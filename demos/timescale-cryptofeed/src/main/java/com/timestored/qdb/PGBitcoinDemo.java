package com.timestored.qdb;

import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Random;
import java.util.logging.Level;

import org.knowm.xchange.currency.CurrencyPair;
import org.knowm.xchange.dto.marketdata.OrderBook;
import org.knowm.xchange.dto.marketdata.Trade;
import org.knowm.xchange.dto.trade.LimitOrder;
import org.knowm.xchange.instrument.Instrument;
import org.knowm.xchange.service.marketdata.MarketDataService;

import info.bitrich.xchangestream.bitfinex.BitfinexStreamingExchange;
import info.bitrich.xchangestream.bitstamp.v2.BitstampStreamingExchange;
import info.bitrich.xchangestream.core.StreamingExchange;
import info.bitrich.xchangestream.core.StreamingExchangeFactory;
import info.bitrich.xchangestream.kraken.KrakenStreamingExchange;
import info.bitrich.xchangestream.okex.OkexStreamingExchange;
import io.reactivex.disposables.Disposable;
import lombok.Data;
import lombok.NonNull;
import lombok.extern.java.Log;

/**
 * Example of creating Postgres Database with trade/orders table for market data
 * and populating it with crypto data. 
 */
@Log public class PGBitcoinDemo {
	
    private static final String URL = "jdbc:postgresql://odrlt9p4il.j26c6ws540.tsdb.cloud.timescale.com:31319/tsdb?sslmode=require";
    private static final String USER = "tsdbadmin";
    private static final String PASSWORD = "wfs87w1k6fa0yrs9";
    
	private static final long TIMEWINDOW = 1000; // 1000 millis = 1 second
	private static final List<CurrencyPair> PAIRS = new ArrayList<>();
	static {
		PAIRS.add( CurrencyPair.BTC_USD);PAIRS.add( CurrencyPair.ETH_USD); 
		PAIRS.add(CurrencyPair.XRP_USD);PAIRS.add( CurrencyPair.ADA_USD);PAIRS.add( CurrencyPair.DOGE_USD);PAIRS.add( CurrencyPair.ETH_BTC);PAIRS.add( CurrencyPair.ETC_USD);PAIRS.add( CurrencyPair.XMR_USD); 
		PAIRS.add(CurrencyPair.LINK_USD);PAIRS.add( CurrencyPair.BCH_USD);PAIRS.add( CurrencyPair.LTC_USD);PAIRS.add( CurrencyPair.TRX_USDT);PAIRS.add( CurrencyPair.ATOM_USD);
		PAIRS.add(CurrencyPair.XLM_USD);PAIRS.add( CurrencyPair.NEO_USD);PAIRS.add( CurrencyPair.EUR_USD);PAIRS.add( CurrencyPair.GBP_USD);PAIRS.add( CurrencyPair.BCA_USD);
		PAIRS.add( CurrencyPair.XDC_USD);PAIRS.add( CurrencyPair.NMC_USD);PAIRS.add( CurrencyPair.NVC_USD);PAIRS.add( CurrencyPair.TRC_BTC);PAIRS.add( CurrencyPair.PPC_USD);
		PAIRS.add( CurrencyPair.VET_BTC);PAIRS.add( CurrencyPair.IOTA_USD);PAIRS.add( CurrencyPair.DASH_USD);
	}
	private static final int LEVELS = 8;
	
	private long lastFlush = System.currentTimeMillis();
	private Random r = new Random();
	private final Connection conn;

	public static void exec(ConnectionProvider connProvider, String sql) throws SQLException {
		Connection cn = connProvider.getConnection();
		Statement st = cn.createStatement();
		log.info(sql);
		st.execute(sql);
		cn.commit();
		st.close();
		cn.close(); 
	}
	
