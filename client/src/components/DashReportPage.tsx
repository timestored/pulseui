import { useState, useEffect, useContext, FormEvent } from 'react';
import axios from 'axios';
import { Number as Num, String, Array, Record, Static, Boolean, Partial, Undefined  } from 'runtypes';
import { Alert, Button, HTMLTable, Intent, NonIdealState, Slider,Menu, MenuDivider, MenuItem, Icon, Breadcrumbs, Breadcrumb, BreadcrumbProps } from '@blueprintjs/core';
import { SERVER } from '../engine/queryEngine';
import { Dash, fromEpoch, getDash, prettyDate } from './DashPage';
import { isAdmin, ThemeContext } from '../context';
import { Route, Routes, useParams } from 'react-router';
import { notyf } from './../context';
import { HelpLink, MyOverlay } from './CommonComponents';
import { AjaxResButton, AjaxResult } from './ConnectionsPage';
import cronstrue from 'cronstrue';
import { Popover2 } from "@blueprintjs/popover2";
import { Link } from 'react-router-dom';
import { RiMailSettingsLine } from "react-icons/ri";
import React from 'react';
import { ANAME } from '../App';

/**
 * Whether to use MyOverlay to allow editing one item at time like ConnectionsPage 
 *   OR to have an editable table where all reports can be edited at once?
 * +EditAtOnce - Easier to prevent large mishaps?
 * +FullTable - Easier to change many.
 * -FullTable - Save is less obvious. You make changes but could forget to save? Or one version could fail?
 * 
 * Should I associtate the ReportCOnfig in java with other entites? Makes converrsion messier but more useful?
 */

/** Messy conversion similar to DashPage to deal with Date/number difference between java/react and to allow checking returned json */
const ReportRecord = Record({
    id: Num,
    url: String,
    cron: String,
    width:Num,
    height:Num,
    secondsDelay:Num,
    ownerId:Num,
    dashId:Num,
    dateCreated: Num,
    dateUpdated: Num,
});

type ReportR = Static<typeof ReportRecord>;
type Report = {
    id: number,
    url: string,
    cron: string,
    width:number,
    height:number,
    secondsDelay:number,
    ownerId:number,
    dashId:number,
    dateCreated: Date,
    dateUpdated: Date,
}

function convertReport(u: ReportR): Report {
    let dateCreated = fromEpoch(u.dateCreated as unknown as number);
    let dateUpdated = fromEpoch(u.dateUpdated as unknown as number);
    return { ...u, ...{ dateCreated, dateUpdated } };
}


/** Messy conversion similar to DashPage to deal with Date/number difference between java/react and to allow checking returned json */
const ReportResultRecord = Record({
    id: Num,
    version: Num,
    url: String,
    reportId:Num,
    dashId:Num,
    succeeded: Boolean,
    dateCreated: Num,
    dateUpdated: Num,
}).And(Partial({
    result: String.Or(Undefined),
    log: String.Or(Undefined),
    html: String.Or(Undefined),
    dateCompleted: Num.Or(Undefined)
}));

type ReportResultR = Static<typeof ReportResultRecord>;
type ReportResult = {
    id: number,
    version: number,
    url: string,
    reportId: number,
    dashId:number,
    dateCompleted: Date | undefined,
    result:string,
    log:string,
    html:string,
    succeeded:boolean,
    dateCreated: Date,
    dateUpdated: Date,
}

function convertReportResult(u: ReportResultR): ReportResult {
    let dateCreated = fromEpoch(u.dateCreated as unknown as number);
    let dateUpdated = fromEpoch(u.dateUpdated as unknown as number);
    let dateCompleted = u.dateCompleted === undefined ? undefined : fromEpoch(u.dateCompleted as unknown as number);
    let result = u.result === undefined ? "" : u.result;
    let log = u.log === undefined ? "" : u.log;
    let html = u.html === undefined ? "" : u.html;
    return { ...u, ...{ dateCreated, dateUpdated, dateCompleted, result, log, html } };
}

// function convertToReportR(d: User): ReportR {
//     let dateCreated = toEpoch(d.dateCreated);
//     let dateUpdated = toEpoch(d.dateUpdated);
//     return { ...d, ...{ dateCreated, dateUpdated } };
// }

