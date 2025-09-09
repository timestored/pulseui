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
 
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Number, String, Array, Record, Static, Undefined, Partial } from 'runtypes';
import { Button,  HTMLTable, Icon, Menu, MenuItem, NonIdealState, MaybeElement, BreadcrumbProps, Breadcrumbs, Breadcrumb } from '@blueprintjs/core';
import { SERVER } from '../engine/queryEngine';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { containsUserConn, ServerConfig, useServerConfigs } from './ConnectionsPage';
import { isAdmin, notyf, ThemeContext } from './../context';
import { IJsonModel } from 'flexlayout-react';
import useLocalStorage, { useCacheThenUpdate } from './hooks';
import { analytics } from '../App';
import { Popover2 } from '@blueprintjs/popover2';
import { addParameter } from './CommonComponents';
import { RiMailSettingsLine } from 'react-icons/ri';
import { DemoListing, getDashCoverImg, KnownDashTitles } from '../pro/DashHelp';


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
    const dateCreated = fromEpoch(dr.dateCreated as unknown as number);
    const dateUpdated = fromEpoch(dr.dateUpdated as unknown as number);

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
    const dateCreated = toEpoch(d.dateCreated);
    const dateUpdated = toEpoch(d.dateUpdated);
    const data = d.data ? JSON.stringify(d.data, null, "\t") : undefined;
    return { ...d, ...{ dateCreated, dateUpdated, data } };
}


async function fetchHistory(dashId:string) {
    const r = await axios.get<DashR[]>(SERVER + "/dashboard/history/" + dashId);
    Array(DashRecord).check(r.data);
    return (r.data as unknown as DashR[]).map(d => convertDash(d));
}

export function DashHistoryPage() {
    const { dashId } = useParams<{dashId: string | undefined}>();
    const [data, setData] = useState<Dash[]>([]);

    useEffect(() => { 
        dashId && fetchHistory(dashId).then(a => {
            setData(a)
        }).catch((e) => {
            notyf.error(e);
            
        });
    },[dashId]);

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
    const maxVersion = data[0].version;

    return (<>
            <BreadCrumbHeader dashId={data[0].id} dashName={data[0].name} pageSelected="history" />
            <div><HTMLTable condensed striped bordered>
            <thead><tr><th>Name</th><th>Version</th><th>Updated</th><th>Restore</th></tr></thead>
                <tbody>{data.map((s, idx) => <tr key={s.version}>
                    <td><Link to={getVLink(s, idx===0)}>{s.name}</Link></td>
                    <td><Link to={getVLink(s, idx===0)}>{s.version}</Link></td>
                    <td>{prettyDate(s.dateUpdated)}</td> 
                    <td>{idx !== 0 && <Button small  onClick={() => confirmRestore({...s, version:maxVersion})}>Restore</Button>}</td></tr>)}</tbody>
            </HTMLTable></div>
        </>)
}


export function DashboardPageRaw(props:{rightOptions:JSX.Element}) {
  
    const { dashId } = useParams<{dashId: string | undefined}>();
    const { versionId } = useParams<{versionId: string | undefined}>();
    // const [editMode,setEditMode] = useState(false);
    const [dash,setDash] = useState<Dash>();
    
    useEffect(() => {
      let dId = -1;
      const vId = versionId && !isNaN(parseInt(versionId)) ? parseInt(versionId) : -1;
      if(dashId && !isNaN(parseInt(dashId))) {
        dId = parseInt(dashId);
        getDash(dId, vId).then(d => setDash(d));
      }
    }, [dashId,versionId]);
    
    if(!dash) {
        return  <NonIdealState icon="error" title="No dashboard found" action={<div>Try <Link to="/dash">View Dashboards</Link></div>} />
    }
    return (<div>
        <BreadCrumbHeader dashId={dash.id} dashName={dash.name} pageSelected="rawjson" />
        <HTMLTable condensed striped bordered>
          <tr><td>id</td><td>{dash.id}</td></tr>
          <tr><td>name</td><td>{dash.name}</td></tr>
          <tr><td>version</td><td>{dash.version}</td></tr>
          <tr><td>defaultParams</td><td>{dash.defaultParams}</td></tr>
          <tr><td>dateCreated</td><td>{""+dash.dateCreated}</td></tr>
          <tr><td>dateUpdated</td><td>{""+dash.dateUpdated}</td></tr>
      </HTMLTable>
        <textarea style={{width:"90%", height:"60vh"}} readOnly>
  {JSON.stringify(dash?.data, null, 2)}
        </textarea>
    </div>);
  }


  export type PageSelected = "config" | "reports" | "history" | "rawjson";
  export function BreadCrumbHeader(props:{dashId:number,dashName:string,pageSelected:PageSelected }) {
      const ps = props.pageSelected;
      const BREADCRUMBS: BreadcrumbProps[] = [
          { href: "/dash", text: "Dashboards" },
          { href: "/dash/" + props.dashId, icon: undefined, text: props.dashName },
          ps === "config" ? { icon: <RiMailSettingsLine />, text: "Report Configuration" }
              : ps === "history" ? { icon: "history", text: "Dashboard History" }
              : ps === "rawjson" ? { icon: "code", text: "Raw JSON" }
              : { icon: "envelope", text: "Reports" }
      ];
  
      return <Breadcrumbs  items={BREADCRUMBS} breadcrumbRenderer={({ href, ...restProps }) => { 
          return href === undefined ? <Breadcrumb {...restProps} /> : <Link to={href}><Breadcrumb {...restProps} /></Link>}
      } />;
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
}

