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

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.Principal;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Optional;
import java.util.logging.Level;
import java.util.stream.Collectors;

import javax.activation.UnsupportedDataTypeException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.base.Joiner;
import com.sqldashboards.dashy.EngineResult;
import com.sqldashboards.dashy.QueryEngine2;
import com.sqldashboards.dashy.QueryEngine2.ArgVal;
import com.sqldashboards.dashy.QueryTranslator;
import com.sqldashboards.dashy.Queryable;
import com.sqldashboards.dashy.ServerConfig;
import com.sqldashboards.lic.PLicenser;
import com.sqldashboards.shared.JdbcTypes;
import com.sqldashboards.shared.MetaInfo;
import com.sqldashboards.shared.MetaInfo.ColumnInfo;
import com.sqldashboards.webby.WebSocketServer.ArgEntry;
import com.timestored.kdb.QueryResultI;

import io.micronaut.core.annotation.Introspected;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.core.io.ResourceResolver;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Consumes;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Error;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.http.server.types.files.StreamedFile;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import jakarta.inject.Inject;
import com.kx.c.Dict;
import com.kx.c.KException;

import lombok.Data;
import lombok.extern.java.Log;

@Secured(SecurityRule.IS_AUTHENTICATED)
@Controller
@Log
public class ConferenceController {

	@Inject
	ServerConfigRepository serverConfigRepository;

	@Data
	public static class QueryWithArgs {
		private String query;
		private String serverCmd;
		private ArgEntry[] argsArray;
	}

    @Post("/api/a.json/{server}")   @Consumes(MediaType.ALL)
    public String postQuery(HttpRequest<?> request, @Nullable @QueryValue String server, @Body String query, Principal principal) throws JsonProcessingException, IOException {
    	// If it's JSON, this allows more complicated query where Arguments are specified
		if(request.getContentType().isPresent() && request.getContentType().get().equals(MediaType.APPLICATION_JSON_TYPE)) {
			ObjectMapper objectMapper = new ObjectMapper();
			QueryWithArgs qa = objectMapper.readValue(query, QueryWithArgs.class);
			return querydb(server, qa.query, qa.serverCmd, principal, qa.argsArray);
		}
		// Else treat it as a plain text query
		return querydb(server, query, null, principal, null);

	}

	
//	@Post("/api/translate/{server}")
//    public String translate(@Nullable @QueryValue String server, @Body QueryWithArgs queryWithArgs, Principal principal) throws JsonProcessingException, IOException {
//		return translateQuery(server, queryWithArgs.query, principal, queryWithArgs.argsArray);
//	}

	@Get("/api/a.json")
    public String querydb(@Nullable @QueryValue String server, @QueryValue String query, @Nullable @QueryValue String serverCmd, Principal principal, @Nullable ArgEntry[] argsArray) throws JsonProcessingException, IOException {
		EngineResult er = query(server, query, principal, argsArray, serverCmd);
		return new ResultSetSerializer().toString(er);
	}

	private EngineResult query(String server, String query, Principal principal) {
		return query(server, query, principal, null, null);
	}

	private EngineResult query(String server, String query, Principal principal, ArgEntry[] argsArray, @Nullable String serverCmd) {
		return performQuery(server, query, principal, argsArray, serverCmd);
	}

	private EngineResult performQuery(String server, String query, Principal principal, ArgEntry[] argsArray, @Nullable String serverCmd) {
		// ALl queries from pulse should go through translator to get pre/post wrap and ((args)) converted.
    	Map<String, ArgVal> m = argsArray == null ? new HashMap<>() : WebSocketServer.argsToMap(argsArray);
		m.put("user", ArgVal.s(principal.getName()));
		QueryTranslator queryTranslator = new QueryTranslator(m);
		Queryable queryable = new Queryable(server, query, 0, serverCmd);
		DbServerController.installDriverIfDriverNotPresent(Application.APPNAME, Application.CONNMAN.getServer(server).getJdbcType());
		return QueryEngine2.performQuery(queryable, Application.CONNMAN, queryTranslator);
	}

