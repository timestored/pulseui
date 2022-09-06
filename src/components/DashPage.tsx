import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Number, String, Array, Record, Static, Undefined, Partial } from 'runtypes';
import { Button, HTMLTable, Icon, Menu, MenuItem, NonIdealState } from '@blueprintjs/core';
import { HHOST, SERVER } from '../engine/queryEngine';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchProcessServers, ServerConfig } from './ConnectionsPage';
import { isAdmin, notyf, ThemeContext } from './../context';
import { IJsonModel } from 'flexlayout-react';
import useLocalStorage from './hooks';
import { analytics } from '../App';
import { Popover2 } from '@blueprintjs/popover2';
import { toSvg } from "jdenticon";
import { RiMailSettingsLine } from "react-icons/ri";
import { BreadCrumbHeader } from './DashReportPage';


/** Messy conversion similar to UserPage to deal with Date/number difference between java/react and to allow checking returned json */

const DashRecord = Record({
    id: Number,
    version: Number,
    name: String,
    dateCreated: Number,
    dateUpdated: Number,
}).And(Partial({
    data: String.Or(Undefined)
}));
type DashR = Static<typeof DashRecord>;

export type Dash = {
    id: number,
    version: number,
    name: string,
    dateCreated: Date,
    dateUpdated: Date,
    data: IJsonModel | undefined,
}

function convertDash(dr: DashR): Dash {
    let dateCreated = fromEpoch(dr.dateCreated as unknown as number);
    let dateUpdated = fromEpoch(dr.dateUpdated as unknown as number);
    let data = dr.data ? JSON.parse(dr.data) : undefined;
    return { ...dr, ...{ dateCreated, dateUpdated, data } };
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
                    <td>{idx !== 0 && <Button small intent="primary" onClick={() => confirmRestore({...s, version:maxVersion})}>Restore</Button>}</td></tr>)}</tbody>
            </HTMLTable></div>
        </>)
}