export async function getDash(dashId:number, version:number | undefined = undefined) {
    const r = await axios.get<DashR>(SERVER + "/dashboard/" + dashId + ((version && version>=0) ? "/" + version : ""));
    return convertDash(DashRecord.check(r.data));
}

export async function saveDash(dash:Dash) {
    return axios.put<Dash>(SERVER + "/dashboard", convertToDashR(dash));
}

type OpenMethod = "popup"|"newtab"|"samewindow";

function wrapLink (openMethod:OpenMethod, href:string, openFunc:()=>void, children:MaybeElement,  target = "_blank") {
    if(openMethod === "samewindow") {
        return <Link to={href} >{children}</Link>;
    }
    return <a  href={href}  target={openMethod === "newtab" ? target : undefined}  
                onClick={(e)=>{ if(openMethod === "popup"){ openFunc(); e.preventDefault(); return false; }} } >
                {children}
                </a>;
}

export const addKnownDemo = (name:KnownDashTitles, callback:(url:string)=>void) => {
    analytics.track("Dashboard - AddDemo", {dashName:name});
    axios.post<Dash>(SERVER + "/dashboard/add-demo", name, {headers:{"Content-Type":"text/plain"}})
    .then(r => {
        callback(r.headers['location'] || "");
    }).catch((e) => {
        notyf.error("Error adding demo dashboard.");
        console.error(e);
    });
}

