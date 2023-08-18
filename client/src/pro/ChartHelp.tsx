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
 
import { ChartType } from "../components/ChartFactory";
import { SmartRs } from "../engine/chartResultSet";
import { ExampleTestCases } from '../engine/ViewStrategy';


export default interface ChartTypeHelp {    chartType: ChartType;    description: string;    testCase: TestCase;    formatExplainationHtml: JSX.Element;    examples: Array<ExampleView>;    icon: string; }

class ChartTypeHelpC implements ChartTypeHelp {
    constructor(readonly chartType: ChartType, readonly description: string, readonly testCase: TestCase,
        readonly formatExplainationHtml: JSX.Element, readonly examples: Array<ExampleView> = [], readonly icon: string = "") { }
}
class ExampleView { constructor(readonly name: string, readonly description: string, readonly testCase: TestCase) { } }
class TestCase { constructor(readonly kdbQuery: string, readonly name: string, readonly srs: SmartRs) { } }

export function getChartHelp(): ChartTypeHelp[] {
    const r: ChartTypeHelp[] = [];
    const simpleFormatExplain = <ul>
        <li>The first string columns are used as category labels.</li>
        <li>Whatever numeric columns appear after the strings represents a separate series in the chart.</li>
    </ul>;
    r.push(new ChartTypeHelpC("area", "Area Chart", ExampleTestCases.COUNTRY_STATS, simpleFormatExplain));
    r.push(new ChartTypeHelpC("bar", "Bar Chart", ExampleTestCases.COUNTRY_STATS, simpleFormatExplain));    return r;
}

export function getChartHelpFor(chartType:ChartType): ChartTypeHelp { return getChartHelp().find(c => c.chartType === chartType)!; }

export function getKdbDemoQueryable(ct: ChartType):string {
    switch(ct) {
        case "bar": 
        case "stack": 
        case "bar_horizontal": 
        case "stack_horizontal": 
        case "line": 
        case "area": 
        case "pie": return "// See help->charts for details on format to customize your chart appearance"
            + "\n([] Company:`Microsoft`Oracle`Paypal`Monero`FXC`Braint`MS`UBS; "
            + "\n\t  PnL:(0.8+rand[0.2])*31847.0 13239.0 127938.0 81308.0 63047.0 13010.0 152518.0 166629.0;"
            + "\n\t  Revenue:(0.9+rand[0.1])*15080.0 11300.0 34444.0 3114.0 2228.0 88.9 1113.0 41196.0 ; "
            + "\n\t  Negatives:(0.95+rand[0.05])*48300.0 8400.0 34700.0 38100.0 36500.0 413.0 1788.0 11732.0 )";
    }
    return "// Time Series display can be configured by column names. See help->timeseries for details"
    + "\n{  walk:{ [seed;n]"
        + "\n\t r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};"
        + "\n\t prds (100+((r[seed;n]) mod 11)-5)%100};"
        + "\n\t c:{x mod `long$00:20:00.0t}x;   st:x-c;   cn:`long$c%1000;"
        + "\n\t ([] time:.z.d+st+1000*til cn; gold:walk[100;cn]; bitcoin:walk[2;cn])  }[.z.t]";  
}


export function getH2DemoQueryable(ct: ChartType):string {
    switch(ct) {
        case "timeseries":  
        case "bar": 
        case "stack": 
        case "bar_horizontal": 
        case "stack_horizontal": 
        case "line": 
        case "area":  return "select name, quantity,mid from position WHERE name<>'BRK.A'AND name<>'GOOG';";
        }
        return "SELECT TIME,BID,ASK FROM quote WHERE NAME='NFLX' AND TIME>timestampadd(minute,-20,date_trunc('minute',CURRENT_TIMESTAMP())) ORDER BY TIME ASC;"        
}
