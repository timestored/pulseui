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
 
package com.timestored.db;

import java.lang.reflect.Array;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeType;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.ValueNode;
import com.jayway.jsonpath.JsonPath;

import net.minidev.json.JSONArray;

public class JsonResultSetBuilder {

	public static ResultSet fromJSON(String json) throws JsonMappingException, JsonProcessingException {
		return fromJSON(json, "", "");
	}
	
	public static ResultSet fromJSON(String json, String path, String columns) throws JsonMappingException, JsonProcessingException {
		ObjectMapper objectMapper = JsonMapper.builder()
				.configure(JsonParser.Feature.ALLOW_UNQUOTED_FIELD_NAMES, true)
				.configure(JsonParser.Feature.ALLOW_SINGLE_QUOTES, true)
		    	.configure(DeserializationFeature.ACCEPT_SINGLE_VALUE_AS_ARRAY, true)
		    	.build();
		JsonNode n = null;
		try {
			Map<String, String> colTypeMap = Collections.emptyMap();
			if(!columns.isEmpty()) {
				TypeReference<HashMap<String, String>> typeRef = new TypeReference<HashMap<String, String>>() {};
				colTypeMap = objectMapper.readValue(columns, typeRef);
			}
			String jsonRead = json;
	    	if(!path.isEmpty()) {
	    		jsonRead = ((JSONArray) JsonPath.read(json, path)).toJSONString();
	    	}
			n = objectMapper.readTree(jsonRead);
			ArrayNode an = findArrayNode(n);
			if(an != null) {
				return fromJSON(an, colTypeMap);
			}
			if(n instanceof ObjectNode) {
				return fromSingleObjectNode((ObjectNode)n);
			} else if(n instanceof ValueNode) {
				// single value - make it an array of one then convert
				an = objectMapper.createArrayNode();
				an.add(n);
				return fromJSON(an, colTypeMap);
			}
			// What's left?
		} catch(JsonProcessingException | ClassCastException e) {
			if(n != null) {
				return new SimpleResultSet(new String[] { "jsonError" }, new Object[] { new String[] { json, n.toPrettyString(), e.toString() } });
			} else {
				return new SimpleResultSet(new String[] { "jsonError" }, new Object[] { new String[] { json, e.toString() } });
			}
		}
		return new SimpleResultSet(new String[] { "InvalidJson" }, new Object[] { new String[] { json } });
	}
	
	private static Stream<Entry<String, JsonNode>> toStream(ObjectNode n) {
		return StreamSupport.stream(Spliterators.spliteratorUnknownSize(n.fields(), Spliterator.ORDERED), false);
	}
	private static Stream<JsonNode> toStream(ArrayNode n) {
		return StreamSupport.stream(Spliterators.spliteratorUnknownSize(n.elements(), Spliterator.ORDERED), false);
	}

	/** No array was found, flip it as a dict **/
	private static ResultSet fromSingleObjectNode(ObjectNode n) {
		List<String> keys = new ArrayList<>();
		List<String> vals = new ArrayList<>();
		toStream(n).forEach(e -> {
			keys.add(e.getKey());
			vals.add((e.getValue().toPrettyString()));
		});
		Object[] cols = new Object[] { keys.toArray(new String[] {}), vals.toArray(new String[] {}) };
		return new SimpleResultSet(new String[] { "keys","vals" }, cols);
		
	}

	private static ArrayNode findArrayNode(JsonNode n) {
		if (n instanceof ArrayNode) {
			return (ArrayNode) n;
		}
		if (n.isObject()) {
			ObjectNode objectNode = (ObjectNode) n;
			Iterator<Map.Entry<String, JsonNode>> iter = objectNode.fields();
			while (iter.hasNext()) {
				Map.Entry<String, JsonNode> entry = iter.next();
				if (entry.getValue().isArray()) {
					return (ArrayNode) entry.getValue();
				}
			}
		}
		return null;
	}

	private static ResultSet fromJSON(ArrayNode arrayNode, Map<String, String> colTypeMap) throws JsonMappingException, JsonProcessingException {
		int sz = arrayNode.size();
		if(sz == 0) {
			return new SimpleResultSet(new String[] { "empty" });
		}
		if(arrayNode.get(0).isValueNode()) { // [1,2,3]
			return fromArrayOfvalueNodes(arrayNode);
		} else if(arrayNode.get(0).isObject()) { // [{a:1,b:2},{a:1,b:2}]
			return fromArrayOfObjectNodes(arrayNode, colTypeMap);
		} // array of array nodes?
		return new SimpleResultSet(new String[] { "a" }, new Object[] { new String[] { "v1", "v2" } });
	}

