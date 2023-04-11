import { DataTypes, SmartRs } from "../engine/chartResultSet";
import React, { useContext } from 'react';
import { Button, IconName, Menu, MenuDivider, MenuItem, Position } from "@blueprintjs/core";
import { IconCodepoints  } from "@blueprintjs/icons";
import SFormatters from "./SFormatters";
import writeXlsxFile from 'write-excel-file';
import { isAdmin, ThemeContext } from "../context";
import { aNAME } from './../App';
import { ColFormat } from "./ChartFactory";
import { AiOutlineBoxPlot } from 'react-icons/ai';
import { Popover2 } from "@blueprintjs/popover2";
import { ColAlignOptions } from "./AGrid";
import { ActionHandler } from "../engine/actionHandlers";

//  Popup context menu allowing saving/exporting of data to CSV/excel etc.
// @TODO - All methods should work similarly and possibly hide _SD_ columns etc.
// @TODO - Excel would ideally show formatting
// 
// Note there are 3 export methods as users want:
// 1. Interactive fancy slick grid.
// 2. Ability to download excel
// 3. Ability to email tables? - Note the email tables could be used for excel copy-paste but NOT download.

type GridArgs = { colName:string, selected:ColFormat, setColumnFormat:(colName:string, colFormat:ColFormat)=>void }

