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
 
import assert from "assert";
import { getLocalStorage } from "../components/hooks";
import { utcToZonedTime, format } from 'date-fns-tz';

import SFormatters from '../components/SFormatters';

/**
 * Decorates a resultSet to provide a data structure easier to access for charting.
 * <ul>
 * <li>Charts recognise only three types of columns: strings / numbers / dates</li>
 * <li>Number columns are all converted to {@link NumericCol} / double[]'s</li>
 * <li>Non-Number columns are all converted to {@link StringyCol}</li>
 * <li>Only the first date/time column is converted to {@link TimeCol}</li>
 * <li>The order of the columns is maintained within each column type </li>
 * </ul>
 */
export default class ChartResultSet {
    readonly numericColumns:Array<Col<number>>;
    readonly stringyColumns:Array<Col<string>>;
    readonly dateColumns:Array<Col<Date>>;
    readonly rowLabels:Array<string>;
    //private final TimeCol timeCol;
    readonly rowTitle:string;

    constructor(rsdata:RsData) {
        this.numericColumns = [];
        this.stringyColumns = [];
        this.dateColumns = [];
        this.rowLabels = [];
        this.rowTitle = "";

        if(rsdata.tbl === undefined || rsdata.tbl.data === undefined) {
            return;
        }
        const d = rsdata.tbl.data;
        // Use column names from data if it's there. If data is empty fallback to types.
        const colNames = Object.keys(d.length > 0 ? d[0] : rsdata.tbl.types); 
        for(let c = 0; c < colNames.length; c++) {
            const cn = colNames[c];
            let firstVal = undefined;
            for(let p = 0; p < d.length && (firstVal === undefined || firstVal === null); p++) {
                firstVal = (d[p])[cn];
            }
            const ct = rsdata.tbl.types[cn];
            if(ct === "number" || typeof(firstVal) === "number") {
                const nums:Array<number> = [];
                for(let r = 0; r < d.length; r++) {
                    nums.push((d[r])[cn] as number);
                }
                this.numericColumns.push(new Col(cn, nums));
            } else if(ct === "string" || typeof(firstVal) === "string") {
                this.rowTitle += (this.rowTitle === "" ? "" : " - ") + cn;
                const strs:Array<string> = [];
                for(let r = 0; r < d.length; r++) {
                    strs.push((d[r])[cn] as string);
                }
                this.stringyColumns.push(new Col(cn, strs));
            } else if(ct === "Date" || ct === "Time" || ct === "DateOnly" || (firstVal) instanceof Date) {
                this.rowTitle += (this.rowTitle === "" ? "" : " - ") + cn;
                const dates:Array<Date> = [];
                for(let r = 0; r < d.length; r++) {
                    dates.push((d[r])[cn] as Date);
                }
                this.dateColumns.push(new Col(cn, dates));
                this.stringyColumns.push(new Col(cn, dates.map(d => SFormatters.getFormatter(cn,ct)(0,0,d,null,null))));
                
            }
        }

        this.rowLabels = ChartResultSet.generateRowLabels(this.stringyColumns, d.length);
    }

    private static generateRowLabels(stringyColumns:Array<Col<string>>, rowCount:number):Array<string> {
        if(stringyColumns.length === 0) {
            return Array(rowCount).fill(0).map((v,i)=>""+(1+i)); // no string columns, use row numbers
        }
        const res:Array<string> = [];
        const rows = (stringyColumns[0]).vals.length;
        for(let r=0; r<rows; r++) {
            let s = "";
            for(const sc of stringyColumns) {
                s += (s === "" ? "" : " - ") + sc.vals[r];
            }
            res.push(s);
        }
        return res;
    }
}

export interface RsData { 
    tbl:{
        data:Array<{[key:string] : number | string | Date | null}>,
        types:DataTypeMap,
    }
    exception?:string;
    console?:string;
    k?:any;
    exceededMaxRows?:boolean;
}
export const EmptyRsData:RsData = { tbl: { data:[], types: {} }, exception:undefined, console:undefined, k:undefined}


function timeZoneOffsetInMillis(ianaTimeZone:string) {
    const now = new Date();
    now.setSeconds(0, 0);
  
    // Format current time in `ianaTimeZone` as `M/DD/YYYY, HH:MM:SS`:
    const tzDateString = now.toLocaleString('en-US', {
      timeZone: ianaTimeZone,
      hourCycle: 'h23',
    });
  
    // Parse formatted date string:
    const match = /(\d+)\/(\d+)\/(\d+), (\d+):(\d+)/.exec(tzDateString);
    if(match !== null) {
        const [, month, day, year, hour, min] = match.map(Number);
        // Change date string's time zone to UTC and get timestamp:
        const tzTime = Date.UTC(year, month - 1, day, hour, min);
        // Return the offset between UTC and target time zone:
        return Math.floor((tzTime - now.getTime()));
    }
    return 0;
  }