	private static ResultSet fromArrayOfObjectNodes(ArrayNode arrayNode, Map<String, String> colTypeMap) {
		int sz = arrayNode.size();
		Set<String> keys = new HashSet<>();
		Map<String,Integer> cTypes = new HashMap<>();
		toStream(arrayNode).forEach(jsn -> {
			toStream(((ObjectNode)jsn)).forEach(e ->{
				String k = e.getKey();
				keys.add(k);
				cTypes.merge(k, toSQLtype(e.getValue().getNodeType()), (a,b) -> a.equals(b) ? a :  java.sql.Types.VARCHAR);
				Integer t = cTypes.get(e.getKey());
				
			});
		});
		colTypeMap.forEach((String typKey, String typVal) -> {
			// User specified overrides of column types.
			String t = typVal.toUpperCase();
			int typ = t.equals("DOUBLE") ? java.sql.Types.DOUBLE : 
						t.equals("BOOLEAN") ? java.sql.Types.BOOLEAN :
						t.equals("INTEGER") ? java.sql.Types.INTEGER :
						java.sql.Types.VARCHAR;
			cTypes.put(typKey, typ);
		});
		
		String[] colNames = keys.toArray(new String[] {});
		List<String> cNames = Arrays.asList(colNames);
		
		Object[] colVals = new Object[cNames.size()];
		for(int i=0; i<colVals.length; i++) {
			Object o = getArray(cTypes.get(cNames.get(i)), sz);
			colVals[i] = o;
		}
		int r = 0;
		Iterator<JsonNode> it = arrayNode.iterator();
		while(it.hasNext()) {
			ObjectNode on = (ObjectNode)it.next();
			final int row = r;
			toStream(on).forEach(e -> { 
				int c = cNames.indexOf(e.getKey());
				Array.set(colVals[c], row, getValue(e.getValue(), cTypes.get(e.getKey())) );
			});
			r++;
		}
		return new SimpleResultSet(colNames, colVals);
	}

	private static Object getValue(JsonNode on, int sqlType) {
		switch(sqlType) {
			case java.sql.Types.DOUBLE: return on.asDouble();
			case java.sql.Types.INTEGER: return on.asInt();
			case java.sql.Types.BOOLEAN: return on.asBoolean();
			case java.sql.Types.VARCHAR: return on.asText();
			default:
		}
		return on.toString();
	}

	private static Object getArray(int sqlType, int sz) {
		switch(sqlType) {
			case java.sql.Types.DOUBLE: return new double[sz];
			case java.sql.Types.INTEGER: return new int[sz];
			case java.sql.Types.BOOLEAN: return new boolean[sz];
			case java.sql.Types.VARCHAR: return new String[sz];
			default:
		}
		return new Object[sz];
	}

	private static Integer toSQLtype(JsonNodeType nodeType) {
		switch(nodeType) {
			case NUMBER: return java.sql.Types.DOUBLE;
			case BOOLEAN: return java.sql.Types.BOOLEAN;
			case NULL:
			case OBJECT:
			case STRING:
			case POJO:
			case ARRAY:
			case BINARY:
			case MISSING:
			default:
		}
		return java.sql.Types.VARCHAR;
	}

	private static ResultSet fromArrayOfvalueNodes(ArrayNode arrayNode) {
		int sz = arrayNode.size();
		Object valArray = null;
		ValueNode vn = (ValueNode)arrayNode.get(0);
		String t = vn.getNodeType().name(); 
		Iterator<JsonNode> it = arrayNode.iterator();
		int i = 0;
		switch(vn.getNodeType()) {
			case ARRAY:
			case BINARY:
			case BOOLEAN:
			case MISSING:
			case NULL:
			case OBJECT:
			case STRING:
			case POJO:
				String[] v = new String[sz];
				valArray = v;
				while(it.hasNext()) {
					v[i++] = it.next().toString();
				}
				break;
			case NUMBER:
				double[] d = new double[sz];
				valArray = d;
				while(it.hasNext()) {
					d[i++] = it.next().asDouble();
				}
				break;
		}
		return new SimpleResultSet(new String[] { t }, new Object[] { valArray });
	}
}
