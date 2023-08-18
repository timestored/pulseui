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

import java.util.ArrayList;
import java.util.List;

import com.sqldashboards.webby.Dashboard;

public class DashDemos {
	
	private static final String A = "{   \"tabEnableClose\":false, \"tabEnableFloat\":true, \"tabSetAutoSelectTab\":true, \r\n"
			+ "    \"splitterSize\":1, \"splitterExtra\":10, \"tabEnableRenderOnDemand\":false }";

	private static final String BLOTTER = "{ \"global\": " + A + ", \r\n" 
			+ "\"borders\": [], \"borders\": [], \"layout\": { \"type\": \"row\", \"id\": \"#8f3558c5-1f26-45c1-8115-fd2ceca4b4b4\", \"children\": [ { \"type\": \"tabset\", \"id\": \"#f20b72c6-dcd0-4f51-8f34-2c6c848386c3\", \"weight\": 25, \"children\": [ { \"type\": \"tab\", \"id\": \"#62a93c7b-0f79-4d0e-a6ec-238505cf45c3\", \"name\": \"blotter\", \"component\": \"grid\", \"config\": { \"dashstate\": { \"chartType\": \"grid\", \"queryable\": { \"serverName\": \"DEMODB\", \"query\": \"SELECT `time`,`STATUS`,SYMBOL AS SYMBOL_SD_TAG,`INSTRUMENT NAME`,QUANTITY AS QUANTITY_SD_NUMBER0,\\n DESTINATION,ORDERTYPE AS ORDERTYPE_SD_TAG, PRICE AS PRICE_SD_CURUSD,\\n `PERCENT DONE` AS PERCENT_SD_PERCENT0, `AVG PX`, `PERCENT DONE` AS PERCENT_SD_DATABAR,\\n `UPNL` AS UPNL_SD_CURUSD\\nFROM trade ORDER BY TIME DESC LIMIT 300;\", \"refreshPeriod\": 1000 }, \"subConfig\": { \"overrideJson\": {}, \"colConfig\": {}, \"gridConfig\": { \"showPreheaderPanel\": false, \"showFilters\": true, \"frozenRow\": 0, \"showContextMenu\": true, \"pager\": \"0\", \"autosizeColumns\": true } } } } } ], \"active\": true } ] }}";	

	public static Dashboard getDashboard(String name) {
		Dashboard d = new Dashboard(name);
		d.setData(DashDemos.BLOTTER);
		return d;
	}
	
	public static List<Dashboard> getAllH2Demos() {
		List<Dashboard> l = new ArrayList<>();
		l.add(getDashboard("Trade Blotter"));
		return l;
	}
}