	/**
	 * As suggested by here: https://stackoverflow.com/questions/63523069/micronaut-websocket-security
	 * We use a standard HTTP to return a key
	 * That key can then immediately be used to get a websocket
	 */
    @Get("/api/presubscribe")
    public HttpResponse<String> getPresubscribeKey(Principal principal) {
    	if(WebSocketServer.getActiveUserCount() >= PLicenser.getNumberUsers()) {
    		return HttpResponse.serverError("License: Your license only allows " + PLicenser.getNumberUsers() + " users.");
    	}
    	if(!PLicenser.isPro()) {
    		// In case someone hacks a way to hide everyone behind one user, we also limit the number of total active dashboards
        	if(WebSocketServer.getActiveDashboardCount() > (4*PLicenser.getNumberUsers())) {
        		return HttpResponse.serverError("Basic License: Pulse only allows 4 Active Dashboards per User.");
        	}
    	}
    	return HttpResponse.ok(WebSocketServer.requestKey(principal.getName()));
    }

    @Post("/api/a.csv/{server}")   @Consumes(MediaType.ALL)
    public String postCsvQuery(@Nullable @QueryValue String server, @Body String query, Principal principal) throws JsonProcessingException, IOException {
		try {
	    	QueryResultI qr = query(server, query, principal);
			return CsvConverter.getCSV(qr.getRs(), true, ",");
		} catch (SQLException e) {
			return e.getLocalizedMessage();
		}
    }
    
    @Get(value = "/api/a.csv", produces = "text/comma-separated-values")
    public String getCSV(@Nullable @QueryValue String server, @QueryValue String query, Principal principal) {
		QueryResultI qr = performQuery(server, query, principal, null, null);
		try {
			return CsvConverter.getCSV(qr.getRs(), true, ",");
		} catch (SQLException e) {
			return e.getLocalizedMessage();
		}
    }


	public static boolean runSQL(String sql) throws ClassNotFoundException, SQLException {
		PreparedStatement ps = null;
		Connection memConn = null;
		try {
			Class.forName("org.h2.Driver");
			String url = System.getProperty("DB_URL", "jdbc:h2:file:./pulsedb");
			memConn = DriverManager.getConnection(url, "sa", "");
			ps = memConn.prepareStatement(sql);
			ps.execute();
		} finally {
			if (ps != null) {
				ps.close();
			}
			if (memConn != null) {
				memConn.close();
			}
		}
		return true;
	}
	public static String backup(String filePath) throws ClassNotFoundException, SQLException {
		String fp = filePath;
		if (fp == null) {
			DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HHmmss");
			String dt = formatter.format(LocalDateTime.now());
			fp = "pulse-" + dt + ".zip";
		}
		runSQL("SCRIPT TO '" + fp + "' COMPRESSION ZIP");
		return fp;
	}

	@Get("/api/backup")
    @Secured(SecurityRule.IS_ANONYMOUS) @Produces(MediaType.TEXT_PLAIN)
	public HttpResponse<String> requestBackup(@Nullable @QueryValue String filepath) {
		try {
			return HttpResponse.ok(backup(filepath));
		} catch (ClassNotFoundException | SQLException e) {
			return HttpResponse.serverError(e.toString());
		}
	}

	@Get("/api/serverinfo")
	@Secured(SecurityRule.IS_ANONYMOUS)
	public Map<String, Object> getServerInfo() {
		Map<String, Object> m = new HashMap<>();
		m.put("version", Application.VERSION);
		m.put("license", PLicenser.getLicenseText());
		m.put("licensedUsers", PLicenser.getNumberUsers());
		m.put("licensePro", PLicenser.isPro());
		m.put("licenseDaysLeft", PLicenser.getDaysLicenseLeft());
		m.put("licenseUser", PLicenser.getLicenseUser());
		return m;
	}

    /**
     * The below is essential for React SPA - Single Page Application
     * i.e. forward all unknown addresses to index.html 
     */
    
    @Inject ResourceResolver resourceResolver;



