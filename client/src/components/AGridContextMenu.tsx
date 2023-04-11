import { DataTypes, SmartRs } from "../engine/chartResultSet";
import React, { useContext } from 'react';
import { Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import { SFormatters } from "./AGrid";
import writeXlsxFile from 'write-excel-file';
import { isAdmin, ThemeContext } from "../context";
import { aNAME } from './../App';
import { ColFormat } from "./ChartFactory";

//  Popup context menu allowing saving/exporting of data to CSV/excel etc.
// @TODO - All methods should work similarly and possibly hide _SD_ columns etc.
// @TODO - Excel would ideally show formatting
// 
// Note there are 3 export methods as users want:
// 1. Interactive fancy slick grid.
// 2. Ability to download excel
// 3. Ability to email tables? - Note the email tables could be used for excel copy-paste but NOT download.

export default function AGridContextMenu(props: { srs: SmartRs | null; x: number; y: number; selectionMade: () => void; colName:string, setColumnFormat:(colName:string, colFormat:ColFormat)=>void }) {
    const {srs,colName} = props;
    const context = useContext(ThemeContext);

    const clean = (e: React.MouseEvent) => { e.stopPropagation(); props.selectionMade(); };
    const toXL = (e: React.MouseEvent) => { if (srs) { copyTable(srs); }; clean(e); };
    const toCSV = (e: React.MouseEvent) => { if (srs) { copyToClipboard(genCSV(srs, true, "\t")); }; clean(e); };
    const downCSV = (e: React.MouseEvent) => { if (srs) { download(aNAME + ".csv", genCSV(srs, true)); }; clean(e); };
    const downExcel = (e: React.MouseEvent) => { if (srs) { genExcel(srs); }; clean(e); };
    const disabled = srs === null || srs.count() < 1;
    const colMenuHidden = !isAdmin(context) || colName === undefined || colName.length === 0;

    const ColMenu = colMenuHidden ?
            <MenuItem icon="column-layout" text="Format Column" onClick={() => {}} disabled={true} ></MenuItem>
        :   <MenuItem icon="column-layout" text="Format Column" onClick={() => {}} >
              {getNumberFormatMenuOptions({colName, setColumnFormat:props.setColumnFormat})}
              {getTextFormatMenuOptions({colName, setColumnFormat:props.setColumnFormat})}
            </MenuItem>;

    return <ContextMenu x={props.x} y={props.y}>
        <Menu large={false}>
            <MenuItem icon="clipboard" text="Copy Table" onClick={toCSV} disabled={disabled} />
            <MenuItem icon="download" text="Download CSV" onClick={downCSV} disabled={disabled} />
            {/*  This call is used by report generator / selenium to get HTML */}
            <MenuItem icon="th-derived" text="Copy Table with Formatting" onClick={toXL} disabled={disabled} />
            <MenuItem icon="download" text="Download Excel" onClick={downExcel} disabled={disabled} />
            <MenuDivider />
            {ColMenu}
        </Menu>
    </ContextMenu>;
}

export function getTextFormatMenuOptions(props:{colName:string, setColumnFormat:(colName:string, colFormat:ColFormat)=>void }) {
    const {colName, setColumnFormat} = props;
    return <>
        <MenuItem icon="tag" text="Tags" onClick={() =>{ setColumnFormat(colName,"TAG") }} />
        <MenuItem text="Raw HTML" onClick={() =>{ setColumnFormat(colName,"HTML") }} />
    </>;
}

export function getNumberFormatMenuOptions(props:{colName:string, selected?:ColFormat, setColumnFormat:(colName:string, colFormat:ColFormat)=>void }) {
    const {colName, selected, setColumnFormat} = props;
    return   <>
        <MenuItem icon="eraser" text="Clear Formatting" onClick={() =>{ setColumnFormat(colName,"") }} />
        <MenuItem icon="floating-point" text="Number" onClick={() =>{ setColumnFormat(colName,"NUMBER2") }} >
            <MenuItem text="1 - 0 Decimal Places" onClick={() =>{ setColumnFormat(colName,"NUMBER0") }}     icon={selected === "NUMBER0" ? "tick" : null} />
            <MenuItem text="1.1 - 1 Decimal Place" onClick={() =>{ setColumnFormat(colName,"NUMBER1") }}    icon={selected === "NUMBER1" ? "tick" : null} />
            <MenuItem text="1.12 - 2 Decimal Places" onClick={() =>{ setColumnFormat(colName,"NUMBER2") }}  icon={selected === "NUMBER2" ? "tick" : null} />
            <MenuItem text="1.123 - 3 Decimal Places" onClick={() =>{ setColumnFormat(colName,"NUMBER3") }} icon={selected === "NUMBER3" ? "tick" : null} />
            <MenuItem text="1.1234 - 4 Decimal Places" onClick={() =>{ setColumnFormat(colName,"NUMBER4") }}      icon={selected === "NUMBER4" ? "tick" : null} />
            <MenuItem text="1.12345 - 5 Decimal Places" onClick={() =>{ setColumnFormat(colName,"NUMBER5") }}     icon={selected === "NUMBER5" ? "tick" : null}/>
            <MenuItem text="1.123456 - 6 Decimal Places" onClick={() =>{ setColumnFormat(colName,"NUMBER6") }}    icon={selected === "NUMBER6" ? "tick" : null}/>
            <MenuItem text="1.1234567 - 7 Decimal Places" onClick={() =>{ setColumnFormat(colName,"NUMBER7") }}   icon={selected === "NUMBER7" ? "tick" : null}/>
            <MenuItem text="1.12345678 - 8 Decimal Places" onClick={() =>{ setColumnFormat(colName,"NUMBER8") }}  icon={selected === "NUMBER8" ? "tick" : null}/>
            <MenuItem text="1.123456789 - 9 Decimal Places" onClick={() =>{ setColumnFormat(colName,"NUMBER9") }} icon={selected === "NUMBER9" ? "tick" : null}/>
        </MenuItem>
        <MenuItem icon="percentage" text="Percentage" onClick={() =>{ setColumnFormat(colName,"PERCENT2") }} >
            <MenuItem text="1% - 0 Decimal Place" onClick={() =>{ setColumnFormat(colName,"PERCENT0") }}     icon={selected === "PERCENT0" ? "tick" : null} />
            <MenuItem text="1.1% - 1 Decimal Place" onClick={() =>{ setColumnFormat(colName,"PERCENT1") }}   icon={selected === "PERCENT1" ? "tick" : null} />
            <MenuItem text="1.12% - 2 Decimal Places" onClick={() =>{ setColumnFormat(colName,"PERCENT2") }} icon={selected === "PERCENT2" ? "tick" : null} />
        </MenuItem>
        <MenuItem icon="dollar" text="Currency" onClick={() =>{ setColumnFormat(colName,"CURUSD") }} >
            <MenuItem text="$1.22 - USD" onClick={() =>{ setColumnFormat(colName,"CURUSD") }} icon={selected === "CURUSD" ? "tick" : null} />
            <MenuItem text="€1.22 - EUR" onClick={() =>{ setColumnFormat(colName,"CUREUR") }} icon={selected === "CUREUR" ? "tick" : null} />
            <MenuItem text="£1.22 - GBP" onClick={() =>{ setColumnFormat(colName,"CURGBP") }} icon={selected === "CURGBP" ? "tick" : null} />
        </MenuItem>
    </>;
}

export function ContextMenu(props:{children:React.ReactNode, x: number; y: number;}) {
    return <div className="GRcontextMenu" style={{ top: props.y, left: props.x }}>
        {props.children}
    </div>;
}




// Copies a string to the clipboard. Must be called from within an
// event handler such as click. May return false if it failed, but
// this is not always possible. Browser support for Chrome 43+,
// Firefox 42+, Safari 10+, Edge and Internet Explorer 10+.
// Internet Explorer: The clipboard feature may be disabled by
// an administrator. By default a prompt is shown the first
// time the clipboard is used (per session).
export function copyToClipboard(text:string) { // @ts-ignore
    if (window.clipboardData?.setData) {
        // @ts-ignore  Internet Explorer-specific code path to prevent textarea being shown while dialog is visible. 
        return window.clipboardData.setData("Text", text);

    }
    else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
        var textarea = document.createElement("textarea");
        textarea.textContent = text;
        textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in Microsoft Edge.
        document.body.appendChild(textarea);
        textarea.select();
        try {
            return document.execCommand("copy");  // Security exception may be thrown by some browsers.
        }
        catch (ex) {
            console.warn("Copy to clipboard failed.", ex);
            return prompt("Copy to clipboard: Ctrl+C, Enter", text);
        }
        finally {
            document.body.removeChild(textarea);
        }
    }
}

