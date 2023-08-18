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

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.util.logging.Logger;

import javax.activation.UnsupportedDataTypeException;

import com.sqldashboards.dashy.ServerConfig;
import com.timestored.kdb.QueryResult;
import com.timestored.kdb.QueryResultI;
import com.kx.c.KException;
import com.kx.c;
import com.kx.c.Dict;
import com.kx.c.Flip;
import lombok.extern.java.Log;

/**
 * Provide a standardised connection interface to access a KDB server. 
 */@Log
public class KdbConnection implements AutoCloseable {

	private static final Logger LOG = Logger.getLogger(KdbConnection.class.getName());

	
	private c c;
	private final String host;
	private final int port;
	// need this as c.java provides no way to know if closed.
	private boolean closed = false;

	KdbConnection(String host, int port, String username, 
			String password) throws KException, IOException {

		this.host = host;
		this.port = port;
		c = new c(host, port, username + ":" + password);
	}
	

	KdbConnection(String host, int port) throws KException, IOException {
		this(host, port, null, null);
	}

	public KdbConnection(ServerConfig sconf) throws KException, IOException {
		this(sconf.getHost(), sconf.getPort(), sconf.getUsername(), sconf.getPassword());
	}


	public void close() throws IOException {
		LOG.info("close");
		closed = true;
		c.close();
	}

	public Flip queryFlip(String query) throws IOException, KException {
		Object k = query(query);
		if(k instanceof Flip) {
			return (Flip) k;
		}
		throw new UnsupportedDataTypeException("FlipExpected");
	}

	public Dict queryDict(String query) throws IOException, KException {
		Object k = query(query);
		if(k instanceof Dict) {
			return (Dict) k;
		}
		throw new UnsupportedDataTypeException("DictExpected");
	}

	public Object query(String query) throws IOException, KException {
		Object ret = null;
		return ret;
	}


	public void send(String s) throws IOException {
		sendObject(s);
	}


	private void sendObject(Object obj) throws IOException {
	}

	public void send(Object o) throws IOException {
		sendObject(o);
	}

	public Object k() throws UnsupportedEncodingException, KException, IOException { return c.k(); }
	
	public String getName() { return host + ":" + port; }

	public boolean isConnected() { return !closed && c.s.isConnected(); }

	/**
	 * This logic is here because:
	 * 1. JDBC cannot return objects so can't run debug wrapping.
	 * 2. This causes the problem that queries using this call are NOT pooled.
	 * 3. But how to get conn through connection pool AND to allow wrapping??
	 */
	public static QueryResultI queryKDBwithNewConn(ServerConfig sc, String query, boolean queryWrapped, int maxRows) throws IOException {
		return QueryResult.exceptionResult(query, new KException("kdbUnsupported", "stackMessage"));
	}
	
}
