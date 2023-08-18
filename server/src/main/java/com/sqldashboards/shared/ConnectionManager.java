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
import java.sql.Driver;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.sql.rowset.CachedRowSet;
import javax.sql.rowset.RowSetProvider;

import org.apache.commons.dbcp2.ConnectionFactory;
import org.apache.commons.dbcp2.PoolableConnection;
import org.apache.commons.dbcp2.PoolableConnectionFactory;
import org.apache.commons.pool2.ObjectPool;
import org.apache.commons.pool2.impl.GenericObjectPool;

import com.sqldashboards.dashy.DBHelper;
import com.sqldashboards.dashy.ServerConfig;
import com.sqldashboards.dashy.ServerConfigBuilder;
import com.sqldashboards.pro.KdbConnection;
import com.sqldashboards.webby.Application;
import com.timestored.kdb.QueryResult;
import com.timestored.kdb.QueryResultI;
import com.timestored.plugins.ConnectionDetails;
import com.timestored.plugins.DatabaseAuthenticationService;

import lombok.Getter;
import lombok.Setter;
import net.jcip.annotations.ThreadSafe;

/**
 * Allows managing (adding/removing/updating) server connections. All connections 
 * should be created/accessed using this class. A server is uniquely identified by
 * a name, a server name has a serverConfig detailing JDBC details etc.
 * A preference store can be used to save/restore the list of connections
 * before/after any edits, this is however optional.
 */
@ThreadSafe
public class ConnectionManager implements AutoCloseable {	
	
	public static String XML_ROOT = "serverlist";
	private static final Logger LOG = Logger.getLogger(ConnectionManager.class.getName());
	public static final int MAX_ROWS = 25_013;

	private final List<ServerConfig> serverConns;
	private final Map<ServerConfig, ObjectPool<PoolableConnection>> serverConnPool;
	private final Map<ServerConfig, Boolean> serverConnected = new ConcurrentHashMap<ServerConfig, Boolean>();
	private final List<ServerConfig> readonlyServerConnections;
	private final Object LOCK = new Object();
	
	@Getter private String defaultLoginUsername = null;
	@Getter private String defaultLoginPassword = null;
	

	public void close() {
		serverConnPool.forEach((sc, op) -> {
			try {
				op.clear();
			} catch (Exception e) {}
			try {
				op.close();
			} catch (Exception e) {}
		});
	}

	
	public static ConnectionManager newInstance() {
		return new ConnectionManager();
	}

	private ConnectionManager() {
		
		serverConnPool = new HashMap<ServerConfig, ObjectPool<PoolableConnection>>();
		this.serverConns = new CopyOnWriteArrayList<ServerConfig>();
		readonlyServerConnections = Collections.unmodifiableList(serverConns);
	}
	
	/**
	 * @return The list of server connections at a given point in time,
	 * this list is not guaranteed to be 100% up to date.
	 * Connections returned will be alphabetically sorted on name.
	 */
	public List<ServerConfig> getServerConnections() {
		
		List<ServerConfig> r = new ArrayList<ServerConfig>(readonlyServerConnections);
		Comparator<ServerConfig> alphabetOrder = new Comparator<ServerConfig>() {
			@Override public int compare(ServerConfig sc1, ServerConfig sc2) {
				return sc1.getName().compareTo(sc2.getName());
			}
		};
		Collections.sort(r, alphabetOrder);
		return r;
	}
	
	/** add server but do not notify listeners */ 
	private void addServerSilently(ServerConfig serverConnection) {
		Objects.requireNonNull(serverConnection);
		synchronized (LOCK) {
			String name = serverConnection.getName();
			ServerConfig existingSC = getServer(name);
			if(existingSC!=null) {
				if(existingSC.equals(serverConnection)) {
					return;
				} else {
					throw new IllegalArgumentException("Server name must be unique. " +
							"Cant use this call to update settings.");
				}
			}
			serverConns.add(serverConnection);
			serverConnected.put(serverConnection, Boolean.FALSE);
			LOG.info("added server: " + serverConnection.toString());
		}
	}

