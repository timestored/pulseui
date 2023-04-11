import assert from "assert";
import { SFormatters } from "../components/AGrid";

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
        let d = rsdata.tbl.data;
        // Use column names from data if it's there. If data is empty fallback to types.
        let colNames = Object.keys(d.length > 0 ? d[0] : rsdata.tbl.types); 
        for(let c = 0; c < colNames.length; c++) {
            let cn = colNames[c];
            let firstVal = undefined;
            for(let p = 0; p < d.length && (firstVal === undefined || firstVal === null); p++) {
                firstVal = (d[p])[cn];
            }
            if(rsdata.tbl.types[cn] === "Time") {
                this.rowTitle += (this.rowTitle === "" ? "" : " - ") + cn;
                let dates:Array<Date> = [];
                for(let r = 0; r < d.length; r++) {
                    dates.push(new Date((d[r])[cn] as number));
                }
                this.dateColumns.push(new Col(cn, dates));
                this.stringyColumns.push(new Col(cn, dates.map(d => SFormatters.formatTime(0, 0, d, null, null))));
            } else if(rsdata.tbl.types[cn] === "number" || typeof(firstVal) === "number") {
                let nums:Array<number> = [];
                for(let r = 0; r < d.length; r++) {
                    nums.push((d[r])[cn] as number);
                }
                this.numericColumns.push(new Col(cn, nums));
            } else if(rsdata.tbl.types[cn] === "string" || typeof(firstVal) === "string") {
                this.rowTitle += (this.rowTitle === "" ? "" : " - ") + cn;
                let strs:Array<string> = [];
                for(let r = 0; r < d.length; r++) {
                    strs.push((d[r])[cn] as string);
                }
                this.stringyColumns.push(new Col(cn, strs));
            } else if(rsdata.tbl.types[cn] === "Date" || (firstVal) instanceof Date) {
                this.rowTitle += (this.rowTitle === "" ? "" : " - ") + cn;
                let dates:Array<Date> = [];
                for(let r = 0; r < d.length; r++) {
                    dates.push((d[r])[cn] as Date);
                }
                this.dateColumns.push(new Col(cn, dates));
                this.stringyColumns.push(new Col(cn, dates.map(d => SFormatters.formatDate(0, 0, d, null, null))));
                
            }
        }

        this.rowLabels = ChartResultSet.generateRowLabels(this.stringyColumns, d.length);
    }

    private static generateRowLabels(stringyColumns:Array<Col<string>>, rowCount:number):Array<string> {
        if(stringyColumns.length === 0) {
            return Array(rowCount).fill(0).map((v,i)=>""+(1+i)); // no string columns, use row numbers
        }
        let res:Array<string> = [];
        let rows = (stringyColumns[0]).vals.length;
        for(let r=0; r<rows; r++) {
            let s = "";
            for(let sc of stringyColumns) {
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
}
export const EmptyRsData:RsData = { tbl: { data:[], types: {} }, exception:undefined, console:undefined, k:undefined}


export class SmartRs { 
    d = () => this.rsdata.tbl.data;
    rsdata: RsData;
    chartRS:ChartResultSet;
    
    constructor(rsdata:RsData){   
        if(rsdata.tbl !== undefined) {
            for (const [key, value] of Object.entries(rsdata.tbl.types)) {
                if(value === 'Date') {
                    for (var i = 0; i < rsdata.tbl.data.length; i++) {
                        let v = rsdata.tbl.data[i][key];
                        if(v && !(v instanceof Date)) {
                            rsdata.tbl.data[i][key] = new Date(v);
                        }
                    } 
                }
            }
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
}

export const EmptySmartRs = new SmartRs(EmptyRsData);




/** Abstract class intended for reuse */
export class Col<T> {
    constructor(readonly name:string, readonly vals:Array<T>){}
}

export type DataTypes="number"|"Date"|"Time"|"string";
export type DataTypeMap={[k:string]:DataTypes};

export function getSmartRs(colNames:string[], colValues:(string[] | number[] | Date[])[]):SmartRs {
    assert(colNames.length === colValues.length, "same number columns");
    if(colValues.length === 0) {
        return EmptySmartRs;
    }
    for(let c of colValues) {
        assert(colValues[0].length === c.length, "All rows equal length");
    }
    let types:DataTypeMap = {};
    for(let c = 0; c < colValues.length; c++) {
        types[colNames[c]] = (typeof colValues[c][0]) as DataTypes;
    }
    let data:Array<{[key:string] : number | string | Date}> = new Array(colValues[0].length);
    for(let r = 0; r < colValues[0].length; r++) {
        data[r] = {};
    }
    for(let c = 0; c < colValues.length; c++) {
        for(let r = 0; r < colValues[0].length; r++) {
            data[r][colNames[c]] = colValues[c][r];
        }
    }
    let rsdata:RsData = { tbl: { data:data, types:types }, console:undefined, exception:undefined };

    return new SmartRs(rsdata);
}
