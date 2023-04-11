import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Number, String, Array, Record, Static, Undefined, Partial } from 'runtypes';
import { Button, Collapse, HTMLTable, Icon, Menu, MenuItem, NonIdealState, MaybeElement } from '@blueprintjs/core';
import { SERVER } from '../engine/queryEngine';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchProcessServers, ServerConfig } from './ConnectionsPage';
import { isAdmin, notyf, ThemeContext } from './../context';
import { IJsonModel } from 'flexlayout-react';
import useLocalStorage from './hooks';
import { analytics } from '../App';
import { Popover2 } from '@blueprintjs/popover2';
import { toSvg } from "jdenticon";
import { BreadCrumbHeader } from './DashReportPage';
import { DEFAULT_GLOBAL } from './FlexPanel';
import { addParameter } from './CommonComponents';


/** Messy conversion similar to UserPage to deal with Date/number difference between java/react and to allow checking returned json */

const DashRecord = Record({
    id: Number,
    version: Number,
    name: String,
    dateCreated: Number,
    dateUpdated: Number,
}).And(Partial({
    data: String.Or(Undefined),
    defaultParams: String.Or(Undefined)
}));
type DashR = Static<typeof DashRecord>;

export type Dash = {
    id: number,
    version: number,
    name: string,
    defaultParams: string,
    dateCreated: Date,
    dateUpdated: Date,
    data: IJsonModel | undefined | null,
}

function convertDash(dr: DashR): Dash {
    let dateCreated = fromEpoch(dr.dateCreated as unknown as number);
    let dateUpdated = fromEpoch(dr.dateUpdated as unknown as number);

    let data = undefined;
    try {
        if(dr.data) {
            data = JSON.parse(dr.data);
        }
    } catch(e) {
        data = null;
        console.error(e);
        console.error("Error interpreting Dashboard.");
        console.error(dr.data);
    }
    return { ...dr, ...{ dateCreated, dateUpdated, data, defaultParams: dr.defaultParams ?? "" } };
}
export function fromEpoch(n: number): Date { return new Date(1000 * (n)); }

export function toEpoch(d: Date): number { return (d.getTime() - d.getMilliseconds()) / 1000; }

function convertToDashR(d: Dash): DashR {
    let dateCreated = toEpoch(d.dateCreated);
    let dateUpdated = toEpoch(d.dateUpdated);
    let data = d.data ? JSON.stringify(d.data, null, "\t") : undefined;
    return { ...d, ...{ dateCreated, dateUpdated, data } };
}


async function fetchHistory(dashId:string) {
    const r = await axios.get<DashR[]>(SERVER + "/dashboard/history/" + dashId);
    Array(DashRecord).check(r.data)
    return (r.data as unknown as DashR[]).map(d => convertDash(d));
};

export function DashHistoryPage() {
    let { dashId } = useParams<{dashId: string | undefined}>();
    const [data, setData] = useState<Dash[]>([]);

    useEffect(() => { dashId && fetchHistory(dashId).then(a => setData(a))},[dashId,data]);

    function getNames(o:any):string[] {
        if (!o || typeof o !== 'object') return [];
        if ('name' in o && 'component' in o && typeof o.name === "string" && typeof o.component === "string") return [o.name];
        return Object.values(o).reduce((r:string[], v:any) => [...r, ...getNames(v)], []);
    }    
    const getVLink = (s:Dash, isLatest:boolean) => "/dash/" + s.id + "/" + s.name + (isLatest ? "" : "/" + s.version);
    
    function confirmRestore(d: Dash): void {
        window.confirm("Are you sure you want to overwrite the current dashboard?") && axios.put<Dash>(SERVER + "/dashboard", convertToDashR(d))
        .then(r => { 
            notyf.success("Restored successfully.");
            dashId && fetchHistory(dashId).then(a => setData(a));
        }).catch((e) => {
            notyf.error("Restore Failed.");
        });
    }
    if(!data || data.length <= 0) {
        return  <NonIdealState icon="error" title="No history found" action={<div>Try <Link to="/dash">View Dashboards</Link></div>} />
    }
    let maxVersion = data[0].version;

    return (<>
            
            <BreadCrumbHeader dash={data[0]}  pageSelected="history" />
            <div><HTMLTable condensed striped bordered>
            <thead><tr><th>Name</th><th>Version</th><th>Updated</th><th>Tabs</th><th>Restore</th></tr></thead>
                <tbody>{data.map((s, idx) => <tr key={s.version}>
                    <td><Link to={getVLink(s, idx===0)}>{s.name}</Link></td>
                    <td><Link to={getVLink(s, idx===0)}>{s.version}</Link></td>
                    <td>{prettyDate(s.dateUpdated)}</td>  <td>{getNames(s.data).join(', ')}</td>
                    <td>{idx !== 0 && <Button small  onClick={() => confirmRestore({...s, version:maxVersion})}>Restore</Button>}</td></tr>)}</tbody>
            </HTMLTable></div>
        </>)
}



function openPopoutDash(d:Dash) { 
    const url =  getDashUrlWithParams(d, "sd_noborder=1");
    const v = window.localStorage.getItem("popuppos-" + d.id)
    const pos = v ? JSON.parse(v) : undefined;
    let conf = 'popup=yes,directories=no,titlebar=no,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no';
    if(pos && (typeof pos.x === 'number') && (typeof pos.y === 'number') && (typeof pos.w === 'number') && (typeof pos.h === 'number')) {
        conf += ',width=' + pos.w + ',height=' + pos.h + ',left=' + pos.x + ',top=' + pos.y;
    }
    window.open(url,d.name,conf); 
}

async function getDashes() {
    const r = await axios.get<DashR[]>(SERVER + "/dashboard");
    Array(DashRecord).check(r.data)
    return (r.data as unknown as DashR[]).map(d => convertDash(d));
};

export async function getDash(dashId:number, version:number | undefined = undefined) {
    const r = await axios.get<DashR>(SERVER + "/dashboard/" + dashId + ((version && version>=0) ? "/" + version : ""));
    return convertDash(DashRecord.check(r.data));
};

export async function saveDash(dash:Dash) {
    return axios.put<Dash>(SERVER + "/dashboard", convertToDashR(dash));
}

type OpenMethod = "popup"|"newtab"|"samewindow";

function wrapLink (openMethod:OpenMethod, href:string, openFunc:()=>void, children:MaybeElement,  target:string = "_blank") {
    if(openMethod === "samewindow") {
        return <Link to={href} >{children}</Link>;
    }
    return <a  href={href}  target={openMethod === "newtab" ? target : undefined}  
                onClick={(e)=>{ if(openMethod === "popup"){ openFunc(); e.preventDefault(); return false; }} } >
                {children}
                </a>;
}

const addKnownDemo = (name:KnownDashTitles, callback:(url:string)=>void) => {
    analytics.track("Dashboard - AddDemo", {dashName:name});
    axios.post<Dash>(SERVER + "/dashboard/add-demo", name, {headers:{"Content-Type":"text/plain"}})
    .then(r => {
        callback(r.headers['location']);
    }).catch((e) => {
        notyf.error("Error adding demo dashboard.");
        console.error(e);
    });
}