	/**
	 * Add a {@link ServerConfig}. 
	 * @param serverConnection the connection you want added, the name of the
	 * server must be unique to this manager.
	 * @throws IllegalArgumentException If name is already present and your trying to change its 
	 * 		settings. Note exception not thrown if all details the same.
	 */
	public void addServer(ServerConfig serverConnection) {
		synchronized (LOCK) {
			addServerSilently(serverConnection);
		}
	}
	

	/**
	 * Add a list of {@link ServerConfig}s where possible. 
	 * @param connections the connections you want added, server names must be unique to this manager.
	 * @return The list of configs that failed to add, one reason could be duplicate name but
	 * 	different ports, {@link #addServer(ServerConfig)}.
	 */
	public List<ServerConfig> addServer(List<ServerConfig> connections) {

		List<ServerConfig> failedConfigs = new ArrayList<ServerConfig>();
		synchronized (LOCK) {
			Objects.requireNonNull(connections);
			for(ServerConfig sc : connections) {
				try {
					addServerSilently(sc);
				} catch(IllegalArgumentException iae) {
					LOG.log(Level.WARNING, "Could not add sc: " + sc.toString(), iae);
					failedConfigs.add(sc);
				}
				
			}
		}
		return failedConfigs;
	}
	
	/**
	 * Update a {@link ServerConfig}, serverName must already be present. 
	 * @throws IllegalArgumentException If the oldServerName doesn't exist, 
	 * 	or if the newName is already taken.
	 */
	public void updateServer(String oldServerName, ServerConfig serverConnection) {
		
		String newName = serverConnection.getName();
		if(!newName.equals(oldServerName) && getServer(newName)!=null) {
			throw new IllegalArgumentException("That server name is already taken.");
		}
		LOG.info("updateServer(" + oldServerName + " -> " + serverConnection + ")");
		
		ServerConfig existingSC = null;
		synchronized(LOCK) {
			existingSC = getServer(oldServerName);
			if(existingSC != null) {
				serverConns.remove(existingSC);
				serverConns.add(serverConnection);
			}
		}
		LOG.info("updated server: " + serverConnection.toString());
		if(existingSC == null) {
			throw new IllegalArgumentException("server does not exist already, so can't remove");
		}
	}

	

	/**
	 * Remove the selected server.
	 * @return true if the {@link ServerConfig} was removed, otherwise false.
	 */
	public boolean removeServer(String name) {
		ServerConfig sc = getServer(name);
		return sc!=null ? removeServer(sc) : false;
	}
	

	/**
	 * Remove the selected {@link ServerConfig} s.
	 */
	private boolean[] removeServers(List<ServerConfig> serverConfigs) {
		if(serverConfigs.size()>0) {
			boolean[] goners = new boolean[serverConfigs.size()];

			synchronized (LOCK) {
				for(int i=0; i<serverConfigs.size(); i++) {
					goners[i] = serverConns.remove(serverConfigs.get(i));
					if(goners[i]) {
						LOG.info("removed server: " + serverConfigs.toString());
					}
				}
			}
			return goners;
		}
		return new boolean[0];
	}
	/**
	 * Remove the selected {@link ServerConfig}.
	 * @return true if the {@link ServerConfig} was removed, otherwise false.
	 */
	public boolean removeServer(ServerConfig serverConfig) {
		return removeServers(Arrays.asList(serverConfig))[0];
	}

	/** Remove all servers. */
	public void removeServers() {
		synchronized (LOCK) {
			serverConns.clear();
			LOG.info("removed all servers");
		}
	}
	
	public boolean isConnected(String serverName) {
		return isConnected(getServer(serverName));
	}

	/**
	 * @return Connection for this serverName, or null no such server exists.
	 * @throws IOException if problem connecting to server
	 */
	private PoolableConnection getConnection(ServerConfig serverConfig) throws IOException  {
		synchronized (LOCK) {
			if(serverConns.contains(serverConfig)) {
				return getConn(serverConfig);
			} 
		}
		return null;
	}

