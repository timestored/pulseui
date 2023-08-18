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

import java.io.IOException;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sqldashboards.dashy.QueryEngine2;
import com.sqldashboards.dashy.QueryEngine2.ArgType;
import com.sqldashboards.dashy.QueryEngine2.ArgVal;
import com.sqldashboards.dashy.QueryEngine2.QueryEngineListener;
import com.sqldashboards.dashy.QueryEngine2.SendingRate;
import com.sqldashboards.shared.ConnectionManager;
import com.sqldashboards.dashy.Queryable;

import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.websocket.WebSocketSession;
import io.micronaut.websocket.annotation.OnClose;
import io.micronaut.websocket.annotation.OnMessage;
import io.micronaut.websocket.annotation.OnOpen;
import io.micronaut.websocket.annotation.ServerWebSocket;
import jakarta.inject.Inject;
import lombok.NonNull;
import lombok.extern.java.Log;
import lombok.Data;
import lombok.Getter;
import com.google.common.base.Preconditions;


// @TODO https://stackoverflow.com/questions/63523069/micronaut-websocket-security
@Secured(SecurityRule.IS_ANONYMOUS)
@ServerWebSocket("/api/subscribe/{k}") @Log
public class WebSocketServer {

	/**
	 * As suggested by here: https://stackoverflow.com/questions/63523069/micronaut-websocket-security
	 * We use a standard HTTP get elsewhere to fetch a key
	 * Then immediately using the key to get a socket.
	 */

	private static final Map<WebSocketSession,DashboardEngine> userToEngine = new ConcurrentHashMap<>();
	private static final Map<WebSocketSession,Stats> userToStats = new ConcurrentHashMap<>();
	@Inject ServerConfigRepository serverConfigRepository;
	private static Map<String,String> keysToUser = new ConcurrentHashMap<String, String>();
	@Getter private static int maxActiveDashboardCount = 0;
	@Getter private static int maxActiveUserCount = 0;
	 
	private static class Stats {
		private int ping = 0;
		private int pong = 0;
		
		synchronized void setPong(int pong) { this.pong = pong; }
		synchronized int getPong() { return pong; }
		synchronized int getPing() { return ping; }
		synchronized int incPing() { return ping++; }
	}
	
	public synchronized static String requestKey(String username) {
		String k = UUID.randomUUID().toString();
		keysToUser.put(k, username);
		return k;
	}

	public static int getActiveDashboardCount() { return userToEngine.size(); }
	public static int getActiveUserCount() {
		return (int) userToEngine.values().stream().map(de -> de.getUser()).distinct().count(); 
	}
	
    @OnOpen 
    public void onOpen(String k, WebSocketSession session) {
        String user = keysToUser.remove(k);
        log.info("(" + (user == null ? "unknown" : user) + ") Joined [" + k + "]");
        if(user != null) {
//          session.sendAsync(msg);
            // Convert from one type of server config to the other and create connman now.
            // TODO THis connection manager won't receive updates during running.
        	userToStats.put(session, new Stats());
            ConnectionManager connMan = ConnectionManager.newInstance();
            for(ServerConfigDTO sc : serverConfigRepository.findAll()) {
            	connMan.addServer(sc.toDashySC());
            }
            userToEngine.put(session, new DashboardEngine(session, connMan, user));
            if(userToEngine.size() > maxActiveDashboardCount) {
            	maxActiveDashboardCount = userToEngine.size();
            }
            int auc = getActiveUserCount();
            if(auc > maxActiveUserCount) {
            	maxActiveUserCount = auc;
            }
        } else {
        	session.close();
        	session.clear();
        }
    }

    @OnMessage 
    public void onMessage(String k, String msg, WebSocketSession session) {
        log.fine(msg);
        DashboardEngine de = userToEngine.get(session);
		ObjectMapper objectMapper = new ObjectMapper();
    	boolean success = false;
		try {
			if(msg.startsWith("pong:")) {
				String args[] = msg.substring(5).split(",");
				Stats st = userToStats.get(session);
				if(args.length > 0 && st != null) {
					try {
						int pNum = Integer.parseInt(args[0]);
						st.setPong(pNum);
					} catch(NumberFormatException e) {
						log.warning("Problem interpreting pong message:" + msg);
					}
				}
				return; // Ignore - it's a reply to our ping.
			} else if(msg.startsWith("addq:") || msg.startsWith("subq:")) {
				Queryable q = objectMapper.readValue(msg.substring("subq:".length()), Queryable.class);
	        	success = msg.startsWith("add") ? de.queryEngine.add(q) : de.queryEngine.remove(q);
	        } else if(msg.startsWith("setk:")) {
	        	ArgEntry[] argEntries = objectMapper.readValue(msg.substring("setk:".length()), ArgEntry[].class);
        		de.queryEngine.putArgs(argsToMap(argEntries));
	        	success = true;
	        } else if(msg.startsWith("setdash:")) {
	        	String[] setdashArgs = msg.substring(8).split(",");
	        	try {
	        		if(setdashArgs.length >= 2) {
		        		int dashId = Integer.parseInt(setdashArgs[0]);
		        		int versionId = Integer.parseInt(setdashArgs[1]); 
		        		de.setDash(dashId, versionId);	
	        		}
	        	} catch(NumberFormatException nfe) {
	        		log.warning("Tried to " + msg + " but failed with NFE.");
	        	}
        	}
		} catch (JsonProcessingException e) {
			System.err.println(e.toString());
		}
    	session.sendAsync(msg + " success:" + (success ? "1" : "0"));
    }