async function getReports(dashId:number) {
    const r = await axios.get<ReportR[]>(SERVER + "/report/" + dashId);
    Array(ReportRecord).check(r.data);
    return (r.data as unknown as ReportR[]).map(d => convertReport(d));
};

async function getReportResults(dashId:number) {
    const r = await axios.get<ReportR[]>(SERVER + "/report/results/" + dashId);
    Array(ReportResultRecord).check(r.data);
    return (r.data as unknown as ReportResultR[]).map(d => convertReportResult(d));
};

const newReportConfig: Report = { id: -1, url:"/dash/1/Price%20Grid?mins=30", cron:"", width:0, height:0, secondsDelay:5, ownerId:-1, dashId:-1, dateCreated:new Date(), dateUpdated:new Date() };

function toNiceCron(s:string, verbose:boolean = true) {
    try {
        return s.split("|").map(s => cronstrue.toString(s, { use24HourTimeFormat: true, verbose:true })).join(". \n") 
    } catch {}
    return s;
}

function toNiceURL(url:string) { return url.includes("?") ? url.substring(1+url.indexOf("?")) : url}

function toShortHtml(r:Report) { return <div>{toNiceURL(r.url)} - {toNiceCron(r.cron,false)}</div>; }

export default function DashReportPage() {
    
    let { dashId } = useParams<{dashId: string | undefined}>();
    const [dash, setDash] = useState<Dash | undefined | null>(undefined);
    const context = useContext(ThemeContext);

    useEffect(() => {
        setDash(undefined);
        if(dashId && !isNaN(parseInt(dashId))) {
            getDash(parseInt(dashId)).then(d => setDash(d)).catch(e => setDash(null));
        }
    }, [dashId]);

    if(dash === undefined) {
        return <></>; // Loading
    } else if(dash !== null) {
        return  <>
        <Routes>
            <Route path="/" element={<DashReportPageInner dash={dash} />} />
            <Route path="/emails/*" element={<DashReportResultPageInner dash={dash} />} />
            <Route path="/email/:reportResultIdString" element={<ReportResultPage dash={dash} />} />
        </Routes>
        </>;
    } else  if(!isAdmin(context)) {
        return <NonIdealState icon="error" title="You are not permitted on this page." ></NonIdealState>;
    }
    return <NonIdealState icon="error" title="Invalid DashId" ></NonIdealState>;
}

// H2 Database can return stale reads with connection pooling, need to add foolish delay.
function refreshReports(dashId:number, setReports:(r:Report[])=>void, addDelay:boolean = false) {
    setTimeout(function() {
        getReports(dashId)
            .then(r => { setReports(r);   })
            .catch(r => {console.error(r); notyf.error("Error retrieving reports from servers. ")});
    }, addDelay ? 50 : 0);
}


async function getReportResult(reportResultId:number) { 
    const r = await axios.get<ReportResult>(SERVER + "/report/result/" + reportResultId);
    return convertReportResult(r.data as unknown as ReportResultR)
};

function ReportResultPage(props:{dash:Dash}) {
    const [reportResult, setReportResult] = useState<ReportResult | null | undefined>(null);
    const { dash } = props;
    let { reportResultIdString } = useParams<{reportResultIdString: string | undefined}>();
    
    useEffect(() => {
        if(reportResultIdString !== undefined) {
            let reportResultId = parseInt(reportResultIdString);
            getReportResult(reportResultId)
                .then(rr => setReportResult(rr))
                .catch((e) => { setReportResult(undefined); });
        }
    }, [reportResultIdString]);
    
    if(reportResult === null) {
        return <></>;
    } else if(reportResult === undefined) {
        return <NonIdealState icon="error" title="Report Result Error" />;
    }
    return <div>
        <h1><Link to={"/dash/" + dash.id}>{dash.name}</Link></h1>
        <img src={SERVER + "/report/image/" + reportResultIdString} alt="dashboard screenshot" />
        <div dangerouslySetInnerHTML={{__html:reportResult.html}} />
    </div>;
}