function genTable(t:HTMLTableElement, srs:SmartRs, includeHeader:boolean) {
    let d = srs?.rsdata.tbl.data;
    if(d && d.length > 0) {
        var rn=0;
        let keys = Object.keys(d[0]);
        if(includeHeader) {
            let r = t.insertRow();
            keys.forEach((value,idx) => r.insertCell().innerHTML = value ? ""+value : ""); 
        }
        for(rn=0;rn<d.length;rn++) {
            let r = t.insertRow();
            for(var cn=0;cn<keys.length;cn++) {
                let c = r.insertCell();
                let value = d[rn][keys[cn]];
                c.innerHTML = value ? ""+value : "";
            }
        }
    }
    return t;
}


function genExcel(srs:SmartRs) {
    let d = srs?.rsdata.tbl.data;
    if(d && d.length > 0) {
        const schem = Object.entries(srs.rsdata.tbl.types).map((typ) => { return { 
            column:typ[0], 
            type:typ[1] === "number" ? Number : String, 
            value:(e:any) => typ[1] === "number" ? e[typ[0]] : getFormatter(typ[1])(e[typ[0]])}; 
        });
        // @ts-ignore
        writeXlsxFile(d, {schema:schem, fileName:aNAME + ".xlsx"});
    }
}

function getFormatter(dtype:DataTypes):(value:any)=>string {
    if (dtype === "Date") {
        return (value) => SFormatters.formatDate(0, 0, value as Date, null, null);
    } else if (dtype === "Time") {
        return (value) => SFormatters.formatTime(0, 0, value, null, null);
    }
    return (value) => (value ? ""+value : "");
}

