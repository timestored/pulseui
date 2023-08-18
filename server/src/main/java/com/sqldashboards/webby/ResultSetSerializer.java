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

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;
import com.kx.c.KException;
import com.timestored.kdb.QueryResultI;
import com.kx.c.Dict;
import static com.kx.c.n;
import static com.kx.c.at;

public class ResultSetSerializer extends JsonSerializer<ResultSet> {
	
	private static final Logger LOG = Logger.getLogger(ResultSetSerializer.class.getName());

    public static class ResultSetSerializerException extends JsonProcessingException{
        private static final long serialVersionUID = -914957626413580734L;

        public ResultSetSerializerException(Throwable cause){
            super(cause);
        }
    }

    @Override
    public Class<ResultSet> handledType() {
        return ResultSet.class;
    }

    public String toString(QueryResultI qr) throws IOException, JsonProcessingException {
    	ByteArrayOutputStream baos = new ByteArrayOutputStream(128);
    	JsonGenerator jgen = new JsonFactory().createGenerator(baos);
    	SimpleModule module = new SimpleModule();
    	module.addSerializer(Dict.class, new DictSerializer());
    	ObjectMapper mapper = new ObjectMapper();
    	mapper.registerModule(module);
    	
        jgen.writeStartObject();
        if(qr.getRs() != null) {
            jgen.writeFieldName("tbl");
        	serialize(qr.getRs(), jgen, null);
        }
        
        if(qr.getConsoleView() != null) {
	        jgen.writeFieldName("console");
	        jgen.writeString(qr.getConsoleView());
        }
        if(qr.getE() != null) {
            jgen.writeFieldName("exception");
            if(qr.getE() instanceof KException) {
            	KException ke = (KException) qr.getE();
            	jgen.writeString(ke.getLocalizedMessage());
            } else {
            	jgen.writeString(qr.getE().getLocalizedMessage());
            }
        }

        if(qr.isExceededMax()) {
	        jgen.writeFieldName("exceededMaxRows");
	        jgen.writeBoolean(qr.isExceededMax());
        }
        
        // TODO convert K to json
        if(qr.getK() != null && qr.getRs() == null) {
            jgen.writeFieldName("k");
            String ks = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(qr.getK());
            jgen.writeRawValue(ks);
        }        
        
        jgen.writeEndObject();
        jgen.close();
        return baos.toString("UTF-8");
    }
    
    class DictSerializer extends StdSerializer<Dict> {
        
        public DictSerializer() { this(null); }
        public DictSerializer(Class<Dict> t) { super(t); }

        @Override public void serialize(Dict dict, JsonGenerator jgen, SerializerProvider provider) 
          throws IOException, JsonProcessingException {
            jgen.writeStartObject();
            for(int i = 0; i<n(dict); i++) {
                jgen.writeFieldName(""+at(dict.x,i));
                provider.defaultSerializeValue(at(dict.y,i), jgen);
            }
            jgen.writeEndObject();
        }
    }
    
    public String toString(ResultSet rs, boolean exceededMaxRows) throws IOException, JsonProcessingException {
    	ByteArrayOutputStream baos = new ByteArrayOutputStream(128);
    	JsonGenerator jgen = new JsonFactory().createGenerator(baos);
        jgen.writeStartObject();
        if(exceededMaxRows) {
	        jgen.writeFieldName("exceededMaxRows");
	        jgen.writeBoolean(exceededMaxRows);
        }
        jgen.writeFieldName("tbl");
        serialize(rs, jgen, null);
        jgen.writeEndObject();
        jgen.close();

        return baos.toString("UTF-8");
    }

    private static long toEpochSecond(LocalTime t,LocalDate d,ZoneOffset o){
      long epochDay=d.toEpochDay();
      long secs=epochDay*86400+t.toSecondOfDay();
      secs-=o.getTotalSeconds();
      return secs;
    }
    public static final LocalTime LOCAL_TIME_NULL = LocalTime.ofNanoOfDay(1);
    static final long MILLS_IN_DAY = 86400000L;
    /**
     * Write LocalTime to serialization buffer in big endian format
     * @param t Time to serialize
     */
    long toEpochSecond(LocalTime t){
       return (t==LOCAL_TIME_NULL)?Integer.MIN_VALUE:(int)((toEpochSecond(t,LocalDate.of(1970,1,1),ZoneOffset.ofTotalSeconds(0))*1000+t.getNano()/1000000)%MILLS_IN_DAY);
    }

