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
 
package com.timestored.kdb;

import java.sql.ResultSet;

import io.micronaut.core.annotation.Nullable;
import lombok.Data;

/** The result of a single query to a database. */
@Data
public class QueryResult implements QueryResultI {
	private final String query; 
	private final Object k; 
	@Nullable  final ResultSet rs;
	private final String consoleView;
	private final Exception e; 
	private final boolean cancelled;
	private final boolean exceededMax;

	public static QueryResultI successfulResult(String query, Object k, 
			ResultSet rs, String consoleView, boolean exceededMax) {
		return new QueryResult(query, k, rs, consoleView, null, false, exceededMax);
	}

	public static QueryResultI exceptionResult(String query, Exception e) {
		String cView = (e!=null ? e.getMessage() : "exception") + "\r\n";
		return new QueryResult(query, null, null, cView, e, false, false);
	}
	
	@Override public String toString() {
		return "QueryResult [query=" + query + ", k=" + k + ", consoleView=" + consoleView + ", e=" + e
				+ ", cancelled=" + cancelled + "]";
	}
	
	@Override public void close() throws Exception {
		if(rs != null) {
			rs.close();
		}
	}
}