function openPopoutDash(d:Dash) { 
    const url =  "/dash/" + d.id + "/" + d.name + "?noborder";
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

export default function DashPage() {
    const [data, setData] = useState<Dash[]>([]);
    const [favourites] = useLocalStorage<number[]>("favourites", []);
    const navigate = useNavigate();
    const context = useContext(ThemeContext);


    const addItem = async () => {
        let d = await axios.post<Dash>(SERVER + "/dashboard");
        setData(data.concat(convertDash(d.data as unknown as DashR)));
        analytics.track("Dashboard - Add", {dashName:d.data.name, dashId:d.data.id});
    };

    const copyItem = async (id: number) => {
        let d = await axios.post<Dash>(SERVER + "/dashboard/copy/" + id);
        setData(data.concat(convertDash(d.data as unknown as DashR)));
        analytics.track("Dashboard - Copy", {dashName:d.data.name, dashId:id});
    };

    const deleteItem = async (id: number) => {
        await axios.delete<Dash>(SERVER + "/dashboard/" + id);
        setData(data.filter(e => e.id !== id));
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
                        navigate(r.headers['location']);
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

    return <><div>

        {data.length === 0 && !isAdmin(context) && <NonIdealState icon="error" title="No Dashboards Found" action={<div>An ADMIN user must create a dashboard for you to view.</div>} />}
        <Button icon="add" small intent="success" onClick={addItem} >Add Dashboard</Button>
        {data.length > 0 &&  <Button disabled={favourites.length<=0} intent={favourites.length>0 ? "success" : "none"}
            title="You can favourite a dashboard by clicking on the star icon. Once you have favourites this button will pop-out all favourites to a new window at once."
            onClick={() => {data.forEach(dash => { if(favourites.includes(dash.id)) {openPopoutDash(dash)}})}}>
            Open All Favourites</Button>}
        <br style={{ clear: "left" }} />

        <section id="dashboardListing"><div className='row'><div className='col-md-12'>
            {data.map(d => <DashBox dash={d} hideButtonsInitially menu={
                    <Menu>
                        <MenuItem text="Copy this dashboard." icon="add" onClick={() => copyItem(d.id)} />
                        <Link to={"/dash/history/" + d.id}><MenuItem text="View Dashboard History" icon="history" /></Link>
                        <Link to={"/dash/reports/" + d.id}><MenuItem text="Report Configuration" icon={<RiMailSettingsLine />} /></Link>
                        
                        <MenuItem text="Delete this dashboard." icon="delete" intent="danger" onClick={() => { window.confirm("Are you sure you want to delete his dashboard?") && deleteItem(d.id) }} />                        
                    </Menu>
                    }/>)}
        </div></div></section>
        <section id="demoListing"><div className='row'><div className='col-md-12'>
            {isAdmin(context) && <DemoListing addDemo={addDemo} />}
        </div></div></section>
    </div></>;
}

function DashBox(props:{dash:Dash, menu:JSX.Element, hideButtonsInitially:boolean}) {
    const [menuShown, setMenuShown] = useState(false);
    const [favourites, setFavourites] = useLocalStorage<number[]>("favourites", []);
    const context = useContext(ThemeContext);
    const d = props.dash;

    return <div className="floatbox" key={d.id}>
        <Link to={"/dash/" + d.id + "/" + d.name}><h4>{d.name}</h4>
            <div className="identicon" dangerouslySetInnerHTML={{__html: toSvg(d.name, 150)}} title={"Last Modified: " + prettyDate(d.dateUpdated)}/>
            </Link>
        {/* <p>{prettyDate(d.dateUpdated)}</p> */}
        <p className={props.hideButtonsInitially ? "whenhover" : ""}>
            {/* <Button minimal title="Favourite this dashboard." icon="star-empty" />
                <Button minimal title="Like this dashboard." icon="thumbs-up" /> */}
            <Button minimal title="Popout" icon="share" onClick={()=>openPopoutDash(d)} />
            <Button minimal title="Favourite" icon={favourites.includes(d.id) ? <Icon icon="star" color="#F7B000" /> : "star-empty"}
                onClick={() => {if(favourites.includes(d.id)) { setFavourites(favourites.filter(e => e !== d.id))} else { setFavourites([...favourites,d.id])}}}  />
            <Link to={"/dash/reports/" + d.id + "/emails/" + d.name}><Button minimal title="Report Runs" icon="envelope"/></Link>

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

    return   <div className="floatbox2" style={{  backgroundImage:getUrlN(d.id)}} key={d.id}  title={"Last Modified: " + prettyDate(d.dateUpdated)}>
        <Link to={"/dash/" + d.id + "/" + d.name}>
            <h4>{d.name}</h4>
            <div className="filler"></div>
        </Link>
        <p>
            {/* <Button minimal title="Favourite this dashboard." icon="star-empty" />
                <Button minimal title="Like this dashboard." icon="thumbs-up" /> */}
            <Button minimal title="Popout" icon="share" onClick={()=>openPopoutDash(d)} />
            <Button minimal title="Favourite" icon={favourites.includes(d.id) ? <Icon icon="star" color="#F7B000" /> : "star-empty"}
                onClick={() => {if(favourites.includes(d.id)) { setFavourites(favourites.filter(e => e !== d.id))} else { setFavourites([...favourites,d.id])}}}  />
            <Link to={"/dash/reports/" + d.id + "/emails/" + d.name}><Button minimal title="Report Runs" icon="envelope"/></Link>

            {isAdmin(context) &&  <Popover2 isOpen={menuShown} placement="bottom" onInteraction={(state)=>setMenuShown(state)}  
                content={props.menu}>
                <Button minimal title="Edit Dashboard." icon="more" /*menu*/ onClick={()=>setMenuShown(true)}/>
            </Popover2>}
        </p>
    </div>;
}


function getBlotterDemoDash():Dash {
    let dashJson:IJsonModel  = { "global": { "tabEnableFloat": true }, "borders": [], "layout": { "type": "row", "id": "#8f3558c5-1f26-45c1-8115-fd2ceca4b4b4", "children": [ { "type": "tabset", "id": "#f20b72c6-dcd0-4f51-8f34-2c6c848386c3", "weight": 25, "children": [ { "type": "tab", "id": "#62a93c7b-0f79-4d0e-a6ec-238505cf45c3", "name": "blotter", "component": "grid", "config": { "dashstate": { "chartType": "Grid", "queryable": { "serverName": "DEMODB", "query": "SELECT `time`,`STATUS`,SYMBOL AS SYMBOL_SD_TAG,`INSTRUMENT NAME`,QUANTITY AS QUANTITY_SD_NUMBER0,\n DESTINATION,ORDERTYPE AS ORDERTYPE_SD_TAG, PRICE AS PRICE_SD_CURUSD,\n `PERCENT DONE` AS PERCENT_SD_PERCENT0, `AVG PX`, `PERCENT DONE` AS PERCENT_SD_DATABAR,\n `UPNL` AS UPNL_SD_CURUSD\nFROM TRADE ORDER BY TIME DESC;", "refreshPeriod": 5000 } } } } ], "active": true } ] }};
    return { id: -1, version:0, name: "Trade Blotter", data: dashJson, dateCreated: new Date(), dateUpdated: new Date() };
};

function getPnLDemoDash():Dash {
    let dashJson:IJsonModel  = { "global": { "tabEnableFloat": true, "tabEnableRenderOnDemand": false }, "borders": [], "layout": { "type": "row", "id": "#481b8859-f414-4607-9872-130e1c4e7aa5", "children": [ { "type": "tabset", "id": "#decb3dda-7cdf-4cd4-98dc-80a144049f4d", "weight": 22.63157894736842, "children": [ { "type": "tab", "id": "#beca037c-b553-4aaa-ad4d-228b88066739", "name": "aform", "component": "aform", "config": { "dashstate": { "formWidgets": [ { "id": 1, "guiType": "drop", "key": "ccy", "label": "Choose One:", "optionsList": [ "nyc|New York|United States", "ldn|London|United Kingdom", "washington|Washington, D.C.|United States", "beijing|Beijing|China", "delhi|New Delhi|India" ], "useHardcoded": false, "srs": { "rsdata": { "tbl": { "data": [ { "SYM": "EUR/CHF" }, { "SYM": "EUR/GBP" }, { "SYM": "EUR/JPY" }, { "SYM": "EUR/USD" }, { "SYM": "GBP/USD" }, { "SYM": "USD/CAD" }, { "SYM": "USD/CHF" } ], "types": { "SYM": "string" } } }, "chartRS": { "numericColumns": [], "stringyColumns": [ { "name": "SYM", "vals": [ "EUR/CHF", "EUR/GBP", "EUR/JPY", "EUR/USD", "GBP/USD", "USD/CAD", "USD/CHF" ] } ], "dateColumns": [], "rowLabels": [ "EUR/CHF", "EUR/GBP", "EUR/JPY", "EUR/USD", "GBP/USD", "USD/CAD", "USD/CHF" ], "rowTitle": "SYM" } }, "allowUserCreatedEntries": false, "sliderMin": 0, "sliderMax": 100 }, { "id": 2, "guiType": "drop", "key": "days", "label": "Choose One:", "optionsList": [ "0", "1", "2", "3", "4", "5" ], "useHardcoded": true, "srs": { "rsdata": { "tbl": { "data": [], "types": {} } }, "chartRS": { "numericColumns": [], "stringyColumns": [], "dateColumns": [], "rowLabels": [], "rowTitle": "" } }, "allowUserCreatedEntries": false, "sliderMin": 0, "sliderMax": 100 } ], "layout": "Vertical", "selectedIndex": 1, "queryables": [ { "serverName": "DEMODB", "query": "select distinct(sym) from pnl", "refreshPeriod": 5000 }, { "serverName": "DEMODB", "query": "([] name:`peter`paul`james; nice:(\"Peter Jones\";\"James Dunn\";\"James Rudolph\"))", "refreshPeriod": 5000 } ] } } } ], "active": true }, { "type": "tabset", "id": "#8c7aa838-3d1e-4feb-af09-a32b41446ebc", "weight": 77.36842105263158, "selected": 1, "children": [ { "type": "tab", "id": "#9c7873f1-0032-4e4d-9e55-f275d5a25927", "name": "PnL", "component": "timeseries", "config": { "dashstate": { "chartType": "Time Series", "queryable": { "serverName": "DEMODB", "query": "select time,pnl AS `{ccy}` from pnl WHERE sym LIKE {ccy} AND time>DATEADD('DAY', -{days}, CURRENT_DATE);\n", "refreshPeriod": 5000 } } } }, { "type": "tab", "id": "#0575ac53-18f8-46c0-bb2a-d849749e0b23", "name": "Comparison", "component": "timeseries", "config": { "dashstate": { "chartType": "Time Series", "queryable": { "serverName": "DEMODB", "query": "SELECT c.time,c.GBPUSD,d.`{ccy}` FROM \n(SELECT a.time,b.GBPUSD FROM (select distinct(time) from pnl WHERE sym in ('GBP/USD',{ccy}) AND time>DATEADD('DAY', -{days}, CURRENT_DATE)) a\nLEFT OUTER JOIN\n(SELECT time,pnl AS `GBPUSD` FROM pnl where sym='GBP/USD' AND time>DATEADD('DAY', -{days}, CURRENT_DATE)) b\nON a.time=b.time) c\nLEFT OUTER JOIN\n(SELECT time,pnl AS `{ccy}` FROM pnl where sym={ccy} AND time>DATEADD('DAY', -{days}, CURRENT_DATE)) d\nON c.time=d.time\n", "refreshPeriod": 5000 } } } } ] } ] } }
    return { id: -1, version:0, name: "PnL", data: dashJson, dateCreated: new Date(), dateUpdated: new Date() };
};

function getKdbPnLDemoDash():Dash {
    let dashJson:IJsonModel  = { "global": { "tabEnableFloat": true, "tabEnableRenderOnDemand": false }, "borders": [], "layout": { "type": "row", "id": "#481b8859-f414-4607-9872-130e1c4e7aa5", "children": [ { "type": "tabset", "id": "#2b3cdb08-6355-4490-afe2-90e3f53a37c2", "weight": 35.053003533568905, "children": [ { "type": "tab", "id": "#5857dd5e-fc04-4171-bbb2-13fbe87bd2bb", "name": "form", "component": "aform", "config": { "dashstate": { "formWidgets": [ { "id": 1, "guiType": "multi", "key": "ccy", "label": "Choose One:", "optionsList": [ "nyc|New York|United States", "ldn|London|United Kingdom", "washington|Washington, D.C.|United States", "beijing|Beijing|China", "delhi|New Delhi|India" ], "useHardcoded": false, "srs": { "rsdata": { "tbl": { "data": [ { "sym": "GBP/USD" }, { "sym": "EUR/USD" }, { "sym": "USD/CHF" }, { "sym": "AUD/USD" }, { "sym": "USD/CAD" }, { "sym": "NZD/USD" } ], "types": { "sym": "string" } } }, "chartRS": { "numericColumns": [], "stringyColumns": [ { "name": "sym", "vals": [ "GBP/USD", "EUR/USD", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD" ] } ], "dateColumns": [], "rowLabels": [ "GBP/USD", "EUR/USD", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD" ], "rowTitle": "sym" } }, "allowUserCreatedEntries": false, "sliderMin": 0, "sliderMax": 100 }, { "id": 2, "guiType": "drop", "key": "days", "label": "Choose One:", "optionsList": [ "0|Today", "7|Week" ], "useHardcoded": true, "srs": { "rsdata": { "tbl": { "data": [], "types": {} } }, "chartRS": { "numericColumns": [], "stringyColumns": [], "dateColumns": [], "rowLabels": [], "rowTitle": "" } }, "allowUserCreatedEntries": false, "sliderMin": 0, "sliderMax": 100 } ], "layout": "Vertical", "selectedIndex": 1, "queryables": [ { "serverName": "KDB:localhost:5000", "query": "select distinct(sym) from pnl", "refreshPeriod": 5000 }, { "serverName": "KDB:localhost:5000", "query": "([] name:`peter`paul`james; nice:(\"Peter Jones\";\"James Dunn\";\"James Rudolph\"))", "refreshPeriod": 5000 } ] } } } ], "active": true }, { "type": "tabset", "id": "#8c7aa838-3d1e-4feb-af09-a32b41446ebc", "weight": 64.9469964664311, "selected": 1, "children": [ { "type": "tab", "id": "#d19bbf66-8e4f-4531-be25-48f80da91bd5", "name": "pnl", "component": "timeseries", "config": { "dashstate": { "chartType": "Time Series", "queryable": { "serverName": "KDB:localhost:5000", "query": "(`dt`sym,(first `$((ccy)))) xcol `dt xdesc select from pnl where sym=first `$((ccy)),dt>.z.d-((days))", "refreshPeriod": 5000 } } } }, { "type": "tab", "id": "#84bc5f22-b5c4-4617-a661-8129cbb683a4", "name": "comparison", "component": "timeseries", "config": { "dashstate": { "chartType": "Time Series", "queryable": { "serverName": "KDB:localhost:5000", "query": "0^fills `dt xdesc (uj/) {(`dt,x) xcol select dt,pnl from pnl where sym=x,dt>.z.d-((days))} each (),`$((ccy))", "refreshPeriod": 5000 } } } } ] } ] } };
    return { id: -1, version:0, name: "PnL", data: dashJson, dateCreated: new Date(), dateUpdated: new Date() };
};

function DemoListing(props:{addDemo:(sc:ServerConfig, d:Dash) => void}) {

    function getPriceGridDemo():Dash {
        let dashJson:IJsonModel = { "global": { "tabEnableFloat": true }, 
        "layout": { "type": "row", "id": "#1", 
            "children": [{ "type": "row", "id": "#14", "weight": 17.541560500554432, 
                "children": [{ "type": "tabset", "id": "#13", "weight": 16.27906976744186, 
                    "children": [{ "type": "tab", "id": "#12", "name": "Graph Lookback", "component": "aform", "config": { "dashstate": { "formWidgets": [{ "id": 1, "guiType": "drop", "key": "mins", "label": "Choose One:", "optionsList": ["60|1 Hour", "30|30 Minutes", "10|10 Minutes", "1|1 Minute"], "useHardcoded": true, "srs": { "rsdata": { "tbl": { "data": [], "types": {} } }, "chartRS": { "numericColumns": [], "stringyColumns": [], "dateColumns": [], "rowLabels": [], "rowTitle": "" } }, "allowUserCreatedEntries": false, "sliderMin": 0, "sliderMax": 100 }], "layout": "Vertical", "selectedIndex": 0, "queryables": [{ "serverName": "DEMODB", "query": "([] name:`peter`paul`james; nice:(\"Peter Jones\";\"James Dunn\";\"James Rudolph\"))", "refreshPeriod": 5000 }] } } }], "active": true }, 
                { "type": "tabset", "id": "#7", "weight": 83.72093023255815, 
                "children": [{ "type": "tab", "id": "#6", "name": "Latest Prices", "component": "grid", "config": { "dashstate": { "chartType": "Grid", "queryable": { "serverName": "DEMODB", "query": "\nSELECT NAME,CAST(TIME AS TIME) AS TIME,BID AS BID_SD_NUMBER3, ASK AS ASK_SD_NUMBER3 FROM \n(SELECT NAME,TIME,BID,ASK, \nRANK() OVER (PARTITION BY NAME ORDER BY time DESC) dest_rank \nFROM QUOTE) WHERE dest_rank=1 ORDER BY NAME;", "refreshPeriod": 5000 } } } }] 
                    }] }, 
            { "type": "row", "id": "#23", "weight": 31.67470945849724, 
                "children": [{ "type": "row", "id": "#43", "weight": 35.14492753623188, 
                    "children": [{ "type": "tabset", "id": "#42", "weight": 50, 
                        "children": [{ "type": "tab", "id": "#41", "name": "NFLX", "component": "timeseries", "config": { "dashstate": { "chartType": "Time Series", "queryable": { "serverName": "DEMODB", "query": "SELECT TIME,BID FROM QUOTE \n WHERE NAME='NFLX' AND TIME>timestampadd('minute',-{mins},CURRENT_TIMESTAMP())\n ORDER BY TIME DESC;", "refreshPeriod": 5000 } } } }] }, { "type": "tabset", "id": "#8", "weight": 50, "children": [{ "type": "tab", "id": "#4", "name": "AAPL", "component": "timeseries", "config": { "dashstate": { "chartType": "Time Series", "queryable": { "serverName": "DEMODB", "query": "SELECT TIME,BID FROM QUOTE \n WHERE NAME='AAPL' AND TIME>timestampadd('minute',-{mins},CURRENT_TIMESTAMP())\n ORDER BY TIME DESC;", "refreshPeriod": 5000 } } } }] }] }, { "type": "row", "id": "#49", "weight": 33.19261421920619, "children": [{ "type": "tabset", "id": "#48", "weight": 50, "children": [{ "type": "tab", "id": "#47", "name": "OKTA", "component": "timeseries", "config": { "dashstate": { "chartType": "Time Series", "queryable": { "serverName": "DEMODB", "query": "SELECT TIME,BID FROM QUOTE \n WHERE NAME='OKTA' AND TIME>timestampadd('minute',-{mins},CURRENT_TIMESTAMP())\n ORDER BY TIME DESC;", "refreshPeriod": 5000 } } } }] }, { "type": "tabset", "id": "#22", "weight": 50, "children": [{ "type": "tab", "id": "#21", "name": "GOOG", "component": "timeseries", "config": { "dashstate": { "chartType": "Time Series", "queryable": { "serverName": "DEMODB", "query": "SELECT TIME,BID FROM QUOTE \n WHERE NAME='GOOG' AND TIME>timestampadd('minute',-{mins},CURRENT_TIMESTAMP())\n ORDER BY TIME DESC;", "refreshPeriod": 5000 } } } }] }] }, { "type": "row", "id": "#55", "weight": 31.662458244561932, "children": [{ "type": "tabset", "id": "#54", "weight": 50, "children": [{ "type": "tab", "id": "#53", "name": "TSLA", "component": "timeseries", "config": { "dashstate": { "chartType": "Time Series", "queryable": { "serverName": "DEMODB", "query": "SELECT TIME,BID FROM QUOTE \n WHERE NAME='TSLA' AND TIME>timestampadd('minute',-{mins},CURRENT_TIMESTAMP())\n ORDER BY TIME DESC;", "refreshPeriod": 5000 } } } }] }, { "type": "tabset", "id": "#34", "weight": 50, "children": [{ "type": "tab", "id": "#33", "name": "DOCU", "component": "timeseries", "config": { "dashstate": { "chartType": "Time Series", "queryable": { "serverName": "DEMODB", "query": "SELECT TIME,BID FROM QUOTE \n WHERE NAME='DOCU' AND TIME>timestampadd('minute',-{mins},CURRENT_TIMESTAMP())\n ORDER BY TIME DESC;", "refreshPeriod": 5000 } } } }] }] }] }, { "type": "row", "id": "#29", "weight": 17.96794056726413, "children": [{ "type": "tabset", "id": "#18", "weight": 34.78260869565217, "children": [{ "type": "tab", "id": "#17", "name": "MSFT", "component": "timeseries", "config": { "dashstate": { "chartType": "Time Series", "queryable": { "serverName": "DEMODB", "query": "SELECT TIME,BID FROM QUOTE \n WHERE NAME='MSFT' AND TIME>timestampadd('minute',-{mins},CURRENT_TIMESTAMP())\n ORDER BY TIME DESC;", "refreshPeriod": 5000 } } } }] }, { "type": "tabset", "id": "#28", "weight": 33.550463035630194, "children": [{ "type": "tab", "id": "#27", "name": "AMZN", "component": "timeseries", "config": { "dashstate": { "chartType": "Time Series", "queryable": { "serverName": "DEMODB", "query": "SELECT TIME,BID FROM QUOTE \n WHERE NAME='AMZN' AND TIME>timestampadd('minute',-{mins},CURRENT_TIMESTAMP())\n ORDER BY TIME DESC;", "refreshPeriod": 5000 } } } }] }, { "type": "tabset", "id": "#38", "weight": 31.66692826871762, "children": [{ "type": "tab", "id": "#37", "name": "FB", "component": "timeseries", "config": { "dashstate": { "chartType": "Time Series", "queryable": { "serverName": "DEMODB", "query": "SELECT TIME,BID FROM QUOTE \n WHERE NAME='FB' AND TIME>timestampadd('minute',-{mins},CURRENT_TIMESTAMP())\n ORDER BY TIME DESC;", "refreshPeriod": 5000 } } } }] }] }] }, "borders": [] };
        return  { id: -1, version:0, name: "Price Grid", data: dashJson, dateCreated: new Date(), dateUpdated: new Date() };
    }
    
    const demosc: ServerConfig = { id: -1, name: "DEMODB", host: HHOST, port: 9000, jdbcType: "H2", database: "mem:db1", url: undefined, username: "sa", password: "jimmy1" };
    
    const kdbDemoSc: ServerConfig = { id: -1, name: "KDB:localhost:5000", host: HHOST, port: 5000, jdbcType: "KDB", database: undefined, url: undefined, username: undefined, password: undefined };
    function getKdbDemoDash():Dash {
        let dashJson:IJsonModel = { "global": { "tabEnableFloat": true }, "layout": { "type": "row", "id": "#1", "children": [{ "type": "row", "id": "#45", "weight": 21.894736842105264, "children": [{ "type": "tabset", "id": "#10", "weight": 50, "children": [{ "type": "tab", "id": "#3", "name": "Latest Prices", "component": "timeseries", "config": { "dashstate": { "chartType": "Time Series", "queryable": { "serverName": "KDB:localhost:5000", "query": "{ \n    walk:{ [seed;n]\n        r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n        prds (100+((r[seed;n]) mod 11)-5)%100};\n    c:{x mod `long$00:20:00.0t}x;\n    st:x-c;\n    cn:`long$c%1000;\n    ([] time:.z.d+st+1000*til cn; gold:walk[100;cn]; bitcoin:walk[2;cn])  }[.z.t]", "refreshPeriod": 5000 } } } }] }, { "type": "tabset", "id": "#44", "weight": 50, "children": [{ "type": "tab", "id": "#9", "name": "PnL", "component": "area", "config": { "dashstate": { "chartType": "Area", "queryable": { "serverName": "KDB:localhost:5000", "query": "{([] s:`$string .z.d-til x;w:asc x?100;  v:x?10)} 20", "refreshPeriod": 5000 } } } }], "active": true }] }, { "type": "row", "id": "#40", "weight": 14.052631578947368, "children": [{ "type": "tabset", "id": "#5", "weight": 50, "children": [{ "type": "tab", "id": "#4", "name": "market share", "component": "pie", "config": { "dashstate": { "chartType": "Pie", "queryable": { "serverName": "KDB:localhost:5000", "query": "select from ([] sym:`GOOG`MSFT`IBM`MS`C`RBS; sales:15080.0 11300.0 4444.0 3114.0 2228.0 9.9 )", "refreshPeriod": 5000 } } } }, { "type": "tab", "id": "#16", "name": "grid", "component": "grid", "config": { "dashstate": { "chartType": "Grid", "queryable": { "serverName": "KDB:localhost:5000", "query": "([] stock:`Barclays`BP`BT`Glencore`RioTinto`RBS`Tesco`Vodaphone;  \n    Sell:172.06 319.85 135.70 287.05 5798 186.6 220.50 131.20;\n    Buy:172.08 319.88 135.90 287.25 5802 186.7 220.60 131.30) ", "refreshPeriod": 5000 } } } }] }, { "type": "tabset", "id": "#39", "weight": 50, "children": [{ "type": "tab", "id": "#6", "name": "Volume By Exchange", "component": "stack", "config": { "dashstate": { "chartType": "Stack", "queryable": { "serverName": "KDB:localhost:5000", "query": "{[] walk:{ [seed;n]\n        r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};\n        prds (100+((r[seed;n]) mod 11)-5)%100};\n    ([] time:.z.d-til 13);\n    t:flip `NASDAQ`NYSE`B3`LSE`CME`LME!20 30 2 25 5 4*walk[;13] each til 6;\n    `date xcols update date:`$string .z.d-til 13 from t}[] \n    \n", "refreshPeriod": 5000 } } } }] }] }] }, "borders": [] };
        return { id: -1, version:0, name: "kdb Demo", data: dashJson, dateCreated: new Date(), dateUpdated: new Date() };
    }
    
    return <>
    <div id="demosDiv">
        <h1>Demos</h1>
        <div className="floatbox" title="Table displaying live trades. &#10;Examples of highlighting, currency formatting.">
            <h4>Trade Blotter</h4>
            <div className="demo"><img src="./img/blotter2.png" width="150" height="150" alt="Trade Blotter" /></div>
            <p><Button small title="Copy this dashboard." icon="add" onClick={() => { props.addDemo(demosc, getBlotterDemoDash()); }} intent="success">Add Dashboard</Button></p>
        </div>
        <div className="floatbox" title="Grid of Time Series Charts">
            <h4>Price Grid</h4>
            <div className="demo"><img src="./img/price-grid-small.png" width="150" height="150" alt="Price Grid" /></div>
            <p><Button small title="Copy this dashboard." icon="add" onClick={() => { props.addDemo(demosc, getPriceGridDemo()); }} intent="success">Add Dashboard</Button></p>
        </div>
        <div className="floatbox" title="FX PnL Chart for Week with interactive Form">
            <h4>PnL</h4>
            <div className="demo"><img src="./img/pnl.png" width="150" height="150" alt="Pnl Graph" /></div>
            <p><Button small title="Copy this dashboard." icon="add" onClick={() => { props.addDemo(demosc, getPnLDemoDash()); }} intent="success">Add Dashboard</Button></p>
        </div>
        <div className="floatbox" title="Stock Ticker Dashboard">
            <h4>H2 Demo</h4>
            <div className="demo"><img  src="./img/h2-logo.png" width="150" height="90" alt="H2 Database logo" /></div>
            <p><Button small title="Copy this dashboard." icon="add" onClick={() => {  props.addDemo(kdbDemoSc, getKdbDemoDash());}} intent="success" >Add Dashboard</Button></p>
        </div>
    </div>

    <div id="kdbDemosDiv">
        <h1>KDB Demos</h1>  
        <div className="floatbox" title="Stock Ticker Dashboard">
            <h4>kdb Demo</h4>
            <div className="demo"><img src="./img/kx.png" width="150" height="150" alt="kdb logo" /></div>
            <p><Button small title="Copy this dashboard." icon="add" onClick={() => { props.addDemo(kdbDemoSc, getKdbDemoDash()); }} intent="success" >Add Dashboard</Button></p>
        </div> 
        <div className="floatbox" title="FX PnL Chart for Week with interactive Form">
            <h4>KDB PnL</h4>
            <div className="demo"><img src="./img/pnl.png" width="150" height="150" alt="Pnl Graph" /></div>
            <p><Button small title="Copy this dashboard." icon="add" onClick={() => { props.addDemo(kdbDemoSc, getKdbPnLDemoDash()); }} intent="success">Add Dashboard</Button></p>
        </div>
    </div>
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