	public static void main(String[] args) throws SQLException, InterruptedException {
		String url = URL;
		String user = USER;
		String password = PASSWORD;
		if(args.length < 1) {
			System.out.println("Command line arguments required.");
			System.out.println("java -jar pgfeed.jar URL username password");
			System.out.println("e.g.");
			System.out.println("java -jar pgfeed.jar " + URL + " " + USER + " " + PASSWORD);
			System.exit(1);
		}
		if(args.length >= 1) { url = args[0]; }
		if(args.length >= 2) { user = args[1]; }
		if(args.length >= 3) { password = args[2]; }
		
		ConnectionProvider connProvider = new ConnectionProvider(user, password, url);
		
		exec(connProvider, "DROP TABLE IF EXISTS trade;"
				+ "\r\nCREATE TABLE IF NOT EXISTS trade(etime TIMESTAMP  WITHOUT TIME ZONE NOT NULL, sym VARCHAR(20),ex VARCHAR(20),account VARCHAR(50),"
				+ "type VARCHAR(20),price DOUBLE PRECISION,amount DOUBLE PRECISION,id BIGINT);");
		
		
		
		exec(connProvider, "DROP TABLE IF EXISTS orders;"
				+ "\r\nCREATE TABLE IF NOT EXISTS orders(etime TIMESTAMP  WITHOUT TIME ZONE NOT NULL, sym VARCHAR(20), ex VARCHAR(20), bid DOUBLE PRECISION, bsize DOUBLE PRECISION, ask DOUBLE PRECISION, asize DOUBLE PRECISION, \r\n"
				+ "    		bid1 DOUBLE PRECISION, bid2 DOUBLE PRECISION, bid3 DOUBLE PRECISION, bid4 DOUBLE PRECISION, bid5 DOUBLE PRECISION, bid6 DOUBLE PRECISION, bid7 DOUBLE PRECISION, bid8 DOUBLE PRECISION, \r\n"
				+ "    		bsize1 DOUBLE PRECISION, bsize2 DOUBLE PRECISION, bsize3 DOUBLE PRECISION, bsize4 DOUBLE PRECISION, bsize5 DOUBLE PRECISION, bsize6 DOUBLE PRECISION, bsize7 DOUBLE PRECISION, bsize8 DOUBLE PRECISION, \r\n"
				+ "    		ask1 DOUBLE PRECISION, ask2 DOUBLE PRECISION, ask3 DOUBLE PRECISION, ask4 DOUBLE PRECISION, ask5 DOUBLE PRECISION, ask6 DOUBLE PRECISION, ask7 DOUBLE PRECISION, ask8 DOUBLE PRECISION, \r\n"
				+ "    		asize1 DOUBLE PRECISION, asize2 DOUBLE PRECISION, asize3 DOUBLE PRECISION, asize4 DOUBLE PRECISION, asize5 DOUBLE PRECISION, asize6 DOUBLE PRECISION, asize7 DOUBLE PRECISION, asize8 DOUBLE PRECISION);");

		try {
			exec(connProvider, "SELECT create_hypertable('trade', 'etime', 'sym', 5);");
			exec(connProvider, "SELECT create_hypertable('orders', 'etime', 'sym', 5);");
		} catch(SQLException sql) {
			log.info("Ignoring hypertable error - This will work on Timescale ONLY");
		}
		
		
		StreamingExchangeFactory f = StreamingExchangeFactory.INSTANCE;
//		new BitcoinDemo(f.createExchange(BinanceStreamingExchange.class), "binance", CurrencyPair.BTC_USD);
		try { new PGBitcoinDemo(connProvider, f.createExchange(BitfinexStreamingExchange.class), "bitfinex", CurrencyPair.ETH_USD); 
		} catch(RuntimeException e) {}
		try { new PGBitcoinDemo(connProvider, f.createExchange(OkexStreamingExchange.class), "okex", CurrencyPair.BTC_USD); 
		} catch(RuntimeException e) {}
		try { new PGBitcoinDemo(connProvider, f.createExchange(KrakenStreamingExchange.class), "kraken", CurrencyPair.BTC_USD); 
		} catch(RuntimeException e) {}
		try { new PGBitcoinDemo(connProvider, f.createExchange(BitstampStreamingExchange.class), "bitstamp", CurrencyPair.ETH_USD); 
		} catch(RuntimeException e) {}
	}

	@Data private static class ConnectionProvider {
		@NonNull final String user;
		@NonNull final String password;
		@NonNull final String url;
		Connection getConnection() throws SQLException {
	        Connection cn = DriverManager.getConnection(url, user, password);
	        cn.setAutoCommit(false);
	        return cn;
		}
	}
	