function genCSV(srs:SmartRs, includeHeader:boolean, separator:string = ",") {
    let d = srs?.rsdata.tbl.data;
    const P = separator;
    const N = "\r\n";
    let s = "";
    
    if(d && d.length > 0) {
        var rn=0;
        let keys = Object.keys(d[0]);
        if(includeHeader) {
            keys.forEach((value,idx) => s += (idx === 0 ? "" : P) + (value ? ""+value : ""));
            s += N;
        }
        for(rn=0;rn<d.length;rn++) {
            for(var cn=0;cn<keys.length;cn++) {
                let value = d[rn][keys[cn]];
                let dtype = srs?.rsdata.tbl.types[keys[cn]];
                let v = getFormatter(dtype)(value);
                // If there's a comma, quote it. If when quoting it, escape quotes.
                s += (cn === 0 ? "" : P) + (v.includes(",") ? ("\"" + (v.includes("\"") ? v.replace("\"","\"\"") : v) + "\"") : v);
            }
            s += N;
        }
    }
    return s;
}

export function download(filename:string, text:string) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

export function copyTable(srs:SmartRs) {
    // I'm using my-tabby within the java selenium to fetch the table of data.
    var e = document.getElementById("my-tabby");
    if(e !== null) {
        e.parentNode?.removeChild(e);
    }

    let t = document.createElement("table");
    t.setAttribute('id', 'my-tabby');
    t.setAttribute('style', 'display:none;');
    genTable(t, srs, true);
    document.body.appendChild(t);
    let range = document.createRange();
    range.selectNode(t); 
    window.getSelection()?.addRange(range);
    document.execCommand('copy');  // Copying is by far the most expensive 80+% on large tables
    window.getSelection()?.removeRange(range);
}