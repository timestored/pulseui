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

import java.io.IOException;
import java.sql.ResultSet;
import java.sql.SQLException;

import com.timestored.kdb.QueryResultI;

import lombok.Data;

/** 
 * The result of running a Queryable in the PulseEngine.
 * The complexity is that a QueryResult is one SQL query. 
 * However an EngineResult includes sever commands and translations of user SQL queries to add key replacement and pivot etc. 
 */
@Data
public class EngineResult implements QueryResultI {
	private final String originalQuery;
	private final QueryResultI qr;
	private final ResultSet rs;
	private final Exception e;
	
	@Override public Exception getE() {
		Exception myE = this.e;
		if(this.e == null && qr != null && qr.getE() != null) {
			myE = qr.getE();
		}
		if(myE != null && qr != null && !qr.getQuery().equals(originalQuery)) { // Translated argument, useful for user to see what sent.
			String err = myE.toString();
			if(err.contains("KException: length")) {
				err += "\r\nBy default string like variables are always sent to kdb as strings. You may need to convert them to symbols like so `$((key1))";
			}
			if(!err.contains(qr.getQuery())) {
				err += "\r\nquery=" + qr.getQuery();
			}
			return new SQLException(err);
		}
		return myE; // possibly null
	}

	@Override public String getConsoleView() { return qr==null ? null : qr.getConsoleView(); }
	@Override public Object getK() { return qr==null ? null :qr.getK(); }
	@Override public String getQuery() { return qr==null ? originalQuery : qr.getQuery(); }
	@Override  public boolean isCancelled() { return qr==null ? false : qr.isCancelled(); }
	@Override public boolean isExceededMax() { return qr==null ? false :qr.isExceededMax(); }

	@Override public void close() throws Exception {
		if(qr != null && qr.getRs() != null) {
			qr.getRs().close();
		}
	}
}