function DashReportResultPageInner(props:{dash:Dash}) {
    const [reports, setReports] = useState<Report[]>([]);
    const [reportResults, setReportResults] = useState<ReportResult[]>([]);
    const { dash } = props;

    useEffect(() => { refreshReports(dash.id,setReports) },[dash]);
    useEffect(() => { document.title = (dash ?  dash.name : ANAME) + " - Reports" }, [dash]);
    useEffect(() => { 
        getReportResults(dash.id)
            .then(dr => { setReportResults(dr); })
            .catch(e => {
                notyf.error("Failed to fetch report Results" + e);
                console.error("Failed to fetch report Results" + e);
            })
    },[dash]);
    function getReportLink(reportId:number) {
        let rep = reports.find(r => r.id === reportId);
        if(rep) {
            return <span title={toNiceCron(rep.cron)}>{"" + rep.id + " - " + toNiceURL(rep.url)}</span>
        }
        return ""+reportId;
    }
    
    return <>
        <BreadCrumbHeader dash={dash}  pageSelected="reports" />
        {dash && <EmailReportButton dashId={dash.id} showAdminControls={false}/>}
        <div><HTMLTable condensed striped bordered>
            <thead><tr><th>Email</th><th>Report</th><th>URL</th><th>Started</th><th>Updated</th><th>Completed</th><th>Image</th><th>Succeeded</th></tr></thead>
                <tbody>{reportResults.map((rr, idx) => 
                    <tr key={rr.id}>
                        <td><Link to={"/dash/reports/" + rr.dashId + "/email/" + rr.id}>Email</Link></td>
                        <td><Link to={"/dash/reports/" + rr.dashId + "?highlight=" + rr.reportId}>{getReportLink(rr.reportId)}</Link></td>
                        <td>{toNiceURL(rr.url)}</td>
                        <td>{prettyDate(rr.dateCreated)}</td>
                        <td>{prettyDate(rr.dateUpdated)}</td>
                        <td>{rr.dateCompleted !== undefined ? prettyDate(rr.dateCompleted) : ""}</td>
                        <td> <a href={SERVER + "/report/image/" + rr.id} rel="noreferrer" target="_blank">{"image"+rr.id}</a> </td>
                        <td><Icon icon={rr.succeeded ? "tick" : "small-cross"} intent={rr.succeeded ? "success" : "danger"}  />{rr.succeeded ? "" : "Failed"} </td>
                        </tr>)}
            </tbody></HTMLTable></div>
    </>;
}
 

export type PageSelected = "config" | "reports" | "history";
export function BreadCrumbHeader(props:{dash:Dash,pageSelected:PageSelected }) {
    const ps = props.pageSelected;
    const BREADCRUMBS: BreadcrumbProps[] = [
        { href: "/dash", text: "Dashboards" },
        { href: "/dash/" + props.dash.id, icon: undefined, text: props.dash.name },
        ps === "config" ? { icon: <RiMailSettingsLine />, text: "Report Configuration" }
            : ps === "history" ? { icon: "history", text: "Dashboard History" }
            : { icon: "envelope", text: "Reports" }
    ];

    return <Breadcrumbs  items={BREADCRUMBS} breadcrumbRenderer={({ href, ...restProps }) => { 
        return href === undefined ? <Breadcrumb {...restProps} /> : <Link to={href}><Breadcrumb {...restProps} /></Link>}
    } />;
}