export default function AGridContextMenu(props: { srs: SmartRs | null; x: number; y: number; selectionMade: (ah?:ActionHandler) => void; setColumnAlign:(colAlign:ColAlignOptions)=>void, actionHandlers:ActionHandler[]} & GridArgs) {
    const {srs,colName} = props;
    const context = useContext(ThemeContext);

    const clean = (e: React.MouseEvent, ah?:ActionHandler) => { e.stopPropagation(); };
    const toXL = (e: React.MouseEvent) => { if (srs) { copyTable(srs); }; clean(e); };
    const toCSV = (e: React.MouseEvent) => { if (srs) { copyToClipboard(genCSV(srs, true, "\t")); }; clean(e); };
    const downCSV = (e: React.MouseEvent) => { if (srs) { download(aNAME + ".csv", genCSV(srs, true)); }; clean(e); };
    const downExcel = (e: React.MouseEvent) => { if (srs) { genExcel(srs); }; clean(e); };
    const disabled = srs === null || srs.count() < 1;
    const colMenuHidden = !isAdmin(context) || colName === undefined || colName.length === 0;

    const gridArgs = {colName, setColumnFormat:props.setColumnFormat, selected:props.selected};
    const ColMenu = colMenuHidden ?
            <><MenuItem icon="column-layout" text="Format Column" onClick={() => {}} disabled={true} ></MenuItem>
              <MenuItem icon="align-center" text="Alignment" onClick={() => {}} disabled={true} ></MenuItem></>
        :   <><MenuItem icon="column-layout" text="Format Column" onClick={() => {}} >
                    {getNumberFormatMenuOptions(gridArgs)}
                    {getTextFormatMenuOptions(gridArgs)}
                    <MenuItem text="Spark" icon="timeline-line-chart">
                        {getNumarrayFormatMenuOptions(gridArgs)}
                    </MenuItem>
                </MenuItem>
                <MenuItem icon="align-center" text="Alignment" onClick={() => {}} >
                    <MenuItem icon="align-left" text="Align Left" onClick={() =>{ props.setColumnAlign("left")  }} />
                    <MenuItem icon="align-center" text="Align Center" onClick={() =>{ props.setColumnAlign("center")  }} />
                    <MenuItem icon="align-right" text="Align Right" onClick={() =>{ props.setColumnAlign("right")  }} />
                </MenuItem></>;

    return <ContextMenu x={props.x} y={props.y}>
        <Menu large={false}>
        {props.actionHandlers && props.actionHandlers.length>0 &&
             <>
             {props.actionHandlers.map((a,idx) => 
                <MenuItem key={"action" + idx} icon={getIcon(a.name,"blank")} text={a.name.length>0 ? a.name : ("Action " + (1+idx))}  
                        onClick={e => { e.stopPropagation(); props.selectionMade(a); }} />)}
             <MenuDivider />
             </>
        }
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

function toShortName(cf:ColFormat):string {
    if(cf === undefined || cf === null) {
        return "";
    }
    if(cf.startsWith("NUMBER")) {
        return cf.substring(6).replace("P","") + "dp" + (cf.endsWith("P") ? " no (,)" : "");
    } else if(cf.startsWith("PERCENT")) {
        return "% " + cf.substring(7) + "dp";
    } else if(cf.startsWith("CUR")) {
        return cf.substring(3);
    } else if(cf.startsWith("SPARK")) {
        return cf.substring(5);
    }
    return cf;
}    

////////////       ColEditor
export const FormatterButton = (props:GridArgs & { type:DataTypes}) => {
	let menuItems = null;
	if(props.type === "number") {
		menuItems = getNumberFormatMenuOptions(props);
	} else if (props.type === "numarray") {
		menuItems = getNumarrayFormatMenuOptions(props);
	} else {
		menuItems = getTextFormatMenuOptions(props);
	}
	let typeTxt = ""+props.selected;
	if(props.selected===undefined || props.selected.length <= 0) {
		typeTxt = " \t ";
	} else {
        typeTxt = toShortName(props.selected);
    }
	return <Popover2 content={<Menu>{menuItems}</Menu>} position={Position.BOTTOM}>
			<Button text={typeTxt} key={props.colName} rightIcon="caret-down" small style={{minWidth:"80px"}}/>
		</Popover2>;
}

function getTextFormatMenuOptions(props:GridArgs) {
    const {colName, setColumnFormat} = props;
    return <>
        <MenuItem icon="tag" text="Tags" onClick={() =>{ setColumnFormat(colName,"TAG") }} />
        <MenuItem text="Raw HTML" onClick={() =>{ setColumnFormat(colName,"HTML") }} />
    </>;
}


function getNumarrayFormatMenuOptions(props:GridArgs) {
    const {colName, setColumnFormat} = props;
    return (<>
        <MenuItem icon="eraser" text="Clear Formatting" onClick={() =>{ setColumnFormat(colName,"") }} />
        <MenuItem icon="timeline-line-chart" text="Spark Line" onClick={() =>{ setColumnFormat(colName,"SPARKLINE") }} />
        <MenuItem icon="vertical-bar-chart-asc" text="Spark Bar" onClick={() =>{ setColumnFormat(colName,"SPARKBAR") }} />
        <MenuItem icon="waterfall-chart" text="Spark Discrete" onClick={() =>{ setColumnFormat(colName,"SPARKDISCRETE") }} />
        <MenuItem icon="timeline-line-chart" text="Spark Bullet" onClick={() =>{ setColumnFormat(colName,"SPARKBULLET") }} />
        <MenuItem icon="pie-chart" text="Spark Pie" onClick={() =>{ setColumnFormat(colName,"SPARKPIE") }} />
        <MenuItem icon={<AiOutlineBoxPlot />} text="Spark Boxplot" onClick={() =>{ setColumnFormat(colName,"SPARKBOXPLOT") }} />
        {/* {getNumberFormatMenuOptions(props)} */}
    </>);
}

function getNumberFormatMenuOptions(props:GridArgs) {
    const {colName, selected, setColumnFormat} = props;
    const isEmptySelected = selected === undefined || selected === null || selected.length === 0;
    const isPlain = selected !== undefined &&  selected.endsWith("P");
    const toggleVal:ColFormat = (selected && selected.startsWith("NUMBER")) ? ((isPlain ? selected.substring(0, selected.length-1) : (selected + "P")) as ColFormat) : "NUMBER2P";
    function setN(fmt:ColFormat) { setColumnFormat(colName,(fmt + ((isEmptySelected || isPlain) ? "" : "P")) as ColFormat); }
    function getNumIcon(fmt:ColFormat) { return (selected === fmt || selected === (fmt+"P")) ? "tick" : null; };
    return   <>
        <MenuItem icon="eraser" text="Clear Formatting" onClick={() =>{ setColumnFormat(colName,"") }} />
        <MenuItem icon="floating-point" text="Number" onClick={() =>{ setN("NUMBER2") }} >
            <MenuItem text="Show 1000s Separator (,)" onClick={(se) =>{ setColumnFormat(colName,toggleVal) }}     icon={isPlain ? "square" : "tick"} />
            <MenuItem text="1 - 0 Decimal Places" onClick={() =>{ setN("NUMBER0") }}     icon={getNumIcon("NUMBER0")} />
            <MenuItem text="1.1 - 1 Decimal Place" onClick={() =>{ setN("NUMBER1") }}    icon={getNumIcon("NUMBER1")} />
            <MenuItem text="1.12 - 2 Decimal Places" onClick={() =>{ setN("NUMBER2") }}  icon={getNumIcon("NUMBER2")} />
            <MenuItem text="1.123 - 3 Decimal Places" onClick={() =>{ setN("NUMBER3") }} icon={getNumIcon("NUMBER3")} />
            <MenuItem text="1.1234 - 4 Decimal Places" onClick={() =>{ setN("NUMBER4") }}      icon={getNumIcon("NUMBER4")} />
            <MenuItem text="1.12345 - 5 Decimal Places" onClick={() =>{ setN("NUMBER5") }}     icon={getNumIcon("NUMBER5")}/>
            <MenuItem text="1.123456 - 6 Decimal Places" onClick={() =>{ setN("NUMBER6") }}    icon={getNumIcon("NUMBER6")}/>
            <MenuItem text="1.1234567 - 7 Decimal Places" onClick={() =>{ setN("NUMBER7") }}   icon={getNumIcon("NUMBER7")}/>
            <MenuItem text="1.12345678 - 8 Decimal Places" onClick={() =>{ setN("NUMBER8") }}  icon={getNumIcon("NUMBER8")}/>
            <MenuItem text="1.123456789 - 9 Decimal Places" onClick={() =>{ setN("NUMBER9") }} icon={getNumIcon("NUMBER9")}/>
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

function getIcon(name: string, defaultIcon:IconName): IconName | undefined {
    if(name.toLowerCase() in IconCodepoints) {
        return name.toLowerCase() as IconName;
    }
    return defaultIcon;
}
