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

import java.util.ArrayList;
import java.util.List;

import com.sqldashboards.shared.JdbcTypes;
import com.timestored.plugins.ConnectionDetails;

import lombok.Data;
import lombok.Getter;
import net.jcip.annotations.Immutable;


/** Details relevant to a single database server connection. */
@Immutable @Data
public class ServerConfig {

	private final String name;
	private final String username;
	private final String password;
	private final String host;
	private final int port;
	private final String database;
	private final JdbcTypes jdbcType;
	@Getter private final String queryWrapPre;
	@Getter private final String queryWrapPost;
	

	public ServerConfig(String host, int port, String username, 
			String password, String name, JdbcTypes jdbcType) {
		this(host, port, username, password, name, jdbcType, null);
	}
	public ServerConfig(String host, int port, String username, 
			String password, String name, JdbcTypes jdbcType, String database) {
		this(host, port, username, password, name, jdbcType, database, null, "", "");
	}
	
	/**
	 * @param folder The folder(s) separated by forward slashes that this server goes into. If null it could be supplied
	 * as part of the name itself.
	 */
	public ServerConfig(String host, int port, String username, 
			String password, String name, JdbcTypes jdbcType, String database, String folder, String queryWrapPre, String queryWrapPost) {

		if(port<0) {
			throw new IllegalArgumentException("Must specify positive port");
		}
		if(name.endsWith("/")) {
			throw new IllegalArgumentException("Name cannot end with a /");
		}
		
		this.database = database;
		this.host = java.util.Objects.requireNonNull(host);
		this.port = port;
		this.username = username;
		this.password = password;
		this.queryWrapPre = queryWrapPre;
		this.queryWrapPost = queryWrapPost;
		
		// clean any folders, remove multiple empty /s
		String n = name;
		if(n==null || n.length()==0) {
			n = host + ":" + port;
		}

		// tricky part is either folder or name can specify folder but NOT both
		if(folder != null) {
			if(n.contains("/")) {
				throw new IllegalArgumentException("Cant specify name with path and separate folder");
			} else {
				String cf = cleanFolderName(folder);
				n =  (cf.length()>0 ? cf + "/" : "") + n;
			}
		} else {
			n = String.join("/",extractParts(n));
		}
		this.name = n;
		
		
		this.jdbcType = java.util.Objects.requireNonNull(jdbcType);
	}

	public ServerConfig(String host, int port, 
			String username, String password, String name) {
		this(host, port, username, password, name, JdbcTypes.KDB);
	}
	public ServerConfig(String host, int port, 
			String username, String password) {
		this(host, port, username, password, host + ":" + port, JdbcTypes.KDB);
	}

	public ServerConfig(String host, int port) {
		this(host, port, "", "", host + ":" + port, JdbcTypes.KDB);
	}

	/** @return A short user assigned name representing this server **/
	public String getName() { return name; }

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
	
	public ConnectionDetails getConnectionDetails() {
		return new ConnectionDetails(host, port, database, username, password);
	}
	
	/**
	 * @return The folder that this {@link ServerConfig} is in or "" if in the root.
	 * Note the returned folder will NOT have a trailing slash.
	 */
	public String getFolder() {
		int p = name.lastIndexOf("/");
		String s = p > -1 ? name.substring(0, p) : "";
		return s;
	}

	public List<String> getFolders() {
		List<String> l = extractParts(name);
		return l.subList(0, l.size() -1);
	}

	/**
	 * @return List of strings that had been separated by folder-separators
	 */
	public static List<String> extractParts(String name) {
		if(!name.contains("/")) {
			List<String> r = new ArrayList<String>(1);
			r.add(name);
			return r;
		}
		String[] a = name.split("/");
		List<String> r = new ArrayList<String>(a.length);
		for(String s : a) {
			if(s.length()>0) {
				r.add(s);
			}
		}
		return r;
	}
	

	/**
	 * @return cleaned folder name i.e. collapse reoccurring // and only return one slash and no start/end slash.
	 *  eg cleanFolderName("///aa///bb/////c//") -&gt; a/b/c
	 */
	public static String cleanFolderName(String folder) {
		List<String> folds = extractParts(folder);
		return String.join("/", folds);
	}
	
	/**
	 * @return The name of this {@link ServerConfig} excluding the path.
	 */
	public String getShortName() {
		int p = name.lastIndexOf("/");
		return p > -1 ? name.substring(p + 1) : name;
	}
	
	public JdbcTypes getJdbcType() { return jdbcType; }
	
	@Override
	public String toString() {
		return "ServerConfig [name=" + name + ", username=" + username + ", host=" + host + ", port=" + port
				+ ", database=" + database + ", jdbcType=" + jdbcType + "]";
	}
	
	/**
	 * @return JDBC URL for this connection
	 */
	public String getUrl() {
		return jdbcType.getURL(this);
	}

	/** @return true iff this is a kdb server **/
	public boolean isKDB() { return jdbcType.isKDB(); }
	
	/** @return true iff this is a streaming server **/
	public boolean isStreaming() { return jdbcType.isStreaming(); }

	public boolean hasLogin() {
		return username!=null && username.length()>0 || password!=null && password.length()>0;
	}
	
}
