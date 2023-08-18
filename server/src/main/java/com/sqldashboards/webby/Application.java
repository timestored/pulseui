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

import java.io.File;
import java.io.IOException;
import java.net.InetAddress;
import java.net.URL;
import java.net.URLEncoder;
import java.net.UnknownHostException;
import java.nio.file.Files;
import java.nio.file.Paths;

import org.fusesource.jansi.AnsiConsole;
import org.slf4j.LoggerFactory;

import com.sqldashboards.lic.PLicenser;
import com.sqldashboards.pro.DashDemos;
import com.sqldashboards.pro.DbDemo;
import com.sqldashboards.pro.KdbHelper;
import com.sqldashboards.shared.ConnectionManager;
import com.sqldashboards.shared.JdbcTypes;

import ch.qos.logback.classic.LoggerContext;

import java.sql.SQLException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Optional;
import java.util.Random;
import java.util.Scanner;
import java.util.TimeZone;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import io.micronaut.context.event.ApplicationEventListener;
import io.micronaut.runtime.Micronaut;
import io.micronaut.runtime.server.event.ServerStartupEvent;
import jakarta.inject.Inject;
import kx.jdbc;
import lombok.extern.java.Log;
import uk.org.webcompere.lightweightconfig.ConfigLoader;

//import static org.fusesource.jansi.Ansi.*;
//import static org.fusesource.jansi.Ansi.Color.*;

@Log
public class Application  {

	private static final java.util.logging.Logger LOG = java.util.logging.Logger.getLogger(Application.class.getName());
	public static Configuration CONFIG;
	static {
		forceConfigReload();
	}

	/** Careful this controls the folder where libs/jars are stored **/
	public static final String APPNAME = "pulse"; 
	public static final String VERSION = "1.50";
	public static final String DBNAME = "DEMODB";
	public static final String PASSWORD = "jimmy1";
    // Declaring ANSI_RESET so that we can reset the color
    public static final String RESET = "\u001B[0m";
  
    // Declaring the color
    // Custom declaration
    public static final String ANSI_YELLOW = "\u001B[33m"; 
    public static final String BLUE = "\u001b[36m"; 
    public static final String GREEN = "\u001b[32m"; 
    public static final String BUILTIN_LICENSE = "H4sIAAAAAAAAAGNgYNAz0GESSSw/tOXmVY3j1x8wHlr6r24+57Odckwi/J/uZZj1FsQ99zB4JSR6ejX33scTjQyMjHUNzHQNjWvATEMDIK/GLcjVtabGuCagNKc4FQCg4xDkVQAAAA==";


	/*
	 * Initially I was always fetching ServerConns from the database and it was the golden source.
	 * BUT to allow connection pooling I needed ConnectionMnager created somewhere and kept alive.
	 * Application seems most sensible for now.
	 * All server connection edits MUST
	 * 	1. Update the database
	 *  2. AND update connectionManager.
	 * Else things will get weird and break.
	 */
    public static ConnectionManager CONNMAN = ConnectionManager.newInstance();

	public static final String LOGO =  "\n"
			+ BLUE + " $$$$$$$\\            $$\\                      " + RESET + "\n"
			+ BLUE + " $$  __$$\\           $$ |                     " + RESET + "\n"
			+ BLUE + " $$ |  $$ |$$\\   $$\\ $$ | $$$$$$$\\  $$$$$$\\   " + RESET + "\n"
			+ BLUE + " $$$$$$$  |$$ |  $$ |$$ |$$  _____|$$  __$$\\  " + RESET + "\n"
			+ BLUE + " $$  ____/ $$ |  $$ |$$ |\\$$$$$$\\  $$$$$$$$ | " + RESET + "\n"
			+ BLUE + " $$ |      $$ |  $$ |$$ | \\____$$\\ $$   ____| " + RESET + "\n"
			+ BLUE + " $$ |      \\$$$$$$  |$$ |$$$$$$$  |\\$$$$$$$\\  " + RESET + "\n"
			+ BLUE + " \\__|       \\______/ \\__|\\_______/  \\_______| " + RESET + "\n"
			+ "\n"   
			+ ""
			+ RESET; 

