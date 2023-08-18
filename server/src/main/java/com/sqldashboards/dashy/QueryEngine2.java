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
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.sql.rowset.CachedRowSet;
import javax.sql.rowset.RowSetProvider;

import com.timestored.kdb.QueryResultI;

import io.micronaut.core.annotation.NonNull;
import com.kx.c.KException;
import com.sqldashboards.pro.KdbConnection;
import com.sqldashboards.pro.PivotResultSet;
import com.sqldashboards.shared.ConnectionManager;
import com.google.common.base.Preconditions;
import com.kx.c;
import kx.jdbc;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Forked Copy of sqlDashboards java versions QueryEngine. 
 * Copy-Pasted as needed to bring args inside engine to allow subscription updates.
 * Wasn't worth refactoring original.
 */
public class QueryEngine2 {

	private static final Logger LOG = Logger.getLogger(QueryEngine2.class.getName());

	private ScheduledExecutorService scheduler;
	private ExecutorService executor = Executors.newCachedThreadPool();
	private final List<QueryEngineListener> listeners = new CopyOnWriteArrayList<QueryEngineListener>();
	private final int milliseconds = 50;
	private int counter = 0;
	private ConnectionManager connMan;
	private final ConcurrentLinkedQueue<Queryable> priorityQueue = new ConcurrentLinkedQueue<Queryable>();
	private Collection<Queryable> queryables = new CopyOnWriteArrayList<Queryable>();
	private Map<Queryable,ResultSet> queryablesResultCache = new ConcurrentHashMap<>();
	private final QueryTranslator queryTranslator;
	private final Map<String, ArgVal> argMap = new ConcurrentHashMap<>();
	private final Map<HPQ, SubEngine> hpqToSub = new ConcurrentHashMap<>();

	private SendingRate sendingRate = SendingRate.NORMAL;
	
	public static enum SendingRate { NORMAL, SLOW, STOPPED }
	public static enum ArgType { STRING, STRINGS, NUMBER, DATE }
	
	@Data @AllArgsConstructor
	public static class ArgVal {
		private String[] strings;
		private @NonNull ArgType argType;
		
		public static ArgVal s(String s) { return new ArgVal(new String[] {s}, ArgType.STRING); };
		public static ArgVal l(String s) { return new ArgVal(new String[] {s}, ArgType.STRINGS); };
		public static ArgVal d(String s) { return new ArgVal(new String[] {s}, ArgType.DATE); };
		public static ArgVal n(int n) { return new ArgVal(new String[] {""+n}, ArgType.NUMBER); };
		public static ArgVal d(String s, String t) { return new ArgVal(new String[] {s, t}, ArgType.DATE); };
		public static ArgVal l(String s, String t) { return new ArgVal(new String[] {s, t}, ArgType.STRINGS); };
		public static ArgVal l(String s, String t, String u) { return new ArgVal(new String[] {s, t, u}, ArgType.STRINGS); };
	}
	
	
	public static QueryEngine2 newQueryEngine(ConnectionManager connMan, String user) {
		return new QueryEngine2(connMan, user);
	}
	
	private QueryEngine2(ConnectionManager connMan, String user) {
		this.connMan = connMan;
		argMap.put("user", ArgVal.s(user));
		this.queryTranslator = new QueryTranslator(argMap);
	}
	
	public void addToPriorityQueue(Collection<Queryable> qs) {
		priorityQueue.addAll(qs);
	}
	