	/** Return the connection to the pool */
	private boolean returnConn(ServerConfig serverConfig, PoolableConnection conn, boolean invalidateConnection)  {
		ObjectPool<PoolableConnection> sp = serverConnPool.get(serverConfig);
		if(sp!=null && conn!=null) {
			try {
				if(conn.isClosed() || invalidateConnection) {
					sp.invalidateObject(conn);
				} else {
					sp.returnObject(conn);
				}
				return true;
			} catch (Exception e) {
				LOG.log(Level.SEVERE, "error returning object to pool", e);
			}
		}
		return false;
	}

	/** get a connection but don't care if we know about it or not */
	private PoolableConnection getConn(ServerConfig serverConfig) throws IOException {
		try {
			ObjectPool<PoolableConnection> connPool = serverConnPool.get(serverConfig);
			
			if(connPool == null) {
				ServerConfig sc = overrideServerConfig(serverConfig);
				ConnectionFactory connectionFactory = new MyDriverManagerConnectionFactory(sc);
				// I think this may be needed, to pool connections
				@SuppressWarnings("unused")
				PoolableConnectionFactory poolableConnectionFactory = new PoolableConnectionFactory(connectionFactory, null);
				connPool = new GenericObjectPool<>(poolableConnectionFactory);
				  
				serverConnPool.put(serverConfig, connPool);
			}

			PoolableConnection c = connPool.borrowObject();
			if(c.isClosed()) {
				connPool.invalidateObject(c);
				c = null;
			}
			
			return  c;
		} catch ( Exception e) {
			LOG.info("getConn Exception server: " + serverConfig.toString());
			throw new IOException(e);
		}
	}

	private ServerConfig overrideServerConfig(ServerConfig serverConfig) {
		ServerConfig sc = serverConfig;
		
		// if no login details assigned use default username / password
		if(!serverConfig.hasLogin() && (this.defaultLoginPassword!=null || this.defaultLoginUsername!=null)) {
			sc = new ServerConfigBuilder(serverConfig).setUsername(defaultLoginUsername).setPassword(defaultLoginPassword).build();
		}
		
		// If this JDBC type has custom authenticator use it
		DatabaseAuthenticationService dps = serverConfig.getJdbcType().getAuthenticator();
		if(dps != null) {
			ConnectionDetails connDetails = dps.getonConnectionDetails(sc.getConnectionDetails());
			sc = new ServerConfigBuilder(serverConfig)
					.setHost(connDetails.getHost())
					.setPort(connDetails.getPort())
					.setDatabase(connDetails.getDatabase())
					.setUsername(connDetails.getUsername())
					.setPassword(connDetails.getPassword()).build();
		}
		
		return sc;
	}

	/**
	 * @return Server associated with the serverName, or null if not found.
	 * @param serverName serverName uniquely identifying a given {@link ServerConfig}.
	 */
	public ServerConfig getServer(String serverName) {
		Objects.requireNonNull(serverName);

		synchronized(LOCK) {
			for(ServerConfig sc : serverConns) {
				if(sc.getName().equals(serverName)) {
					return sc;
				}
			}
		}
		return null;
	}
	
	
	@Override public String toString() {
		return "ConnectionManager [serverConns=" + serverConns + "]";
	}
	

	/**
	 * @return kdbConnection for selected {@link ServerConfig} else throw an Exception
	 */
	private KdbConnection tryKdbConnection(ServerConfig serverConfig) throws Exception {
		if(serverConfig.isKDB()) {
			try {
				return new KdbConnection(overrideServerConfig(serverConfig));
			} catch (Exception e) {
				String text = "Could not connect to server: " + serverConfig.getHost() + ":" + serverConfig.getPort() 
					+ "\r\n Exception: " + e.toString();
				throw new IOException(text);
			}
		}
		throw new IllegalStateException("tryKdbConnection only works for kdb");
	}