export class SmartRs { 
    d = () => this.rsdata.tbl.data;
    rsdata: RsData;
    chartRS:ChartResultSet;
    
    constructor(rsdata:RsData, tz:string|undefined = undefined){
        // Best practice to store data in UTC to prevent DST overlaps etc and allow sharing amongst team.
        // https://github.com/apache/echarts/issues/14453 eCharts cannot render UTC well, two options:
        //   1. Override all formatters to format UTC data = works ok EXCEPT tick marks are generated badly e.g. 2023-01-01 01:00 - instead of rounded date for midnight.
        //   2. Send in all data to eCharts as UTC converted to target local time so it thinks it's just showing local.
        // shift by local offset so that 11PM UTC makes 11PM Locally to show sensibly.
        // Then shift again to get from local time to target time zone.
        const browserTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const myTz = tz !== undefined ? tz : getLocalStorage("timezone", browserTZ); 
        if(rsdata.tbl !== undefined) {
            for (const [key, value] of Object.entries(rsdata.tbl.types)) {
                // https://www.timestored.com/pulse/help/timezone-wrong
                //  If we convert the date column, naively it would be 2025-01-01T00:00 -> 2024-12-31T20:00, i.e. it has gone back to the previous day. This makes no sense in a table.
                // Assuming we are not going to convert just dates, We can't convert just time else they wouldn't agree.
                // Therefore only converting full DateTime makes sense and is useful to users that want to see local time.
                const onlyDorT = value === 'Time' || value === 'DateOnly';
                if(value === 'Date' || onlyDorT) {
                    for (let i = 0; i < rsdata.tbl.data.length; i++) {
                        const v = rsdata.tbl.data[i][key];
                        if(v !== undefined && v !== null && typeof v == "number") {
                            rsdata.tbl.data[i][key] = utcToZonedTime(v,onlyDorT ? browserTZ : myTz);
                        }
                    } 
                }
            }
        } else {
            // kdb results can return no table just console.
            rsdata.tbl =  { data:[], types: {} };
        }
        this.rsdata = rsdata;
        this.chartRS = new ChartResultSet(rsdata);
    }

    count():number { return this.d().length; }
    
    findColumn(name:string):string | undefined { 
        if(this.count()<1) {
            return undefined;
        }
        return Object.keys(this.rsdata.tbl.data[0]).find(e => e.toUpperCase() === name.toUpperCase());
    }
    getRange<T>(vals:T[]):T[] {
        if(vals.length < 1) { return []; }
        const min = vals.reduce((p,v) => v < p ? v : p);
        const max = vals.reduce((p,v) => v > p ? v : p);
        return [min, max];
    }
    getDateRange():Date[] {
        if(this.chartRS.dateColumns.length < 1) { return []; }
        return this.getRange(this.chartRS.dateColumns[0].vals);
    }

    getColumnNames():string[] { return Object.keys(this.rsdata.tbl.types); }

    toString():string {
        const d = this.rsdata.tbl.data;
        if(d.length === 0) {
            return "EmptyTable";
        }
        let v = "";
        if(this.count() >= 1) {
            const ks = Object.keys(d[0]);
            if(ks.length >= 1) {
                v = ""+ (d[0][ks[0]] ?? "null");
                if(this.count() === 1 && ks.length === 1) {
                    return v; // as it's only cell in whole table.
                }
            }
        }
        return "Table with " + this.count() + " rows returned." + (v.length > 0 ? (" first value = " + v) : "");
    }
}

export const EmptySmartRs = new SmartRs(EmptyRsData);




/** Abstract class intended for reuse */
export class Col<T> {
    constructor(readonly name:string, readonly vals:Array<T>){}
}

export type DataTypes="number"|"Date"|"DateOnly"|"Time"|"string"|"numarray"|"";
export type DataTypeMap={[k:string]:DataTypes};

export function getSmartRs(colNames:string[], colValues:(string[] | number[] | Date[])[]):SmartRs {
    assert(colNames.length === colValues.length, "same number columns");
    if(colValues.length === 0) {
        return EmptySmartRs;
    }
    for(const c of colValues) {
        assert(colValues[0].length === c.length, "All rows equal length");
    }
    const types:DataTypeMap = {};
    for(let c = 0; c < colValues.length; c++) {
        types[colNames[c]] = (typeof colValues[c][0]) as DataTypes;
    }
    const data:Array<{[key:string] : number | string | Date}> = new Array(colValues[0].length);
    for(let r = 0; r < colValues[0].length; r++) {
        data[r] = {};
    }
    for(let c = 0; c < colValues.length; c++) {
        for(let r = 0; r < colValues[0].length; r++) {
            data[r][colNames[c]] = colValues[c][r];
        }
    }
    const rsdata:RsData = { tbl: { data:data, types:types }, console:undefined, exception:undefined };

    return new SmartRs(rsdata);
}
