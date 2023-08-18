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

import java.util.List;
import java.util.Objects;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.logging.Logger;

import lombok.ToString;

/**
 * Represents a single sql connection/query. 
 */
@ToString
public class Queryable {

	/** Listen for changes to the config. */
	public static interface Listener {
		/** Config was changed */
		public void configChanged(Queryable queryable);
	}

	private static final Logger LOG = Logger.getLogger(Queryable.class.getName());
	
   	transient private final List<Queryable.Listener> listeners = new CopyOnWriteArrayList<Queryable.Listener>();

   	private String serverName = "localhost:5000";
   	private String serverCmd = "";
    private String query = "";
    private int refreshPeriod;
	
	public Queryable() {}

	public Queryable(String serverName, String query, int refreshPeriod, String serverCmd) {
		this.serverName = serverName;
		this.query = query;
		this.refreshPeriod = refreshPeriod;
		this.serverCmd = serverCmd;
	}
	
	public Queryable(String serverName, String query) {
		this(serverName, query, 0, "");
	}
	
	Queryable(Queryable app) {
		this.serverName = app.getServerName();
		this.query = app.getQuery();
		this.refreshPeriod = app.getRefreshPeriod();
		this.serverCmd = app.getServerCmd();
	}

	public void setQuery(String query) {
		this.query = Objects.requireNonNull(query);    cc();
	}

	/**
	 * Set the servername uniquely identifying which server this app gets data from.
	 * @param serverName server that will be queried if it exists.
	 */
	public void setServerName(String serverName) {
		this.serverName = Objects.requireNonNull(serverName);    cc();
	}

	public void setServerCmd(String serverCmd) {
		this.serverCmd = Objects.requireNonNull(serverCmd);    cc();
	}

	/**
	 * Requery the database every milliseconds, must be &gt;50,
	 * 0 means re-query as fast as possible. -1 Means don't re-query except on interaction.
	 * @param milliseconds How often the database will be queried.
	 */
	public void setRefreshPeriod(int milliseconds) {
		if(milliseconds < -1) {
			throw new IllegalArgumentException("refresh period must be >=-1");
		}
		this.refreshPeriod = milliseconds;
		cc();
	}

	public String getServerName() { return serverName; }
	public String getServerCmd() { return serverCmd; }
	public String getQuery() { return query; }

	/**
	 * @return milliseconds between which DB will be queried, 
	 * 0 means re-query as fast as possible. -1 Means don't re-query except on interaction. 
	 */
	public int getRefreshPeriod() { return refreshPeriod; }
	
	/** cc = configChanged so notify listeners **/
	private void cc() {
		LOG.fine("Queryable configChanged");
		for(Queryable.Listener l : listeners) {
			l.configChanged(this);
		}
	}
	
	public boolean addListener(Queryable.Listener queryableListener) {
		return listeners.add(queryableListener);
	}
	public boolean removeListener(Queryable.Listener queryableListener) {
		return listeners.remove(queryableListener);
	}

	@Override
	public int hashCode() {
		final int prime = 31;
		int result = 1;
		result = prime * result + ((query == null) ? 0 : query.hashCode());
		result = prime * result + refreshPeriod;
		result = prime * result + ((serverName == null) ? 0 : serverName.hashCode());
		result = prime * result + ((serverCmd == null) ? 0 : serverCmd.hashCode());
		return result;
	}

	@Override
	public boolean equals(Object obj) {
		if (this == obj)
			return true;
		if (obj == null)
			return false;
		if (getClass() != obj.getClass())
			return false;
		Queryable other = (Queryable) obj;
		if (query == null) {
			if (other.query != null)
				return false;
		} else if (!query.equals(other.query))
			return false;
		if (refreshPeriod != other.refreshPeriod)
			return false;
		if (serverName == null) {
			if (other.serverName != null)
				return false;
		} else if (!serverName.equals(other.serverName))
			return false;
		if (serverCmd == null) {
			if (other.serverCmd != null)
				return false;
		} else if (!serverCmd.equals(other.serverCmd))
			return false;
		return true;
	}
	

}