export default function DashPage() {
    const [data, setData] = useState<Dash[]|undefined>(undefined);
    const [favourites] = useLocalStorage<number[]>("favourites", []);
    const [defaultOpenMethod] = useLocalStorage<OpenMethod>("DashPageDefaultOpenMethod","samewindow");
    const navigate = useNavigate();
    const context = useContext(ThemeContext);


    const addItem = async () => {
        if(data !== undefined) {
            let d = await axios.post<Dash>(SERVER + "/dashboard");
            setData(data.concat(convertDash(d.data as unknown as DashR)));
            analytics.track("Dashboard - Add", {dashName:d.data.name, dashId:d.data.id});
        }
    };

    const copyItem = async (id: number) => {
        if(data !== undefined) {
            let d = await axios.post<Dash>(SERVER + "/dashboard/copy/" + id);
            setData(data.concat(convertDash(d.data as unknown as DashR)));
            analytics.track("Dashboard - Copy", {dashName:d.data.name, dashId:id});
        }
    };

    const deleteItem = async (id: number) => {
        await axios.delete<Dash>(SERVER + "/dashboard/" + id);
        setData(data!.filter(e => e.id !== id));
        analytics.track("Dashboard - Delete", {dashName:"", dashId:id});
    };


    const addDemo = (demosc: ServerConfig, dash: Dash) => {
        analytics.track("Dashboard - AddDemo", {dashName:dash.name, dashId:dash.id});
        fetchProcessServers((serverConfigs: ServerConfig[]) => {
            let found = false;
            for (let s of serverConfigs) {
                const detailsMatch = demosc.host && s.port === demosc.port && s.jdbcType === demosc.jdbcType && s.database === demosc.database;
                if (s.host === detailsMatch || s.name === demosc.name) {
                    demosc = s;
                    found = true;
                    break;
                }
            }

            const addDash = () => {
                axios.put<Dash>(SERVER + "/dashboard", convertToDashR(dash))
                    .then(r => {
                        const p = dash.defaultParams.length > 0 ? dash.defaultParams +"&sd_edit=1" : "?sd_edit=1";
                        navigate(r.headers['location'] + p);
                    }).catch((e) => {
                        notyf.error("Error adding demo dashboard.");
                        console.error(e);
                    });
            }
            if (found) {
                addDash();
            } else {
                axios.post<ServerConfig>(SERVER + "/dbserver", demosc)
                    .then(() => {
                        addDash();
                    }).catch(() => {
                        notyf.error("Could not create demo connection");
                    });
            }
        });
    }

    useEffect(() => { getDashes().then(d => setData(d)); }, []);
    useEffect(() => { document.title = "Dashboards" }, []);
    const isFetched = data !== undefined;

    return <><div>

        {isFetched && data.length === 0 && !isAdmin(context) && <NonIdealState icon="error" title="No Dashboards Found" action={<div>An ADMIN user must create a dashboard for you to view.</div>} />}
        <Button icon="add" small onClick={addItem} >Add Dashboard</Button>
        {<Button small disabled={favourites.length<=0} 
            title="You can favourite a dashboard by clicking on the star icon. Once you have favourites this button will pop-out all favourites to a new window at once."
            onClick={() => {(data || []).forEach(dash => { if(favourites.includes(dash.id)) {openPopoutDash(dash)}})}}>
            Open All Favourites</Button>}
            {/* <div className="bp4-html-select">
                <select onChange={(e) => { setDefaultOpenMethod(e.target.value as OpenMethod)}}>
                    <option value="newtab" selected={defaultOpenMethod === "newtab"}>New Tab</option>
                    <option value="popup" selected={defaultOpenMethod === "popup"}>Popup</option>
                    <option value="samewindow" selected={defaultOpenMethod === "samewindow"}>Same Window</option>
                </select>
                <span className="bp4-icon bp4-icon-caret-down"></span>
            </div>         */}
        <br style={{ clear: "left" }} />

        <section id="dashboardListing"><div className='row'><div className='col-md-12'>
            {(data || []).map(d => 
                <DashBox hideButtonsInitially dash={d} openMethod={defaultOpenMethod}
                    menu={
                    <Menu>
                        <MenuItem text="Copy this dashboard." icon="add" onClick={() => copyItem(d.id)} />
                        <Link to={"/dash/history/" + d.id}><MenuItem text="View Dashboard History" icon="history" /></Link>
                        {/* <Link to={"/dash/reports/" + d.id}><MenuItem text="Report Configuration" icon={<RiMailSettingsLine />} /></Link> */}
                        
                        <MenuItem text="Delete this dashboard." icon="delete" intent="danger" onClick={() => { window.confirm("Are you sure you want to delete his dashboard?") && deleteItem(d.id) }} />                        
                    </Menu>
                    }/>)}
                
        </div></div></section>
        <section id="demoListing"><div className='row'><div className='col-md-12'>
            {isAdmin(context) && data !== undefined && <DemoListing addDemo={addDemo} />}
        </div></div></section>
    </div></>;
}


function getDashUrlWithParams(d:Dash, moreParams:string = "") {
    // IF user set params locally use them, else use whatever author saved.
    let param = d.defaultParams.length > 1 ? d.defaultParams : "";
    let paramCache = window.localStorage.getItem("kparams-"+d.id);
    if(paramCache !== null && paramCache[0] === "?") {
        param = paramCache;
    }
    return "/dash/" + d.id + "/" + d.name + param + (param.length>1 ? "&"+moreParams : "?"+moreParams);
}

function DashBox(props:{dash:Dash, menu:JSX.Element, hideButtonsInitially:boolean, openMethod:OpenMethod}) {
    const [menuShown, setMenuShown] = useState(false);
    const [favourites, setFavourites] = useLocalStorage<number[]>("favourites", []);
    const context = useContext(ThemeContext);
    const d = props.dash;
    
    let img = <img src={SERVER+"/dashboard/img/" + d.id + "-" + d.version} width="267" height="150" alt="" />;
    if(props.dash.version === 0) {
        const im = getDashCoverImg(props.dash.name);
        if(im !== null) {
            img = <img src={im} width="267" height="150" alt="" />;
        }
    }
    const editURL = addParameter(addParameter(getDashUrlWithParams(d), "sd_edit", "1"), "noborder", "0");

    const linkHeaderAndImg = <><h4>{d.name}</h4>
        <div className="dashboxContainer">
            <div className="dashbox identicon" dangerouslySetInnerHTML={{__html: toSvg(d.name, 150)}} title={"Last Modified: " + prettyDate(d.dateUpdated)}></div>
            <div className="dashbox dashbox-top">
                {img}
            </div>
        </div></>

    return <div className="floatbox" key={d.id}>
        {wrapLink(props.openMethod, getDashUrlWithParams(d), () => { openPopoutDash(d); }, linkHeaderAndImg, "_blank"+d.id)}

        {/* <p>{prettyDate(d.dateUpdated)}</p> */}
        <p className={props.hideButtonsInitially ? "whenhover" : ""}>
            {/* <Button minimal title="Favourite this dashboard." icon="star-empty" />
                <Button minimal title="Like this dashboard." icon="thumbs-up" /> */}
            <Button minimal title="Popout" icon="share" onClick={()=>openPopoutDash(d)} />
            <Button minimal title="Favourite" icon={favourites.includes(d.id) ? <Icon icon="star" color="#F7B000" /> : "star-empty"}
                onClick={() => {if(favourites.includes(d.id)) { setFavourites(favourites.filter(e => e !== d.id))} else { setFavourites([...favourites,d.id])}}}  />
            <Link to={editURL}><Button minimal title="Edit" icon="edit" >Edit</Button></Link>
                
            {/* <Link to={"/dash/reports/" + d.id + "/emails/" + d.name}><Button minimal title="Report Runs" icon="envelope"/></Link> */}

            {isAdmin(context) &&  <Popover2 isOpen={menuShown} placement="bottom" onInteraction={(state)=>setMenuShown(state)}  
                content={props.menu}>
                <Button minimal title="Edit Dashboard." icon="more" /*menu*/ onClick={()=>setMenuShown(true)}/>
            </Popover2>}
        </p>
    </div>;
}

