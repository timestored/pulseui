/*******************************************************************************
 *
 *   $$$$$$$\            $$\                     
 *   $$  __$$\           $$ |                     
 *   $$ |  $$ |$$\   $$\ $$ | $$$$$$$\  $$$$$$\   
 *   $$$$$$$  |$$ |  $$ |$$ |$$  _____|$$  __$$\  
 *   $$  ____/ $$ |  $$ |$$ |\$$$$$$\  $$$$$$$$ |  
 *   $$ |      $$ |  $$ |$$ | \____$$\ $$   ____|  
 *   $$ |      \$$$$$$  |$$ |$$$$$$$  |\$$$$$$$\  
 *   \__|       \______/ \__|\_______/  \_______|
 *
 *  Copyright c 2022-2023 TimeStored
 *
 *  Licensed under the Reciprocal Public License RPL-1.5
 *  You may obtain a copy of the License at
 *
 *  https://opensource.org/license/rpl-1-5/
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 ******************************************************************************/
 
package com.sqldashboards.shared;

import java.io.IOException;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.logging.Logger;

import com.google.common.base.Joiner;
import com.sqldashboards.dashy.ServerConfig;

import lombok.Data;
import lombok.NonNull;


/**
 * Contains the logic for fetching database meta data and Db specific querying.
 * Both qStudio and PUlse require meta-data and DB specific logic. 
 * JdbcTypes would get too big and ConnectionManager is too different between the 2 programs. 
 */
@Data public class MetaInfo {
	
	private final List<ColumnInfo> columnInfo;
	private static final Logger LOG = Logger.getLogger(MetaInfo.class.getName());

	@Data
	public static class ColumnInfo {
		// TABLE_CAT:`,TABLE_SCHEM:`,TABLE_NAME:n,COLUMN_NAME:c,DATA_TYPE:0i,TYPE_NAME:`int$t
		@NonNull final String cat;
		@NonNull final String schema;
		@NonNull final String tableName;
		@NonNull final String columnName;
		@NonNull final String typeName;
		final int typeNumber;

		public String getNamespace() {
			return cat.isEmpty() ? schema : (schema.isEmpty() ? cat : cat + "." + schema); 
		}

		public String getFullTableName() {
			String ns = getNamespace();
			return ns.isEmpty() ? tableName : (ns + "." + tableName); 
		}
	}
	
	
	
	public static MetaInfo empty() { return new MetaInfo(Collections.emptyList()); }
		
	public static MetaInfo getMetaInfo(ConnectionManager connMan, ServerConfig serverConfig) throws Exception {
		Exception err = null;
		MetaInfo r = null;
		// Cascade through each method until sensible return encountered
		if(serverConfig.getJdbcType().equals(JdbcTypes.TDENGINE)) {
			String tdsql = "SELECT '' AS TABLE_CAT,db_name AS TABLE_SCHEM,table_name,COL_NAME AS COLUMN_NAME,0 AS DATA_TYPE,col_type AS TYPE_NAME FROM INFORMATION_SCHEMA.INS_COLUMNS";
			try {
				r = MetaInfo.fromColumnRs(serverConfig, connMan.executeQuery(serverConfig, tdsql ).getRs());
			} catch(Exception e) { err = e; } catch(Throwable t) { LOG.info(t.getLocalizedMessage()); }
			if(r != null && r.getColumnInfo().size()>0) { return r; }
		}
		try {
			r = getColumns(connMan, serverConfig, null, "%", "%", "%");
		} catch(Exception e) { err = e; } catch(Throwable t) { LOG.info(t.getLocalizedMessage()); }
		if(r != null && r.getColumnInfo().size()>0) { return r; }
		
		try {
			r = getTables(connMan, serverConfig);
		} catch(Exception e) { err = e; } catch(Throwable t) { LOG.info(t.getLocalizedMessage()); }
		if(r != null && r.getColumnInfo().size()>0) { return r; }
		
		if(err != null) {
			throw err;
		}
		return MetaInfo.empty();
	}

	private static MetaInfo getTables(ConnectionManager connMan, ServerConfig serverConfig) throws IOException, SQLException {
		return connMan.useConn(serverConfig, (Connection conn) -> {
			DatabaseMetaData md = conn.getMetaData();
			// TABLE_CAT:`;TABLE_SCHEM:`;TABLE_NAME
			ResultSet rs = md.getTables(null, null, "%", new String[] {"TABLE","VIEW"});
			if(rs != null) { // some databases don't return a result for these meta queries.
				List<ColumnInfo> colInfos = new ArrayList<>();
				if(rs != null) { // some databases don't return a result for these meta queries.
					while(rs.next()) {
						colInfos.add(new ColumnInfo(safeGet(rs, "TABLE_CAT"), safeGet(rs, "TABLE_SCHEM"), safeGet(rs, "TABLE_NAME"), 
								"ColumnsNotDetected", "", 0));		
					}
					try { rs.close(); } catch(Exception e) {};
				}
				return new MetaInfo(colInfos);
			}
			return null;
		});
	}