	public static final String LOGO2 =  "\n"
			+ BLUE + "                         ##                                               \r\n"
			+ BLUE + "                     ##########                                           \r\n"
			+ BLUE + "                    ############                                          \r\n"
			+ BLUE + "                   (((###########                                         \r\n"
			+ BLUE + "                 ,(((((((#########                                        \r\n"
			+ BLUE + "                ((((((((((((#******                                       \r\n"
			+ BLUE + "               (((((((((((((********,                                     \r\n"
			+ BLUE + "              ///(((((((((***********/                                    \r\n"
			+ BLUE + "             ///////((((( ********/////                (((((((((########  \r\n"
			+ BLUE + "            ///////////(   .**//////////             /((((((((((((########\r\n"
			+ BLUE + "           ////////////      ////////////           //(((((((((((((((#####\r\n"
			+ BLUE + "  ,*********//////////        ////////////         //////(((((((((((((((# \r\n"
			+ BLUE + " **************//////          ////////////       //////////((            \r\n"
			+ BLUE + "********************            ////////((((/    ////////////             \r\n"
			+ BLUE + " *****************               ////(((((((((  **//////////              \r\n"
			+ BLUE + "     ........*.                   *((((((((((((*******/////               \r\n"
			+ BLUE + "                                    ((((((((((((*********/                \r\n"
			+ BLUE + "                                     ((((((((((((********                 \r\n"
			+ BLUE + "                                      ((((((((#####(***.                  \r\n"
			+ BLUE + "                                       ((((###########                    \r\n"
			+ BLUE + "                                        #############                     \r\n"
			+ BLUE + "                                         (##########                      \r\n"
			+ BLUE + "                                           #######                        \r\n"
			+ BLUE + "" + RESET + "\n"
			+ "\n"   
			+ ""
			+ RESET; 
	 
	public static String getPortEnding() {
		int port = 8080; // must be same as application.yml
		if(System.getenv("SERVER_PORT") != null) {
			port = Integer.parseInt(System.getenv("SERVER_PORT"));
		}
		return  (port == 80 ? "" : ":" + port);
	}
	
	static Configuration forceConfigReload() { 
		CONFIG = ConfigLoader.loadYmlConfigFromResource("config.yml", Configuration.class);
		return CONFIG; 
	}

	public Application(String[] args) throws SQLException, ClassNotFoundException {
		
		jdbc.setToStringer(s -> KdbHelper.asLine(s));
		setPulseDBPath();

		
		System.out.print(".");
		AnsiConsole.systemInstall();
		System.out.print(".");
		
		System.out.print(".");
		// StartupException occurs here if port in use but no nice way to catch it.
		Micronaut.build(args).banner(false).start();
		System.out.print(".");
		System.out.println(new Random().nextInt(4) == 2 ? LOGO2 : LOGO);
		if(!checkLicense()) {
			System.exit(-1);
		}
		
		String host = "localhost";
		try {
			host = InetAddress.getLocalHost().getHostName();
		} catch (UnknownHostException e) { }
		String url = "http://" + host + getPortEnding();
		System.out.println("Pulse " + VERSION + ":  " + url);
		if(CONFIG.getRoot_url() != null) {
			url = CONFIG.getRoot_url();
			System.out.println("External URL :  " + CONFIG.getRoot_url());
		}
		
		log.info("Config:");
		log.info(CONFIG.toString());
		
		try {
		    String osName = System.getProperty("os.name");
		    
		    boolean isRyan = false;
		    try {
//		    	isRyan = InetAddress.getLocalHost().getHostName().equalsIgnoreCase("ryan-box-1");
		    } catch(Exception re) {}
		    
			if (!isRyan && (osName.startsWith("Mac OS") || osName.startsWith("Windows"))) {
				showDocument(url + "/dash");
			}
		// Catches needed to allow server headless JREs to run.
		} catch(Error e) {}
		 catch(Exception e) {}
	}

	private static final String[][] commands = new String[][]{
        {"xdg-open", "$1"},
        {"gio", "open", "$1"},
        {"gvfs-open", "$1"},
        {"gnome-open", "$1"},  // Gnome
        {"mate-open", "$1"},  // Mate
        {"exo-open", "$1"},  // Xfce
        {"enlightenment_open", "$1"},  // Enlightenment
        {"gdbus", "call", "--session", "--dest", "org.freedesktop.portal.Desktop",
            "--object-path", "/org/freedesktop/portal/desktop",
            "--method", "org.freedesktop.portal.OpenURI.OpenURI",
            "", "$1", "{}"},  // Flatpak
        {"open", "$1"},  // Mac OS fallback
        {"rundll32", "url.dll,FileProtocolHandler", "$1"},  // Windows fallback
};