	public static Map<String, ArgVal> argsToMap(ArgEntry[] argEntries) {
		Map<String,ArgVal> args = new HashMap<>();
		for(ArgEntry ae : argEntries) {
			ArgType at = ae.getArgType() != null && ae.getArgType().length()>0 ? ArgType.valueOf(ae.getArgType().toUpperCase()) : ArgType.STRINGS;
			if(ae.getArgVals() instanceof String[]) {
				args.put(ae.getArgKey(), new ArgVal((String[])ae.getArgVals(), at));
			} else if(ae.getArgVals() == null) {
				args.put(ae.getArgKey(), null);
			} else {
				log.severe("Unrecognised putArg:" + ae.getArgVals());
			}
		}
		return args;
	}

	@Data
	public static class ArgEntry {
		private String argKey;
		private String[] argVals;
		private String argType;
	}


	@OnClose 
    public void onClose(String k, WebSocketSession session) {
        log.info("[" + k + "] Disconnected.");
        userToStats.remove(session);
        DashboardEngine de = userToEngine.remove(session);
        if(de != null) {
        	de.shutDown();
        }
    }
    

    
    private static class DashboardEngine implements QueryEngineListener {
        final QueryEngine2 queryEngine;
		private final WebSocketSession session;
		@Getter private final String user;
		private ScheduledExecutorService scheduler;
		@Getter private int dashId;
		@Getter private int versionId;
        
        public DashboardEngine(@NonNull WebSocketSession session, ConnectionManager connectionManager, String user) {
			this.session = Preconditions.checkNotNull(session);
			this.user = Preconditions.checkNotNull(user);
			queryEngine = QueryEngine2.newQueryEngine(connectionManager, user);
			queryEngine.addListener(this);
			queryEngine.startUp();

			// Heartbeat every 15 seconds as for example CloudFlare timeouts every 100s - https://community.cloudflare.com/t/cloudflare-websocket-timeout/5865/2
			scheduler = Executors.newSingleThreadScheduledExecutor();
			Runnable r = () -> {
				Stats st = userToStats.get(session);
				int delay = st.getPing() - st.getPong();
				DashboardEngine dEng = userToEngine.get(session);
				
				// To prevent large memory built-up from slow subscribers, slow down or stop rate of querying and sending.
				if((30*60) < delay) { // 2*30*60 = 3600 seconds = 1 hour cutoff
					log.warning("Subscriber for " + session.getId() + " disconnected as too slow.");
					session.close();
					shutDown();
				} else if(4 < delay) { // 4*2 = 8 seconds delay = stop.
					queryEngine.setSendingRate(SendingRate.STOPPED);
					log.warning("Subscriber for " + dEng.user + " is being stopped from receiving updates.");
				} else if(2 < delay) { // 2*2 = 4 seconds delay = slow.
					queryEngine.setSendingRate(SendingRate.SLOW);
					log.warning("Subscriber for " + dEng.user + " seems to be a slow subscriber.");
				} else {
					queryEngine.setSendingRate(SendingRate.NORMAL);
				}
				
				session.sendAsync("ping:" + (st == null ? "?" : (""+st.incPing()))); 
			};
			scheduler.scheduleWithFixedDelay(r, 2, 2, TimeUnit.SECONDS);
		}

		public void setDash(int dashId, int versionId) {
			this.dashId = dashId;
			this.versionId = versionId;
		}

		private static String toJson(Queryable queryable) throws JsonProcessingException {
			ObjectMapper objectMapper = new ObjectMapper();
        	return objectMapper.writeValueAsString(queryable);
        }
        
		@Override public void tabChanged(Queryable queryable, ResultSet rs, boolean exceededMaxRows) {
	    	try {
				String qj = "{ \"queryable\":" + toJson(queryable);
				String rss = new ResultSetSerializer().toString(rs, exceededMaxRows);
				String r = qj + ", \"data\":" + rss + "}";
				session.sendAsync(r);
			} catch (IOException e) {
				queryError(queryable, e);
			}
		}
		
		@Override public void tabNeverChanged(Queryable queryable) {
			// Used to let client know that result was unchanged. Without it, the client may think it's stale.
    		session.sendAsync("nochange:" + queryable.getQuery());
		}
		
		@Override
		public void queryError(Queryable queryable, Exception e) {
	    	try {
				ObjectMapper objectMapper = new ObjectMapper();
	    		session.sendAsync(objectMapper.writeValueAsString(new QueryError(queryable, e.toString())));
			} catch (IOException convertError) {
				System.err.println(convertError.toString());
			}
		}

		@Data
		private static class QueryError {
			private final Queryable queryable;
			private final String error;
		}
		
		public void shutDown() {
			queryEngine.shutDown();
			scheduler.shutdown();
		}
    }
}