export default function DashPage() {
    const [data, setData] = useCacheThenUpdate<Dash[]|undefined>("dashpage-dashes", undefined, getDashes, ()=>{});
    const [favourites] = useLocalStorage<number[]>("favourites", []);
    const [hasUserConn, setHasUserConn] = useLocalStorage<boolean>("hasUserConn", true);
    const [defaultOpenMethod] = useLocalStorage<OpenMethod>("DashPageDefaultOpenMethod","samewindow");
    const [serverConfigs] = useServerConfigs();
    const navigate = useNavigate();
    const context = useContext(ThemeContext);

    const addItem = async () => {
        if(data !== undefined) {
            const d = await axios.post<Dash>(SERVER + "/dashboard");
            setData(data.concat(convertDash(d.data as unknown as DashR)));
            analytics.track("Dashboard - Add", {dashName:d.data.name, dashId:d.data.id});
            navigate(d.headers['location'] + "?sd_edit=1");
        }
    };

    const copyItem = async (id: number) => {
        if(data !== undefined) {
            const d = await axios.post<Dash>(SERVER + "/dashboard/copy/" + id);
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
        let found = false;
        for (const s of serverConfigs) {
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
    }

    useEffect(() => { setHasUserConn(containsUserConn(serverConfigs)); },[setHasUserConn,serverConfigs])
    useEffect(() => { document.title = "Dashboards" }, []);
    const isFetched = data !== undefined;
    const hasUserDash = data && data.find(d => d.id > 5);

    return <><div>
        <h1>Welcome to Pulse</h1>
        <div className="topButtons">
            <Button icon="add" small onClick={addItem} intent={hasUserConn && !hasUserDash ? "success" : "primary"} className="dash-add-dashboard-button" data-testid="dash-add-dashboard">Add Dashboard</Button>
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
        </div>                
        
        {hasUserConn ? 
            ((data === undefined || hasUserDash) ? null 
                : <NonIdealState className="firstSteps" layout='horizontal' icon="add" title="Create Dashboard" description="Click 'Add Dashboard' to create your own dashboard."  />)
             : <NonIdealState className="firstSteps" layout='horizontal' icon="data-connection" title="Data Connection Required" description="You should first add a connection to access your own data." 
                            action={<Link to="/connections"><Button icon="add" intent='success' >Connect Data</Button></Link>} />}

        {isFetched && data.length === 0 && !isAdmin(context) && <NonIdealState icon="error" title="No Dashboards Found" action={<div>An ADMIN user must create a dashboard for you to view.</div>} />}
        
        <section id="dashboardListing"><div className='row'><div className='col-md-12'>
            {(data || []).map(d => 
                <DashBox hideButtonsInitially dash={d} openMethod={defaultOpenMethod}
                    menu={
                    <Menu>
                        <MenuItem text="Copy this dashboard." icon="add" onClick={() => copyItem(d.id)} />
                        <Link to={"/dash/history/" + d.id}><MenuItem text="View Dashboard History" icon="history" /></Link>
                        <Link to={"/dash/raw/" + d.id}><MenuItem text="View Raw JSON" icon="code" /></Link>
                        {/* <Link to={"/dash/reports/" + d.id}><MenuItem text="Report Configuration" icon={<RiMailSettingsLine />} /></Link> */}
                        
                        <MenuItem text="Delete this dashboard." icon="delete" intent="danger" onClick={() => { window.confirm("Are you sure you want to delete his dashboard?") && deleteItem(d.id) }} />                        
                    </Menu>
                    }/>)}
                
        </div></div></section>
        
            {isAdmin(context) && data !== undefined 
                    && <section id="demoListing"><div className='row'><div className='col-md-12'><DemoListing addDemo={addDemo} /></div></div></section>}
        <section id="addons"><div className='row'>
            <div className='col-md-8'><div className='greybox'>
                <h3>Learn</h3>
                <div className='row'>
                <TuteVideo title='Trader Dashboards (25 mins)' img="https://timestored.com/pulse/tutorial/img/building-kdb-trader-dashboards-small.jpg" link="https://www.timestored.com/pulse/tutorial/kdb-database-charts" />
                <TuteVideo title='Interactive Tables (4 mins)' img="http://timestored.com/pulse/video/pulse-interactive-table.png" link="https://www.timestored.com/pulse/tutorial/pulse-interactive-table"/>
                <TuteVideo title='Event Handlers (2 mins)' img="http://timestored.com/pulse/video/pulse-event-handlers.png" link="https://www.timestored.com/pulse/tutorial/pulse-event-handlers" />
                </div>
            </div></div>
            <div className='col-md-4'><div className='greybox' style={{textAlign:"left"}}>
                <h3>News</h3>
                <ul>
                    {/* eslint-disable-next-line react/jsx-no-target-blank */}
                    <li><a target="_blank" href="https://www.timestored.com/b/qstudio-2-0/">qStudio 2.0</a> - Released with support for other databases including DuckDB.</li> {/* eslint-disable-next-line react/jsx-no-target-blank */}
                    <li>Pulse adds <a target="_blank"  href="https://www.timestored.com/b/pulse-adds-metrics-and-questdb-tutorial/">Metrics Component.</a></li> {/* eslint-disable-next-line react/jsx-no-target-blank */}
                    <li>Newly Added: <a target="_blank"  href="https://www.timestored.com/pulse/help/table-click-events">table Click Events</a>.</li>
                </ul>
            </div></div>
        </div></section>
    </div></>;
}


function TuteVideo(props:{title:string, img:string, link:string}) {
    return <div className="col-md-4 tute" style={{textAlign: "center"}}>
      {/* eslint-disable-next-line react/jsx-no-target-blank */}
    <a href={props.link} target="_blank" > 
    <div className="mytutorial">
        <h3>{props.title}</h3>
        <div className="tutimgWrapper">
            <img height="100%" width="100%" src={props.img} alt={props.title}/>
        </div>
    </div>	
    </a>
    </div>;		
}

function getDashUrlWithParams(d:Dash, moreParams = "") {
    // IF user set params locally use them, else use whatever author saved.
    let param = d.defaultParams.length > 1 ? d.defaultParams : "";
    param = param.replaceAll("&sd_edit=1","").replaceAll("?sd_edit=1",""); // Some dashboards accidentally saved in edit mode. Remove.
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
            <div className="dashbox dashbox-top"  title={"Last Modified: " + prettyDate(d.dateUpdated)}>
                {img}
            </div>
        </div></>

    return <div className="floatbox" key={d.id}>
        {wrapLink(props.openMethod, getDashUrlWithParams(d), () => { openPopoutDash(d); }, linkHeaderAndImg, "_blank"+d.id)}

        {/* <p>{prettyDate(d.dateUpdated)}</p> */}
        <p className={props.hideButtonsInitially ? "whenhover" : ""}>
            {/* <Button minimal title="Favourite this dashboard." icon="star-empty" />
                <Button minimal title="Like this dashboard." icon="thumbs-up" /> */}
            <Button minimal title="Popout" icon="share" onClick={()=>openPopoutDash(d)} className="dash-popout-button" data-testid="dash-popout" />
            <Button minimal title="Favourite" icon={favourites.includes(d.id) ? <Icon icon="star" color="#F7B000" /> : "star-empty"}
                onClick={() => {if(favourites.includes(d.id)) { setFavourites(favourites.filter(e => e !== d.id))} else { setFavourites([...favourites,d.id])}}} className="dash-favourite-button" data-testid="dash-favourite" />
            <Link to={editURL}><Button minimal title="Edit" icon="edit" className="dash-edit-button" data-testid="dash-edit">Edit</Button></Link>
                
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

export function prettyDate(time: Date): string {
    const date = new Date(time),
        diff = (((new Date()).getTime() - date.getTime()) / 1000),
        day_diff = Math.floor(diff / 86400);
    const year = date.getFullYear(),
        month = date.getMonth() + 1,
        day = date.getDate();

    if (isNaN(day_diff) || day_diff < 0 || day_diff >= 31)
        return (
            year.toString() + '-'
            + ((month < 10) ? '0' + month.toString() : month.toString()) + '-'
            + ((day < 10) ? '0' + day.toString() : day.toString())
        );

    const r =
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