	public static void showDocument(final String uri) {
	    String osName = System.getProperty("os.name");
	    try {
	        if (osName.startsWith("Mac OS")) {
	            Runtime.getRuntime().exec(new String[]{"open", uri});
	        } else if (osName.startsWith("Windows")) {
	            Runtime.getRuntime().exec(new String[]{"rundll32", "url.dll,FileProtocolHandler", uri});
	        } else { //assume Unix or Linux
	            new Thread(() -> {
	                try {
	                    for (String[] browser : commands) {
	                        try {
	                            String[] command = new String[browser.length];
	                            for (int i = 0; i < browser.length; i++)
	                                if (browser[i].equals("$1"))
	                                    command[i] = uri;
	                                else
	                                    command[i] = browser[i];
	                            if (Runtime.getRuntime().exec(command).waitFor() == 0)
	                                return;
	                        } catch (IOException ignored) {
	                        }
	                    }
	                    String browsers = System.getenv("BROWSER") == null ? "x-www-browser:firefox:iceweasel:seamonkey:mozilla:" +
	                            "epiphany:konqueror:chromium:chromium-browser:google-chrome:" +
	                            "www-browser:links2:elinks:links:lynx:w3m" : System.getenv("BROWSER");
	                    for (String browser : browsers.split(":")) {
	                        try {
	                            Runtime.getRuntime().exec(new String[]{browser, uri});
	                            return;
	                        } catch (IOException ignored) {
	                        }
	                    }
	                } catch (Exception ignored) {
	                }
	            }).start();
	        }
	    } catch (Exception e) {
	        // should not happen
	        // dump stack for debug purpose
	        e.printStackTrace();
	    }
	}	
	
	/**
	 * @return Null if no writable path found ELSE the path to where pulse database is saved
	 */
	public static String setPulseDBPath() {
		// Do NOT use program folder as
		// If user runs Pulse right after installer -> it will have permisson to write there
		// But when the user later runs from start menu, it won't so data will be "lost"
		boolean isWin = System.getProperty("os.name").toLowerCase().contains("win");
		boolean isProbablyInstalled = new java.io.File(".").getAbsolutePath().toLowerCase().contains("program files");
		boolean isWritable = Files.isWritable(Paths.get(""));
		String pulsePath = "./";
		if(!isWritable || (isProbablyInstalled && isWin)) {
			pulsePath = System.getProperty("user.home") + File.separator + "pulse"+ File.separator;
			try {
				new File(pulsePath).mkdirs();
			} catch(NullPointerException npe) {
				pulsePath = null;
			}
		}
		
		// take that path and use it to set DB if possible
		if(pulsePath != null) {
			System.setProperty("DB_URL", "jdbc:h2:file:" + pulsePath + "pulsedb");	
			LOG.info("Database path: " + pulsePath + "pulsedb");
		} else { 
			LOG.severe("Can't write to database path. Running in-memory only."); 
			System.setProperty("DB_URL", "jdbc:h2:mem:pulsedb;LOCK_TIMEOUT=10000;DB_CLOSE_ON_EXIT=FALSE");	
		}
		
		return pulsePath;
	}

	private boolean checkLicense() {
		PLicenser.setSignedLicense(BUILTIN_LICENSE);
		if(CONFIG.getLicense_text() != null && CONFIG.getLicense_text().trim().length()>1) {
			PLicenser.setSignedLicense(CONFIG.getLicense_text().trim());
		}
		System.out.println(PLicenser.getLicenseText());
		if(!PLicenser.isPermissioned()) {
			System.err.println("License has expired. Please register or download new version from https://www.timestored.com/pulse NOW.");
			return false;
		} else if(PLicenser.getDaysLicenseLeft() < 14) {
			System.err.println("WARNING License expires in " + PLicenser.getDaysLicenseLeft() + " days. Please register https://www.timestored.com/pulse/register NOW.");
		}
		return true;
	}
	
