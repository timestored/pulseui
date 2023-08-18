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
 
package com.sqldashboards.dashy;

import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;


/**
 * DataBase helper methods. 
 */
public class DBHelper {
	
	private static final Logger LOG = Logger.getLogger(DBHelper.class.getName());

	public static int getSize(ResultSet rs) throws SQLException {
//		int row = rs.getRow();
		rs.last();
		int size = rs.getRow();
//		rs.absolute(row);
		rs.beforeFirst();
		return size;
	}
	
	/**
	 * @return True iff the two result sets contain identical columns, types and values.
	 * A return value of false only means they are probably not equal, it is NOT a guarantee.
	 */
	public static boolean isEqual(ResultSet rsA, ResultSet rsB) {
		if(rsB == null) {
			return rsA == null;
		}
		if(rsA == null) {
			return rsB == null;
		}
		try {
			ResultSetMetaData mdA = rsA.getMetaData();
			int cols = mdA.getColumnCount();
			ResultSetMetaData mdB = rsB.getMetaData();
			if(cols != mdB.getColumnCount()) {
				return false;
			}
			for(int c=1; c<=cols; c++) {
				if(!mdA.getColumnName(c).equals(mdB.getColumnName(c))) {
					return false;
				}
			}
			rsA.beforeFirst();
			rsB.beforeFirst();
			// The single ampersand here is essential to make sure both positions move
			// so the later check is true.
			while(rsA.next() & rsB.next()) {
				for(int c=1; c<=cols; c++) {
					boolean eq = Objects.equals( rsA.getObject(c),  rsB.getObject(c));
					if(!eq) {
						if(LOG.isLoggable(Level.FINER)) {
							LOG.log(Level.FINE, " rsA.getObject(c) = " + rsA.getObject(c).toString());
							LOG.log(Level.FINE, " rsB.getObject(c) = " + rsB.getObject(c).toString());
						}
						return false;
					}
				}
			}
			return rsA.isAfterLast() && rsB.isAfterLast();
			
		} catch (SQLException e) {
			LOG.log(Level.WARNING, "Error. Assuming isEqualResultSets false", e);
		}
		return false;
	}

	final public static String toString(ResultSet rs, boolean withTypesInHeader) throws SQLException {
		StringBuilder sb = new StringBuilder();
		ResultSetMetaData rsmd = rs.getMetaData();
		int cn = rsmd.getColumnCount();
		if(withTypesInHeader) {
			for (int i = 1; i <= cn; i++) {
				if (i > 1)
					sb.append(" | ");
				sb.append(rsmd.getColumnType(i));
			}
			sb.append("\r\n");
		}
		for (int i = 1; i <= cn; i++) {
			if (i > 1)
				sb.append(" | ");
			sb.append(rsmd.getColumnLabel(i));
		}
		sb.append("\r\n");
		rs.beforeFirst();
		while (rs.next()) {
			for (int i = 1; i <= cn; i++) {
				if (i > 1)
					sb.append(" | ");
				sb.append(""+rs.getObject(i));
			}
			sb.append("\r\n");
		}
		return sb.toString();
	}

}