	public void startUp() {
		scheduler = Executors.newSingleThreadScheduledExecutor();
		
		if(milliseconds != 0) {
			scheduler.scheduleWithFixedDelay(new Runnable() {
				
				@Override public void run() {
					if(sendingRate == SendingRate.STOPPED) {
						return;
					}
					try {
						// decide here which ones to use in case they change during run
						final ConnectionManager cm = connMan;
	
						Queryable w = null;
						while((w=priorityQueue.poll()) != null) {
							LOG.info("priorityQueueing " + w.getQuery().substring(0, Math.min(w.getQuery().length(), 55)) + "...");
							requery(w, cm);
						}
						
						counter++;
						if(counter % 2 == 0) {
							if(cm!=null && !cm.isEmpty()) {
								for(Queryable app : queryables) {
									// refresh period is in millis
									// this section gets ran every 100 millis
									// if modulus then run this time
									int refRate = app.getRefreshPeriod();
									int m = refRate/100;
									if(refRate!=-1) {
										if(sendingRate == SendingRate.NORMAL) {
											if(m == 0 || counter % (m*2) == 0) {
												requery(app, cm);		
											}
										} else if(sendingRate == SendingRate.SLOW) {
											if(counter % ((m+1)*2*5) == 0) {
												requery(app, cm);		
											}
										}
									}
								}
							}
						}
					} catch(Exception e) {
						LOG.log(Level.SEVERE, "big loopy scheduled problems", e);
					}
				}
			}, milliseconds, milliseconds, TimeUnit.MILLISECONDS);
		}
	}

	/**
	 * Listen for changes to the query/view/qtab/config.
	 */
	public static interface QueryEngineListener {
		
		/** 
		 * Called if the qtab and subsequently therefore the view changed
		 * @param qTab the {@link ResultSet} for the query if there is one, otherwise null.
		 */
		public void tabChanged(final Queryable queryable, final ResultSet qTab, boolean exceededMaxRows);

		/** 
		 * Called if data source was requeried but there was no change in result.
		 * @param qTab the {@link ResultSet} for the query if there is one, otherwise null.
		 */
		public void tabNeverChanged(final Queryable queryable);

		/**
		 * Called if there was an error while trying to retrieve resultset for that apps query
		 * @param queryable The query that caused a problem
		 * @param e The exception that caused the problem.
		 */
		public void queryError(final Queryable queryable, Exception e);

	}

	private void requery(Queryable w, ConnectionManager connMan) {
		// avoid querying for empty queries
		if(w.getQuery() == null || w.getQuery().length()<1 ||  w.getServerName()==null || connMan.isEmpty()) {
			return;
		}

		ServerConfig sc = getSCorThrow(connMan, w.getServerName());
		if(sc.isStreaming()) {
			return; // Can ignore as streaming ran elsewhere.
		}
		EngineResult engineResult = performQuery(w, connMan, queryTranslator);

		// notify listeners of success or error
		ResultSet crs = engineResult.getRs();
	    if(crs != null) {
	    	// Only notify listeners if there was an actual change.
	    	ResultSet prevRS = queryablesResultCache.get(w);
	    	if(!DBHelper.isEqual(prevRS, crs)) {
				queryablesResultCache.put(w, crs);
				for(QueryEngineListener l : listeners) {
					l.tabChanged(w, crs, engineResult.getQr().isExceededMax());
				}
	    	} else {
				for(QueryEngineListener l : listeners) {
					l.tabNeverChanged(w);
				}
	    	}
		} else {
			for(QueryEngineListener l : listeners) {
				Exception e = engineResult.getE();
				l.queryError(w, e == null ? new IOException("Query never returned a table.") : e);
			}
		}
	}

	private static ServerConfig getSCorThrow(ConnectionManager connMan, String srv) {
		if(srv == null) {
			throw new IllegalStateException("No Server Selected.");
		}
		ServerConfig sc = connMan.getServer(srv);
		if(sc == null) {
			throw new IllegalStateException("Could not find server:" + srv);
		}
		return sc;
	}

