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
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;

import org.h2.tools.Server;

import com.sqldashboards.shared.JdbcTypes;

import lombok.extern.java.Log;

/**
 * Populates trade/quote with fake data of certain size.
 */
@Log
public class DbDemo implements AutoCloseable {
	private final ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor();
	private final Connection tcpConn;
	private final Connection memConn;
	private final Server server;
	private final JdbcTypes jdbcType;
	public static final int PORT = 8999;
	public static final int OPEN_ORDERS = 30;
	public static int orderId = 1;

	private final static String[] STRAT_VARIANTS = { "Stealth-NonStop", "Stealth-Slow"  };

	public static void main(String[] args) throws Exception {
		if (args.length > 0) {
			String jdbcURL = args[0];
			String u = args.length > 1 ? args[1] : "";
			String p = args.length > 2 ? args[2] : "";
			new DbDemo(jdbcURL, u, p);
		} else {
			new DbDemo(PORT, "jimmy1");
		}
//    	dbDemo.close();
	}

	public void stop() {
		executor.shutdown();
		if (memConn != null) {
    		try { memConn.close(); } catch (SQLException e) { }
			}
		if (tcpConn != null) {
    		try { tcpConn.close(); } catch (SQLException e) { }
			}
		if (server != null) {
			server.stop();
		}
		log.info("stopped DbDemo");
	}

	@Override public void close() throws Exception { stop(); }

	public static ResultSet query(Connection conn, String sql) throws SQLException {
		return conn.createStatement().executeQuery(sql);
	}

	/** Connect to existing JDBC instance and run demo code */
    public DbDemo(String jdbcUrl, String username, String password) throws SQLException, ClassNotFoundException, IOException, InterruptedException {
		tcpConn = DriverManager.getConnection(jdbcUrl, username, password);
		String url = jdbcUrl.toLowerCase();
	    this.jdbcType = url.startsWith("jdbc:h2:") ? JdbcTypes.H2 : url.startsWith("jdbc:mysql:") ? JdbcTypes.MYSQL : null;
		runDEMO();
		server = null;
		memConn = null;
	}

	/** Start H2 Demo database on selected port with username:sa, password */
    public DbDemo(final int port, final String password) throws SQLException, ClassNotFoundException, IOException, InterruptedException {
		Class.forName("org.h2.Driver");
		memConn = DriverManager.getConnection("jdbc:h2:mem:db1", "sa", "");
		Thread.sleep(2000);
		server = Server.createTcpServer("-tcp", "-tcpAllowOthers", "-tcpPort", "" + port, "-baseDir", ".").start();
//	    tcpConn = DriverManager.getConnection("jdbc:h2:tcp://localhost:" + port + "/mem:db1", "sa", "");
		tcpConn = memConn;
		this.jdbcType = JdbcTypes.H2;
		run("ALTER USER sa SET PASSWORD '" + password + "'");
		run("CREATE ALIAS EXECUTE FOR \"com.sqldashboards.pro.DbDemo.query\";");
		runDEMO();
	}

