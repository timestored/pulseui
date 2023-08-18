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
 
package com.timestored.plugins;

/** Details relevant to a single database server connection. */
public class ConnectionDetails {
	
	private final String host;
	private final int port;
	private final String database;
	private final String username;
	private final String password;

	public ConnectionDetails(String host, int port, String database, String username, String password) {
		this.host = host;
		this.port = port;
		this.database = database;
		this.username = username;
		this.password = password;
	}

	/** @return username for logging into database if one is set else empty string  **/
	public String getUsername() { return username == null ? "" : username; }

	/** @return password for logging into database if one is set else empty string  **/
	public String getPassword() { return password == null ? "" : password; }

	/** @return hostname that the database server is running on **/
	public String getHost() { return host; }

	/** @return tcp port that the database server is running on **/
	public int getPort() { return port; }

	/** @return database that will be connected to if one is set else empty string  **/
	public String getDatabase() { return database == null ? "" : database; }
}