	public static EngineResult performQuery(Queryable w, ConnectionManager connMan, QueryTranslator queryTranslator) {
		final String qry = w.getQuery();
		EngineResult engineResult = new EngineResult(qry, null, null, null);
		// convert the query
	    String query = qry;
		
		ServerConfig sc = getSCorThrow(connMan, w.getServerName());
		try {
			LOG.finer("requery -> " + w.getServerName() + " : " + qry);
			TranslationResult tr = null;
			if(queryTranslator != null) {
				tr = queryTranslator.translate(qry, w.getServerCmd(), sc);
				if(tr.isOK()) {
					query = tr.getTranslation();
				} else {
					boolean anySubmits = tr.getUnfoundKeys().stream().anyMatch(s -> s.toLowerCase().startsWith("submit_"));
					if(anySubmits) {
						throw new IllegalStateException("Awaiting Submit.");
					}
					throw new IllegalStateException("Missing Required Arguments: "
							+ "\r\n" + tr.getUnfoundKeys().toString() 
							+ "\r\nQuery is:" + tr.getTranslation());					
				}
			}

			QueryResultI qr = connMan.query(sc, query);
			ResultSet rs = qr.getRs();
			if(tr != null && tr.getPivotlist().size() > 0 && !sc.isKDB()) {
				rs = new PivotResultSet(rs, tr.getGroupbylist(), tr.getPivotlist());
			}
			engineResult = new EngineResult(qry, qr, rs, null);
			if(qr.isExceededMax()) {
				LOG.severe("Result is large. RS for query: " + query);
			}
		} catch (Exception ee) {
			engineResult = new EngineResult(qry, null, null, ee);
			LOG.log(Level.WARNING, "app update error for query:" + qry);
		}
		return engineResult;
	}

	public void setConnectionManager(ConnectionManager connMan) {
		this.connMan = Objects.requireNonNull(connMan);
	}
	
	public void shutDown() {
		LOG.info("shutDown");
		if(scheduler != null) {
			scheduler.shutdown();
		}
		scheduler = null;
		listeners.clear();
		queryablesResultCache.clear();
		hpqToSub.forEach((hpq,subEng) -> subEng.requestStop());
		hpqToSub.clear();
		executor.shutdown();
		connMan.close();
	}

	public void setQueryables(Collection<Queryable> queryables) {
		hpqToSub.forEach((hpq,subEng) -> subEng.requestStop());
		hpqToSub.clear();
		this.queryables = new CopyOnWriteArrayList<>(Objects.requireNonNull(queryables));
		addToPriorityQueue(queryables);
		this.queryablesResultCache.clear();
		for(Queryable qble : queryables) {
			subscribeTo(qble);
		}
	}

	@Data
	private static class HPQ {
		final String host;
		final int post;
		final String query;
	}
	
	@AllArgsConstructor
	private class SubEngine implements Runnable {

		private KdbConnection kdbConn;
		private volatile boolean shutdownRequested = false;
		private final ServerConfig sc;
		private final Queryable qble;
		private final String query;

		public SubEngine(ServerConfig sc, Queryable qble, String query) {
			super();
			this.sc = sc;
			this.qble = qble;
			this.query = query;
		};
		
		private void sendFormatError(final Queryable queryable) {  
			for(QueryEngineListener l : listeners) {
				l.queryError(qble, new IllegalStateException("Data from subscription wasn't (`upd;`tablename;tbl) format."));
			}
		}
		
		@Override public void run() {
		    try {
		    	kdbConn = connMan.getKdbConnection(sc);
		    	kdbConn.send(query);
		    	while (!Thread.currentThread().isInterrupted() && !shutdownRequested) {
		    	    try {
		    	        Object r = kdbConn.k();
		    	        if (r != null) {
		    	        	if(!(r instanceof Object[])) { sendFormatError(qble); continue; }
		    	            Object[] data = (Object[]) r;
		    	        	if(data.length<3 || data[1] == null || data[2] == null || !(data[2] instanceof c.Flip)) { sendFormatError(qble); continue; }
//		    	            String tblname = (data[1]).toString();
		    	            c.Flip tbl = (c.Flip) data[2];
		    				ResultSet rs = new jdbc.rs(null, tbl, ConnectionManager.MAX_ROWS);
		    			    CachedRowSet crs = RowSetProvider.newFactory().createCachedRowSet();
		    			    crs.populate(rs);
		    			    boolean exceededMaxRows = DBHelper.getSize(crs) >= ConnectionManager.MAX_ROWS;
		    				for(QueryEngineListener l : listeners) {
		    					l.tabChanged(qble, crs, exceededMaxRows);
		    				}
		    	        }
		    	    } catch (SQLException | KException | RuntimeException e) {
	    				for(QueryEngineListener l : listeners) {
	    					l.queryError(qble, e);
	    				}
		    	    }
		    	}
		    } catch (IOException e) {
				if(!Thread.currentThread().isInterrupted() && !shutdownRequested) {
					e.printStackTrace();
				} else {
					LOG.info("shut Fine");
				}
			}
		    LOG.info("Shutting down subscriber for query:" + query);
		}
		
