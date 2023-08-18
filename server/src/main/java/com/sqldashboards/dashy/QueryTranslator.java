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

import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.function.Function;

import com.sqldashboards.dashy.QueryEngine2.ArgType;
import com.sqldashboards.dashy.QueryEngine2.ArgVal;
import com.sqldashboards.pro.PivotResultSet;
import com.sqldashboards.shared.JdbcTypes;
import com.timestored.jdb.kexception.NYIException;

/**
 * Converts a query. In this particular instance it uses arguments
 * stored in a desktop model to convert $$placeholders$$ to their replacement
 * string values. 

 * 
 * It receives argType from the input components that suggests a type BUT 
 * it is also free to guess. e.g. 2022.01.01 is a KDB date so don't wrap it in quotes.
 */
public class QueryTranslator {

	/** ARG Wrapper that surrounds an argument in a query **/
	private Map<String, ArgVal> keyToVals;
	
	public QueryTranslator(Map<String, ArgVal> keyToVals) {
		this.keyToVals = keyToVals;
	}
	
	
	private static boolean isIdentifier(char c) {
		return Character.isLetterOrDigit(c) || c=='_'|| c=='-'|| c=='.'|| c==':';
	}

	public String translateQuery(final String query, ServerConfig sc) {
		return translate(query, "", sc).getTranslation();
	}

	TranslationResult translate(final String query, ServerConfig sc) {
		return translate(query, "", sc);
	}
	