    // Index fetching required as I want to rewrite config into HTML to allow runtime configuration.
    // Some of the config is where to contact the server in case of proxying so it can't be sent in a API call as
    // the config is needed to make API calls work.
	@Get("/") @Secured(SecurityRule.IS_ANONYMOUS) @Produces(MediaType.TEXT_HTML)
    public HttpResponse<String> getIndex() {   
		log.info("GET /");
		return HttpResponse.ok(getIndexHtml()); 
	}
	
	
    @Produces(MediaType.TEXT_HTML)
    @Error(status = HttpStatus.NOT_FOUND, global = true)  
    public HttpResponse forward(HttpRequest request) {
    	if(request.getMethodName().toUpperCase() == "GET") {
    		String path = request.getUri().getPath().substring(1);
    		log.info("GET " + path);
    		File f = new File(new File("./public"), path);
    		if(f.exists() && !f.isDirectory()) {
        		File curDir = new File(".");
        		try {
					if(!f.getCanonicalPath().startsWith(curDir.getCanonicalPath())) {
						log.warning("Can't access above current directory");
						return HttpResponse.notAllowed();
					}
				} catch (IOException e) {log.warning(e.getLocalizedMessage());}
        		try {
        			MediaType mt = MediaType.forFilename(f.getName());
					return HttpResponse.ok(new StreamedFile(new FileInputStream(f), mt));
				} catch (FileNotFoundException e) {
			        return HttpResponse.notFound();
				}
    		}
    	}
        if (request.getHeaders().accept().stream().anyMatch(mediaType -> mediaType.getName().contains(MediaType.TEXT_HTML))) {
            String html = getIndexHtml();
            if(html != null) {
            	return HttpResponse.ok(html);
            }
		}
		return HttpResponse.notFound();
	}