		void requestStop() {
			shutdownRequested = true;
			if(kdbConn != null) { try { kdbConn.close(); } catch (IOException e) { } kdbConn=null; }
		}
	}

	private void unsubscribeFrom(final Queryable qble) {
		final ServerConfig sc = connMan.getServer(qble.getServerName());
		if(sc == null || !sc.isStreaming()) {
			return; // can ignore
		}
		TranslationResult tr = queryTranslator.translate(qble.getQuery(), qble.getServerCmd(), sc);
		HPQ hpq = new HPQ(sc.getHost(), sc.getPort(), tr.getTranslation());
		SubEngine subEng = hpqToSub.remove(hpq);
		if(subEng != null) {
			subEng.requestStop();
		}
	}
	
	private void subscribeTo(final Queryable qble) {
		final ServerConfig sc = connMan.getServer(qble.getServerName());
		if(sc == null || !sc.isStreaming()) {
			return; // can ignore
		}
		TranslationResult tr = queryTranslator.translate(qble.getQuery(), qble.getServerCmd(), sc);
		if(!tr.isOK()) {
			throw new IllegalStateException("Missing Required Arguments: "
					+ "\r\n" + tr.getUnfoundKeys().toString() 
					+ "\r\nQuery is:" + tr.getTranslation());	
		}
		HPQ hpq = new HPQ(sc.getHost(), sc.getPort(), tr.getTranslation());
		SubEngine subEng = new SubEngine(sc, qble, tr.getTranslation());
		SubEngine existing = hpqToSub.putIfAbsent(hpq, subEng);
		if(existing == null) {
			executor.execute(subEng);	
		}
	}
	
	public void addListener(QueryEngineListener listener) {
		listeners.add(listener);
	}

	public void removeListener(QueryEngineListener listener) {
		listeners.remove(listener);
	}

	public void putArgs(Map<String,ArgVal> args) {
		Set<Queryable> qrs = new HashSet<>();
		for(Entry<String, ArgVal> entry : args.entrySet()) {
			ArgVal v = entry.getValue();
			String k = entry.getKey();

			if("user".equals(k)) {
				LOG.info("user arg is protected");
				continue;
			}
			
			LOG.info("setArg: " + v.getArgType() + ":" + k + "->" +  Arrays.toString(v.getStrings()));	// Queries with a submit ONLY get updated when the submit value changes.
			//IF the key is NOT a submit, and the query contains submit, we won't run it.
			boolean ignoreIfTheyHaveSubmit = !k.toLowerCase().startsWith("submit");
			qrs.addAll(QueryTranslator.filterByKeys(queryables, new HashSet<>(Arrays.asList(k)), ignoreIfTheyHaveSubmit));

			if(v.getStrings() == null) {
				argMap.remove(k);
			} else {
				argMap.put(k, v);
			}
		}
		// perform heavy operations at end of batch only
		qrs.forEach(q -> unsubscribeFrom(q));
		priorityQueue.addAll(qrs);
		qrs.forEach(q -> subscribeTo(q));	
	}
	
	public void putArg(String key, Object value, ArgType argType) {
		if(value instanceof String[]) {
			Map<String,ArgVal> args = new HashMap<>(1);
			args.put(key, new ArgVal((String[])value, argType));
			putArgs(args);
		} else {
			LOG.severe("Unrecognised putArg:" + value);
		}
	}

//	public void setArgMap(Map<String, Object> argMap2) {
//		this.argMap.clear();
//		this.argMap.putAll(argMap2);
//	}

	public boolean remove(Queryable q) {
		boolean removed = queryables.remove(q); // Remove from queryables first in case unsubscribe throws exception
		unsubscribeFrom(q);
		return removed;
	}

	public boolean add(Queryable q) {
		boolean added = queryables.add(q);
		addToPriorityQueue(Arrays.asList(q));
		subscribeTo(q);
		return added;
	}

	
	public void setSendingRate(SendingRate sendingRate) { this.sendingRate = Preconditions.checkNotNull(sendingRate); }

}