	/**
	 * @return A query where the arguments $arg have been replaced with their
	 * 	actual values. Or null in the event any argument cannot be found.
	 */
	public TranslationResult translate(final String query, final String serverCmd, ServerConfig sc) {
		
		final JdbcTypes jdbcTypes = sc.getJdbcType();
		String qry = sc.getQueryWrapPre() + query + sc.getQueryWrapPost();
		String translation = qry;
		Set<String> allKeys = Collections.emptySet();
		Set<String> unfoundKeys = Collections.emptySet();
		
		if(qry != null && qry.length()>=2 && qry.contains("{") || qry.contains("((") || qry.contains("\\{") || qry.contains("\\(")) {
			StringBuilder sb = new StringBuilder();
			allKeys = new HashSet<>();
			unfoundKeys = new HashSet<>();

			char[] a = qry.toCharArray();
			for(int i=0; i<a.length; i++) {
				if(a[i] == '\\' && i+1<a.length && (a[i+1]=='{' || a[i+1]=='(')) {
					sb.append(a[++i]);
				} else if(a[i] == '{' && i+1<a.length && isIdentifier(a[i+1])) {
					int start = i++;
					while(i<a.length && isIdentifier(a[i])) { i++; }
					if(i<a.length && a[i]=='}') {
						String k = qry.substring(start+1,i);
						sb.append(addKV(jdbcTypes, allKeys, k, unfoundKeys));
					} else {
						sb.append(qry.substring(start, i==a.length ? i : i+1));
					}
				} else if(a[i] == '(' && i+2<a.length && a[i+1] == '(' && isIdentifier(a[i+2])) {
					int start = i;
					i+=2;
					while(i<a.length && isIdentifier(a[i])) { i++; }
					if(i+1<a.length && a[i]==')' && a[i+1]==')') {
						String k = qry.substring(start+2,i);
						i++;
						sb.append(addKV(jdbcTypes, allKeys, k, unfoundKeys));
					} else {
						sb.append(qry.substring(start, i==a.length ? i : i+1));
					}
				}  else if(a[i] == '{' && i+2<a.length && a[i+1] == '{' && isIdentifier(a[i+2])) {
					int start = i;
					i+=2;
					while(i<a.length && isIdentifier(a[i])) { i++; }
					if(i<a.length && a[i]=='}') {
						String k = qry.substring(start+2,i);
						if(i+1<a.length && a[i+1]=='}') { 
							i++;
							sb.append(addKV(jdbcTypes, allKeys, k, unfoundKeys));
						} else {
							// else it was {{blah}_  i.e. an unmatched pair. Replace single only
							sb.append("{"+addKV(jdbcTypes, allKeys, k, unfoundKeys));
						}
					} else {
						sb.append(qry.substring(start, i==a.length ? i : i+1));
					}
				} else {
					sb.append(a[i]);
				}
			}
			translation = sb.toString();
		}

		List<String> groupbylist = Collections.emptyList();
		List<String> pivotlist = Collections.emptyList();
		
		if(serverCmd != null && serverCmd.trim().length() > 0) {
			if(serverCmd.startsWith("pivot:")) {
				String[] s = serverCmd.substring("pivot:".length()).split("\\|", -1);
				if(s.length >= 3) {
					groupbylist = s[0].isEmpty() ? Collections.emptyList() : Arrays.asList(s[0].split(",",-1));
					pivotlist = s[1].isEmpty() ? Collections.emptyList() : Arrays.asList(s[1].split(",",-1));
					String sel = s[2];
					if(pivotlist.size() > 0 && groupbylist.size()==0) {
						throw new NYIException("Must specify groupby to allow pivot.");
					}
					translation = PivotResultSet.pivotSQL(jdbcTypes, groupbylist, pivotlist, sel, translation);
				} else {
					unfoundKeys.add("pivot command not found"); // fake way to throw an error
				}
			} else {
				unfoundKeys.add("pivot command not found"); // fake way to throw an error
			}
		}
		return new TranslationResult(qry, translation, allKeys, unfoundKeys, groupbylist, pivotlist);
	}

	
	private static enum AVFormatter {
		RAW { 
			String convertValue(ArgVal argVal) { return convertValue(argVal, "","", ",", s -> s); } 
		},
		CSV { 
			String convertValue(ArgVal argVal) { return RAW.convertValue(argVal); } 
		},
		HTML { 
			String convertValue(ArgVal argVal) { return escapeHTML(CSV.convertValue(argVal)); }
			
		},
		PIPE { 
			String convertValue(ArgVal argVal) { return convertValue(argVal, "","","|", s -> s); } 
		},
		JSON { 
			String convertValue(ArgVal argVal) {
				boolean b = argVal.getArgType().equals(ArgType.STRINGS) || argVal.getStrings().length>1;
				return convertValue(argVal, b?"[":"", b?"]":"", ",",QueryTranslator::doubleQuote); 
			} 
		},
		URL { 
			String convertValue(ArgVal argVal) { return encode(CSV.convertValue(argVal)); }
			String encode(String s) { return URLEncoder.encode(s.replace("\"", "\\\"")); } 
		},
		SQL {
			String convertValue(ArgVal argVal) {
				String[] v = argVal.getStrings();
				if(v == null) {
					return "";
				}
				ArgType at = argVal.getArgType();
				String r = "";
				
				if(at.equals(ArgType.STRINGS) || at.equals(ArgType.DATE)) {
					r = toStringList("(",")", ",", Arrays.asList(v), QueryTranslator::singleQuote);
				} else if(at.equals(ArgType.NUMBER)){
					r = ""+v[0];
				} else if(at.equals(ArgType.STRING)) {
					r = isNumber(v[0]) ? getNumber(v[0]) : singleQuote(v[0]);
				}
				return r;
			}
		},
		KDB {
			String convertValue(ArgVal argVal) {
				String[] v = argVal.getStrings();
				if(v == null) {
					return "";
				}
				ArgType at = argVal.getArgType();
				String r = "";
				
				if(at.equals(ArgType.STRINGS)) {
					r = toKdbStringList(Arrays.asList(v));
				} else if(at.equals(ArgType.NUMBER)){
					r = ""+v[0];
				} else if(at.equals(ArgType.DATE)){
					if(v.length == 2) {
						r = (v[0].replace("-", ".") + " " + v[1].replace("-", "."));	
					} else {
						r = v[0].replace("-", ".");
					}
				} else if(at.equals(ArgType.STRING)){
					if(isNumber(v[0])) {
						r = getNumber(v[0]);
					} else if(isKdbDateOrTime(v[0]))  {
						r = v[0]; // pass raw without quotes
					} else {
						r = wrapKdbString(v[0]);
					}
				}
				return r;
			}

		};
		
		abstract String convertValue(ArgVal argVal);

		static String convertValue(ArgVal argVal, String starter, String ender, String itemSep, Function<String,String> wrapString) {
			String[] v = argVal.getStrings();
			if(v == null) {
				return "";
			}
			return toStringList(starter, ender, itemSep, Arrays.asList(v), wrapString);
		}
		
	}
	