function DashReportPageInner(props:{dash:Dash}) {
    const [reports, setReports] = useState<Report[]>([]);
    const [deleteId, setDeleteId] = useState<Report>();
    const [runId, setRunId] = useState<Report>();
    const [editId, setEditId] = useState<Report>();
    const [highlightId, setHighlightId] = useState<Report>();
    const { dash } = props;

    useEffect(() => { refreshReports(dash.id,setReports) },[dash]);
    useEffect(() => { document.title = (dash ?  dash.name : ANAME) + " - Reports" }, [dash]);
    
    useEffect(() => {
        let sp = new URLSearchParams(window.location.search);
        if(sp.get("add")) {
            let srch = sp.get("add") === "?" ? "" : "?" + sp.get("add");
            setEditId({...newReportConfig, url:"/dash/" + dash.id + srch, dashId:dash.id});
        }
    },[dash]);
    useEffect(() => {
        let sp = new URLSearchParams(window.location.search);
        if(sp.get("highlight")) {
            let a = reports.filter(r => r.id === parseInt(sp.get("highlight") || "-2"));
            setHighlightId(a && a.length === 1 ? a[0] : undefined);
        }
    },[reports]);
    
    async function deleteItem(id: number) { await axios.delete(SERVER + "/report/" + id); console.log("Report - Deleted: " + id); };
    
    async function runItem(id: number) {
        // await axios.delete(SERVER + "/report/" + id);
        console.log("Report - Ran: " + id);
    };

    function refreshR() { refreshReports(dash.id, setReports, true); }

    return (<>
    <BreadCrumbHeader dash={dash}  pageSelected="config" />

    <Button icon="add" small onClick={() => { setEditId({...newReportConfig, dashId:dash.id, url:"/dash/" + dash.id}); }} intent="success">Add Report for Dashboard</Button>
    <Link to={"/dash/reports/" + dash.id + "/emails/" + dash.name}><Button small icon="envelope">Report Runs</Button></Link>

            <div><HTMLTable condensed striped bordered interactive>
            <thead><tr><th>id</th><th>URL</th><th>Schedule</th><th>Screenshot Size</th><th>Delay</th><th>Updated</th><th>Delete</th><th>Run</th></tr></thead>
                <tbody>{reports.map((r, idx) => 
                    <tr key={r.id} onClick={() => setEditId(r)} className={highlightId?.id === r.id ? "highRow" : ""}>
                        <td>{r.id}</td>
                        <td>{toNiceURL(r.url)}</td>
                        <td>{toNiceCron(r.cron).split("\n").map((e,idx) => <span>{(idx>0 && <br />)}{e}</span>)}</td>
                        <td>{r.height !== undefined && r.height === 0 ? "default" : ""+r.width+"x"+r.height}</td>
                        <td>{r.secondsDelay === 0 ? "default" : r.secondsDelay}</td>
                        <td>{prettyDate(r.dateUpdated)}</td>
                        <td><Button icon="delete" intent={Intent.DANGER} small onClick={(e) => { e.stopPropagation(); setDeleteId(r); }} /></td>
                        <td><ReportRunButton report={r} /></td>
                        </tr>)}
            </tbody></HTMLTable></div>

            <MyOverlay isOpen={editId !== undefined} handleClose={() => setEditId(undefined)} title={(editId?.id === -1 ? "Add" : "Edit") + " Report"}>
                <ReportEditor report={editId!} editorClosed={() =>{ setEditId(undefined); refreshR(); }} />
            </MyOverlay>

            <Alert cancelButtonText="Cancel" confirmButtonText="Delete" icon="trash" intent={Intent.DANGER} isOpen={deleteId?.id ? true : false}
                        onCancel={() => setDeleteId(undefined)} onConfirm={() => { deleteId?.id && deleteItem(deleteId.id); setDeleteId(undefined); refreshR(); }}
                        canEscapeKeyCancel canOutsideClickCancel>
                        <p>Are you sure you want to delete this Report?
                            <br />This will stop emails to all subscribed users.</p>
                    </Alert>

            <Alert cancelButtonText="Cancel" confirmButtonText="Run Report" icon="envelope" isOpen={runId?.id ? true : false}
                        onCancel={() => setRunId(undefined)} onConfirm={() => { runId?.id && runItem(runId.id); setRunId(undefined); }}
                        canEscapeKeyCancel canOutsideClickCancel>
                        <p>Are you sure you want to run this report?
                            <br />This will email any users subscribed to that report. </p>
                    </Alert>
        </>);
}



function ReportRunButton(props:{report:Report }) {
    const [reportResult, setReportResult] = useState<ReportResult>();
    const [runState, setRunState] = useState<AjaxResult>({state:""});

    async function handleRun() {
        setRunState({state:"running"});
        setReportResult(undefined);
        axios.post<ReportResult>(SERVER + "/report/" + props.report.id)
            .then(d => {
                setReportResult(convertReportResult(d.data as unknown as ReportResultR));
                setRunState({state:"succeeded"});
            })
            .catch(e => {
                setRunState({state:"failed", msg:"Failed to Run Report" + e});
                setReportResult(undefined);
            });
    }
    
    return <>
            <Button icon="play" disabled={runState?.state === "running"} intent={Intent.SUCCESS} small onClick={(e) => { e.stopPropagation(); handleRun(); }}  />
            {reportResult && ("Run " + reportResult.succeeded ? "Succeeded" : "Failed") }
        </>;
}