	PGBitcoinDemo(ConnectionProvider connectionProvider, StreamingExchange exchange, final String ex, final CurrencyPair cp) throws SQLException {
		this.conn = connectionProvider.getConnection();
		exchange.connect().blockingAwait();

		new Thread(() -> {
			MarketDataService marketDataService = exchange.getMarketDataService();
			fetchAllPairs(marketDataService, 0, ex);
			while(true) {
				fetchAllPairs(marketDataService, 7_000, ex);
			}
		}).start();

		if(!ex.toLowerCase().equals("okex")) {
			new Thread(() -> {
				// Subscribe to live trades update.
				Disposable subscription1 = exchange.getStreamingMarketDataService()
				    .getTrades(cp) // BTC_USD
				    .subscribe(
				        trade -> sendTrade(ex, trade),
				        throwable -> log.log(Level.SEVERE, "Error in trade subscription", throwable));

			// Subscribe order book data with the reference to the subscription.
			Disposable subscription2 = exchange.getStreamingMarketDataService()
			    .getOrderBook(cp)
			    .subscribe(orderBook -> sendOrderBook(ex, orderBook));
			}).start();
		}

	}

    private static final String TRADE_IN = "INSERT INTO trade(etime, sym,ex,account,type,price,amount,id) "
            + "VALUES(?,?,?,?,?,?,?,?)";
	
	// CREATE TABLE IF NOT EXISTS trade(sym SYMBOL, price DOUBLE, amount DOUBLE, id LONG, etime TIMESTAMP, ts TIMESTAMPT) timestamp(ts);
	private void sendTrade(String exchange, Trade trade) {
//		log.log(Level.INFO, "Trade: " + trade);
		System.out.print("T");
		// First get the data, in case gets break, we don't want to call sender and it break midway.
		String sym = trade.getInstrument().toString();
		String type = trade.getType().toString();
		double price = trade.getPrice().doubleValue();
		double amount = trade.getOriginalAmount().doubleValue();
		long id = -1;
		try {
			id = Long.parseLong(trade.getId());
		} catch(NumberFormatException pe) { }
		long etime = trade.getTimestamp().getTime();
		int v = r.nextInt(15);
		String account = v < 3 ? "ts"+v : ""; 
		
		synchronized(conn) {
			PreparedStatement pstmt = null;
			try {
				pstmt = conn.prepareStatement(TRADE_IN);
	            pstmt.setTimestamp(1, new Timestamp(etime));
	            pstmt.setString(2, sym);
	            pstmt.setString(3, exchange);
	            pstmt.setString(4, account);
	            pstmt.setString(5, type);
	            pstmt.setDouble(6, price);
	            pstmt.setDouble(7, amount);
	            pstmt.setLong(8, id);
	            pstmt.execute();
			} catch(Exception e) {
				log.log(Level.SEVERE, "Trade Exception: " + e.getLocalizedMessage());
			} finally {
				if(pstmt != null) {
					try { pstmt.close(); } catch (SQLException e) {  
						log.warning(e.getLocalizedMessage());
					}
				}
			}
	        long now = System.currentTimeMillis();
	        if((now - lastFlush) > TIMEWINDOW/2) {
	        	try {
					conn.commit();
				} catch (SQLException e) {}
	        	lastFlush = now;
	    		System.out.println(".");
	        }
		}
	}

	HashMap<String,Double> symToLastBid = new HashMap<>();
	HashMap<String,Double> symToLastAsk = new HashMap<>();

    private static final String ORDER_IN = "INSERT INTO orders(etime, sym,ex,bid,bsize,ask,asize,"
    		+ "bid1,bid2,bid3,bid4,bid5,bid6,bid7,bid8,"
    		+ "bsize1,bsize2,bsize3,bsize4,bsize5,bsize6,bsize7,bsize8,"
    		+ "ask1,ask2,ask3,ask4,ask5,ask6,ask7,ask8,"
    		+ "asize1,asize2,asize3,asize4,asize5,asize6,asize7,asize8"
    		+ ") "
            + "VALUES(?,?,?,?,?,?,?,"
            + "?,?,?,?,?,?,?,?,"
            + "?,?,?,?,?,?,?,?,"
            + "?,?,?,?,?,?,?,?,"
            + "?,?,?,?,?,?,?,?"
            + ")";
    
