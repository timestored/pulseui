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
 
package com.sqldashboards.pro;

import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

import com.google.common.collect.Lists;
import com.sqldashboards.dashy.BaseResultSet;
import com.sqldashboards.shared.JdbcTypes;

/**
 * Used to construct rough {@link ResultSet}'s for testing / documentation  purposes.
 */
public class PivotResultSet extends BaseResultSet {

	private int idx;

	public PivotResultSet(ResultSet rs, String byCol, String pivotCol) throws SQLException {
		this(rs, Lists.newArrayList(byCol), Lists.newArrayList(pivotCol));
	}
	/**
	 * Pivot result set. VERY STRICT REQUIREMENTS that table is sorted on byCols
	 * e.g. if byCols aa,bb,cc table MUST be sorted by aa,bb,cc in that order. Else nonsense returned. 
	 */
	public PivotResultSet(ResultSet rs, List<String> byCols, List<String> pivotCols) throws SQLException {

	}


	public int sz() {
		return 0;
	}

	@Override public boolean absolute(int row) throws SQLException {
		idx = row-1;
		return true;
	}

	@Override public void beforeFirst() throws SQLException { idx = -1; }

	@Override public void afterLast() throws SQLException { idx = sz() + 1; 	}

	@Override public int findColumn(String columnLabel) throws SQLException {
		throw new SQLException();
	}

	@Override public boolean first() throws SQLException { idx = 0; return true; }


	@Override public ResultSetMetaData getMetaData() throws SQLException { return null; }


	@Override public Object getObject(int columnIndex) throws SQLException {
		return null;
	}
	
	@Override public boolean wasNull() throws SQLException { return  true; }

	@Override public Object getObject(int columnIndex, Map<String, Class<?>> map) throws SQLException {
		throw new UnsupportedOperationException();
	}

	@Override public int getRow() throws SQLException { return idx; }

	@Override public boolean isAfterLast() throws SQLException { return idx >= sz(); }

	@Override public boolean isBeforeFirst() throws SQLException { return idx < 0; }

	@Override public boolean isFirst() throws SQLException { return idx == 0; }

	@Override public boolean isLast() throws SQLException { return idx == (sz() - 1); }

	@Override public boolean last() throws SQLException { idx = sz(); return true; }

	@Override public boolean next() throws SQLException {
		return sz()>0 && idx < sz();
	}

	@Override public boolean previous() throws SQLException {
		return idx >= 0;
	}

	

	public static String pivotSQL(JdbcTypes jdbcTypes, List<String> groupbylist, List<String> pivotlist, String sel, String translation) {
		return "";
	}
	
}
