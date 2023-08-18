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
 
import { Button, Collapse  } from '@blueprintjs/core';
import { useNavigate } from 'react-router-dom';
import { ServerConfig  } from '../components/ConnectionsPage';
import { IJsonModel } from 'flexlayout-react';
import useLocalStorage from '../components/hooks';
import { DEFAULT_GLOBAL } from '../components/FlexPanel';
import { useCallback } from 'react';
import { addKnownDemo, Dash } from '../components/DashPage';


export type KnownDashTitles = "Price Grid"|"Trade Blotter";

export function getDashCoverImg(dashTitle:KnownDashTitles|string) {
    const n = dashTitle;
     if(n === "Price Grid") {
        return "./img/dashcovers/price-grid-small.png";
    } else if(n === "Trade Blotter") {
        return "./img/dashcovers/blotter2.png";
    }
    return null;
}

function getImg(dashTitle:KnownDashTitles) {
    const n = dashTitle;
     if(n === "Price Grid") {
        return <img src="./img/price-grid-small.png" width="150" height="150" alt="Price Grid" />;
    } else if(n === "Trade Blotter") {
        return <img src="./img/blotter2.png" width="150" height="150" alt="Trade Blotter" />;
    } 
    return null;
}


function getKdbTaqChartDemoDash():Dash {
    const dashJson:IJsonModel  = { "global": DEFAULT_GLOBAL, "borders": [], "layout": { "type": "row", "id": "#481b8859-f414-4607-9872-130e1c4e7aa5", "children": [ { "type": "row", "id": "#42ccca57-d5b3-4080-930c-faea3b92d935", "weight": 25, "children": [ { "type": "tabset", "id": "#8c7aa838-3d1e-4feb-af09-a32b41446ebc", "weight": 79.2102206736353, "children": [ { "type": "tab", "id": "#be3da150-92f7-4026-b5c6-45697b098514", "name": "TAQ", "component": "timeseries", "config": { "dashstate": { "chartType": "timeseries", "queryable": { "serverName": "KDB:localhost:5000", "query": "// Time Series display can be configured by column names. See help->timeseries for details\n{ r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n walk:{ [r;seed;n] prds (100+((r[seed;n]) mod 11)-5)%100}[r;;];\n c:{x mod `long$00:05:00.0t}x; st:x-c; cn:100+`long$c%500;\n t:([] time:.z.d+st+1000*til cn; bid:walk[100;cn]);\n rnd:{[r;seed;n] (r[seed;n] mod 1000)%1000}[r;;];\n t:update ask:bid+0.1*rnd[10;cn] from t;\n t:update buy_SD_CIRCLE:?[rnd[11;cn]>0.92;bid-rnd[11;cn]*0.03;0n],sell_SD_CIRCLE:?[rnd[15;cn]>0.92;ask+rnd[11;cn]*0.03;0n] from t;\n t:update buy_SD_SIZE:?[null buy_SD_CIRCLE; 0n; 1+r[14;cn] mod 10],sell_SD_SIZE:?[null sell_SD_CIRCLE; 0n; 1+r[14;cn] mod 10] from t;\n t:update hedger_buy_SD_TRIANGLE:?[rnd[11;cn]>0.98;bid-rnd[11;cn]*0.01;0n],hedger_sell_SD_TRIANGLE:?[rnd[15;cn]>0.98;ask+rnd[11;cn]*0.01;0n] from t;\n t:update hedger_buy_SD_SIZE:?[null hedger_buy_SD_TRIANGLE; 0n; 6+r[14;cn] mod 14],hedger_sell_SD_SIZE:?[null hedger_sell_SD_TRIANGLE;0n;6+r[14;cn] mod 14] from t;\n t}[.z.t]", "refreshPeriod": 1000 },"subConfig": { "overrideJson": { "custom": { "dataZoom": { "show": true } } }} } } }, { "type": "tab", "id": "#09eb0ad0-1438-40e7-93d8-0b9e2caf12b9", "name": "grid", "component": "grid", "config": { "dashstate": { "chartType": "grid", "queryable": { "serverName": "KDB:localhost:5000", "query": "// Time Series display can be configured by column names. See help->timeseries for details\n{ r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n walk:{ [r;seed;n] prds (100+((r[seed;n]) mod 11)-5)%100}[r;;];\n c:{x mod `long$00:05:00.0t}x; st:x-c; cn:100+`long$c%500;\n t:([] time:.z.d+st+1000*til cn; bid:walk[100;cn]);\n rnd:{[r;seed;n] (r[seed;n] mod 1000)%1000}[r;;];\n t:update ask:bid+0.1*rnd[10;cn] from t;\n t:update buy_SD_CIRCLE:?[rnd[11;cn]>0.92;bid-rnd[11;cn]*0.03;0n],sell_SD_CIRCLE:?[rnd[15;cn]>0.92;ask+rnd[11;cn]*0.03;0n] from t;\n t:update buy_SD_SIZE:?[null buy_SD_CIRCLE; 0n; 1+r[14;cn] mod 10],sell_SD_SIZE:?[null sell_SD_CIRCLE; 0n; 1+r[14;cn] mod 10] from t;\n t:update hedger_buy_SD_TRIANGLE:?[rnd[11;cn]>0.98;bid-rnd[11;cn]*0.01;0n],hedger_sell_SD_TRIANGLE:?[rnd[15;cn]>0.98;ask+rnd[11;cn]*0.01;0n] from t;\n t:update hedger_buy_SD_SIZE:?[null hedger_buy_SD_TRIANGLE; 0n; 6+r[14;cn] mod 14],hedger_sell_SD_SIZE:?[null hedger_sell_SD_TRIANGLE;0n;6+r[14;cn] mod 14] from t;\n t:select from t where (not null buy_SD_CIRCLE) or (not null sell_SD_CIRCLE) or (not null hedger_buy_SD_TRIANGLE) or (not null hedger_sell_SD_TRIANGLE);\n t:delete hedger_buy_SD_SIZE,hedger_sell_SD_SIZE,sell_SD_SIZE,buy_SD_SIZE from t;\n reverse t}[.z.t]", "refreshPeriod": 5000 } } } } ] }, { "type": "tabset", "id": "#9355c28b-ef59-424d-a2e8-5ceab5c9c19a", "weight": 20.78977932636469, "children": [ { "type": "tab", "id": "#c8a626a2-6e0d-4659-a05c-a1f08e88e0fe", "name": "Position", "component": "timeseries", "config": { "dashstate": { "chartType": "timeseries", "queryable": { "serverName": "KDB:localhost:5000", "query": "// Time Series display can be configured by column names. See help->timeseries for details\n{ r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n walk:{ [r;seed;n] prds (100+((r[seed;n]) mod 11)-5)%100}[r;;];\n c:{x mod `long$00:05:00.0t}x; st:x-c; cn:100+`long$c%500;\n t:([] time:.z.d+st+1000*til cn; bid:walk[100;cn]);\n rnd:{[r;seed;n] (r[seed;n] mod 1000)%1000}[r;;];\n t:update ask:bid+0.1*rnd[10;cn] from t;\n t:update buy_SD_CIRCLE:?[rnd[11;cn]>0.92;bid-rnd[11;cn]*0.03;0n],sell_SD_CIRCLE:?[rnd[15;cn]>0.92;ask+rnd[11;cn]*0.03;0n] from t;\n t:update buy_SD_SIZE:?[null buy_SD_CIRCLE; 0n; 1+r[14;cn] mod 10],sell_SD_SIZE:?[null sell_SD_CIRCLE; 0n; 1+r[14;cn] mod 10] from t;\n t:update hedger_buy_SD_TRIANGLE:?[rnd[11;cn]>0.98;bid-rnd[11;cn]*0.01;0n],hedger_sell_SD_TRIANGLE:?[rnd[15;cn]>0.98;ask+rnd[11;cn]*0.01;0n] from t;\n t:update hedger_buy_SD_SIZE:?[null hedger_buy_SD_TRIANGLE; 0n; 6+r[14;cn] mod 14],hedger_sell_SD_SIZE:?[null hedger_sell_SD_TRIANGLE;0n;6+r[14;cn] mod 14] from t;\n t:select time,action:0+((0^buy_SD_CIRCLE*buy_SD_SIZE)+(0^hedger_buy_SD_TRIANGLE*hedger_buy_SD_SIZE))-\n ((0^sell_SD_CIRCLE*sell_SD_SIZE)+(0^hedger_sell_SD_TRIANGLE*hedger_sell_SD_SIZE)) from t;\n update ulimit:150,dlimit:-150,position:sums action from t}[.z.t]", "refreshPeriod": 1000 },  } } } ], "active": true } ] } ] } };
    return { id: -1, version:0, name: "TAQ", defaultParams:"", data: dashJson, dateCreated: new Date(), dateUpdated: new Date() };
}