	// CREATE TABLE IF NOT EXISTS order(sym SYMBOL, bid DOUBLE, ask DOUBLE, ts TIMESTAMP) timestamp(ts);
	private void sendOrderBook(String exchange, OrderBook orderBook) {
//		log.log(Level.INFO, "OrderBook: " + orderBook);
		System.out.print(".");
		List<LimitOrder> asks = orderBook.getAsks();
		List<LimitOrder> bids = orderBook.getBids();
		if(asks != null && asks.size() > 0 && bids != null && bids.size() > 0) {
			Instrument inst = asks.get(0).getInstrument();
			String sym = inst == null ? "" : inst.toString();
			double bid = bids.get(0).getLimitPrice().doubleValue();
			double bsize = bids.get(0).getOriginalAmount().doubleValue();
			double ask = asks.get(0).getLimitPrice().doubleValue();
			double asize = asks.get(0).getOriginalAmount().doubleValue();

			double prevBid = symToLastBid.getOrDefault(sym, -1.);
			double prevAsk = symToLastAsk.getOrDefault(sym, -1.);
			// If topLevel hasn't changed for our purposes ignore as it won't affect most things
			if((Math.abs(bid - prevBid) > 0.0001) || (Math.abs(ask - prevAsk) > 0.0001)) { //  || r.nextInt(100) > 95
				symToLastBid.put(sym, bid);
				symToLastAsk.put(sym, ask);
				System.out.print("o");

				synchronized(conn) {
					PreparedStatement pstmt = null;
					try {
						pstmt = conn.prepareStatement(ORDER_IN);
			            pstmt.setTimestamp(1, new Timestamp(new Date().getTime())); // orderBook.getTimeStamp()
			            pstmt.setString(2, sym);
			            pstmt.setString(3, exchange);
			            pstmt.setDouble(4, bid);
			            pstmt.setDouble(5, bsize);
			            pstmt.setDouble(6, ask);
			            pstmt.setDouble(7, asize);
			            int c = 7;
						for(int i = 1; i <= LEVELS; i++) { // Math.min(bids.size(),LEVELS)
				            pstmt.setDouble(c+i, bids.size() >= i ? bids.get(i).getLimitPrice().doubleValue() : Double.NaN);
						}
						c += LEVELS;
						for(int i = 1; i <= LEVELS; i++) { // Math.min(bids.size(),LEVELS)
				            pstmt.setDouble(c+i, bids.size() >= i ? bids.get(i).getOriginalAmount().doubleValue() : Double.NaN);
						}
						c += LEVELS;
						for(int i = 1; i <= LEVELS; i++) { // Math.min(bids.size(),LEVELS)
				            pstmt.setDouble(c+i, asks.size() >= i ? asks.get(i).getLimitPrice().doubleValue() : Double.NaN);
						}
						c += LEVELS;
						for(int i = 1; i <= LEVELS; i++) { // Math.min(bids.size(),LEVELS)
				            pstmt.setDouble(c+i, asks.size() >= i ? asks.get(i).getOriginalAmount().doubleValue() : Double.NaN);
						}
			            pstmt.execute();
					} catch(Exception e) {
						log.log(Level.SEVERE, "Order Exception: " + e.getLocalizedMessage());
					} finally {
						if(pstmt != null) {
							try { pstmt.close(); } catch (SQLException e) {  }
						}
					}
				}
			}
	        long now = System.currentTimeMillis();
	        if((now - lastFlush) > TIMEWINDOW) {
	        	try {
					conn.commit();
				} catch (SQLException e) {}
	        	lastFlush = now;
	    		System.out.println("-SENT");
	        }
		}
	}

	private void fetchAllPairs(MarketDataService marketDataService, int sleep, String ex) {
		for(CurrencyPair c : PAIRS) {
			try {
				OrderBook orderbook = marketDataService.getOrderBook(c);
				System.out.print("," + ex + "-" + c.toString().substring(0,3) + ",");
				sendOrderBook(ex, orderbook);
				Thread.sleep(sleep);
			} catch(IOException | InterruptedException | RuntimeException e) {
//				System.err.println("failed to fetch " + ex + " -> " + c.toString());
			}
		}
	}

}
