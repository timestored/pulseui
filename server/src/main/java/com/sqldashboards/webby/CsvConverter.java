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
 
package com.sqldashboards.webby;

import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;

public class CsvConverter {
	private static final char NL = '\n';

	/**
	 * Convert a table to values separated by separator and new lines.
	 * @param selectedAreaOnly whether to convert the whole table or only user selected area.
	 * @param separator The string to place between columns in the output.
	 * @throws SQLException 
	 */
	public static String getCSV(ResultSet rs, boolean includeHeaders, final String separator) throws SQLException {
		
		ResultSetMetaData rsmd = rs.getMetaData();
		int cEnd = rsmd.getColumnCount();
		
		StringBuilder sb = new StringBuilder();
		
		// include column headers if whole table
		if(includeHeaders) {
			for (int c = 1; c <= cEnd; c++) {
				sb.append(rsmd.getColumnName(c));
				if(c!=cEnd) {
					sb.append(separator);
				}
			}
			sb.append(NL);
		}
		
		// loop through rows/cols building up output string.
        while (rs.next()) {
			for (int c = 1; c <= cEnd; c++) {
				String s = "" + rs.getObject(c);
//				if(o!=null) {
//					s = stringValue==null ? o.toString() 
//							: stringValue.getString(o);
//					// numbers use unformatted to prevent erroneous commas
//					// all else take a chance on the stringValuer
//					if(o instanceof Number && !s.trim().isEmpty()) {
//						s = "" + o;
//					}
//				}
				sb.append(s);
				if(c!=cEnd) { // comma except after last column
					sb.append(separator);
				}
			}
			sb.append(NL);
		}
		return sb.toString();
	}
}