export function DemoListing(props:{addDemo:(sc:ServerConfig, d:Dash) => void, isOpen?:boolean}) {
    const [showDemos, setShowDemos] = useLocalStorage("showDemos",props.isOpen === true);
    const navigate = useNavigate();

    const kdbDemoSc: ServerConfig = { id: -1, name: "KDB:localhost:5000", host: "localhost", port: 5000, jdbcType: "KDB", database: undefined, url: undefined, username: undefined, password: undefined };
    const But = useCallback((props:{title:KnownDashTitles}) => {
        return <p><Button small icon="add" title="Copy this dashboard." onClick={() => { addKnownDemo(props.title, url => navigate(url + (url.includes("?") ? "&" : "?") + "sd_edit=1")); }} >Add Dashboard</Button></p>;
    },[navigate]);

    return <>
    <Button small onClick={() => setShowDemos(!showDemos)}>
        {showDemos ? "Hide" : "Show"} Examples
    </Button>
    <Collapse isOpen={showDemos}>

    <div id="demosDiv">
            <h1>Demos</h1>
            <div className="floatbox" title="Table displaying live trades. &#10;Examples of highlighting, currency formatting.">
                <h4>Trade Blotter</h4>
                <div className="demo">{getImg("Trade Blotter")}</div>
                <But title='Trade Blotter'/>
            </div>        
            <div className="floatbox" title="Grid of Time Series Charts">
                <h4>Price Grid</h4>
                <div className="demo">{getImg("Price Grid")}</div>
                <But title='Price Grid'/>
            </div>
            
                  
        </div>

        <div id="kdbDemosDiv">
            <div className="floatbox" title="Streaming Quotes,Trades and current position">
                <h4>Trade Surveillance</h4>
                <div className="demo">Trade Surveillance</div>
                <p><Button small title="Copy this dashboard." icon="add" onClick={() => { props.addDemo(kdbDemoSc, getKdbTaqChartDemoDash()); }} >Add Dashboard</Button></p>
            </div>   
        </div>
    </Collapse>
            
    </>;
}