function getUrlN(n:number) {
    const imgs = ["antenna.jpg","belfast.jpg","bitcoin.jpg","bull.jpg","calculator.jpg","car-dashboard.jpg","central-station.jpg","city.jpg","clock.jpg","cockpit.jpg","coints.jpg","containers.jpg","dollars.jpg","euro.jpg","fishing.jpg","fistbump.jpg","graph.jpg","library.jpg","lightning.jpg","mining.jpg","plane.jpg","rocket.jpg","safe.jpg","speedometer.jpg","stock-chart.jpg","stopwatch.jpg","telescope.jpg","underground.jpg","wall-street.jpg"];
    return `url("./img/dashbg/${imgs[n%imgs.length]}`;
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DashBox2(props:{dash:Dash, menu:JSX.Element}) {

    const [menuShown, setMenuShown] = useState(false);
    const [favourites, setFavourites] = useLocalStorage<number[]>("favourites", []);
    const context = useContext(ThemeContext);
    const d = props.dash;
    const b = <><h4>{d.name}</h4><div className="filler"></div></>;
    const editURL = addParameter(addParameter(getDashUrlWithParams(d), "sd_edit", "1"), "noborder", "0");

    return   <div className="floatbox2" style={{  backgroundImage:getUrlN(d.id)}} key={d.id}  title={"Last Modified: " + prettyDate(d.dateUpdated)}>
            {wrapLink("samewindow", getDashUrlWithParams(d), () => { openPopoutDash(d); }, b, "_blank"+d.id)}
        <p>
            {/* <Button minimal title="Favourite this dashboard." icon="star-empty" />
                <Button minimal title="Like this dashboard." icon="thumbs-up" /> */}
            <Button minimal title="Popout" icon="share" onClick={()=>openPopoutDash(d)} />
            <Button minimal title="Favourite" icon={favourites.includes(d.id) ? <Icon icon="star" color="#F7B000" /> : "star-empty"}
                onClick={() => {if(favourites.includes(d.id)) { setFavourites(favourites.filter(e => e !== d.id))} else { setFavourites([...favourites,d.id])}}}  />
            {/* <Link to={"/dash/reports/" + d.id + "/emails/" + d.name}><Button minimal title="Report Runs" icon="envelope"/></Link> */}
            <Link to={editURL}><Button minimal title="Edit" icon="edit">Edit</Button></Link>

            {isAdmin(context) &&  <Popover2 isOpen={menuShown} placement="bottom" onInteraction={(state)=>setMenuShown(state)}  
                content={props.menu}>
                <Button minimal title="Edit Dashboard." icon="more" /*menu*/ onClick={()=>setMenuShown(true)}/>
            </Popover2>}
        </p>
    </div>;
}

type KnownDashTitles = "Price Grid"|"Trade Blotter"|"Candlestick"|"PnL"|"Stream Liquidity"|"TAQ"|"Misc";

function getDashCoverImg(dashTitle:KnownDashTitles|string) {
    let n = dashTitle;
     if(n === "Price Grid") {
        return "./img/dashcovers/price-grid-small.png";
    } else if(n === "Trade Blotter") {
        return "./img/dashcovers/blotter2.png";
    } else if(n === "Candlestick") {
        return "./img/dashcovers/candle-cover.png";
    } else if(n === "PnL") {
        return "./img/dashcovers/pnl.png";
    } else if(n === "Stream Liquidity") {
        return "./img/dashcovers/liquidity-grid.png";
    } else if(n === "TAQ") {
        return "./img/dashcovers/bid-ask-taq-timeseries-small.png";
    } else if(n === "Misc") {
        return "./img/dashcovers/misc-cover-small.png";
    } else if(n === "Charts 1") {
        return "./img/dashcovers/charts1.png";
    } else if(n === "Charts 2") {
        return "./img/dashcovers/charts2.png";
    } else if(n === "Charts 3") {
        return "./img/dashcovers/charts3.png";
    }
    return null;
}

function getImg(dashTitle:"Price Grid"|"Trade Blotter"|"Candlestick"|"PnL"|"Stream Liquidity"|"TAQ"|"Misc"|string) {
    let n = dashTitle;
     if(n === "Price Grid") {
        return <img src="./img/price-grid-small.png" width="150" height="150" alt="Price Grid" />;
    } else if(n === "Trade Blotter") {
        return <img src="./img/blotter2.png" width="150" height="150" alt="Trade Blotter" />;
    } else if(n === "Candlestick") {
        return <img src="./img/candle-cover.png" width="150" height="150" alt="Candlestick Chart" />;
    } else if(n === "PnL") {
        return <img src="./img/pnl.png" width="150" height="150" alt="Pnl Graph" />;
    } else if(n === "Stream Liquidity") {
        return <img src="./img/liquidity-grid.png" width="150" height="150" alt="Stream Liquidity Table" />;
    } else if(n === "TAQ") {
        return <img src="./img/bid-ask-taq-timeseries-small.png" width="150" height="150" alt="TAQ Chart" />;
    } else if(n === "Misc") {
        return <img src="./img/misc-cover-small.png" width="150" height="150" alt="Miscellaneous" />;
    }
    return null;
}


function getKdbPriceGridDemo():Dash {
    let dashJson:IJsonModel  = { "global": DEFAULT_GLOBAL, "borders": [], "layout": { "type": "row", "id": "#1", "children": [ { "type": "row", "id": "#14", "weight": 17.541560500554432, "children": [ { "type": "tabset", "id": "#13", "weight": 20, "children": [ { "type": "tab", "id": "#12", "name": "Graph Lookback", "component": "aform", "config": { "dashstate": { "formWidgets": [ { "id": 1, "guiType": "drop", "key": "mins", "label": "Choose One:", "optionsList": [ "10|10 Minutes", "5|5 Minutes", "2|2 Minutes", "1|1 Minutes" ], "useHardcoded": true, "srs": { "rsdata": { "tbl": { "data": [], "types": {} } }, "chartRS": { "numericColumns": [], "stringyColumns": [], "dateColumns": [], "rowLabels": [], "rowTitle": "" } }, "allowUserCreatedEntries": false, "sliderMin": 0, "sliderMax": 100 } ], "layout": "Vertical", "selectedIndex": 0, "queryables": [ { "serverName": "DEMODB", "query": "([] name:`peter`paul`james; nice:(\"Peter Jones\";\"James Dunn\";\"James Rudolph\"))", "refreshPeriod": 5000 } ] } } } ], "active": true }, { "type": "tabset", "id": "#7", "weight": 80, "children": [ { "type": "tab", "id": "#6", "name": "Latest Prices", "component": "grid", "config": { "dashstate": { "chartType": "grid", "queryable": { "serverName": "KDB:localhost:5000", "query": "// Table display can be configured using column names. See help->charts for details on format.\nupdate ask:bid+20?0.01 0.02 0.03,\n bid_SD_FG:((`$(\"#FF6666\";\"#66FF66\";\"\"))!`$(\"#222\";\"#222\";\"\")) bid_SD_BG,\n ask_SD_FG:((`$(\"#FF6666\";\"#66FF66\";\"\"))!`$(\"#222\";\"#222\";\"\")) ask_SD_BG\n from \n\t ([] time:.z.t-til 20; \n\t\t instrument_SD_TAG:20#`OKTA`TWLO`TTD`DOCU`NFLX`GOOG`AMZN`TSLA`AAPL`BABA`BRK.A`JPM`JNJ`FB`MSFT;\n\t\t bid:(20#269.98 385.24 718.86 231.93 546.54 2297.76 399.44 739.78 134.16 235.6 409250. 153.3 162.24 306.18 260.74)+20?1.0;\n\t\t bid_SD_BG:20?`$(\"#FF6666\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"#66FF66\");\n\t\t ask_SD_BG:20?`$(\"#FF6666\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"#66FF66\");\n\t\t ask_SD_CODE:20#(\"0.xXXx\";\"0.XXx\";\"0.xxXX\");\n\t\t bid_SD_CODE:20#(\"0.xXXx\";\"0.XXx\";\"0.xxXX\"))", "refreshPeriod": 5000 } } } } ] } ] }, { "type": "row", "id": "#23", "weight": 31.67470945849724, "children": [ { "type": "row", "id": "#43", "weight": 35.14492753623188, "children": [ { "type": "tabset", "id": "#42", "weight": 50, "children": [ { "type": "tab", "id": "#41", "name": "NFLX", "component": "timeseries", "config": { "dashstate": { "chartType": "timeseries", "queryable": { "serverName": "KDB:localhost:5000", "query": "{select from x where time>max[time]-((mins))*00:01t}\n { r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n walk:{ [r;seed;n] prds (100+((r[seed;n]) mod 11)-5)%100}[r;;];\n c:{x mod `long$00:15:00.0t}x; st:x-c; cn:100+`int$(15*60)*c%00:15t;\n t:([] time:st+1000*til cn; bid:walk[43;cn]);\n t}[.z.t]", "refreshPeriod": 5000 } } } } ] }, { "type": "tabset", "id": "#8", "weight": 50, "children": [ { "type": "tab", "id": "#4", "name": "AAPL", "component": "timeseries", "config": { "dashstate": { "chartType": "timeseries", "queryable": { "serverName": "KDB:localhost:5000", "query": "{select from x where time>max[time]-((mins))*00:01t}\n { r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n walk:{ [r;seed;n] prds (100+((r[seed;n]) mod 11)-5)%100}[r;;];\n c:{x mod `long$00:15:00.0t}x; st:x-c; cn:100+`int$(15*60)*c%00:15t;\n t:([] time:st+1000*til cn; bid:walk[14;cn]);\n t}[.z.t]", "refreshPeriod": 5000 } } } } ] } ] }, { "type": "row", "id": "#49", "weight": 33.19261421920619, "children": [ { "type": "tabset", "id": "#48", "weight": 50, "children": [ { "type": "tab", "id": "#47", "name": "OKTA", "component": "timeseries", "config": { "dashstate": { "chartType": "timeseries", "queryable": { "serverName": "KDB:localhost:5000", "query": "{select from x where time>max[time]-((mins))*00:01t}\n { r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n walk:{ [r;seed;n] prds (100+((r[seed;n]) mod 11)-5)%100}[r;;];\n c:{x mod `long$00:15:00.0t}x; st:x-c; cn:100+`int$(15*60)*c%00:15t;\n t:([] time:st+1000*til cn; bid:walk[17;cn]);\n t}[.z.t]", "refreshPeriod": 5000 } } } } ] }, { "type": "tabset", "id": "#22", "weight": 50, "children": [ { "type": "tab", "id": "#21", "name": "GOOG", "component": "timeseries", "config": { "dashstate": { "chartType": "timeseries", "queryable": { "serverName": "KDB:localhost:5000", "query": "{select from x where time>max[time]-((mins))*00:01t}\n { r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n walk:{ [r;seed;n] prds (100+((r[seed;n]) mod 11)-5)%100}[r;;];\n c:{x mod `long$00:15:00.0t}x; st:x-c; cn:100+`int$(15*60)*c%00:15t;\n t:([] time:st+1000*til cn; bid:walk[18;cn]);\n t}[.z.t]", "refreshPeriod": 5000 } } } } ] } ] }, { "type": "row", "id": "#55", "weight": 31.662458244561932, "children": [ { "type": "tabset", "id": "#54", "weight": 50, "children": [ { "type": "tab", "id": "#53", "name": "TSLA", "component": "timeseries", "config": { "dashstate": { "chartType": "timeseries", "queryable": { "serverName": "KDB:localhost:5000", "query": "{select from x where time>max[time]-((mins))*00:01t}\n { r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n walk:{ [r;seed;n] prds (100+((r[seed;n]) mod 11)-5)%100}[r;;];\n c:{x mod `long$00:15:00.0t}x; st:x-c; cn:100+`int$(15*60)*c%00:15t;\n t:([] time:st+1000*til cn; bid:walk[19;cn]);\n t}[.z.t]", "refreshPeriod": 5000 } } } } ] }, { "type": "tabset", "id": "#34", "weight": 50, "children": [ { "type": "tab", "id": "#33", "name": "DOCU", "component": "timeseries", "config": { "dashstate": { "chartType": "timeseries", "queryable": { "serverName": "KDB:localhost:5000", "query": "{select from x where time>max[time]-((mins))*00:01t}\n { r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n walk:{ [r;seed;n] prds (100+((r[seed;n]) mod 11)-5)%100}[r;;];\n c:{x mod `long$00:15:00.0t}x; st:x-c; cn:100+`int$(15*60)*c%00:15t;\n t:([] time:st+1000*til cn; bid:walk[21;cn]);\n t}[.z.t]", "refreshPeriod": 5000 } } } } ] } ] } ] }, { "type": "row", "id": "#29", "weight": 17.96794056726413, "children": [ { "type": "tabset", "id": "#18", "weight": 34.78260869565217, "children": [ { "type": "tab", "id": "#17", "name": "MSFT", "component": "timeseries", "config": { "dashstate": { "chartType": "timeseries", "queryable": { "serverName": "KDB:localhost:5000", "query": "{select from x where time>max[time]-((mins))*00:01t}\n { r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n walk:{ [r;seed;n] prds (100+((r[seed;n]) mod 11)-5)%100}[r;;];\n c:{x mod `long$00:15:00.0t}x; st:x-c; cn:100+`int$(15*60)*c%00:15t;\n t:([] time:st+1000*til cn; bid:walk[15;cn]);\n t}[.z.t]", "refreshPeriod": 5000 } } } } ] }, { "type": "tabset", "id": "#28", "weight": 33.550463035630194, "children": [ { "type": "tab", "id": "#27", "name": "AMZN", "component": "timeseries", "config": { "dashstate": { "chartType": "timeseries", "queryable": { "serverName": "KDB:localhost:5000", "query": "{select from x where time>max[time]-((mins))*00:01t}\n { r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n walk:{ [r;seed;n] prds (100+((r[seed;n]) mod 11)-5)%100}[r;;];\n c:{x mod `long$00:15:00.0t}x; st:x-c; cn:100+`int$(15*60)*c%00:15t;\n t:([] time:st+1000*til cn; bid:walk[218;cn]);\n t}[.z.t]", "refreshPeriod": 5000 } } } } ] }, { "type": "tabset", "id": "#38", "weight": 31.66692826871762, "children": [ { "type": "tab", "id": "#37", "name": "FB", "component": "timeseries", "config": { "dashstate": { "chartType": "timeseries", "queryable": { "serverName": "KDB:localhost:5000", "query": "{select from x where time>max[time]-((mins))*00:01t}\n { r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n walk:{ [r;seed;n] prds (100+((r[seed;n]) mod 11)-5)%100}[r;;];\n c:{x mod `long$00:15:00.0t}x; st:x-c; cn:100+`int$(15*60)*c%00:15t;\n t:([] time:st+1000*til cn; bid:walk[117;cn]);\n t}[.z.t]", "refreshPeriod": 5000 } } } } ] } ] } ] } };
    return  { id: -1, version:0, name: "Price Grid", defaultParams:"", data: dashJson, dateCreated: new Date(), dateUpdated: new Date() };
}


function getKdbBlotterDemoDash():Dash {
    let dashJson:IJsonModel  = { "global": DEFAULT_GLOBAL, "borders": [], "layout": { "type": "row", "id": "#8f3558c5-1f26-45c1-8115-fd2ceca4b4b4", "children": [ { "type": "tabset", "id": "#1ccd13d0-b38b-4fd3-a088-5282cda70495", "weight": 7.94596165020337, "children": [ { "type": "tab", "id": "#a74e5e49-78b7-4fb4-b47e-d3eca79e2bd2", "name": "grid", "component": "grid", "config": { "dashstate": { "chartType": "grid", "queryable": { "serverName": "KDB:localhost:5000", "query": "{ // The below is an example of generating a randmom appending table in-memory. \n// We don't want to rely on a table existing so that\n// if someone runs it against a random kdb instance it works but doesn't change anything there.\n\n// random helpers\nr:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]}; // deterministic random\nwalk:{[r;seed;n] prds (100+((r[seed;n]) mod 11)-5)%100}[r;;];\n\n// config\nzt:.z.t;\noffsetTime:(zt mod `long$00:05:00.0t);\nstartTime:zt - offsetTime;\ntimes:asc startTime+r[99;800] mod t:5*60*1000;\nc:150+`long$800*offsetTime%00:05:00.0t; // 800 per minute over 5 minues = 2.6 per second\n \nchoose:{[r;c;vals] vals@r[13;c] mod count vals}[r;c;];\nrn:{[r;c;n] v:n*((r[22;c] mod 9999)%9999); $[7h=abs type n;`long$v;v]}[r;c;];\n\n// Column contents\nsym:`OKTA`TWLO`TTD`DOCU`NFLX`GOOG`AMZN`TSLA`AAPL`BABA`BRK.A`JPM`JNJ`FB`MSFT;\nsymToPrice:sym!269.98 385.24 718.86 231.93 546.54 2297.76 399.44 739.78 134.16 235.6 409250. 153.3 162.24 306.18 260.74;\nsymToName:sym!name:`$(\"Okta\";\"Twilio\";\"Trade Desk\";\"Docusign\";\"Netflix\";\"Google\";\"Amazon\";\"Tesla\";\"Apple\";\"Alibaba\";\"Berkshire Hathaway\";\"JPMorgan Chase\";\"Johnson & Johnson\";\"Facebook\";\"Microsoft\");\nstatus:`$(\"Pending\";\"Partially Filled\";\"Partially Cancelled\";\"Filled\";\"Ready\";\"Pending Cancel\";\"New\");\ndestination:`NASDAQ`LSE`LSE;\norderType:`TWAP`VWAP`LIMIT`Market`Sweeper`MinImpact`Iceberg;\n\nt:([] time:c#times; choose sym; choose status; quantity:rn 40000; choose destination; choose orderType; percent:10*rn 10; pnl:rn 3000.0 );\nt:update price:(symToPrice sym)*walk[first i;count i] by sym from t;\nt:reverse update name:symToName sym,avgPrice:avg price by sym from t;\n// formatting\nselect time,status,sym_SD_TAG:sym,name,quantity_SD_NUMBER0:quantity,destination,orderType_SD_TAG:orderType,price_SD_CURUSD:price,percent_SD_PERCENT0:percent%100,percbar_SD_DATABAR:percent%100,avgPrice,percent,pnl from t\n}[]\n\n\n\n", "refreshPeriod": 1000 } } } } ], "active": true } ] }};
    return { id: -1, version:0, name: "Trade Blotter", defaultParams:"", data: dashJson, dateCreated: new Date(), dateUpdated: new Date() };
};

function getKdbCandleDemoDash():Dash {
    let dashJson:IJsonModel  = { "global": DEFAULT_GLOBAL, "borders": [], "layout": { "type": "row", "id": "#481b8859-f414-4607-9872-130e1c4e7aa5", "children": [ { "type": "row", "id": "#d3c30169-b1d1-4975-ade9-fda4cb4e2078", "weight": 50, "children": [ { "type": "tabset", "id": "#8c7aa838-3d1e-4feb-af09-a32b41446ebc", "weight": 64.02877697841727, "selected": 1, "children": [ { "type": "tab", "id": "#07bd8ea1-7e79-4d63-b507-18d1a7626c12", "name": "Welcome", "component": "atext", "config": { "dashstate": { "html": "<div style='margin:5px 40px;'>\n<h1>Welcome</h1></div>" } } }, { "type": "tab", "id": "#b8b07240-dee0-432b-9a41-eb65d8c0a68f", "name": "candle", "component": "candle", "config": { "dashstate": { "chartType": "candle", "queryable": { "serverName": "KDB:localhost:5000", "query": "// Column names are used to identify Open/High/low/Close/Volume\n{ r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n\twalk:{ [r;seed;n] prds (100+((r[seed;n]) mod 11)-5)%100}[r;;];\n\tc:{x mod `long$00:05:00.0t}x; st:x-c; cn:100+`long$c%1000;\n\tt:([] time:`second$.z.d+st+1000*til cn; open:walk[9;cn]; close:walk[105;cn]);\n\t-100 sublist update low:?[open > close;close;open]-(r[11;cn] mod 11)*0.02,high:?[open < close;close;open]+(r[44;cn] mod 11)*0.02,volume:(r[44;cn] mod 110) from t}[.z.t]", "refreshPeriod": 5000 } } } } ] }, { "type": "row", "id": "#03558bd1-7402-4b11-bacb-4f4df74df247", "weight": 35.97122302158273, "children": [ { "type": "tabset", "id": "#ae3e3baf-818d-4fa6-a651-2d9350807097", "weight": 29.957356076759062, "children": [ { "type": "tab", "id": "#57a1e63c-7509-4891-b2e2-ccc25ed00d2e", "name": "pie", "component": "pie", "config": { "dashstate": { "chartType": "stack", "queryable": { "serverName": "KDB:localhost:5000", "query": "// See help->charts for details on format to customize your chart appearance\n([] Group:`Corporate`Corporate`Retail`Retail`Retail`Retail`Bank`Bank;\n\t Country:`Microsoft`Oracle`Paypal`Monero`FXC`Braint`MS`UBS; \n\t PnL:(0.8+rand[0.2])*31847.0 13239.0 127938.0 81308.0 63047.0 13010.0 152518.0 166629.0;\n\t Revenue:(0.9+rand[0.1])*15080.0 11300.0 34444.0 3114.0 2228.0 88.9 1113.0 41196.0 ; \n\t Negatives:(0.95+rand[0.05])*48300.0 8400.0 34700.0 38100.0 36500.0 413.0 1788.0 11732.0 )", "refreshPeriod": 5000 } } } } ] }, { "type": "tabset", "id": "#a8c8ea85-64e6-400a-9297-5709ae776f0d", "weight": 70.04264392324095, "children": [ { "type": "tab", "id": "#15031241-32ff-461d-b645-3dcdb61b3516", "name": "calendar", "component": "calendar", "config": { "dashstate": { "chartType": "calendar", "queryable": { "serverName": "KDB:localhost:5000", "query": "// A date and value column must be supplied. \n([] dt:2023.12.31 - til 365; v:(asc 365?50)+(365?50)+365#90 80 72 83 40 2 3)", "refreshPeriod": 5000 } } } } ], "active": true } ] } ] } ] } };
    return { id: -1, version:0, name: "Candlestick", defaultParams:"", data: dashJson, dateCreated: new Date(), dateUpdated: new Date() };
};


function getKdbLiquidityDemoDash():Dash {
    let dashJson:IJsonModel  = { "global": DEFAULT_GLOBAL, "borders": [], "layout": { "type": "row", "id": "#481b8859-f414-4607-9872-130e1c4e7aa5", "children": [ { "type": "tabset", "id": "#0998f21f-6300-4449-a84e-634b8af07441", "weight": 7.844276583381755, "children": [ { "type": "tab", "id": "#e9600f06-a07c-47c2-be2a-30a4e7aec09c", "name": "aform", "component": "aform", "config": { "dashstate": { "formWidgets": [ { "id": 1, "guiType": "checkbox", "key": "key1", "label": "Select:", "optionsList": [ "mkt", "JET", "HOT", "FISH", "STREAM", "ICE" ], "useHardcoded": true, "srs": { "rsdata": { "tbl": { "data": [], "types": {} } }, "chartRS": { "numericColumns": [], "stringyColumns": [], "dateColumns": [], "rowLabels": [], "rowTitle": "" } }, "allowUserCreatedEntries": false, "sliderMin": 0, "sliderMax": 100 } ], "layout": "Vertical", "selectedIndex": 0, "queryables": [ { "serverName": "KDB:localhost:5000", "query": "([] name:`peter`paul`james; nice:(\"Peter Jones\";\"James Dunn\";\"James Rudolph\"))", "refreshPeriod": 5000 } ] } } } ] }, { "type": "tabset", "id": "#8c7aa838-3d1e-4feb-af09-a32b41446ebc", "weight": 92.15572341661824, "children": [ { "type": "tab", "id": "#b582e88a-49ef-4aab-96de-577b481cef71", "name": "grid", "component": "grid", "config": { "dashstate": { "chartType": "grid", "queryable": { "serverName": "KDB:localhost:5000", "query": "{\ndict:`ICE`STREAM`FISH`HOT`JET`mkt!(`ICE_q5`ICE_q10`ICE_q20`ICE_q50`ICE_s;`STREAM_q5`STREAM_q10`STREAM_q20`STREAM_q50`STREAM_s;`FISH_q5`FISH_q10`FISH_q20`FISH_q50`FISH_s;`HOT_q5`HOT_q10`HOT_q20`HOT_q50`HOT_s;`JET_q5`JET_q10`JET_q20`JET_q50`JET_s;`MKT_q5`MKT_q10`MKT_q20`MKT_q50`MKT_s);\nspreads:{\n ren:{z lj 1!(`$ssr[;\"MKT_\";x] each string cols[z] except `mid) xcol 0!y*delete mid from z};\n update time:.z.t-29?00:00:01t from \n ren[\"ICE_\";1.5] ren[\"STREAM_\";1.4] ren[\"FISH_\";1.3] ren[\"HOT_\";1.2] ren[\"JET_\";1.1]\n update MKT_s:0n from \n update MKT_q50:?[i in 0 1 2 6 8;(1.05*MKT_q20)+0.01*29?50;0n] from \n update MKT_q20:?[i in 0 1 2 6 8;(1.05*MKT_q10)+0.01*29?50;0n] from \n update MKT_q10:?[(i<10) or i in 13 14 17;(1.05*MKT_q5)+0.01*29?50;0n] from \n update MKT_q5:mid*(1+i div 3)*0.0033*1000+29?50 ,mid+(29?0.0005)-0.00025 from  \n ([ccy:`GBPEUR`GBPUSD`GBPNZD`GBPAUD`GBPCAD`GBPJPY`GBPZAR`GBPAED`GBPINR`GBPTRY`GBPCHF`EURNZD`EURAUD`EURCAD`EURJPY`EURZAR`EURAED`EURINR`EURTRY`EURCHF`USDNZD`USDAUD`USDCAD`USDJPY`USDZAR`USDAED`USDINR`USDTRY`USDCHF]\n \tmid:1.1811 1.1817 1.9068 1.7109 1.5372 161.99 20.138 4.3368 94.325 21.416 1.1327 1.6144 1.4485 1.3014 137.15 17.050 3.6718 79.861 18.132 0.959 1.6136 1.4478 1.3008 137.08 17.042 3.67 79.822 18.123 0.9586)\n }[];\nupdate MKT_s:`$\"&nbsp;&nbsp;&nbsp;|\",MKT_s_SD_FG:`$\"#555\",mid_SD_CODE:?[ccy in `GBPEUR`GBPUSD`EURCAD`USDCAS;`0.xxXX;?[ccy in `GBPJPY`GBPINR`EURJPY`EURINR;`0.XXx;`0.xXXx]] from \n{update HOT_q50_SD_CLASS:`red,HOT_q20_SD_CLASS:`red,JET_q50_SD_CLASS:`red,JET_q20_SD_CLASS:`red,STREAM_q50_SD_CLASS:`red,FISH_q20_SD_CLASS:`red from x where ccy in `GBPINR}\n{update HOT_q5_SD_CLASS:`red,HOT_q10_SD_CLASS:`red,JET_q5_SD_CLASS:`red,JET_q10_SD_CLASS:`red,STREAM_q5_SD_CLASS:`red,FISH_q10_SD_CLASS:`red from x where ccy in `GBPINR`GBPTRY}\n{update HOT_q5_SD_CLASS:`green,HOT_q10_SD_CLASS:`green,JET_q5_SD_CLASS:`green,JET_q10_SD_CLASS:`green,STREAM_q5_SD_CLASS:`green,FISH_q10_SD_CLASS:`green from x where ccy in `GBPCAD`EURCAD}\n{c:cols x; (c!?[c like \"*_q*\";`$string[c],\\:\"_SD_NUMBER1\";c]) xcol x}\n(`ccy`time`mid,raze dict `$\"`\" vs {$[10h=type x;x;\"`\" sv x]} {key1})#() xkey spreads\n }[]", "refreshPeriod": 1000 }, "subConfig": { "mid": "NUMBER1", "JET_q5": "NUMBER1", "JET_q10": "NUMBER1", "JET_q20": "NUMBER1", "JET_q50": "NUMBER2", "HOT_q5": "NUMBER1", "HOT_q10": "NUMBER1", "HOT_q20": "NUMBER1" } } } } ], "active": true } ] } };
    return { id: -1, version:0, name: "Stream Liquidity", defaultParams:"?key1=strings.mkt_JET_FISH", data: dashJson, dateCreated: new Date(), dateUpdated: new Date() };
};

function getKdbPnLDemoDash():Dash {
    let dashJson:IJsonModel  = { "global": DEFAULT_GLOBAL, "borders": [], "layout": { "type": "row", "id": "#481b8859-f414-4607-9872-130e1c4e7aa5", "children": [ { "type": "tabset", "id": "#2b3cdb08-6355-4490-afe2-90e3f53a37c2", "weight": 35.053003533568905, "children": [ { "type": "tab", "id": "#5857dd5e-fc04-4171-bbb2-13fbe87bd2bb", "name": "form", "component": "aform", "config": { "dashstate": { "formWidgets": [ { "id": 1, "guiType": "multi", "key": "ccy", "label": "Choose One:", "optionsList": [ "nyc|New York|United States", "ldn|London|United Kingdom", "washington|Washington, D.C.|United States", "beijing|Beijing|China", "delhi|New Delhi|India" ], "useHardcoded": false, "srs": { "rsdata": { "tbl": { "data": [ { "sym": "GBP/USD" }, { "sym": "EUR/USD" }, { "sym": "USD/CHF" }, { "sym": "AUD/USD" }, { "sym": "USD/CAD" }, { "sym": "NZD/USD" } ], "types": { "sym": "string" } } }, "chartRS": { "numericColumns": [], "stringyColumns": [ { "name": "sym", "vals": [ "GBP/USD", "EUR/USD", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD" ] } ], "dateColumns": [], "rowLabels": [ "GBP/USD", "EUR/USD", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD" ], "rowTitle": "sym" } }, "allowUserCreatedEntries": false, "sliderMin": 0, "sliderMax": 100 }, { "id": 2, "guiType": "drop", "key": "days", "label": "Choose One:", "optionsList": [ "0|Today", "7|Week" ], "useHardcoded": true, "srs": { "rsdata": { "tbl": { "data": [], "types": {} } }, "chartRS": { "numericColumns": [], "stringyColumns": [], "dateColumns": [], "rowLabels": [], "rowTitle": "" } }, "allowUserCreatedEntries": false, "sliderMin": 0, "sliderMax": 100 } ], "layout": "Vertical", "selectedIndex": 1, "queryables": [ { "serverName": "KDB:localhost:5000", "query": "select distinct(sym) from pnl", "refreshPeriod": 5000 }, { "serverName": "KDB:localhost:5000", "query": "([] name:`peter`paul`james; nice:(\"Peter Jones\";\"James Dunn\";\"James Rudolph\"))", "refreshPeriod": 5000 } ] } } } ], "active": true }, { "type": "tabset", "id": "#8c7aa838-3d1e-4feb-af09-a32b41446ebc", "weight": 64.9469964664311, "selected": 1, "children": [ { "type": "tab", "id": "#d19bbf66-8e4f-4531-be25-48f80da91bd5", "name": "pnl", "component": "timeseries", "config": { "dashstate": { "chartType": "timeseries", "queryable": { "serverName": "KDB:localhost:5000", "query": "(`dt`sym,(first `$((ccy)))) xcol `dt xdesc select from pnl where sym=first `$((ccy)),dt>.z.d-((days))", "refreshPeriod": 5000 } } } }, { "type": "tab", "id": "#84bc5f22-b5c4-4617-a661-8129cbb683a4", "name": "comparison", "component": "timeseries", "config": { "dashstate": { "chartType": "timeseries", "queryable": { "serverName": "KDB:localhost:5000", "query": "0^fills `dt xdesc (uj/) {(`dt,x) xcol select dt,pnl from pnl where sym=x,dt>.z.d-((days))} each (),`$((ccy))", "refreshPeriod": 5000 } } } } ] } ] } };
    return { id: -1, version:0, name: "PnL", defaultParams:"", data: dashJson, dateCreated: new Date(), dateUpdated: new Date() };
};

function getKdbTaqChartDemoDash():Dash {
    let dashJson:IJsonModel  = { "global": DEFAULT_GLOBAL, "borders": [], "layout": { "type": "row", "id": "#481b8859-f414-4607-9872-130e1c4e7aa5", "children": [ { "type": "row", "id": "#42ccca57-d5b3-4080-930c-faea3b92d935", "weight": 25, "children": [ { "type": "tabset", "id": "#8c7aa838-3d1e-4feb-af09-a32b41446ebc", "weight": 79.2102206736353, "children": [ { "type": "tab", "id": "#be3da150-92f7-4026-b5c6-45697b098514", "name": "TAQ", "component": "timeseries", "config": { "dashstate": { "chartType": "timeseries", "queryable": { "serverName": "KDB:localhost:5000", "query": "// Time Series display can be configured by column names. See help->timeseries for details\n{ r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n walk:{ [r;seed;n] prds (100+((r[seed;n]) mod 11)-5)%100}[r;;];\n c:{x mod `long$00:05:00.0t}x; st:x-c; cn:100+`long$c%500;\n t:([] time:.z.d+st+1000*til cn; bid:walk[100;cn]);\n rnd:{[r;seed;n] (r[seed;n] mod 1000)%1000}[r;;];\n t:update ask:bid+0.1*rnd[10;cn] from t;\n t:update buy_SD_CIRCLE:?[rnd[11;cn]>0.92;bid-rnd[11;cn]*0.03;0n],sell_SD_CIRCLE:?[rnd[15;cn]>0.92;ask+rnd[11;cn]*0.03;0n] from t;\n t:update buy_SD_SIZE:?[null buy_SD_CIRCLE; 0n; 1+r[14;cn] mod 10],sell_SD_SIZE:?[null sell_SD_CIRCLE; 0n; 1+r[14;cn] mod 10] from t;\n t:update hedger_buy_SD_TRIANGLE:?[rnd[11;cn]>0.98;bid-rnd[11;cn]*0.01;0n],hedger_sell_SD_TRIANGLE:?[rnd[15;cn]>0.98;ask+rnd[11;cn]*0.01;0n] from t;\n t:update hedger_buy_SD_SIZE:?[null hedger_buy_SD_TRIANGLE; 0n; 6+r[14;cn] mod 14],hedger_sell_SD_SIZE:?[null hedger_sell_SD_TRIANGLE;0n;6+r[14;cn] mod 14] from t;\n t}[.z.t]", "refreshPeriod": 1000 } } } }, { "type": "tab", "id": "#09eb0ad0-1438-40e7-93d8-0b9e2caf12b9", "name": "grid", "component": "grid", "config": { "dashstate": { "chartType": "grid", "queryable": { "serverName": "KDB:localhost:5000", "query": "// Time Series display can be configured by column names. See help->timeseries for details\n{ r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n walk:{ [r;seed;n] prds (100+((r[seed;n]) mod 11)-5)%100}[r;;];\n c:{x mod `long$00:05:00.0t}x; st:x-c; cn:100+`long$c%500;\n t:([] time:.z.d+st+1000*til cn; bid:walk[100;cn]);\n rnd:{[r;seed;n] (r[seed;n] mod 1000)%1000}[r;;];\n t:update ask:bid+0.1*rnd[10;cn] from t;\n t:update buy_SD_CIRCLE:?[rnd[11;cn]>0.92;bid-rnd[11;cn]*0.03;0n],sell_SD_CIRCLE:?[rnd[15;cn]>0.92;ask+rnd[11;cn]*0.03;0n] from t;\n t:update buy_SD_SIZE:?[null buy_SD_CIRCLE; 0n; 1+r[14;cn] mod 10],sell_SD_SIZE:?[null sell_SD_CIRCLE; 0n; 1+r[14;cn] mod 10] from t;\n t:update hedger_buy_SD_TRIANGLE:?[rnd[11;cn]>0.98;bid-rnd[11;cn]*0.01;0n],hedger_sell_SD_TRIANGLE:?[rnd[15;cn]>0.98;ask+rnd[11;cn]*0.01;0n] from t;\n t:update hedger_buy_SD_SIZE:?[null hedger_buy_SD_TRIANGLE; 0n; 6+r[14;cn] mod 14],hedger_sell_SD_SIZE:?[null hedger_sell_SD_TRIANGLE;0n;6+r[14;cn] mod 14] from t;\n t:select from t where (not null buy_SD_CIRCLE) or (not null sell_SD_CIRCLE) or (not null hedger_buy_SD_TRIANGLE) or (not null hedger_sell_SD_TRIANGLE);\n t:delete hedger_buy_SD_SIZE,hedger_sell_SD_SIZE,sell_SD_SIZE,buy_SD_SIZE from t;\n reverse t}[.z.t]", "refreshPeriod": 5000 } } } } ] }, { "type": "tabset", "id": "#9355c28b-ef59-424d-a2e8-5ceab5c9c19a", "weight": 20.78977932636469, "children": [ { "type": "tab", "id": "#c8a626a2-6e0d-4659-a05c-a1f08e88e0fe", "name": "Position", "component": "timeseries", "config": { "dashstate": { "chartType": "timeseries", "queryable": { "serverName": "KDB:localhost:5000", "query": "// Time Series display can be configured by column names. See help->timeseries for details\n{ r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n walk:{ [r;seed;n] prds (100+((r[seed;n]) mod 11)-5)%100}[r;;];\n c:{x mod `long$00:05:00.0t}x; st:x-c; cn:100+`long$c%500;\n t:([] time:.z.d+st+1000*til cn; bid:walk[100;cn]);\n rnd:{[r;seed;n] (r[seed;n] mod 1000)%1000}[r;;];\n t:update ask:bid+0.1*rnd[10;cn] from t;\n t:update buy_SD_CIRCLE:?[rnd[11;cn]>0.92;bid-rnd[11;cn]*0.03;0n],sell_SD_CIRCLE:?[rnd[15;cn]>0.92;ask+rnd[11;cn]*0.03;0n] from t;\n t:update buy_SD_SIZE:?[null buy_SD_CIRCLE; 0n; 1+r[14;cn] mod 10],sell_SD_SIZE:?[null sell_SD_CIRCLE; 0n; 1+r[14;cn] mod 10] from t;\n t:update hedger_buy_SD_TRIANGLE:?[rnd[11;cn]>0.98;bid-rnd[11;cn]*0.01;0n],hedger_sell_SD_TRIANGLE:?[rnd[15;cn]>0.98;ask+rnd[11;cn]*0.01;0n] from t;\n t:update hedger_buy_SD_SIZE:?[null hedger_buy_SD_TRIANGLE; 0n; 6+r[14;cn] mod 14],hedger_sell_SD_SIZE:?[null hedger_sell_SD_TRIANGLE;0n;6+r[14;cn] mod 14] from t;\n t:select time,action:0+((0^buy_SD_CIRCLE*buy_SD_SIZE)+(0^hedger_buy_SD_TRIANGLE*hedger_buy_SD_SIZE))-\n ((0^sell_SD_CIRCLE*sell_SD_SIZE)+(0^hedger_sell_SD_TRIANGLE*hedger_sell_SD_SIZE)) from t;\n update ulimit:150,dlimit:-150,position:sums action from t}[.z.t]", "refreshPeriod": 1000 } } } } ], "active": true } ] } ] } };
    return { id: -1, version:0, name: "TAQ", defaultParams:"", data: dashJson, dateCreated: new Date(), dateUpdated: new Date() };
};


function DemoListing(props:{addDemo:(sc:ServerConfig, d:Dash) => void, isOpen?:boolean}) {
    const [showDemos, setShowDemos] = useLocalStorage("showDemos",props.isOpen !== false);
    const navigate = useNavigate();

    const kdbDemoSc: ServerConfig = { id: -1, name: "KDB:localhost:5000", host: "localhost", port: 5000, jdbcType: "KDB", database: undefined, url: undefined, username: undefined, password: undefined };
    function getKdbDemoDash():Dash {
        let dashJson:IJsonModel = { "global": DEFAULT_GLOBAL, "borders": [], "layout": { "type": "row", "id": "#1", "children": [ { "type": "row", "id": "#45", "weight": 21.894736842105264, "children": [ { "type": "tabset", "id": "#10", "weight": 50, "children": [ { "type": "tab", "id": "#3", "name": "Latest Prices", "component": "timeseries", "config": { "dashstate": { "chartType": "timeseries", "queryable": { "serverName": "KDB:localhost:5000", "query": "{ \n walk:{ [seed;n]\n r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n prds (100+((r[seed;n]) mod 11)-5)%100};\n c:{x mod `long$00:20:00.0t}x;\n st:x-c;\n cn:`long$c%1000;\n ([] time:.z.d+st+1000*til cn; gold:walk[100;cn]; bitcoin:walk[2;cn]) }[.z.t]", "refreshPeriod": 5000 } } } } ] }, { "type": "row", "id": "#6d347e12-b5b4-4c3b-84b9-5044ed4efab5", "weight": 50, "children": [ { "type": "tabset", "id": "#44", "weight": 50, "selected": 1, "children": [ { "type": "tab", "id": "#9", "name": "PnL", "component": "area", "config": { "dashstate": { "chartType": "area", "queryable": { "serverName": "KDB:localhost:5000", "query": "{([] s:`$string .z.d-til x;w:asc x?100; v:x?10)} 20", "refreshPeriod": 5000 } } } }, { "type": "tab", "id": "#f224082e-26e0-4d86-a613-e8a157d6cfcc", "name": "bubble", "component": "bubble", "config": { "dashstate": { "chartType": "bubble", "queryable": { "serverName": "KDB:localhost:5000", "query": "update GDPperCapita%900,LifeExpectancy%911 from ([] Continent:`NorthAmerica`Asia`Asia`Europe`Europe`Africa`Asia`Africa`Asia;\n\t Country:`US`China`japan`Germany`UK`Zimbabwe`Bangladesh`Nigeria`Vietnam; \n\t Population:313847.0 1343239.0 127938.0 81308.0 63047.0 13010.0 152518.0 166629.0 87840.0 ;\n\t GDP:15080.0 11300.0 4444.0 3114.0 2228.0 9.9 113.0 196.0 104.0 ; \n\tGDPperCapita:48300.0 8400.0 34700.0 38100.0 36500.0 413.0 1788.0 732.0 3359.0 ; \n\tLifeExpectancy:77.14 72.22 80.93 78.42 78.16 39.01 61.33 51.01 70.05 )", "refreshPeriod": 5000 } } } } ] }, { "type": "tabset", "id": "#7778d738-d984-49dc-8f3f-c31f97cdc3ab", "weight": 50, "children": [ { "type": "tab", "id": "#ae9574eb-5575-4045-9c7e-ec8af471bd6a", "name": "radar", "component": "radar", "config": { "dashstate": { "chartType": "radar", "queryable": { "serverName": "KDB:localhost:5000", "query": "([] portfolio:`threadneedle`diamonte; agri:100 10; realEstate:100 10; tech:0 80; growthPotential:50 100; finance:60 20) \n", "refreshPeriod": 5000 } } } } ] } ] } ] }, { "type": "row", "id": "#40", "weight": 14.052631578947368, "children": [ { "type": "tabset", "id": "#5", "weight": 50, "selected": 1, "children": [ { "type": "tab", "id": "#4", "name": "market share", "component": "pie", "config": { "dashstate": { "chartType": "pie", "queryable": { "serverName": "KDB:localhost:5000", "query": "select from ([] sym:`GOOG`MSFT`IBM`MS`C`RBS; sales:15080.0 11300.0 4444.0 3114.0 2228.0 9.9 )", "refreshPeriod": 5000 } } } }, { "type": "tab", "id": "#16", "name": "grid", "component": "grid", "config": { "dashstate": { "chartType": "scatter", "queryable": { "serverName": "KDB:localhost:5000", "query": "update GDPperCapita%20 from ([] Continent:`NorthAmerica`Asia`Asia`Europe`Europe`Africa`Asia`Africa`Asia;\n\t Country:`US`China`japan`Germany`UK`Zimbabwe`Bangladesh`Nigeria`Vietnam; \n\t Population:313847.0 1343239.0 127938.0 81308.0 63047.0 13010.0 152518.0 166629.0 87840.0 ;\n\t GDP:15080.0 11300.0 4444.0 3114.0 2228.0 9.9 113.0 196.0 104.0 ; \n\tGDPperCapita:48300.0 8400.0 34700.0 38100.0 36500.0 413.0 1788.0 732.0 3359.0 ; \n\tLifeExpectancy:77.14 72.22 80.93 78.42 78.16 39.01 61.33 51.01 70.05 )", "refreshPeriod": 5000 } } } } ] }, { "type": "tabset", "id": "#39", "weight": 50, "children": [ { "type": "tab", "id": "#6", "name": "Volume By Exchange", "component": "stack", "config": { "dashstate": { "chartType": "heatmap", "queryable": { "serverName": "KDB:localhost:5000", "query": "{[] walk:{ [seed;n]\n r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n prds (100+((r[seed;n]) mod 11)-5)%100};\n ([] time:.z.d-til 13);\n t:flip `NASDAQ`NYSE`B3`LSE`CME`LME!20 30 2 25 5 4*walk[;13] each til 6;\n `date xcols update date:`$string .z.d-til 13 from t}[] \n \n", "refreshPeriod": 5000 } } } } ], "active": true } ] } ] } };
        return { id: -1, version:0, name: "Misc", defaultParams:"", data: dashJson, dateCreated: new Date(), dateUpdated: new Date() };
    }
    const But = (props:{title:KnownDashTitles}) => {
        return <p><Button small icon="add" title="Copy this dashboard." onClick={() => { addKnownDemo(props.title, url => navigate(url + "?sd_edit=1")); }} >Add Dashboard</Button></p>;
    }

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
            <div className="floatbox" title="Streaming Quotes,Trades and current position">
                <h4>TAQ</h4>
                <div className="demo">{getImg("TAQ")}</div>
                <But title='TAQ'/>
            </div>        
            <div className="floatbox" title="Grid of Time Series Charts">
                <h4>Price Grid</h4>
                <div className="demo">{getImg("Price Grid")}</div>
                <But title='Price Grid'/>
            </div>
            <div className="floatbox" title="Candlestick">
                <h4>Candlestick Chart</h4>
                <div className="demo">{getImg("Candlestick")}</div>
                <But title='Candlestick'/>
            </div>
            <div className="floatbox" title="FX PnL Chart for Week with interactive Form">
                <h4>PnL</h4>
                <div className="demo">{getImg("PnL")}</div>
                <But title='PnL'/>
            </div>  
            
                  
        </div>

        <div id="kdbDemosDiv">
            <h1>KDB Demos</h1>  
            <p>A kdb database running on localhost port 5000 is required or you must modify the connection details to point to your own server.</p>
            <div className="floatbox" title="Table displaying live trades. &#10;Examples of highlighting, currency formatting.">
                <h4>Trade Blotter</h4>
                <div className="demo">{getImg("Trade Blotter")}</div>
                <p><Button small title="Copy this dashboard." icon="add" onClick={() => { props.addDemo(kdbDemoSc, getKdbBlotterDemoDash()); }} >Add Dashboard</Button></p>
            </div>
            <div className="floatbox" title="Streaming Quotes,Trades and current position">
                <h4>TAQ</h4>
                <div className="demo">{getImg("TAQ")}</div>
                <p><Button small title="Copy this dashboard." icon="add" onClick={() => { props.addDemo(kdbDemoSc, getKdbTaqChartDemoDash()); }} >Add Dashboard</Button></p>
            </div>    
            <div className="floatbox" title="Grid of Time Series Charts">
                <h4>Price Grid</h4>
                <div className="demo">{getImg("Price Grid")}</div>
                <p><Button small title="Copy this dashboard." icon="add" onClick={() => { props.addDemo(kdbDemoSc, getKdbPriceGridDemo()); }} >Add Dashboard</Button></p>
            </div>
            <div className="floatbox" title="FX PnL Chart for Week with interactive Form">
                <h4>KDB PnL</h4>
                <div className="demo">{getImg("PnL")}</div>
                <p><Button small title="Copy this dashboard." icon="add" onClick={() => { props.addDemo(kdbDemoSc, getKdbPnLDemoDash()); }} >Add Dashboard</Button></p>
            </div>
            <div className="floatbox" title="Table displaying liquidity per stream">
                <h4>Stream Liquidity</h4>
                <div className="demo">{getImg("Stream Liquidity")}</div>
                <p><Button small title="Copy this dashboard." icon="add" onClick={() => { props.addDemo(kdbDemoSc, getKdbLiquidityDemoDash()); }} >Add Dashboard</Button></p>
            </div>
            <div className="floatbox" title="Candlestick">
                <h4>Candlestick Chart</h4>
                <div className="demo">{getImg("Candlestick")}</div>
                <p><Button small title="Copy this dashboard." icon="add" onClick={() => { props.addDemo(kdbDemoSc, getKdbCandleDemoDash()); }} >Add Dashboard</Button></p>
            </div>
            <div className="floatbox" title="Miscellaneous other chart types.">
                <h4>Misc</h4>
                <div className="demo">{getImg("Misc")}</div>
                <p><Button small title="Copy this dashboard." icon="add" onClick={() => { props.addDemo(kdbDemoSc, getKdbDemoDash()); }} >Add Dashboard</Button></p>
            </div>     
        </div>
    </Collapse>
            
    </>;
}

export function prettyDate(time: Date): string {
    var date = new Date(time),
        diff = (((new Date()).getTime() - date.getTime()) / 1000),
        day_diff = Math.floor(diff / 86400);
    var year = date.getFullYear(),
        month = date.getMonth() + 1,
        day = date.getDate();

    if (isNaN(day_diff) || day_diff < 0 || day_diff >= 31)
        return (
            year.toString() + '-'
            + ((month < 10) ? '0' + month.toString() : month.toString()) + '-'
            + ((day < 10) ? '0' + day.toString() : day.toString())
        );

    var r =
        (
            (
                day_diff === 0 &&
                (
                    (diff < 60 && "just now")
                    || (diff < 120 && "1 minute ago")
                    || (diff < 3600 && Math.floor(diff / 60) + " minutes ago")
                    || (diff < 7200 && "1 hour ago")
                    || (diff < 86400 && Math.floor(diff / 3600) + " hours ago")
                )
            )
            || (day_diff === 1 && "Yesterday")
            || (day_diff < 7 && day_diff + " days ago")
            || (day_diff < 31 && Math.ceil(day_diff / 7) + " weeks ago")
        );
    return r ? r : date.toDateString();
}