	private void runDEMO() throws SQLException {
		log.info("Connection Established: "+ tcpConn.getMetaData().getDatabaseProductName() + "/" + tcpConn.getCatalog());
		createQuoteTable();
		createTradeTable();
		insertTAQ(null);
		insertQuotes(null);

		LocalDateTime start = LocalDateTime.now().minus(60, ChronoUnit.SECONDS);
		List<String> allStratVariants = Arrays.asList(STRAT_VARIANTS);
		for (int sec = 0; sec < 60; sec++) {
			LocalDateTime t = start.plus(sec, ChronoUnit.SECONDS);
			String tim = t.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME);
			insertQuotes(tim);
			insertTrades(tim, allStratVariants);
		}

	}

	private static List<String> getStrats(List<String> stratVariants) {
		List<String> strats = new ArrayList<>();
		for (String sv : stratVariants) {
			String strat = sv.split("-")[0];
			if (!strats.contains(strat)) {
				strats.add(strat);
			}
		}
		return strats;
	}

	private void createQuoteTable() throws SQLException {
    	String createTbl = "DROP TABLE IF EXISTS quote;\r\n" + 
    			"CREATE MEMORY TABLE IF NOT EXISTS quote (time TIMESTAMP, `name` VARCHAR(6),  `bid` DOUBLE, `ask` DOUBLE);\r\n";
		for (int i = 0; i < STOCKS.length; i++) {
    		createTbl += "INSERT INTO quote VALUES (CURRENT_TIMESTAMP(), '" + STOCKS[i] + "'," + BID[i] + "," + ASK[i] + ");\r\n";
		}
		run(createTbl);
	}

	private final String[] FXPAIRS = { "USD/CAD", "EUR/JPY", "EUR/USD", "EUR/CHF", "USD/CHF", "EUR/GBP", "GBP/USD" };
	private final double[] PNL = { 0, 0, 0, 0, 0, 0, 0 };
	private double taq_bid = 100.0;
	private int taq_count = 0;

	private void insertTAQ(String optionalTimestamp) throws SQLException {
		final String ts = optionalTimestamp == null ? "CURRENT_TIMESTAMP()" : "'" + optionalTimestamp + "'";
		StringBuilder sb = new StringBuilder();
    	// ( time ,bid , ask , buy , `buy_quantity` , sell , `sell_quantity` , hedger_buy , hedger_buy_quantity, hedger_sell, hedger_sell_quantity);";
		for (int i = 0; i < 1; i++) {
			taq_bid *= (1 + 0.01 * (r(16) - 8) / 8.0);
			double b = taq_bid;
			double a = b + b * 0.01 * r(100) / 100.0;
			sb.append("INSERT INTO `taq` VALUES (" + ts + ", " + b + "," + a
					+ (r(200) <= 192 ? ",null,null" : "," + ((b - b * 0.05 * r(99) / 99.0) + "," + (10 + r(500)))) // buy
					+ (r(200) <= 192 ? ",null,null" : "," + ((a + a * 0.05 * r(99) / 99.0) + "," + (10 + r(500)))) // sell
    				+ (r(400)<=397 ? ",null,null" : "," + ((b-b*0.02*r(99)/99.0) + "," + (10+r(2000)))) // hedger buy 
    				+ (r(400)<=397 ? ",null,null" : "," + ((a+a*0.02*r(99)/99.0) + "," + (10+r(2000)))) // hedger sell
					+ ");\r\n");
		}
		if (r(10000) > 9998 || taq_count > 2000) {
			run("DELETE FROM TAQ;"); // Trim it every so often to prevent too much data.
			taq_count = 0;
			taq_bid = 100.0;
		}
		run(sb.toString());
		taq_count++;
	}

    private static final String[] STOCK_NAME = { "Okta","Twilio", "Trade Desk", "Docusign", "Netflix", "Google", "Amazon", 
    		"Tesla", "Apple", "Alibaba", "Berkshire Hathaway", "JPMorgan Chase", "Johnson & Johnson", "Facebook", "Microsoft"};
    private static final String[] STOCKS = { "OKTA","TWLO", "TTD", "DOCU", "NFLX", "GOOG", "AMZN", "TSLA", "AAPL", "BABA", "BRK.A", "JPM", "JNJ", "FB", "MSFT"};
    private static final double[] BID =  { 269.98, 385.24, 718.86, 231.93, 546.54, 2297.76, 399.44, 739.78, 134.16, 235.6, 409250., 153.3, 162.24, 306.18, 260.74  };
    private static final double[] ASK =  { 269.98, 385.24, 718.86, 231.93, 546.54, 2297.76, 399.44, 739.78, 134.16, 235.6, 409250., 153.3, 162.24, 306.18, 260.74  };

	private void insertQuotes(String optionalTimestamp) throws SQLException {
		final String ts = optionalTimestamp == null ? "CURRENT_TIMESTAMP()" : "'" + optionalTimestamp + "'";
		StringBuilder sb = new StringBuilder();
		for (int i = 0; i < STOCKS.length; i++) {
			if (r(9) > 5) {
				BID[i] = walk(BID[i]);
				ASK[i] = BID[i] + (BID[i] * r(150) / 1000.0);
    			sb.append("INSERT INTO quote VALUES (" + ts + ", '" + STOCKS[i] + "'," + BID[i] + "," + ASK[i] + ");\r\n");
			}
		}
		if (r(100) > 97) {
			run("DELETE FROM quote WHERE TIME <timestampadd(minute,-60,CURRENT_TIMESTAMP());"); // Trim it every so often to prevent too much data.
		}
		run(sb.toString());
	}

	private void createTradeTable() throws SQLException {
    	String sql = "DROP TABLE IF EXISTS trade;\r\n" + 
    			"CREATE TABLE IF NOT EXISTS trade ( time TIMESTAMP, `status` VARCHAR(50), `symbol` VARCHAR(50), `Instrument Name` VARCHAR(255), `Quantity` INT, `Destination` VARCHAR(50), `OrderType` VARCHAR(50), `Price` DOUBLE, `Rem Qty` INT, `Filled Qty` INT, `Percent Done` DOUBLE, `Avg Px` DOUBLE, `UPnL` DOUBLE, `Client` VARCHAR(50));\r\n" + 
    			"";
		run(sql);
	}
	
    private void insertTrades(String optionalTimestamp, List<String> stratVariants) throws SQLException {
		final String ts = optionalTimestamp == null ? "CURRENT_TIMESTAMP()" : "'" + optionalTimestamp + "'";
    	String[] stat = {"Pending", "Partially Filled", "Partially Cancelled", "Filled", "Ready", "Pending Cancel", "New"};
		String[] dest = { "NASDAQ", "LSE" };
    	String[] client = {"I-MAB","Amerco","AXT","8x8","F5","Inpixon","9F","LianBio","NN","2U","XP","Alvotech","Arrivals","CSP","DZS","Ericsson","IAC","IMV","MDJM","NICE","Bank OZK","PTC","TPG","TORM plc","TSR","Xos","111","AAON","Abcam plc","Alvotechs","Angi","argenx SE","AYRO","BTCS","CEVA","Cohu","CVRx","Dave","eBay","EBET","Ebix","EQRx","Etsy","EVgo","Evotec SE","Gaia","Gevo","Gogo","iCAD","ICON plcs","iSun","LHC Group","AEye","Lyft","MICT","Mogo","NWTN","Okta","AMMO","Roku","Root","Saia","Seer","SNDL","SRAX","TowneBank","Travelzoo","Usio","VersaBank","Veru","View","XPEL","JOYY","Apple","Adobe","Adeia","Ainos","Air T","Akili","Alico","Amgen","ANSYS","Agora","ARKO Corp.","Avnet","Aware","Braze","CADIZ","Clene","CONX Corp.","Cowen","Curis","Crocs","Cyngn","DocGo","Eargo","Edgio","89bio","Five9","Flex Ltd.","Funko","First Bank","Canoo","GoPro","HEXO Corp.","IMARA","Inogen","ioneer","iQIYI","Itron","JOANN","Largo","LIZHI","Latch","Minim","Monro","Merus N.V.","MMTec","nCino","Nogin","Novan","NuZee","Nova Ltd.","NexGel","Nyxoah SAs","ObsEva SAs","OP Bancorp","OpGen","PCTEL","PetIQ","Pluri","ePlus","Qorvo","Reeds","Ryvyl","Slam Corp.","Snail","Sanofi ADS","Sonos","SeqLL","Tio Tech A","Tesla","Udemy","Upexi","Valneva SE","Vimeo","Vroom","Vaxart","XWELL","Zynex","Airbnb","Aditxt","Agenus","Allot Ltd.","Amyris","Arhaus","authID","Auddia","Axogen","Azenta","Atreca","BayCom Corp","Beam Global","Biogen","BioVie","Bumble","Bank7 Corp.","Biote Corp.","Baozun","Canaan","Can B Corp.","CareDx","ClimateRock","Calyxt","Conns","Cepton","Cricut","Criteo S.A.","Cutera","CohBar","CYREN Ltd.","Docebo","Daseke","DexCom","Eltek Ltd.","Evolus","Erasca","Fanhua","Fiserv","Fluent","Forian","JFrog Ltd.","Gogoro","GENFIT S.A.","GitLab","Hasbro","Helbiz","Imunon","IN8bio","Intapp","Intuit","iPower","Iteris","JD.com","Akerna Corp","Kforce","nLIGHT","LifeMD","Lilium N.V.","LENSAR","Mattel","Movano","Marpai","Nocera","Nasdaq","Nkarta","Inotiv","NetApp","Natera","Nayax Ltd.","OmniAb","Oblong","Ocugen","OMNIQ Corp.","Ontrak","PAVmed","PACCAR","PCB Bancorp","PepGen","PFSweb","Impinj","Peraso","Qualys","RBB Bancorp","R1 RCM","RadNet","Rambus","Rapid7","Rumble","Sunrun","Seagen","Splunk","Savara","TaskUs","Tucows","Upwork","Vacasa","Vertex","voxeljet AG","Volcon","ViaSat","VirTra","Exagen","Xencor","Zenvia","ZimVie","Zentek","Zumiez","ABIOMED","AC Immune SA","Arcellx","Adagene","Affimed N.V.","Afya Limited","Arteris","Airgain","Akanda Corp.","Alector","Allakos","AlloVir","Amedisys","Amesite","Annexon","Aptinyx","Aravive","Ardelyx","Arvinas","Aterian","Anterix","Athenex","Avinger","AVROBIO","Axonics","BioAtla","Blucora","BeiGene","Biocept","Biolase","Popular","CalAmp Corp.","Camtek Ltd.","Chain Bridge","Codexis","Certara","Cemtrex","CareMax","Cerence","CorVel Corp.","Cuentas","DatChat","Dropbox","Datadog","Datasea","eHealth","Energem Corp","Evogene Ltds","Farmmi Inc.","Femasys","FibroGen","GAN Limiteds","Gogoro Inc.","Galapagos NV","Galecto","Genprex","Genasys","Grifols S.A.","Groupon","Gyrodyne LLC","Hibbett","Hologic","Hawkins","HyreCar","IBEX Limited","T Stamp","InflaRx N.V.","Immunic","Inhibrx","Incyte Corp.","InMode Ltd.","Identiv","Intevac","Invivyd","Kubient","Akerna Corp.","Kaltura","Kamada Ltd.","KnowBe4","Li Auto","Limoneira Co","CarLotz","LiveOne","MongoDB","Medigus","MDxHealth SA","Magnite","MorphoSys AG","Marqeta","Moderna","MaxCyte","My Size","Neonode","Nephros","Netflix","NextNav","Novanta","NetEase","NETGEAR","Nutanix","Novavax","Neovasc","Oncorus","OneSpan","Otonomy","Paltalk","Paysign","Paychex","Vaxcyte","Pro-Dex","PepsiCo","Progyny","Kidpik Corp.","Premier","Plexus Corp.","Radcom Ltd.","RxSight","SI-BONE","Sientra","Silicom Ltds","Shineco","SkyWest","SunOpta","StoneCo","Tricida","ThredUp","Gentherm","Tiptree","Trimble","TrueCar","trivago N.V.","Trevena","Vivakor","ViewRay","Viatris","Workday","WalkMe Ltd.","SCWorx Corp.","Exicure","Xometry","Zscaler","Accolade","Aclarion","Autodesk","AudioEye","Alkermes plcs","Anghami Inc.","Apexigen","AppFolio","Athersys","AtriCure","Augmedix","Broadcom","AvePoint","Biodesix","Bel Fuse","Bilibili","Allbirds","Bitfarms","BuzzFeed","Celcuity","Chimerix","Colicity","CorMedix","CureVac N.V.","Crexendo","CryoPort","DermTech","DocuSign","Duolingo","EDAP TMS S.A.","EuroDry Ltd. ","Embecta Corp.","Energem Corps","Entegris","Exelixis","Exponent","Eyenovia","First Bancorp","Freshpet","Forza X1","Fortinet","Arcimoto","Golar Lng","GoHealth","Alphabet","Harmonic","HilleVax","Histogen","Humacyte","Icosavax","Illumina","Immunome","Immatics N.V.","Innodata","Inseego Corp.","Innoviva","Innospec","KemPharm","Leslies","LivaNova PLCs","Lipocine","Momentus","Nano Labs","NeoVolta","NuVasive","Nuvalent","Nuwellis","NextPlat Corp","NextCure","Outbrain","OceanPal","Opera Limited","OptiNose","Precigen","Phunware","Peak Bio","Poshmark","Proterra","PubMatic","PolyPid Ltd.","uniQure N.V.","Radware Ltd.","Renalytix plc","RenovoRx","comScore","374Water","SCYNEXIS","Synopsys","Surrozen","Stagwell","Semantix","Sunworks","Synlogic","Symbotic","TELA Bio","Teradyne","Transcat","TROOPS Inc.s ","Cryptyde","Vaccitech plc","Vaccinex","Veracyte","VEON Ltd. ADS","Veritone","Vericity","VerifyMe","VeriSign","Verastem","Vitru Limited","WD-40 Company","Wingstop","Wix.com Ltd.","WesBanco","TeraWulf","Woodward","XBiotech","Ameris Bancorp","AFC Gamma","AstroNova","Altimmune","Amplitude","AMERISAFE","Bandwidth","Couchbase","BioCardia","Heartbeam","Baidu Inc. ADS","BlackLine","bleuacacia","Blackbaud","BioLineRx","Belite Bio","Backblaze","Biomerica","Sierra Bancorp","BT Brands","Bioventus","BrainsWay","Broadwind","CarGurus","Chain Bridge I","Confluent","Conformis","Compugen Ltd.","Check-Cap","Cinedigm Corp.","Cingulate","Cellectis S.A.","CME Group","Centogene N.V.","Coherent Corp.","DLocal Limited","Codex DNA","Draganfly","DAVIDsTEA","Equillium","EverQuote","Exscientia Plc","Expensify","FFBW Inc. (MD)","FTC Solar","Frontdoor","Fuel Tech","Genmab A/S ADS","GSI Technology","HashiCorp","Humanigen","High Tide","Hour Loop","Hub Group","Hyperfine","ImmunoGen","Intrusion","iSpecimen","Karooooo Ltd.","Locafy Limited","LGI Homes","LogicMark","Lantronix","MGE Energy","Medicinova","ModivCare","CareCloud","Metacrine","Materialise NV","MaxLinear","MYR Group","Northeast Bank","NexImmune","NeoGames S.A.","Neuropace","InspireMD","Nutriband","Opthea Limited","Orgenesis","Oatly Group AB","Pinduoduo","Wag! Group Co.","Preferred Bank","ShiftPixy","Plumas Bancorp","Powered Brands","PRA Group","Precipio","Pulmatrix","PaxMedica","Qutoutiao","REGENXBIO","Signature Bank","Sesen Bio","SG Blocks","Sharecare","SomaLogic","SenesTech","Soligenix","SOBR Safe","SciSparc Ltd.","Surmodics","Semantix Inc.","SurgePays","Talkspace","Taoping Inc.s ","Interface","TOP Ships","Trupanion","urban-gro","Urban One","UTime Limiteds","Vaxxinity","Vyant Bio","Waldencast plc","Worksport","Xunlei Limited","Expion360","Alset Inc. (TX)","AlerisLife","Ambarella Inc.","Amazon.com","AnaptysBio","Sphere 3D Corp.","APA Corporation","AppHarvest","AudioCodes","Applied UV","AstraZeneca PLC","Brightcove","bleuacacia ltds","DMC Global","Biotricity","Baudax Bio","Cardlytics","CDW Corporation","Celularity","Clearfield","CleanSpark","CSX Corporation","Cantaloupe","Daktronics","DraftKings","Amdocs Limiteds","Entera Bio","Everbridge","FAT Brands","FG Merger Corp.","FinWise Bancorp","Five Below","Finward Bancorp","Fox Corporation","Freshworks","FS Bancorp","StealthGas","GlucoTrack","Ferroglobe PLCs","Cue Health","HomeStreet","HV Bancorp","Ichor Holdingss","Ideanomics","Immutep Limited","Immuron Limited","Immunovant","Intercure Ltd.","INmune Bio","IO Biotech","IF Bancorp","IVERIC bio","The Joint Corp.","KLA Corporation","Kronos Bio","LDH Growth Corp","Lands End","Littelfuse","Longeveron","LKQ Corporation","LivePerson","J. W. Mays","MediWound Ltd.","MEI Pharma","MarketWise","Maris-Tech","Matterport","Nanobiotix S.A.","Netcapital","NantHealth","NerdWallet","NVE Corporation","NV5 Global","Omega Flex","OPAL Fuels","PacWest Bancorp","Pharvaris N.V.","Photronics","PLBY Group","Plug Power","PLx Pharma","Powered Brandss","Perficient","PriceSmart","Personalis","PolarityTE","Portillos","PowerFleet","Paycor HCM","QuinStreet","Royal Gold","Satellogic","ScanSource","Sono Group N.V.","Stitch Fix","SPAR Group","Slam Corp. Unit","SLM Corporation","SilverSPAC","Smart Sand","Stericycle","SSR Mining","Sumo Logic","Save Foods","The Bancorp","TuanChe Limited","Bio-Techne Corp","Transphorm","Instil Bio","Tetra Tech","TechTarget","U.S. Gold Corp.","Value Line","VNET Group","VSE Corporation","Waldencast plc ","WaveDancer","Beyond Air","Zhongchao Inc.","Ziff Davis","Zai Lab Limited","Adicet Bio","ACNB Corporation","Akumin Inc. (DE)","Amryt Pharma plc","Aqua Metals","ABRI SPAC I","Aspen Group","Biofrontera","BGC Partners","Beyond Meat","CompoSecure","Copart Inc. (DE)","Crown Crafts","Yunhong CTI","Citi Trends","1stdibs.com","Dollar Tree","ECB Bancorp","electroCore","Entera Bio Ltd.","ESSA Pharma","Fastenal Company","FlexShopper","First Solar","FVCBankcorp","Gen Digital","Green Giant","GH Research PLCs","TD Holdings","GeoVax Labs","Muscle Maker","GSE Systems","Harte-Hanks","ImmunityBio","ICU Medical","iHeartMedia","Inter & Co.","Ideal Power","JanOne Inc. (NV)","Koss Corporation","Knightscope","LatAmGrowth SPAC","Lucid Group","LCNB Corporation","aTyr Pharma","LumiraDx Limited","LINKBANCORP","Lottery.com","908 Devices","Mustang Bio","MiMedx Group","MacroGenics","McGrath RentCorp","MillerKnoll","monday.com Ltd.","Hello Group","Morningstar","Mid Penn Bancorp","Match Group","Maris-Tech Ltd.","MicroVision","PLAYSTUDIOS","NBT Bancorp","NeoGenomics","Niu Technologies","NI Holdings","NeuroMetrix","News Corporation","OPKO Health","Paramount Global","Passage Bio","Pegasystems","Polar Power","Pool Corporation","Porch Group","PainReform Ltd.","ProKidney Corp.","Partners Bancorp","Pixelworks","Qumu Corporation","Red Violet","Ross Stores","Rover Group","Rail Vision","Satellogic Inc.","Schrodinger","Vivid Seats","Sidus Space","Silo Pharma","Solid Power","Sohu.com Limited","ShotSpotter","S&T Bancorp","Neuronetics","Taboola.com","TriCo Bancshares","Yoshitsu Co.","T-Mobile US","LendingTree","TripAdvisor","Ulta Beauty","Uniti Group","Uxin Limited ADS","Vital Farms","Weyco Group","Xcel Energy","Xcel Brands","XOMA Corporation","Absci Corporation","ACM Research","ACV Auctions","Aehr Test Systems","AgileThought","AdaptHealth Corp.","AMC Networks","Aemetis Inc. (DE)","ASP Isotopes","Astra Space","bluebird bio","Benefitfocus","Bit Digital Inc.","Casa Systems","Cambridge Bancorp","Cerus Corporation","CFSB Bancorp","Cirrus Logic","CoStar Group","Caesarstone Ltd.","Digital Ally","DHB Capital Corp.","Krispy Kreme","Domo Inc. Class B","DarioHealth Corp.","Leonardo DRS","Daxor Corporation","Energy Focus","eGain Corporation","Equinix Inc. REIT","ESSA Bancorp","EverCommerce","Evoke Pharma","EVO Payments","FLJ Group Limited","FNCB Bancorp","FingerMotion","Fonar Corporation","Fossil Group","FRP Holdings","Five Star Bancorp","Geron Corporation","Gamida Cell Ltd.","Gossamer Bio","Green Plains","Graphite Bio","GT Biopharma","Home Bancorp","Hope Bancorp","Hempacco Co.","HealthEquity","Henry Schein","Heska Corporation","HealthStream","Hyzon Motors","ICC Holdings","InterDigital","Intellicheck","IES Holdings","Infobird Co. Ltds","i3 Verticals","IM Cannabis Corp.","Intel Corporation","Iron Spark I","Jeffs Brands","Jiayin Group","Kopin Corporation","LatAmGrowth SPACs","LDH Growth Corp I","Lumos Pharma","Merchants Bancorp","Malibu Boats","MercadoLibre","Mesoblast Limited","Missfresh Limited","MIND C.T.I. Ltd.","Mobilicom Limited","Moxian (BVI) Incs","MSP Recovery","NanoVibronix","Noodles & Company","NMI Holdings","NSTS Bancorp","Nutex Health","NovoCure Limiteds","Nuvei Corporation","Omega Alpha SPACs","Palisade Bio","TDH Holdings","Pono Capital Corp","CarParts.com","QCR Holdings","360 DigiTech","Quotient Limiteds","Rocky Brands","The RealReal","RealNetworks","Sabre Corporation","ScION Tech Growth","SecureWorks Corp.","SHF Holdings","Stryve Foods","StoneX Group","Synaptogenix","SoundHound AI","Sovos Brands","SPS Commerce"};
		int n = r(4);
		StringBuilder sb = new StringBuilder();
		// Prevent exception that would occur fetching from empty list
		List<String> strats = stratVariants.size() > 0 ? getStrats(stratVariants) : getStrats(Arrays.asList(STRAT_VARIANTS));
		for (int i = 0; i < n; i++) {
			int si = r(STOCK_NAME.length) - 1;
			double price = round(BID[si] - (r(50) / 100.0), 2);
			double percent = r(10) / 10.0;
			sb.append("INSERT INTO trade VALUES (" + ts + ", '" + rand(stat));
			sb.append("','" + STOCKS[si] + "','" + STOCK_NAME[si] + "',");
			sb.append(r(50000) + ",'" + rand(dest) + "','" + rand(strats));
			sb.append("'," + price + ",25000,25000," + percent + "," + price + ",3249.99,'" + rand(client) + "');\r\n");
		}
		run(sb.toString());
		if (r(1000) > 997) {
			run("DELETE FROM trade WHERE TIME < timestampadd(minute,-60,CURRENT_TIMESTAMP());"); // Trim it every so often to prevent too much data.
		}
	}

	private boolean run(String sql) throws SQLException {
		log.finest(sql);
		return tcpConn.createStatement().execute(sql);
	}

	private final Random r = new Random();
	private int r(int maxVal) {
		return 1 + r.nextInt(maxVal);
	}

	public static double round(double value, int places) {
        if (places < 0) throw new IllegalArgumentException();

		BigDecimal bd = BigDecimal.valueOf(value);
		bd = bd.setScale(places, RoundingMode.HALF_UP);
		return bd.doubleValue();
	}

	private double walk(double d) {
		double v = r.nextFloat() - 0.5;
		return d + (0.0001 + 0.05 * d * v);
	}

	private <T> T rand(T[] array) {
		return array[r.nextInt(array.length)];
	}

	private <T> T rand(List<T> l) {
		return l.get(r.nextInt(l.size()));
	}

}