	private static MetaInfo getColumns(ConnectionManager connMan, ServerConfig serverConfig, String catalog, String schemaPattern, String tableName, String columnName) throws IOException, SQLException {
		return connMan.useConn(serverConfig, (Connection conn) -> {
			MetaInfo res = null;
			DatabaseMetaData md = conn.getMetaData();
			// TABLE_CAT:`,TABLE_SCHEM:`,TABLE_NAME:n,COLUMN_NAME:c,DATA_TYPE:0i,TYPE_NAME:`int$t
			ResultSet rs = md.getColumns(catalog, schemaPattern, tableName, columnName);
			if(rs != null) { // some databases don't return a result for these meta queries.
				res = MetaInfo.fromColumnRs(serverConfig, rs);
				try { rs.close(); } catch(Exception e) {};
			}
			return res;
		});
	}

	private static String safeGet(ResultSet rs, String col) {
		String r = "";
		try {
			r = rs.getString(col);
			if(r == null) {
				r = "";
			}
		} catch (Exception e) {}
		return r;
	}
	
	private static MetaInfo fromColumnRs(ServerConfig serverConfig, ResultSet rs) throws SQLException {
		List<ColumnInfo> colInfos = new ArrayList<>();
		if(rs != null) { // some databases don't return a result for these meta queries.
			while(rs.next()) {
				int dataType = 0;
				try {
					dataType = rs.getInt("DATA_TYPE");
				} catch (Exception e) {}
				String cat = safeGet(rs, "TABLE_CAT");
				String schem = safeGet(rs, "TABLE_SCHEM");
				
				switch(serverConfig.getJdbcType()) {
					case MSSERVER:
						cat = cat.equals("master") ? "" : cat; // master is default 99% of time. Remove to hide in UI
//						schem = schem.equals("dbo") ? "" : schem; NOT turning this on as some MS users do use dbo in queries
						break;
					case H2:
						//cat = cat.equals("UNNAMED") ? "" : cat;
						// For in-memory cat=UNNAMED, ondisk cat=filename so always remove as querying cat.table doesn't work.
						cat = "";
						schem = schem.equals("PUBLIC") ? "" : schem; // PUBLIC is only schema. Not required
						break;
					case DUCKDB:
						cat = ""; // DUckDB reports catalog=memory for in-memory. This is useless.
						schem = schem.equals("main") ? "" : schem; // main is only one currently I think?
						break;
					case POSTGRES:
						schem = schem.equals("public") ? "" : schem;
						break;
					default: // do nothing;
				}
				
				colInfos.add(new ColumnInfo(cat, schem, safeGet(rs, "TABLE_NAME"), 
						safeGet(rs, "COLUMN_NAME"), safeGet(rs, "TYPE_NAME"), dataType));		
			}
			try { rs.close(); } catch(Exception e) {};
		}
		return new MetaInfo(colInfos);
	}
	
	private static String cols(JdbcTypes jdbcTypes, List<String> colNames, boolean includeColumnNames) {
		String cols = jdbcTypes.isKDB() ? "" : "*";
		if (includeColumnNames && colNames != null) {
			cols = Joiner.on(',').join(colNames);
		}
		return cols;
	}
	
	public static String getTop100Query(JdbcTypes jdbcTypes, List<String> colNames, String fullname, boolean isKdbPartitioned, boolean includeColumnNames) {
		String cols = cols(jdbcTypes, colNames, includeColumnNames);
		String qry = "SELECT " + cols + " FROM " + fullname + " LIMIT 100";
		// select top 100
		if(jdbcTypes.isKDB()) {
			String s = includeColumnNames ? ("select " + cols + " ") : "";
			qry = s + (isKdbPartitioned ? ".Q.ind["+fullname+"; `long$til 100]" :  "select[100] from "+fullname);
		} else if(jdbcTypes.equals(JdbcTypes.MSSERVER)) {
			qry = "SELECT TOP 100 " + cols + " FROM " + fullname;
		} else if(jdbcTypes.equals(JdbcTypes.ORACLE)) {
			qry = "SELECT " + cols + " FROM " + fullname + "FETCH FIRST 100 ROWS ONLY";
		}
		return qry;
	}
	
	public static String getBottom100query(JdbcTypes jdbcTypes, List<String> colNames,String fullname, boolean isKdbPartitioned, boolean includeColumnNames) {
		String cols = cols(jdbcTypes, colNames, includeColumnNames);
		if (isKdbPartitioned) {
			return "select " + cols + " from .Q.ind[" + fullname 
					+ "; `long$-100 + (count " + fullname + ")+til 100]";
		} else {
			return "select[-100] " + cols + " from " + fullname;
		}
	}
}