	/**
	 * @return a KDbConnection if possible otherwise null.
	 */
	public KdbConnection getKdbConnection(ServerConfig serverConfig) {
		try {
			return tryKdbConnection(serverConfig);
		} catch (Exception e) { 
			return null;
		}
	}

	public boolean isConnected(ServerConfig sc) {
		if(sc != null) {
			Boolean b = serverConnected.get(sc);
			return b!=null ? b : false;
		}
		return false;
	}

	public boolean contains(ServerConfig serverConfig) {
		synchronized (LOCK) {
			return serverConns.contains(serverConfig);
		}
	}

	/**
	 * A null safe equality check for two strings
	 * @return true if the strings are equal, including possibly both null.
	 */
	private static boolean equals(String a, String b) {
		if(a == null) {
			return b == null;
		}
		return a.equals(b);
	}
	
	/** 
	 * Set the default username / password to be used, if a server doesn't already have one 
	 **/
	public void setDefaultLogin(String username, String password) {
		if(!equals(defaultLoginUsername, username) || 
				!equals(defaultLoginPassword, password)) {
			this.defaultLoginUsername = username;
			this.defaultLoginPassword = password;
			serverConnPool.clear(); // must clear to prevent bad cached conns being returned
		}
	}

	public boolean isDefaultLoginSet() {
		return defaultLoginUsername!=null || defaultLoginPassword!=null;
	}	


    public QueryResultI query(String serverName, String query) {
    	return query(getServer(serverName), query, true);
    }

    public QueryResultI query(ServerConfig sc, String query) {
    	return query(sc, query, true);
    }

	/**
	 * This logic is here because:
	 * 1. JDBC cannot return objects so can't run debug wrapping.
	 * 2. This causes the problem that queries using this call are NOT pooled.
	 * 3. But how to get conn through connection pool AND to allow wrapping??
	 */
    private QueryResultI query(ServerConfig sc, String query, boolean queryWrapped) {
		try {
			if(sc.getJdbcType().isKDB() && queryWrapped && !sc.getHost().equalsIgnoreCase("mem")) {
				return KdbConnection.queryKDBwithNewConn(sc, query, queryWrapped, MAX_ROWS);
			} else {
				return executeQuery(sc, query);
			}
		} catch(IOException | SQLException e) {
			return QueryResult.exceptionResult(query, e);
		}
    }
    
	/**
	 * Attempt to query a selected {@link ServerConfig} and return a cached result.
	 * @return The query result if all successful otherwise null.
	 * @throws SQLException If there was a problem with the sql.
	 * @throws IOException If there was a problem with the connection.
	 */
	public QueryResultI executeQuery(ServerConfig serverConfig, String sql) throws SQLException, IOException {
		return useConn(serverConfig, (Connection conn) -> executeQuery(serverConfig, sql, conn));
	}

	
	/**
	 * Carefully wrap a call to a Connection so that at all costs the connection is closed.
	 * Previously qStudio had bugs in fetching meta, querying that caused connections NOT to be returned to the pool.
	 * This means the pool runs out and the UI freezes.
	 * @return The query result if all successful otherwise null.
	 * @throws SQLException If there was a problem with the sql.
	 * @throws IOException If there was a problem with the connection.
	 */
	<T> T useConn(ServerConfig serverConfig, CheckedFunction<Connection,T> f) throws IOException,SQLException {
		PoolableConnection conn = getConnection(serverConfig);
		if(conn == null) {
			throw new IOException("Could not find server");
		}
		boolean kdbConnectionClosed = false;
		try {
			return f.apply(conn);
		} catch(SQLException sqe) {
			kdbConnectionClosed = serverConfig.getJdbcType().equals(JdbcTypes.KDB) && 
					(sqe instanceof SQLException) && sqe.toString().contains("recv failed") || sqe.toString().contains("SOCKETERR");
			// basically one level recursion retry as we know recv is remote handle closed. Some KDB systems close handles open for long periods.
			if(kdbConnectionClosed) {
				PoolableConnection connInner = getConnection(serverConfig);
				try {
					return f.apply(connInner);
				} catch(SQLException sqeInner) {
					throw sqeInner;
				} finally {
					returnConn(serverConfig, connInner, false);
				}				
			}
			throw sqe;
		} catch(Exception e) { // What to do if JDBC driver breaks? e.g. bug through NPE. BEst we can do is close it so it will retry?
			kdbConnectionClosed = true;
			throw e;
		} finally {
			returnConn(serverConfig, conn, kdbConnectionClosed);
		}
	}	