	private String addKV(JdbcTypes jdbcTypes, Set<String> allKeys, String keyAndFormat, Set<String> unfoundKeys) {
		String k = keyAndFormat;
		AVFormatter formatter = jdbcTypes.isKDB() ? AVFormatter.KDB : AVFormatter.SQL;
		if(keyAndFormat.contains(":")) {
			k = keyAndFormat.substring(0,keyAndFormat.indexOf(":"));
			String f = keyAndFormat.substring(keyAndFormat.indexOf(":")+1);
			try {
				formatter = AVFormatter.valueOf(f.toUpperCase());
			} catch(IllegalArgumentException e) {
				allKeys.add(k);
				return k + ":formatternotfound";
			} // warn user?
		}
		
		allKeys.add(k);
		ArgVal av = keyToVals.get(k);
		if(av != null) {
			return k.toLowerCase().startsWith("submit_") ? "" : formatter.convertValue(av);
		}
		// check if k is a prefix and if there are keys in map with that as a prefix
		// e.g. { pre.bar:1, pre.foo:"hi"} would return a dict for kdb with k=pre.
		if(jdbcTypes.isKDB()) {
			Map<String, String> matches = new HashMap<>();
			for(String myk : keyToVals.keySet()) {
				if(myk.startsWith(k + ".") && myk.length() > (k.length()+1)) {
					matches.put(myk.substring(k.length()+1), formatter.convertValue(keyToVals.get(myk)));
				}
			}
			if(!matches.isEmpty()) {
				return multikeyToString(jdbcTypes.isKDB(), matches);
			}
		}
		unfoundKeys.add(k);
		return k; // Returning k, keeps that string in query and often produces error with that text.
	}
	
	private String multikeyToString(boolean isKDB, Map<String, String> matches) {
		if(!isKDB) {
			throw new UnsupportedOperationException("multikeyToString only supported for kdb currently");
		}
		StringBuilder sb = new StringBuilder();
		sb.append("(`$");
		sb.append(toKdbStringList(matches.keySet()));
		sb.append(")!(");
		if(matches.size() == 1) {
			String onlyK = matches.keySet().iterator().next();
			sb.append(matches.get(onlyK));
		} else {
			boolean firstEntry = true;
			for(Entry<String, String> e : matches.entrySet()) {
				if(!firstEntry) {
					sb.append(";");
				}
				sb.append(e.getValue());
				firstEntry = false;
			}
		}
		sb.append(")");
		return sb.toString();
	}


	public static String toKdbStringList(Collection<String> l) {
		if(l.size() == 1) {
			StringBuilder sb = new StringBuilder("(");
			sb.append("enlist ").append(wrapKdbString("" + l.iterator().next()));
			sb.append(")");
			return sb.toString();
		}
		return toStringList("(", ")", ";", l, o -> wrapKdbString("" + o));
	}

	private static String toStringList(String starter, String ender, String sep, Collection<String> l, Function<String,String> wrapper) {
		StringBuilder sb = new StringBuilder(starter);
		boolean firstEntry = true;
		for(Object o : l) {
			if(!firstEntry) {
				sb.append(sep);
			}
			sb.append(wrapper.apply("" + o));
			firstEntry = false;
		}
		sb.append(ender);
		return sb.toString();
	}

	private static String singleQuote(String s) { return  "'" + s.replace("'", "''") + "'"; }
	
	private static String doubleQuote(String s) { return  "\"" + s.replace("\"", "\\\"") + "\""; }
	
	/**
	 * Wrap a string for the relevant database.
	 */
	private static String wrapKdbString(String s) {
		String r = "";
		// careful of single chars and escaping quotes
		if(s.length()<2) {
			r = "enlist ";	
		}
		r += "\"" + s.replace("\"", "\\\"") + "\"";
		return r;
	}

	private static String getNumber(String s) {
		return s.contains(".") ? ""+Double.parseDouble(""+s) : ""+Long.parseLong(""+s);
	}
	

	static boolean isKdbDateOrTime(String s) { return isKdbDate(s) || isKdbDateTime(s) || isKdbTime(s); }
	
	private static boolean isKdbDate(String s) { 
		char c = '.'; 
		return s.length() == 10 && s.charAt(4) == c && s.charAt(7) == c; 
	}

	
	// 2022.09.13T14:39:00.731
	private static boolean isKdbDateTime(String s) {
		return s.length() > 10 && isKdbDate(s.substring(0,10)) && s.charAt(10)=='T' && (s.length()==11 || isKdbTime(s.substring(11)));
	}
	