function ReportEditor(props:{report:Report, editorClosed:()=>void}) {
    const [saveState, setSaveState] = useState<AjaxResult>();
    const [report, setReport] = useState<Report>(props.report);

    function handleSubmit(e: FormEvent<HTMLFormElement>): void {
        e.preventDefault();
        setSaveState({state:"running"});
        let upsert = report.id === -1 ? axios.post : axios.put;
        upsert<Report>(SERVER + "/report", report)
        .then(r => {
            ReportRecord.check(r.data);
            notyf.success("Report Added");
            setSaveState({state:"succeeded"});
            props.editorClosed();
        }).catch((e) => {
            let msg = e?.response?.data?._embedded?.errors[0]?.message;
            notyf.error("Failed to Add Report" + msg);
            console.error("Failed to Add Report " + e);
            setSaveState({state:"failed", msg:msg});
        });
    }

    function setWH(w:number, h:number) { setReport({...report,...{width:w, height:h}}); }

    let dashId:number | undefined = undefined;
    if(report.url.startsWith("/dash/")) {
        let d = report.url.substring(6);
        if(d.indexOf("/") !== -1) {
            d = d.substring(0,d.indexOf("/"));
        }
        dashId = parseInt(d);
    }
    let args = "";
    let preArgs = report.url;
    let qPos = report.url.indexOf("?");
    if(qPos !== -1) {
        args = report.url.substring(qPos+1);
        preArgs = report.url.substring(0, qPos);
    }
    let UrlInput =  <label>URL: <input type="text" value={report.url} onChange={(e) =>  setReport({...report,url:e.target.value})} 
            width="45" style={{width:"35em"}} minLength={3} placeholder="http://google.com"/></label>;
    if(dashId) {
        UrlInput =  <label>DashBoard ID: {dashId} <input type="text" value={args} onChange={(e) =>  setReport({...report,url:preArgs + "?" + e.target.value})} 
                width="35" style={{width:"25em"}} minLength={3} placeholder="?arg=val"/></label>;
    }

    function addToCron(c:string) {
        let newc = c;
        if(report.cron.startsWith(c) || report.cron.includes("|" +c )) {
            return; // do nothing as that cron is already there
        }
        if(report.cron.trim().length > 0) {
            newc = report.cron.trim() + "|" + c;
        }
        setReport({...report,cron:newc})
    }

    return <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => handleSubmit(e)}>
            <br />{UrlInput}<br /><br />

            <label>CRON: <input type="text" value={report.cron} onChange={(e) =>  setReport({...report,cron:e.target.value})} 
                width="35" style={{width:"25em"}} minLength={3} placeholder="0 17 * * FRI"/>
                
                <HelpLink href="https://crontab.guru/#0_19_*_*_FRI" htmlTxt="MIN HOUR DD MONTH DAY - Cron Format<br />With a | separator to allow specifying multiple timings of one report." />
                
                </label>
            <br />
            <Button small text="Mon-Fri 4:30pm" onClick={()=>addToCron("30 16 * * 1-5")} />
            <Button small text="Weekly 7pm Fri" onClick={()=>addToCron("0 19 * * FRI")} />
            <br /><br />
            <label>Resolution: <span className="bp4-text-muted">(optional)</span></label>
            <br />
            <Button small onClick={() => { setWH(3840,2160); }}>4K</Button>
            <Button small onClick={() => { setWH(1920,1080); }}>1080</Button>
            <Button small onClick={() => { setWH(720,480); }}>720</Button>
            <Button small onClick={() => { setWH(640,480); }}>480</Button>
            <Button small onClick={() => { setWH(1748,2480); }}>A4</Button>
            <br />
            <label>Width: <input type="number" value={report.width === 0 ? "" : report.width} onChange={(e) => setReport({...report, width:Number(e.target.value)}) } width="4" style={{width:"5em"}} />        </label>
            <label>Height: <input type="number" value={report.height === 0 ? "" : report.height} onChange={(e) =>  setReport({...report,height:Number(e.target.value)}) }  width="4" style={{width:"5em"}} />        </label>
            <br /><br />
              <div style={{width:"300px"}}>
                <label>Seconds Delay Before Screengrab: <span className="bp4-text-muted">(optional)</span>
                    <Slider value={report.secondsDelay} min={0} max={60}  
                        onChange={(n) =>  setReport({...report,secondsDelay:(n >= 1 ? n : 1)})} stepSize={1} labelStepSize={10} 
                    /></label>
              </div>
              
              <Button intent="primary" type="submit" disabled={saveState?.state === "running"}>{report.id === -1 ? "Add" : "Save"}</Button>&nbsp;
              <Button intent="success" disabled={saveState?.state === "running"}>Send Test Email</Button>&nbsp;
                {saveState && <AjaxResButton mystate={saveState} succeededMsg="Saved" />}
    </form>;
}