    @Override
    public void serialize(ResultSet rs, JsonGenerator jgen, SerializerProvider provider) throws IOException, JsonProcessingException {

        try {
            ResultSetMetaData rsmd = rs.getMetaData();
            int numColumns = rsmd.getColumnCount();
            String[] columnNames = new String[numColumns];
            int[] columnTypes = new int[numColumns];

            for (int i = 0; i < columnNames.length; i++) {
                columnNames[i] = rsmd.getColumnLabel(i + 1);
                columnTypes[i] = rsmd.getColumnType(i + 1);
            }

            jgen.writeStartObject();
            jgen.writeFieldName("data");
            jgen.writeStartArray();
            Map<String,String> colNamesToJsTypes = new HashMap<>(3);

            rs.beforeFirst();
            while (rs.next()) {

                boolean b;
                long l;
                double d;

                jgen.writeStartObject();

                for (int i = 0; i < columnNames.length; i++) {

                    jgen.writeFieldName(columnNames[i]);
                    switch (columnTypes[i]) {

                    case Types.INTEGER:
                        l = rs.getInt(i + 1);
                        if (rs.wasNull()) {
                            jgen.writeNull();
                        } else {
                            jgen.writeNumber(l);
                        }
                        break;

                    case Types.BIGINT:
                        l = rs.getLong(i + 1);
                        if (rs.wasNull()) {
                            jgen.writeNull();
                        } else {
                            jgen.writeNumber(l);
                        }
                        break;

                    case Types.DECIMAL:
                    case Types.NUMERIC:
                        jgen.writeNumber(rs.getBigDecimal(i + 1));
                        break;

                    case Types.FLOAT:
                    case Types.REAL:
                    case Types.DOUBLE:
                        d = rs.getDouble(i + 1);
                        if (rs.wasNull()) {
                            jgen.writeNull();
                        } else {
                            jgen.writeNumber(d);
                        }
                        break;

                    case Types.NVARCHAR:
                    case Types.VARCHAR:
                    case Types.LONGNVARCHAR:
                    case Types.LONGVARCHAR:
                        jgen.writeString(rs.getString(i + 1));
                        break;

                    case Types.BOOLEAN:
                    case Types.BIT:
                        b = rs.getBoolean(i + 1);
                        if (rs.wasNull()) {
                            jgen.writeNull();
                        } else {
                            jgen.writeBoolean(b);
                        }
                        break;

                    case Types.BINARY:
                    case Types.VARBINARY:
                    case Types.LONGVARBINARY:
                        jgen.writeBinary(rs.getBytes(i + 1));
                        break;

                    case Types.TINYINT:
                    case Types.SMALLINT:
                        l = rs.getShort(i + 1);
                        if (rs.wasNull()) {
                            jgen.writeNull();
                        } else {
                            jgen.writeNumber(l);
                        }
                        break;

                    case Types.DATE:
                    case Types.TIMESTAMP:
                    case Types.TIME:     
                    case Types.TIME_WITH_TIMEZONE:     
                    case Types.TIMESTAMP_WITH_TIMEZONE:     
                    	
                    	Object o = rs.getObject(i+1);
                    	long epoch = 0;
                    	if(o instanceof java.sql.Date) {
                    		epoch = ((java.sql.Date)o).getTime();
                    	} else if(o instanceof java.util.Date) {
                    		epoch = ((java.util.Date)o).getTime();
                    	} else if(o instanceof LocalDate) {
                    		epoch = ((LocalDate) o).atStartOfDay(ZoneId.of("UTC")).toInstant().toEpochMilli();
                    	} else if(o instanceof LocalTime) {
                    		epoch = toEpochSecond((LocalTime) o);
                    	} else if(o instanceof LocalDateTime) {
                    		epoch = ((LocalDateTime)o).toInstant(ZoneOffset.UTC).toEpochMilli();
                    	} else if(o instanceof Instant) {
                    		epoch = ((Instant)o).toEpochMilli();
                    	}
                    	jgen.writeNumber(epoch);
                    	int ct = columnTypes[i];
                    	String typ = ct == Types.TIME || ct == Types.TIME_WITH_TIMEZONE ? "Time" : 
                    			(ct == Types.DATE ? "DateOnly" : "Date");
                    	colNamesToJsTypes.putIfAbsent(columnNames[i], typ);
                        break;

                    case Types.BLOB:
                        Blob blob = rs.getBlob(i);
                        provider.defaultSerializeValue(blob.getBinaryStream(), jgen);
                        blob.free();
                        break;

                    case Types.CLOB:
                        Clob clob = rs.getClob(i);
                        provider.defaultSerializeValue(clob.getCharacterStream(), jgen);
                        clob.free();
                        break;

                    case Types.ARRAY:
                        boolean isNumArray = true;
                    	Object oo = rs.getObject(i+1); // notice this is getObject. getArray doesn't work for H2
                		if(oo instanceof int[]) { jgen.writeArray((int[])oo, 0, ((int[])oo).length); }
                		else if(oo instanceof long[]) {  jgen.writeArray((long[])oo, 0, ((long[])oo).length); }
                		else if(oo instanceof double[]) { jgen.writeArray((double[])oo, 0, ((double[])oo).length); }
                		else if(oo instanceof String[]) { jgen.writeArray((String[])oo, 0, ((String[])oo).length); }
                		else if(oo instanceof Object[]) {
                    		jgen.writeStartArray();
                    		Object[] oa = (Object[])oo;
                    		for(int mi=0;mi<oa.length;mi++) {
                    			jgen.writeObject(oa[mi]);
                    		}
                    		jgen.writeEndArray();
                    	} else {
                    		isNumArray = false;
                    	}
                		if(isNumArray) {
                			colNamesToJsTypes.putIfAbsent(columnNames[i], "numarray");
                		}
                        break;

                    case Types.STRUCT:
                        throw new RuntimeException("ResultSetSerializer not yet implemented for SQL type STRUCT");

                    case Types.DISTINCT:
                        throw new RuntimeException("ResultSetSerializer not yet implemented for SQL type DISTINCT");

                    case Types.REF:
                        throw new RuntimeException("ResultSetSerializer not yet implemented for SQL type REF");

                    case Types.JAVA_OBJECT:
                    default:
                    	Object obj = rs.getObject(i + 1);
                    	if(obj instanceof Timestamp) {
                    		// TODO losing accuracy here
                        	jgen.writeNumber(((Timestamp)  obj).getTime());
                        	colNamesToJsTypes.putIfAbsent(columnNames[i], "Date");
                    	} else {
	                    	try {
	                        	colNamesToJsTypes.putIfAbsent(columnNames[i], obj instanceof Number ? "number" : "string");
	                        	if(provider != null) {
	                        		provider.defaultSerializeValue(obj, jgen);
	                        	} else {
	                            	jgen.writeString(obj == null ? "" : obj.toString());
	                        	}
	                    	} catch(IOException ioe) {
	                    		LOG.warning("Unrecognised " + columnNames[i] + " of type " + columnTypes[i] + " with value: " + obj);
	                    	}
                    	}
                        break;
                    }
                }

                jgen.writeEndObject();
            }

            jgen.writeEndArray();

            jgen.writeFieldName("types");
            jgen.writeStartObject();

            for(int c = 0; c < columnNames.length; c++) {
				jgen.writeFieldName(columnNames[c]);
				String typ = colNamesToJsTypes.get(columnNames[c]);
				if(typ != null) {
    				jgen.writeString(typ);
				} else {
		             switch (columnTypes[c]) {
		                case Types.INTEGER:
		                case Types.NUMERIC:
		                case Types.DECIMAL:
		                case Types.FLOAT:
		                case Types.REAL:
		                case Types.DOUBLE:
		                case Types.BIGINT:
		    				jgen.writeString("number");
		    				break;
	                    case Types.NVARCHAR:
	                    case Types.VARCHAR:
	                    case Types.LONGNVARCHAR:
	                    case Types.LONGVARCHAR:
		    				jgen.writeString("string");
		    				break;
						default:
		    				jgen.writeString("");
		    				break;
		                }	
				}
            }

            jgen.writeEndObject();
            
            jgen.writeEndObject();
        } catch (SQLException e) {
            throw new ResultSetSerializerException(e);
        }
    }
}