	private String getIndexHtml() {
		Optional<StreamedFile> f = resourceResolver.getResource("classpath:public/index.html").map(StreamedFile::new);
		String text = null;
		if (f.isPresent()) {
			InputStream inputStream = f.get().getInputStream();
			text = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8)).lines()
	    	    			.collect(Collectors.joining("\n"));
    	} else {
    		// index.html in public mostly used for debugging purposes.
    		File file = new File(new File("./public"), "index.html");
    		if(file.exists() && !file.isDirectory()) {
				try {
					byte[] encoded = Files.readAllBytes(file.toPath());
	    			 text = new String(encoded, StandardCharsets.UTF_8);
				} catch (IOException e) {}
    		}
    	}
    	if(text == null) {
    		log.severe("no index found");
    		return "no index found";
    	}
    	// Supplying config
    	String html = text;
    	String rootUsed = Application.CONFIG.getRoot_url();
    	if(rootUsed == null) {
    		rootUsed = "/";
    	} if(!rootUsed.endsWith("/")) {
    		rootUsed = rootUsed + "/";
    	}
		html = html.replace("<base href=\"/\"/>", "<base href=" + toS(rootUsed) + "/>");
		String newConfig = "{" + ("\"isDemo\":"+toS(Application.CONFIG.isDemo())) 
				+ ",\"isAuthProxy\":"+toS(Application.CONFIG.isAuth_proxy_enabled()) 
				+ ",\"version\":"+toS(Application.VERSION) 
				+ ",\"rootURL\":"+toS(rootUsed)
				+ "}";
		html = html.replace("window.pulseconfig={}", "window.pulseconfig=" + newConfig);

		// FOr when user loads page like /dash/1/blah - MUST be absolute link to css/js
		html = html.replace("./static/", rootUsed + "static/");
		html = html.replace("href=\"/favicon.ico\"", "href=\"" + rootUsed + "favicon.ico\"");
		html = html.replace("href=\"/style.css\"", "href=\"" + rootUsed + "style.css\"");
		
		
		
		log.fine("transformed to HTML:" + html);
    	
		return html;
    }
    private String toS(String s) { return s == null ? "\"\"" : "\"" + s.replaceAll("\"", "\\\"") + "\""; }
    private String toS(boolean s) { return s ? "true" : "false"; }

	private List<ServerEntity> serverTree = null;
	private int requestCount = 0;

	@Get("/api/servertree") @Produces(MediaType.APPLICATION_JSON)
	public List<ServerEntity> getServerTree() throws UnsupportedDataTypeException, IOException, KException {
		requestCount++;
		if (serverTree == null || requestCount % 40 == 0) {
			serverTree = getTree();
		}
		return serverTree;
	}

	private List<ServerEntity> getTree() throws IOException, KException, UnsupportedDataTypeException {
		Iterable<ServerConfigDTO> scs = serverConfigRepository.findAll();
		List<ServerEntity> r = new ArrayList<>();
		for (ServerConfigDTO sc : scs) {
			if (sc.getJdbcType().isKDB()) {
				try {
					QueryResultI qr = Application.CONNMAN.query(sc.getName(), GET_TREE_QUERY);
					for (ServerEntity s : getNSListing(sc.getName(), qr.getK())) {
						String ns = s.getNamespace();
						if(!(ns.equals(".q") || ns.equals(".h") || ns.equals(".j") || ns.equals(".h") || ns.equals(".Q") || ns.equals(".o"))) {
							r.add(s);
						}
					}
				} catch (RuntimeException | UnsupportedDataTypeException rte) {
					log.warning("Problem fetching ServerTree from " + sc.getName());
				}
			} else {
				r.addAll(getTree(sc.toDashySC()));
			}
		}
		return r;
	}
	
	private List<ServerEntity> getTree(ServerConfig sc) {
		List<ServerEntity> r = new ArrayList<>();
		try {
			MetaInfo mi = MetaInfo.getMetaInfo(Application.CONNMAN, sc);
			Map<String, List<ColumnInfo>> tblNameToCols = mi.getColumnInfo().stream().collect(Collectors.groupingBy(ci -> ci.getFullTableName()));
			for(Entry<String, List<ColumnInfo>> e : tblNameToCols.entrySet()) {
				List<String> cols = e.getValue().stream().map(ci -> ci.getColumnName()).collect(Collectors.toList());
				ColumnInfo c = e.getValue().get(0);
				String sel = MetaInfo.getTop100Query(sc.getJdbcType(), cols, c.getFullTableName(), true, false);
				String colNames = Joiner.on(',').join(cols);
		        r.add(new ServerEntity(sc.getName(), sc.getDatabase(), c.getNamespace(), 
		        		c.getTableName(), c.getFullTableName(), "table", "", sel, colNames));	
			}
		} catch (Exception e) {
			log.warning(e.getLocalizedMessage());
		}
		return r;
	}
	/**
	 * Query that returns a dictionary from 
	 * namespace->varNames->(type; count; isTable; isPartitioned; colnames/funcArgs; isView)
	 * ESSENTIAL it's exact same as qStudio as some places have custom logic handling to make it work.
	 */
	private static final String GET_TREE_QUERY = "/ qstudio - get server tree \r\n" +
			"{   nsl:\".\",/:string `,key `;    \r\n" +
			"    nsf:{[ns] \r\n        ff:{ [viewset; v; fullname; sname]\r\n" +
			"            findColArgs:{$[.Q.qt x; cols x; 100h~type x; (value x)1; `$()]};\r\n" +
			"            safeCount: {$[.Q.qp x; $[`pn in key `.Q; {$[count x;sum x;-1]} .Q.pn y; -1]; count x]};\r\n" +
			"            (@[type;v;0h]; .[safeCount;(v;fullname);-2]; @[.Q.qt;v;0b]; @[.Q.qp;v;0b]; @[findColArgs;v;()]; .[in;(sname;viewset);0b])};\r\n" +
			"        vws: system \"b \",ns;\r\n        n: asc key[`$ns] except `;\r\n" +
			"        fn: $[ns~enlist \".\"; n; ns,/:\".\",/:string n];\r\n" +
			"        n!.'[ ff[vws;;;]; flip ( @[`$ns; n]; fn; n)]};\r\n" +
			"    (`$nsl)!@[nsf;;()!()] each nsl}[]";

	private static List<ServerEntity> toElementListing(String serverName, String namespace, Dict tree) {

		String[] elementNames = (String[]) tree.x;
		Object[] detailsArray = (Object[]) tree.y;
		
		if(elementNames.length > 0) {
			List<ServerEntity> r = new ArrayList<ServerEntity>(elementNames.length);
			for(int i=0; i<elementNames.length; i++) {
				try {
					Object[] d = (Object[]) detailsArray[i];
					Short type = (d[0] instanceof Short) ? (Short) d[0] : 0;
					boolean isTable = (d[2] instanceof Boolean) ? (Boolean) d[2] : false;
					boolean partitioned = (d[3] instanceof Boolean) ? (Boolean) d[3] : false;
					String[] colNames = d[4] instanceof String[] ? (String[]) d[4] : null;
					boolean isView = (d[5] instanceof Boolean) ? (Boolean) d[5] : false;
					long count = d[1] instanceof Number ? ((Number) d[1]).longValue() : -1;
					
					ServerEntity sqe;
					String info = "" + count + "," + partitioned;
					String typ = (isTable || type == 98) ? "table" : type == 100 ? "function" : isView ? "view" : type == 99 ? "dictionary" : "other";
					String fullName = namespace.equals(".") ? elementNames[i] : namespace + "." + elementNames[i];
					String query = fullName;
					if(isTable) {
						query = partitioned ? ".Q.ind["+fullName+"; `long$til 100]" : "select[100] from "+fullName;
					}
					sqe = new ServerEntity(serverName, "", namespace, elementNames[i], fullName, typ, info, query, String.join(",",colNames));
					r.add(sqe);
				} catch(IllegalArgumentException iae) {
					String msg = "unrecognised ServerEntity: " + namespace + "." + elementNames[i];
					log.log(Level.WARNING, msg, iae);
				}
			}
			return r;
		}
		
		return Collections.emptyList();
	}	
	
	private List<ServerEntity> getNSListing(String serverName, Object treeQueryKdbObject)
			throws IOException, KException, UnsupportedDataTypeException {
		Object o = treeQueryKdbObject; 
		
		if(!(o instanceof Dict)) {
			throw new UnsupportedDataTypeException("Never received proper format reply from server.");
		}
		
		Dict tree = (Dict) o;
		String[] namespaces = (String[]) tree.x;
		Object[] nsList = (Object[]) tree.y;
		ArrayList<String> problemNSs = new ArrayList<>();
		List<ServerEntity> allElements = new ArrayList<>();

		for(int i=0; i<nsList.length; i++) {
			String ns = namespaces[i];
			if(nsList[i] instanceof Dict) {
				Dict nsTree = (Dict) nsList[i];
				allElements.addAll(toElementListing(serverName, ns, nsTree));
			} else {
				problemNSs.add(ns);
			}
		}
		
		if(!problemNSs.isEmpty()) {
			String msg = "Could not refresh the server tree namespaces:" + String.join(",",problemNSs);
			log.log(Level.SEVERE, msg);
		}
		return allElements;
	}


	@Data
	@Introspected
	public static class AIQueryDTO {
		private final String txt;
		private final String server;
	}


    @Get("/api/whoami")  @Produces(MediaType.TEXT_PLAIN) 
    public String whoami(Principal principal) {   return principal.getName(); }
	
	@Post("/api/txt2sql")
	public String text2sql(@Body AIQueryDTO aiQueryDTO) {
		
		// make API exact same as ChatGPT but without key and server adds initial SQL
		// setup text to force AI to be expert.
		try {
			String server = aiQueryDTO.server;
			String txt = aiQueryDTO.txt;
			// defaults as may not have tree or servername
			String tblInfo = "";
			JdbcTypes jdbcTyp = JdbcTypes.KDB;
			if (server != null && server.length() > 0) {
				ServerConfig sc = Application.CONNMAN.getServer(server);
				if (sc != null) {
					jdbcTyp = sc.getJdbcType();
				}
				List<ServerEntity> st = serverTree;
				if (st != null && st.size() > 0) {
					List<ServerEntity> tables = st.stream().filter(se -> se.getType().toLowerCase().equals("table"))
							.collect(Collectors.toList());
					tblInfo = tables.stream().map(se -> se.getQuery() + "\n" + se.getFullName() + " Columns: " + se.getColumns() + "\n")
							.collect(Collectors.joining());
				}
			}
			if(server.equals("DEMODB")) {
				// Extra info for the builtin table that will make generation even better.
				// Don't do for others as we don't want to send actual data to OpenAI remote server!
				tblInfo += DBDEMO_TABLES;
			}
			String s = AIFacade.queryOpenAI(jdbcTyp, tblInfo, txt);
			return s == null ? "FAIL" : s;
		} catch (IOException e) {
			log.warning(e.getLocalizedMessage());
			return "FAIL";
		}
	}

	private static class AIFacade {

		private static final String SQL_PREP = "You are an sql expert. Given an input question, step by step create a syntactically correct sql query to run.\r\n"
				+ "Unless the user specifies in the question a specific number of examples to obtain, query for at most 1000 results using the LIMIT clause as per SQL. You can order the results to return the most informative data in the database.\r\n"
				+ "Never query for all columns from a table. You must query only the columns that are needed to answer the question. Wrap each column name in double quotes (\") to denote them as delimited identifiers.\r\n"
				+ "Pay attention to use only the column names you can see in the tables below. Be careful to not query for columns that do not exist. Also, pay attention to which column is in which table.\r\n"
				+ "";
		private static final String SQL_Q1 = "Question: Select the first two rows from the trade table?";
		private static final String SQL_A1 = "Answer: SELECT * FROM trade LIMIT 2";
		private static final String SQL_Q2 = "Question: Select the most recent 20 minutes of 'NFLX' bid ask quotes?";
		private static final String SQL_A2 = "Answer: SELECT TIME,BID,ASK FROM quote WHERE NAME='NFLX' AND TIME>timestampadd(minute,-20,date_trunc('minute',CURRENT_TIMESTAMP())) ORDER BY TIME ASC;";
		private static final String SQL_Q3 = "Question: Find the number of trades for JPM grouped by week?";
		private static final String SQL_A3 = "Answer: select COUNT(*) as trade_count,DATE_TRUNC('week', time)  as ttime FROM trade WHERE symbol = 'JPM' GROUP BY ttime";

		private static final String KDB_PREP = "You are a kdb+ expert. Given an input question, step by step create a syntactically correct kdb query to run.\r\n"
				+ "Unless the user specifies in the question a specific number of examples to obtain, query for at most 5 results using take #. \r\n"
				+ "Pay attention to use only the column names you can see in the tables below. \r\n"
				+ "Be careful to not query for columns that do not exist. Also, pay attention to which column is in which table.\r\n"
				+ "'ORDER BY' does not work in kdb. LIMIT does not work in kdb. 'GROUP BY' does not work in kdb.\r\n"
				+ "\r\n" + "Only use the following tables:";

		private static final String KDB_Q1 = "Question: Select the first two rows from the trade table?";
		private static final String KDB_A1 = "Answer: select time,sym,status,quantity,destination,orderType,percent,pnl,price,name,avgPrice from trade where date=.z.d-1,i<2";
		private static final String KDB_Q2 = "Question: Find the number of trades for JPM grouped by week?";
		private static final String KDB_A2 = "Answer: select count i by 7 xbar `date$time from trade where sym=`JPM";
		private static final String KDB_Q3 = "Question: Find the price of 'NFLX' trades in 15 minute bars from trades?";
		private static final String KDB_A3 = "Answer: select count i by 15 xbar time.minute from trade where sym=`NFLX";

		private static final String getKDBMessages(String tblInfo, String question) {
			String tbls = tblInfo != null ? tblInfo : "";
			return "[{\"role\": \"user\", \"content\": \"" + KDB_PREP.replace("\n", "\\n").replace("\r", "\\r").replace("\"", "\\\"")
					+ tbls.replace("\n", "\\n").replace("\r", "\\r") + "\"}\r\n"
					+ ",{\"role\": \"user\", \"content\": \"" + KDB_Q1 + "\"}\r\n"
					+ ",{\"role\": \"assistant\", \"content\": \"" + KDB_A1 + "\"}\r\n"
					+ ",{\"role\": \"user\", \"content\": \"" + KDB_Q2 + "\"}\r\n"
					+ ",{\"role\": \"assistant\", \"content\": \"" + KDB_A2 + "\"}\r\n"
					+ ",{\"role\": \"user\", \"content\": \"" + KDB_Q3 + "\"}\r\n"
					+ ",{\"role\": \"assistant\", \"content\": \"" + KDB_A3 + "\"}\r\n"
					+ ",{\"role\": \"user\", \"content\": \"Question: "
					+ question.replace("\n", "\\n").replace("\r", "\\r") + "\"}\r\n"
					+ ",{\"role\": \"assistant\", \"content\": \"Answer: select \"}\r\n" + "]\r\n";
		}

		private static final String getSQLMessages(String tblInfo, String question) {
			String tbls = tblInfo != null ? tblInfo : "";
			return "[{\"role\": \"user\", \"content\": \"" + SQL_PREP.replace("\n", "\\n").replace("\r", "\\r").replace("\"", "\\\"")
					+ tbls.replace("\n", "\\n").replace("\r", "\\r") + "\"}\r\n"
					+ ",{\"role\": \"user\", \"content\": \"" + SQL_Q1 + "\"}\r\n"
					+ ",{\"role\": \"assistant\", \"content\": \"" + SQL_A1 + "\"}\r\n"
					+ ",{\"role\": \"user\", \"content\": \"" + SQL_Q2 + "\"}\r\n"
					+ ",{\"role\": \"assistant\", \"content\": \"" + SQL_A2 + "\"}\r\n"
					+ ",{\"role\": \"user\", \"content\": \"" + SQL_Q3 + "\"}\r\n"
					+ ",{\"role\": \"assistant\", \"content\": \"" + SQL_A3 + "\"}\r\n"
					+ ",{\"role\": \"user\", \"content\": \"Question: "
					+ question.replace("\n", "\\n").replace("\r", "\\r") + "\"}\r\n"
					+ ",{\"role\": \"assistant\", \"content\": \"Answer: select \"}\r\n" + "]\r\n";
		}

		public static String queryOpenAI(JdbcTypes jdbcType, String tblInfo, String question) throws IOException {
			// Below line is needed to make call work in bundled JRE
			// To test you must do full build and run with JRE.
			System.setProperty("https.protocols", "TLSv1.2");
			String msgs = jdbcType.isKDB() ? getKDBMessages(tblInfo, question) : getSQLMessages(tblInfo, question);
//			String msgs = getKDBMessages(tblInfo, question) ;
			final String jsonInputString = "{\r\n" + "\r\n" + "    \"model\": \"gpt-3.5-turbo\",\r\n" + "\r\n"
					+ "    \"messages\": " + msgs + "\r\n" + "  }";
			final String url = "https://api.openai.com/v1/chat/completions";
			HttpURLConnection urlConnection = (HttpURLConnection) ((new URL(url).openConnection()));
			urlConnection.setDoOutput(true);
			urlConnection.setRequestProperty("Authorization",
					"Bearer " + "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");
			urlConnection.setRequestProperty("Accept", "application/json");
			urlConnection.setRequestProperty("Content-Type", "application/json");
			urlConnection.setRequestMethod("POST");
			urlConnection.setConnectTimeout(15000);
			urlConnection.setReadTimeout(15000);
			try (OutputStream os = urlConnection.getOutputStream()) {
				System.out.println(jsonInputString);
				byte[] input = jsonInputString.getBytes("utf-8");
				os.write(input, 0, input.length);
			}
			if (urlConnection.getResponseCode() == HttpURLConnection.HTTP_OK) { // success
				StringBuffer response = new StringBuffer();
				try (BufferedReader in = new BufferedReader(new InputStreamReader(urlConnection.getInputStream()))) {
					String inputLine;
					while ((inputLine = in.readLine()) != null) {
						response.append(inputLine).append("\n");
					}
				}
				return response.toString();
			}
			return "{\"error\":" + urlConnection.getResponseCode() + ", \"errmsg\":\"" + urlConnection.getResponseMessage().replace('\"', '\'')+ "\"}";
		}
	}

	private static final String DBDEMO_TABLES = "\r\n" + "```\r\n" + "SELECT * FROM fxhist LIMIT 3;\r\n"
			+ "time                          mid      sym   \r\n"
			+ "---------------------------------------------\r\n"
			+ "2023.05.26D07:58:00.000000000 0.994005 USDCHF\r\n"
			+ "2023.05.26D07:59:00.000000000 0.993012 USDCHF\r\n"
			+ "2023.05.26D08:00:00.000000000 0.997    USDCHF\r\n" + "\r\n" + "SELECT * FROM fxposition LIMIT 3;\r\n"
			+ "COUNTRY CURRENCY PAIR   CODE   RATE      HIST              MV           time        \r\n"
			+ "------------------------------------------------------------------------------------\r\n"
			+ "IN      INR      USDINR 0.xXXx 81.29286  6 8 1 2 0 2 8 0 2 -0.003641846 12:46:17.159\r\n"
			+ "RU      RUB      USDRUB 0.XXx  10.31629  0 1 1 9 1 5 9 4 4 0.008829492  12:46:17.059\r\n"
			+ "CH      CHF      USDCHF 0.xxXX 0.1350524 3 3 9 4 6 0 5 3 0 -0.004332216 12:46:16.959\r\n" + "\r\n"
			+ "select * from trade LIMIT 3;\r\n"
			+ "time         sym  status           quantity destination orderType percent pnl      price    name           avgPrice\r\n"
			+ "-------------------------------------------------------------------------------------------------------------------\r\n"
			+ "12:45:00.907 JPM  Pending          9581     LSE         TWAP      20      718.5719 152.8401 JPMorgan Chase 154.2131\r\n"
			+ "12:45:00.099 DOCU Partially Filled 35344    NASDAQ      VWAP      90      2650.765 231.0023 Docusign       231.157 \r\n"
			+ "12:45:00.071 FB   New              88       LSE         Iceberg   0       6.60066  304.6491 Facebook       304.4901\r\n"
			+ "\r\n" + "```\r\n";	
}