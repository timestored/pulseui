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
 
import { DataTypes } from "../engine/chartResultSet";

type FormatCallback = (row:number, cell:number, value:any, columnDef:any, dataContext:any) => string;

/** Contains the logic for formatting currencies/numbers and styling based on _SD_ columns*/
export default class SFormatters {

    public static getRenderer(colName: string):FormatCallback | undefined {
        const c = colName.toLowerCase();
        if (c.endsWith("_sd_databar")) {
            return SFormatters.databarRenderer; //Formatters.PercentCompleteBar;
        } else if (c.endsWith("_sd_html")) {
            return (row:number, cell:number, value:any, columnDef:any, dataContext:any) => value;
        }
        return undefined;
    }
   
  /**
   * Generate random tag with color based on hash of text content.
   */
  private static databarRenderer(row:number, cell:number, value:any, columnDef:any, dataContext:any) {
    const color = value > 1.0 ? 'orange' : 'green';
    const n = Math.floor(Math.min(10, value * 10));
    const nf = new Intl.NumberFormat(undefined, { style: 'percent', minimumFractionDigits: 0 });
    const tooltip = nf.format(value);
    const rep = (n: number, color: string, title: string) => { return "<span title='" + title + "' style='color:" + color +"'>" + "█".repeat(n) + "</span>"; }
    return value ? "<span class='databar'>" + rep(n, color, tooltip) + rep(10 - n, '#ffffff00', tooltip) + "</span>" : "";
    }
    
    private static defaultFormatter(value:any) {
        const nf0 = new Intl.NumberFormat(undefined, { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0, });
        const nf2 = new Intl.NumberFormat(undefined, { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2, });
        const nf4 = new Intl.NumberFormat(undefined, { style: 'decimal', minimumFractionDigits: 4, maximumFractionDigits: 4, });
        if(typeof value === "number") {
            return value === 0 ? 0 : value < 0.5 ? nf4.format(value) : value > 1000000 ? nf0.format(value) : nf2.format(value);
        }
        return value;
    }


    static formatDate(row:number, cell:number, value:any, columnDef:any, dataContext:any) {
        if(value === null) {
            return '';
        }
        const s = (value as Date).toLocaleString('sv-SE');
        const millis = value % 1000;
        const m = (n: number) => (n < 10 ? "00" : n < 100 ? "0" : "") + n;

        if(millis !== 0) {
            return s + "." + m(millis).trim();
        }
        return s.replaceAll("00:00:00","").trim();
    }
    
    static getFormatter(colName: string, dtype: DataTypes):FormatCallback {
        const c = colName.toLowerCase();        
        if (dtype === "Date") {
            return SFormatters.formatDate;
        }
        return (row:number, cell:number, value:any, columnDef:any, dataContext:any) => this.defaultFormatter(value);
    }
}