const SubscriptionRecord = Record({
    id: Num,
    userId:Num,
    reportId:Num,
});

type Subscription = Static<typeof SubscriptionRecord>;


async function getSubscriptions(dashId:number, targetUserId:number | undefined = undefined) {
    const r = await axios.get<Subscription[]>(SERVER + "/subscription/" + dashId + (targetUserId === undefined ? "" : "/"+targetUserId));
    Array(SubscriptionRecord).check(r.data);
    return (r.data as unknown as Subscription[]);
}

async function setMySubscriptions(dashId:number, reportIds:number[]) {
    // String is a hack to send long[] as micronaut can't understand it otherwise.
    let idString = " "+reportIds.map(rid => ""+rid).join(",");
    await axios.post<Subscription[]>(SERVER + "/subscription/" + dashId, idString, {headers:{"Content-Type":"text/plain"}})
      .catch((e) =>{
        notyf.error("Subscription Failed." + e)
        console.error("Subscription Failed." + e)
      })
}

export function EmailReportButton(props:{dashId:number, showAdminControls:boolean}) {

    const [menuShown, setMenuShown] = useState(false);
    const [reports, setReports] = useState<Report[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const context = useContext(ThemeContext);
    let myReportIds = subscriptions.map(s => s.reportId);
    
    const toggleSubscription = (reportId:number) => {
      console.log("clicked:" + reportId);
      if(myReportIds.includes(reportId)) {
        setMySubscriptions(props.dashId, [...myReportIds].filter(rid => rid !== reportId));
      } else {
        setMySubscriptions(props.dashId, [...myReportIds,reportId]);
      }
      setMenuShown(false);
    }
  
    useEffect(()=>{ refreshReports(props.dashId,setReports);  },[menuShown, props.dashId]);

    useEffect(()=>{
        // H2 Database can return stale reads with connection pooling, need to add foolish delay.
        setTimeout(() => {
            getSubscriptions(props.dashId) // TODO UserID FILTER MUST GO HERE BUT NOWHERE TO FIND IT RIGHT NOW
            .then(r => { setSubscriptions(r);   })
            .catch(r => {console.error(r); notyf.error("Error retrieving reports from servers. ")});
        }, menuShown ? 0 : 50);
    },[props.dashId,menuShown])
    const missingSub = myReportIds.length < reports.length;
  
    return <Popover2 isOpen={menuShown} placement="bottom" onInteraction={(state)=>setMenuShown(state)}  
        content={
        <Menu>
            {reports && reports.map(r => <MenuItem icon={myReportIds.includes(r.id) ? "small-tick" : "small-cross"} 
                    intent={myReportIds.includes(r.id) ? "success" : "none"}
                    onClick={() => toggleSubscription(r.id)} text={toShortHtml(r)} />)}
            {props.showAdminControls && 
            <><MenuDivider title="Admin" />
                <Link to={"/dash/reports/" + props.dashId + "?add=" + (window.location.search.length > 0 ? window.location.search + window.location.hash : "?")}>
                        <MenuItem icon="insert" text="Add Current as Report" disabled={!isAdmin(context)} /></Link>
                <Link to={"/dash/reports/" + props.dashId}><MenuItem icon={<RiMailSettingsLine />} text="Report Configuration"  disabled={!isAdmin(context)} /></Link>
                <MenuItem icon="envelope" text="Send Test Email" disabled={!isAdmin(context)} />
            </>}
        </Menu>}>
        <Button icon="envelope" intent={missingSub ? "primary" : "none"} onClick={()=>setMenuShown(true)}>Emails { reports && reports.length>0 && ("("+myReportIds.length)+"/"+reports.length+")"}</Button>
      </Popover2>
;
  }
  