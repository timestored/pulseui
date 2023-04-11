package com.timestored.qdb;

import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
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
import io.questdb.client.Sender;
import io.reactivex.disposables.Disposable;
import lombok.extern.java.Log;

@Log
public class BitcoinDemo {

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
	
	private Sender sender;
	private long lastFlush = System.currentTimeMillis();
	private Random r = new Random();

	
	
	BitcoinDemo(StreamingExchange exchange, String ex, final CurrencyPair cp) {
		this.sender = Sender.builder().address("localhost:9009").build();
		exchange.connect().blockingAwait();

		new Thread(() -> {
			MarketDataService marketDataService = exchange.getMarketDataService();
			fetchAllPairs(marketDataService, 0, ex);
			while(true) {
				fetchAllPairs(marketDataService, 7_000, ex);
			}
		}).start();
		
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

		// Wait for a while to see some results arrive
//		try {
//			while(true) {
//					Thread.sleep(20000);
//			}
//		} catch (InterruptedException e) {
//			e.printStackTrace();
//		}
//
//		subscription1.dispose();
//		subscription2.dispose();
//		exchange.disconnect().blockingAwait();
	}

	
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
		
		synchronized(sender) {
			try {
	        	sender.table("trade")
	        		.symbol("sym", sym)
	        		.symbol("ex", exchange)
	        		.symbol("account", account)
		        	.symbol("type", type)
		        	.doubleColumn("price", price)
		        	.doubleColumn("amount", amount)
		        	.longColumn("id", id)
		        	.timestampColumn("etime", etime);
			} catch(Exception e) {
				log.log(Level.SEVERE, "Order Exception: " + e.getLocalizedMessage());
			} finally {
	        	sender.atNow();	
			}
	        long now = System.currentTimeMillis();
	        if((now - lastFlush) > TIMEWINDOW/2) {
	        	sender.flush();
	        	lastFlush = now;
	    		System.out.println(".");
	        }
		}
	}

	HashMap<String,Double> symToLastBid = new HashMap<>();
	HashMap<String,Double> symToLastAsk = new HashMap<>();
	
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
			
				synchronized(sender) {
					try {
						sender.table("order")
			        		.symbol("sym", sym)
			        		.symbol("ex", exchange)
			        		.doubleColumn("bid", bid)
			        		.doubleColumn("bsize", bsize)
			        		.doubleColumn("ask", ask)
			        		.doubleColumn("asize", asize);
						for(int i = 1; i <= Math.min(bids.size(),LEVELS); i++) {
							sender.doubleColumn("bid"+i, bids.get(i).getLimitPrice().doubleValue());
							sender.doubleColumn("bsize"+i, bids.get(i).getOriginalAmount().doubleValue());
						}
						for(int i = 1; i <= Math.min(asks.size(),LEVELS); i++) {
							sender.doubleColumn("ask"+i, asks.get(i).getLimitPrice().doubleValue());
							sender.doubleColumn("asize"+i, asks.get(i).getOriginalAmount().doubleValue());
						}
					} catch(Exception e) {
						log.log(Level.SEVERE, "Order Exception: " + e.getLocalizedMessage());
					} finally {
			        	sender.atNow();	
					}
				}
			}
	        long now = System.currentTimeMillis();
	        if((now - lastFlush) > TIMEWINDOW) {
	        	sender.flush();
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

	public static void main(String[] args) throws SQLException, InterruptedException {
		StreamingExchangeFactory f = StreamingExchangeFactory.INSTANCE;
//		new BitcoinDemo(f.createExchange(BinanceStreamingExchange.class), "binance", CurrencyPair.BTC_USD);
		try { new BitcoinDemo(f.createExchange(BitfinexStreamingExchange.class), "bitfinex", CurrencyPair.ETH_USD); 
		} catch(RuntimeException e) {}
		try { new BitcoinDemo(f.createExchange(OkexStreamingExchange.class), "okex", CurrencyPair.BTC_USD); 
		} catch(RuntimeException e) {}
		try { new BitcoinDemo(f.createExchange(KrakenStreamingExchange.class), "kraken", CurrencyPair.BTC_USD); 
		} catch(RuntimeException e) {}
		try { new BitcoinDemo(f.createExchange(BitstampStreamingExchange.class), "bitstamp", CurrencyPair.ETH_USD); 
		} catch(RuntimeException e) {}
	}
}