	public static void main(String[] args) throws SQLException, ClassNotFoundException {
		System.out.print(".");
		List<String> argst = Arrays.asList(args);
		if(argst.indexOf("-vv") != -1) {
			setLevel(java.util.logging.Level.FINEST);
		    System.setProperty(org.slf4j.impl.SimpleLogger.DEFAULT_LOG_LEVEL_KEY, "TRACE");
			setMicronautLogLevel(ch.qos.logback.classic.Level.DEBUG);
		} else if(argst.indexOf("-v") == -1) { // If -v not specified turn OFF most logging
			setLevel(java.util.logging.Level.WARNING);
			setMicronautLogLevel(ch.qos.logback.classic.Level.OFF);	
		    System.setProperty(org.slf4j.impl.SimpleLogger.DEFAULT_LOG_LEVEL_KEY, "ERROR");			
		}
		
	    Thread.setDefaultUncaughtExceptionHandler(new UEHandler());
	    // Turning this off as not used by anyone that I know of 
	    // and raises ugly server warning when Pulse first runs.
	    // The new automatic download and run code should be used to load drivers anyway.
//		try {
//			PluginLoader.loadPlugins(APPNAME);
//		} catch(Throwable ucve) {
//			LOG.severe("Could not load a plugin due to " + ucve.getLocalizedMessage());
//		}
		
		new Application(args);
	}


	private static void setLevel(java.util.logging.Level targetLevel) {
		// Java Util
		java.util.logging.Logger root = java.util.logging.Logger.getLogger("");
	    root.setLevel(targetLevel);
	    for (java.util.logging.Handler handler : root.getHandlers()) {
	        handler.setLevel(targetLevel);
	    }
	}
	
	private static boolean setMicronautLogLevel(ch.qos.logback.classic.Level level) {
		Object o = LoggerFactory.getILoggerFactory();
		if(o instanceof LoggerContext) {
		    LoggerContext loggerContext = (LoggerContext) o;
		    ch.qos.logback.classic.Logger logger = loggerContext.getLogger("ROOT");
		    if (logger != null) {
		        logger.setLevel(level);
		        return true;
		    }
		}
	    return false;
	}

}


@Log
class UEHandler implements Thread.UncaughtExceptionHandler {
    public void uncaughtException(Thread t, Throwable e) {
        log.info("Unhandled exception caught!" + e.getLocalizedMessage());
    }
}


@Log
class DataLoader implements ApplicationEventListener<ServerStartupEvent> {
	@Inject ServerConfigRepository serverConfigRepository;
	@Inject UserRepository userRepository;
	@Inject DashboardRepository dashboardRepository;
	@Override public void onApplicationEvent(ServerStartupEvent event) {
        
        if(Application.CONFIG.isDemo()) {
        	addDemoUsersAndDashboards();
        }

        // THis MUST be ran after addDemo to ensure that any demo serverconfig exists
		String ctypes = "";
        for(ServerConfigDTO sc : serverConfigRepository.findAll()) {
        	Application.CONNMAN.addServer(sc.toDashySC());
        }		

        if(Application.CONFIG.isDemo_rundb()) {
    		System.out.print(".");
    	    Executors.newSingleThreadScheduledExecutor().execute(() -> {
    		    try {
    				DbDemo dbDemo = new DbDemo(DbDemo.PORT, Application.PASSWORD);
    			} catch (ClassNotFoundException | SQLException | IOException | InterruptedException e) {
    				log.warning("Couldn't start DbDemo:" + e.getLocalizedMessage());
    			}
    	    });
        }
		System.out.print(".");

		try {
			final String ct = ctypes != null ? ctypes : "";
			new Thread(() -> { 
				checkVersionAndMsgOrForce(ct);
			}).start();
		} catch(Exception e) {}
		ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
		scheduler.scheduleWithFixedDelay(() -> { try { getVersion("&rg=daily"); } catch (IOException e) {  }}, 1, 1, TimeUnit.DAYS);
		System.out.print(".");
	}

	private void addDemoUsersAndDashboards() {
		ServerConfigDTO demoSC = new ServerConfigDTO("localhost", DbDemo.PORT, "sa", Application.PASSWORD, Application.DBNAME, JdbcTypes.H2, "mem:db1");
		Optional<ServerConfigDTO> existingDemoSc = serverConfigRepository.findByName(Application.DBNAME);
		if(existingDemoSc.isPresent()) {
			if(existingDemoSc.get().getPort() != DbDemo.PORT) { // we changed port from 9000->8999 as clickhouse/questdb is 9000
				serverConfigRepository.delete(existingDemoSc.get());
				serverConfigRepository.save(demoSC);
			}
		} else {
			serverConfigRepository.save(demoSC);
		}
		
		System.out.print(".");
		if(!userRepository.findAll().iterator().hasNext()) {
			final PasswordAuthentication pauth = new PasswordAuthentication();
			userRepository.save(new User("admin", null, pauth.hash("pass"), true));
			userRepository.save(new User("ryan", null, pauth.hash("pass"), false));
			userRepository.save(new User("guest", null, pauth.hash("pass"), false));
		}
		System.out.print(".");
		if(!dashboardRepository.findAll().iterator().hasNext()) {
			List<Dashboard> demos = DashDemos.getAllH2Demos();
			if(demos.size()>0) {
				dashboardRepository.saveAll(DashDemos.getAllH2Demos());
			}
		}
	}