	/**
	 * Execute query and return cachedRowset. Uses serverconfig to adapt for kdb queries. 
	 * @return The query result if all successful otherwise null.
	 * @throws SQLException If there was a problem with the sql.
	 */
	private static QueryResultI executeQuery(ServerConfig serverConfig, String query, Connection conn) 
			throws SQLException {

		boolean kdbPre = serverConfig.getJdbcType().isKDB() && !(query.startsWith("q)") || query.startsWith("s)"));
	    String qry = (kdbPre ? "q)" : "") + query;
	    
		Statement st = null;
		try {
			st = conn.createStatement();
//			try {
//				st.setMaxRows(MAX_ROWS);
//			} catch(SQLException e) {
//				LOG.warning("MAX_ROWS not supported"); // Ignore as it does occur in DolphinDB.
//				st.close();
//				st = conn.createStatement();
//			}
			boolean hasRS = st.execute(qry);
			ResultSet rs = null;
			int statementCount = 0;
			int updateCount = 0;
		    CachedRowSet crs = null;
			do {
				ResultSet tempRs = st.getResultSet();
				if(tempRs != null) {
					rs = tempRs;
				    if(rs != null) {
				    	crs = RowSetProvider.newFactory().createCachedRowSet();
				    	crs.populate(rs);
				    }
				}
				updateCount += tempRs == null ? 0 : st.getUpdateCount();
				statementCount++;
			} while(st.getMoreResults() || st.getUpdateCount() != -1);
		    String consoleView = statementCount + " statements ran." + (updateCount>0 ? (" Update Count = " + updateCount) : "") + "\n";
		    boolean exceededMaxSize = crs != null && DBHelper.getSize(crs) == MAX_ROWS;
		    
		    return QueryResult.successfulResult(query, null, crs, consoleView, exceededMaxSize);
		} catch(SQLException sqe) {
			LOG.warning("Error running sql:\r\n" + qry);
			throw sqe;
		} finally {
			try {
				if(st != null) { st.close();}
			} catch (SQLException e) {}
		}
	}

	public boolean isEmpty() { return serverConns.size()==0; }

	/**
	 * Test if the supplied serverConfig is a server that can actually be connected to.
	 * @throws IOException if can't connect
	 */
	public void testConnection(ServerConfig serverConfig) throws IOException {
		boolean connected = false;
		PoolableConnection conn = getConn(serverConfig);
		try {
			connected = !conn.isClosed();
		} catch (SQLException e) {
			connected = false;
		} finally {
			returnConn(serverConfig, conn, !connected);
		}
	}

	/** This is only exposed to allow testing **/
	@Setter private static String appname = Application.APPNAME;

	private static class MyDriverManagerConnectionFactory implements ConnectionFactory {
		private ServerConfig sc;
		public MyDriverManagerConnectionFactory(ServerConfig sc) {
			this.sc = sc;
		}
		@Override public Connection createConnection() throws SQLException {
			try {
				String driverName = sc.getJdbcType().getDriver();
				Class<?> driver = PluginLoader.getCClass(appname, driverName);
				Properties p = new Properties();
				p.setProperty("user", sc.getUsername());
				p.setProperty("password", sc.getPassword());
				return ((Driver) driver.newInstance()).connect(sc.getUrl(), p);
			} catch (InstantiationException | IllegalAccessException | SQLException | ClassNotFoundException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
				throw new SQLException(e);
			}
		}
		
	}

	@FunctionalInterface
	public interface CheckedFunction<T, R> {
	   R apply(T t) throws SQLException;
	}

}