	private static boolean isNumWithin(String s, int lower, int upper) {
		try {
			int i = Integer.parseInt(s);
			return i >= lower && i <= upper;
		} catch(NumberFormatException e) { }
		return false;
	}
	
	// 2022.09.13T 14:39:00.731
	private static boolean isKdbTime(String s) {
		char a = ':';
		switch(s.length()) {
			case 5: return s.charAt(2)==a && isNumWithin(s.substring(0, 2),0,23) && isNumWithin(s.substring(3, 5), 0, 59);
			case 8: return isKdbTime(s.substring(0, 5)) && s.charAt(5)==a && isNumWithin(s.substring(6, 8), 0, 59);
		}
		return s.length()>8 ? isKdbTime(s.substring(0,8)) && s.charAt(8)=='.' : false;
	}
	
	private static boolean isNumber(String s) {
		try {
			Double.parseDouble(""+s);
			return true;
		} catch(NumberFormatException nfe) { }
		return false;
	}

	/** @return a list of arg keys contained within the query string */
	public static Collection<String> extractArgs(String qry) {
		if(qry.contains("{") || qry.contains("((")) {
			QueryTranslator qt = new QueryTranslator(new HashMap<>());
			TranslationResult res = qt.translate(qry, new ServerConfig("hosty", 5000));
			return res.getAllKeys();
		}
		return Collections.emptySet();
	}

	
	/**
	 * Filter queryables to return only those that contain the argument keys
	 * @param If true, and they contain submit, they will not be returned. 
	 */
	public static Collection<Queryable> filterByKeys(Collection<Queryable> qs,  Set<String> keySet, boolean ignoreIfTheyHaveSubmit) {
		List<Queryable> r = new ArrayList<Queryable>();
		for(Queryable q : qs) {
			for(String a : keySet) {
				Collection<String> args = extractArgs(q.getQuery());
				boolean ignoreThisQuery = ignoreIfTheyHaveSubmit && args.stream().anyMatch(s -> s.toLowerCase().startsWith("submit_"));
				if(!ignoreThisQuery && args.contains(a)) {
					r.add(q);
					break;
				}
			}
		}
		return r;
		
	}

	/** Escape any ampersands etc in the txt to allow use in html **/
	private static String escapeHTML(String txt) {
	    StringBuilder out = new StringBuilder(Math.max(16, txt.length()));
	    return appendEscapedHtml(out, txt).toString();
	}

	/** Append the txt to sb escaping any ampersands etc in the txt */
	private static StringBuilder appendEscapedHtml(StringBuilder sb, String txt) {
		boolean previousWasASpace = false;
	    for( char c : txt.toCharArray() ) {
	        if( c == ' ' ) {
	            if( previousWasASpace ) {
	                sb.append("&nbsp;");
	                previousWasASpace = false;
	                continue;
	            }
	            previousWasASpace = true;
	        } else {
	            previousWasASpace = false;
	        }
	        switch(c) {
	            case '<': sb.append("&lt;"); break;
	            case '>': sb.append("&gt;"); break;
	            case '&': sb.append("&amp;"); break;
	            case '"': sb.append("&quot;"); break;
	            case '\'': sb.append("&apos;"); break;
	            case '\n': sb.append("\n<br />"); break;
	            // We need Tab support here, because we print StackTraces as HTML
	            case '\t': sb.append("&nbsp; &nbsp; &nbsp;"); break;  
	            default:
	                if( c < 128 ) {
	                    sb.append(c);
	                } else {
	                    sb.append("&#").append((int)c).append(";");
	                }    
	        }
	    }
	    return sb;
	}
	
//	//piv[aa;`status`name;`destination;`pnl]
//	 pulseagg[aa;`status`name;`destination;"pnl:max pnl,time:last time"]
//	 pulseagg[aa;`status;`name`destination;"pnl:max pnl,time:last time"]
//	 pulseagg[aa;`status`name;();"pnl:max pnl,time:last time"]
//	 pulseagg[aa;();`destination;"pnl:max pnl,time:last time"]
//	 pulseagg[aa;();();"pnl:max pnl,time:last time"]
//	 pulseagg[aa;();();""]
//	 pulseagg[aa;`status;`destination;""]
	
	
}
