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

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.persistence.Transient;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.PositiveOrZero;

import com.sqldashboards.dashy.ServerConfig;
import com.sqldashboards.shared.JdbcTypes;

import lombok.Data;
import lombok.NonNull;

/** Details relevant to a single database server connection. */
@Entity
@Table(name = "datasource")
@Data
public class ServerConfigDTO {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	@Column(unique = true)
	private final String name;
	private String username;
	private String password;
	@NotBlank
	@NotNull
	private final String host;
	@NotBlank
	@NotNull
	@PositiveOrZero
	private final int port;
	@NotNull
	private String database;
	@NotBlank
	@NotNull
	private final JdbcTypes jdbcType;

	private String queryWrapPre = "";
	private String queryWrapPost = "";
	private boolean wrapQuery = true;

	public static ServerConfigDTO getServerConfig(com.sqldashboards.dashy.ServerConfig s) {
		return new ServerConfigDTO(s.getHost(), s.getPort(), s.getUsername(), s.getPassword(), s.getName(), 
				s.getJdbcType(), s.getDatabase(), s.getQueryWrapPre(), s.getQueryWrapPost());
	}

	public ServerConfigDTO(@NonNull String host, int port, String username, String password, String name,
			@NonNull JdbcTypes jdbcType, String database) {
		this(host, port, username, password, name, jdbcType, database, "", "");
	}

	public ServerConfigDTO(@NonNull String host, int port, String username, String password, String name,
			@NonNull JdbcTypes jdbcType, String database, String queryWrapPre, String queryWrapPost) {

		if (port < 0) {
			throw new IllegalArgumentException("Must specify positive port");
		}
		if (name != null && name.endsWith("/")) {
			throw new IllegalArgumentException("Name cannot end with a /");
		}

		// This null filling is because micronaut converts incoming REST calls but those REST calls may NOT contain optional fields.
		// SO they have to be optional here, even though we don't really want it in java.
		this.database = database == null ? "" : database;
		this.host = host;
		this.port = port;
		this.username = username == null ? "" : username;
		this.password = password == null ? "" : password;
		this.queryWrapPre = queryWrapPre == null ? "" : queryWrapPre;
		this.queryWrapPost = queryWrapPost == null ? "" : queryWrapPost;

		// clean any folders, remove multiple empty /s
		String n = name;
		if (n == null || n.length() == 0) {
			n = host + ":" + port;
		}
		this.name = n;

		this.jdbcType = jdbcType;
	}

	public String getQueryWrapPre() { return queryWrapPre == null ? "" : queryWrapPre; }
	public String getQueryWrapPost() { return queryWrapPost == null ? "" : queryWrapPost; }
	
	
	/** @TODO get this working with lombok */
	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public ServerConfigDTO(String host, int port) {
		this(host, port, "", "", host + ":" + port, JdbcTypes.KDB, "");
	}


//	ConnectionDetails getConnectionDetails() {
//		return new ConnectionDetails(host, port, database, username, password);
//	}

	/**
	 * @return JDBC URL for this connection
	 */
	@Transient public String getUrl() {
		return jdbcType.getURL(toDashySC());
	}

	@Override
	public String toString() {
		return "ServerConfigDTO[id=" + id + ", name=" + name + ", username=" + username + ", password=" + password
				+ ", host=" + host + ", port=" + port + ", database=" + database + ", jdbcType=" + jdbcType + "]";
	}
	

	public com.sqldashboards.dashy.ServerConfig toDashySC() {
		return new ServerConfig(getHost(), getPort(), getUsername(), getPassword(), 
				getName(), getJdbcType(), getDatabase(), null,  getQueryWrapPre(), getQueryWrapPost());
	}
}