	private String[] getVersion(String params) throws IOException {
		StringBuilder sb = new StringBuilder("https://www.timestored.com/pulse/version.txt?v=" + Application.VERSION);
		// Add params
		try {
			Map<String, Long> ctypesMap = new HashMap<>();
			String ctypes = "";
			for(ServerConfigDTO sc : serverConfigRepository.findAll()) {
				String key = sc.getJdbcType().name().toLowerCase().substring(0, 1);
				ctypesMap.compute(key, (k,v) -> v == null ? 0 : v+1);
			}
			for(Entry<String,Long> enn : ctypesMap.entrySet()) {
				ctypes += (""+enn.getKey() + enn.getValue()); // some people have hundreds of servers
			}
			sb.append("&c=" + ctypes);
		} catch(Exception e) {}
		
		try {
			sb.append("&d=" + dashboardRepository.findAllWithoutData().size());
			// OS, ConnTypes, ChartsDrawn?, QueriesRan?
			sb.append("&os=" + getPropAsParam("os.name"));
			sb.append("&ctry=" + getPropAsParam("user.country"));
			sb.append("&lang=" + getPropAsParam("user.language"));
			sb.append("&vmn=" + getPropAsParam("java.vm.name"));
			sb.append("&vmv=" + getPropAsParam("java.vm.vendor"));
			sb.append("&tz=" + URLEncoder.encode(TimeZone.getDefault().getID()));
		} catch(Exception e) {}

		try {
			sb.append("&ad=" + WebSocketServer.getActiveDashboardCount());
			sb.append("&au=" + WebSocketServer.getActiveUserCount());
			sb.append("&adm=" + WebSocketServer.getMaxActiveDashboardCount());
			sb.append("&aum=" + WebSocketServer.getMaxActiveUserCount());
		} catch(Exception e) {}
		try {
		} catch(Exception e) {}
		sb.append(params);
		
		String url = sb.toString();
		try(Scanner sc = new java.util.Scanner(new URL(url).openStream(), "UTF-8")) {
			String[] versionTxt = sc.useDelimiter("\\A").next().split(",");
			return versionTxt;
		}
	}

	private static String getPropAsParam(String name) {
		String s = System.getProperty(name);
		return s == null ? "" : URLEncoder.encode(s);
	}


    private static String hash32(final String k) {
    	int h = 7;
    	for(char c : k.toCharArray()) {
    		// mod to wipe out a lot of resolution to anonymise
    		h = ((h*31)+((int)c))%32000;
    	}
		return Integer.toHexString(h & 0xffff);
    }

	private void checkVersionAndMsgOrForce(String ctypes) {
		String VERSION = Application.VERSION;
		// check for new version
		String url = "https://www.timestored.com/pulse/version.txt?v=" + VERSION + "&c=" + ctypes;
		try {
			// In case of error e.g. website outage or blocked, always show msg but ONLY forceUpgrade if website says so.
			boolean showMsg = true;
			boolean forceUpgrade = false;
			String vs = "?";
			try {
				String[] versionTxt = getVersion("&rg=startup"); 
				vs = versionTxt[0];
				showMsg = !VERSION.equals(vs);
				try {
					double vers = Double.parseDouble(vs);
					double cur = Double.parseDouble(VERSION);
					showMsg = cur < vers; // Allows releasing newer version then later changing .txt to recommend updating old
				} catch(NumberFormatException e) {
					//log.warning("Error parsing versions");
					// currently will error
				}
				forceUpgrade = versionTxt.length > 1 && versionTxt[1].equalsIgnoreCase("FORCE");
			} catch(RuntimeException e) {
				// any problems then showMsg but dont force
			}
			if(showMsg) {
				System.out.println("Pulse version: " + vs + " is now available at https://www.timestored.com/pulse/download");
				if(forceUpgrade) {
					System.err.println("You MUST now upgrade as a new version is available at timestored.com");
					System.exit(0);
				}
			}
		}  catch (IOException e) {}
	}	
}