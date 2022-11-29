import React, { Component, useContext, useEffect, useRef, useState } from 'react';
import { SmartRs } from '../engine/chartResultSet';
import QueryEngine, { getSensibleServerIdx, Queryable, QueryableEditor, QueryEngineAdapter, QueryEngineListener, SERVER } from './../engine/queryEngine';
import { fetchProcessServers, ServerConfig } from './ConnectionsPage';
import { Button, Icon, IconName, NonIdealState, ProgressBar, Tree, TreeNodeInfo } from '@blueprintjs/core';
import { ChartForm, ChartType, MyUpdatingChart, getH2DemoQueryable } from './ChartFactory';
import { IThemeType, ThemeContext } from '../context';
import { ChartWrapper } from '../styledComponents';
import { IJsonModel, IJsonRowNode, Layout, Model, TabNode } from 'flexlayout-react';
import { FlexContainer } from '../styledComponents';
import { Link } from 'react-router-dom';
import useLocalStorage from './hooks';
import { isEqual } from 'lodash-es';
import { useCallback } from 'react';
import 'flexlayout-react/style/light.css';
import '../dark.css';
import { DEFAULT_GLOBAL } from './FlexPanel';
import { ErrorBoundary } from '../ErrorBoundary';
import { addParameter, getDefaultErrorFallback } from './CommonComponents';
import { HiShare } from 'react-icons/hi';
import { copyToClipboard } from './AGridContextMenu';
import { notyf } from './../context';
import { Array as RArray,String, Record, Static, Partial, Undefined } from 'runtypes';
import axios from 'axios';


export default function SqlEditorPage() {
    useEffect(() => { document.title = "SQL Editor" }, []);
    const [serverConfigs, setServerConfigs] = useLocalStorage<ServerConfig[]>("serverConfigs", [], false);
    
    useEffect(() => {
        fetchProcessServers((scs => { 
            // WIthout this isEquals or If you add serverConfigs to useEffect [] it goes crazy and downloads repeatedly
            if(!isEqual(scs, serverConfigs)) {
                setServerConfigs(scs);
            }
        })); 
    });
    return <IdeFlexPanel serverConfigs={serverConfigs} />;
}

const ServerEntityR = Record({
    server: String,
    namespace: String,
    name: String,
    fullName: String,
    type: String,
    query: String,
}).And(Partial({
    info: String.Or(Undefined),
    db: String.Or(Undefined),
}));
export type ServerEntity = Static<typeof ServerEntityR>;

function onlyUnique(value: any, idx: number, self: any) { return self.indexOf(value) === idx; }

function toTree(ses:ServerEntity[], collapsed:string[]):TreeNodeInfo<ServerEntity>[] {
    let serverNames = ses.map(s => s.server).filter(onlyUnique).sort(function (a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    });
    let namespaces = ses.map(s => s.namespace).filter(onlyUnique).sort();

    const toLeaf = (s:ServerEntity):TreeNodeInfo<ServerEntity> => { 
        return {id: id++, label: s.fullName, icon: s.type === "table" ? "th" : "symbol-circle", nodeData:s, className:"entityNode", } 
    };

    let id = 0;
    let t:TreeNodeInfo<ServerEntity>[] = serverNames.map(n => {
        let serverEntities = ses.filter(s => s.server === n);
        let childNodes:TreeNodeInfo<ServerEntity>[] = [];
        namespaces.forEach(ns => {
            let nsEntities = serverEntities.filter(s => s.namespace === ns).sort((a,b) => { 
                return (a.type === "table" && b.type !== "table") ? -1 :
                    (b.type === "table" && a.type !== "table") ? 1 
                    : a.fullName.localeCompare(b.fullName); 
            });
            if(ns === ".") {
                nsEntities.forEach(aa => childNodes.push(toLeaf(aa)));
            } else {
                const isExpanded = !collapsed.includes(n+"-"+ns);
                childNodes.push({ 
                    id: id++, hasCaret: true, label: ns, icon: isExpanded ? "folder-open" : "folder-close",  isExpanded:isExpanded, 
                        nodeData:{name:n, server:n, namespace:ns, fullName:n+"-"+ns, type:"namespace", info:"", db:"", query:"" },  className:"namespaceNode",
                        childNodes:nsEntities.map(aa => toLeaf(aa)),
                 });
            }
        });
        

        return  { 
            id: id++, hasCaret: true, label: n, icon: "data-connection",  isExpanded:!collapsed.includes(n), 
                nodeData:{name:n, server:n, namespace:n, fullName:n, type:"server", info:"", db:"", query:"" },  className:"serverNode",
                childNodes:childNodes,
         };
    });
    return t;
}

function ServerTree(props:{queryEngine:QueryEngine, serverConfigs:ServerConfig[]}) {
    const [ serverTree, setServerTree ] = useState([] as ServerEntity[]);
    const [ collapsed, setCollapsed ] = useLocalStorage<string[]>("EditorCollapsedEntities",[]);

    useEffect(() => {
        axios.get<ServerEntity[]>(SERVER + "/servertree")
        .then(r => {
            let ses:ServerEntity[] = RArray(ServerEntityR).check(r.data)
            setServerTree(ses);
            // Nicely hide things - always hide namespaces, sometimes hide servers if too many        
            if(collapsed.length === 0) {
                let serverNames = ses.map(s => s.server).filter(onlyUnique).sort();
                let namespaceFullNames = ses.map(s => s.server + "-" + s.namespace).filter(onlyUnique).sort();
                let collaps = namespaceFullNames;
                if(ses.length > 20 && serverNames.length > 7) {
                    collaps = [...serverNames, ...collaps];
                }
                setCollapsed(collaps);
            }
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[]);

    let tree = toTree(serverTree, collapsed);

    const handleClick = (node:TreeNodeInfo<ServerEntity>) => {
        if(node.nodeData && node.nodeData?.type !== "server" && node.nodeData?.type !== "namespace") {
            let d = node.nodeData;
            props.queryEngine.sendQuery({query:d.query, serverName:d.server, refreshPeriod:0});
        }
    }
    const handleCollapse = (node:TreeNodeInfo<ServerEntity>) => {
        if(node.nodeData && typeof node.nodeData.fullName === "string") {
            setCollapsed([...collapsed, node.nodeData?.fullName]);
        }
    }
    //<>{JSON.stringify(serverTree)}
    return <Tree className="serverTree" contents={tree} onNodeClick={handleClick} onNodeCollapse={handleCollapse} 
        onNodeExpand={node => {setCollapsed(collapsed.filter(n => n !== node.nodeData?.fullName))}} />;
}

function CodeEditor(props:{queryEngine:QueryEngine, serverConfigs:ServerConfig[]}) {
    const [queryable, setQueryable] = useState<Queryable>();
    const [exception, setException] = useState<string | undefined>("");
    const [lastQuerySent, setLastQuerySent] = useState<string>("");
    const { serverConfigs } = props;

    useEffect(() => {
        const foo = new class extends QueryEngineAdapter {
            tabChanged(queryable: Queryable, qTab: SmartRs): void { setException(""); }
            queryError(queryable: Queryable, exception: string): void { setException(exception); }
        }();
        props.queryEngine.addListener(foo);
        return () => { props.queryEngine.removeListener(foo); }
    },[props.queryEngine]); 
    
    useEffect(() => {
        if(serverConfigs.length>0 && queryable === undefined) {
            let serverIdx = getSensibleServerIdx(serverConfigs);
            const serverName = serverIdx === undefined ? "" : serverConfigs[serverIdx].name;
            const serverType = serverIdx === undefined ? undefined : serverConfigs[serverIdx].jdbcType;
            
            let sp = new URLSearchParams(window.location.search);
            let query = sp.get("qry");
            if(query === null) {
                query = window.localStorage.getItem("sqlEditorPageQuery");
            }
            if(query === null) {
                query = getDefaultQueryCode(serverType === "KDB");
            }

            setQueryable(new Queryable(serverName, query, -1));
        }
    },[serverConfigs,queryable]);

    const sendQuery = useCallback((qr:Queryable) => {
        let newq = {...queryable,...qr};
        setException(undefined);
        setLastQuerySent(newq.query);
        props.queryEngine.sendQuery(newq);
    },[queryable,props.queryEngine]);
    
    
    if(!serverConfigs || serverConfigs.length === 0) {
        return <NonIdealState icon="error" title="No Connections found" 
                        action={<div>Try  <Link to="/connections"><Button intent="primary">Adding Connections</Button></Link></div>} />;
    }
    
    const rightChildren = <>
        <Button small icon={<HiShare />} onClick={() => {
            const qcode = window.localStorage.getItem("sqlEditorPageQuery") ?? "";
            let newUrl = addParameter(window.location.href,"qry",qcode);
            copyToClipboard(newUrl); 
            notyf.success("Shareable URL has been copied to your clipboard"); 
        }} >Share All Code</Button>
        <Button small icon={<HiShare />} disabled={lastQuerySent.length <= 0} onClick={() => {
            let newUrl = addParameter(window.location.href,"qry",lastQuerySent);
            copyToClipboard(newUrl); 
            notyf.success("Shareable URL has been copied to your clipboard"); 
        }} >Share Latest Result</Button>
    </>;

    return <div>
        <div>
            {/* undefined exception means query sent */}
            {exception === undefined ?  <div style={{height:11}}><ProgressBar intent="primary" /></div> : <div style={{height:11}}></div>}
        </div>
        <div id="editor2"> 
            {queryable && <QueryableEditor queryable={queryable} serverConfigs={serverConfigs} sendQuery={sendQuery} sendOnAnyChange={false}
                showRefreshSelect={false} sendButtonText="Send Query" rightChildren={rightChildren} 
                onChange={(t) => {window.localStorage.setItem("sqlEditorPageQuery", t)}} />}
        </div>
    </div>
}

type EditorType = "editorv"|"chartv"|"treev"|"jsonv"|"tablev"|"consolev";

function IdeFlexPanel(props:{serverConfigs:ServerConfig[]}) {

    const queryEngine = useRef<QueryEngine | null>(null);

    useEffect(() => {
        queryEngine.current = new QueryEngine(null, false);    
        return () => { queryEngine?.current?.shutDown(); };
    },[]);
    
    // If you change the layout json you MUST change the name of the localStorage else the component won't show
    const jsonRow:IJsonRowNode = { type: "row", weight: 100, 
        children: 
        [{ type: "row", weight: 50, 
                children: [{ type: "tabset", weight: 15, children:[{ type:"tab", name: "Server Tree", component: "treev", }]},
                        { type: "tabset", weight: 85, children:[{ type:"tab", name: "Editor", component: "editorv", }]}] 
        },
        { type: "tabset", weight: 50, 
            children: [{ type: "tab", name: "Table", component: "tablev", },
                       { type: "tab", name: "JSON1", component: "jsonv", },
                       { type: "tab", name: "Console", component: "consolev", },
                       { type: "tab", name: "Chart", component: "chartv", },] 
        }
        ]
        };
    const jsonRowToCol:IJsonRowNode = { type: "row", weight: 100,  children: [jsonRow] };
    const json : IJsonModel = {
        global: DEFAULT_GLOBAL,
        borders: [],
        layout: jsonRowToCol
    };
    const [modelJson, setModelJson] = useLocalStorage("editorModel3",json, false);

    // To ensure height/width stretch within flexlayout, the first and only div should have heigh:100% i.e. use chartwrapper
    const factory = (node:TabNode) => {
        var cname = node.getComponent() as EditorType;
        const qc = queryEngine.current;
        if(qc === null) { return <></>; }
        switch(cname) {
            case "editorv": return <CodeEditor queryEngine={qc} serverConfigs={props.serverConfigs} />;
            case "chartv": return  <QueryToPropsComponent queryEngine={qc} children={ChartView} />;
            case "jsonv": return  <QueryToPropsComponent queryEngine={qc} children={JsonView} />;
            case "tablev": return  <QueryToPropsComponent queryEngine={qc} children={TblView} />;
            case "consolev": return  <QueryToPropsComponent queryEngine={qc} children={ConsoleView} />;
            case "treev": return  <ServerTree queryEngine={qc}  serverConfigs={props.serverConfigs} />;
        }
    }

    let m = undefined;
    try {
        m = Model.fromJson(modelJson);
    } catch(e:any) {
        m = Model.fromJson(json);
    }

    const iconFactory = (node: TabNode) => {
        let cname = node.getComponent() as EditorType;
        let ic:IconName = "annotation";
        switch(cname) {
            case "editorv": ic = "annotation"; break;
            case "chartv":  ic = "chart"; break;
            case "jsonv":   ic = "code"; break;
            case "tablev":  ic = "grid"; break;
            case "consolev":ic = "console"; break;
            case "treev":   ic = "diagram-tree"; break;
        }
        return <Icon icon={ic} />;
    }

    return (<div><FlexContainer>
        <ErrorBoundary FallbackComponent={getDefaultErrorFallback(<NonIdealState icon="error" title="Bad Component State" 
                        action={<div>Try <Button intent="primary" onClick={()=>setModelJson(json)}>Resetting Layout</Button></div>} />)}>
        {m && <Layout model={m} factory={factory} onModelChange={m => setModelJson(m.toJson()) } popoutURL="/popout.html" iconFactory={iconFactory} />}
        </ErrorBoundary>
    </FlexContainer></div>);
}

function ErrDisplay(props:{exception:string}) {
    return <NonIdealState icon="error" title="Query Error" description={<div style={{whiteSpace: "pre-wrap"}}>{props.exception}</div>} action={<div>Try  changing the query or server</div>} />;
}

interface SqlResult {srs:SmartRs | null, exception:string | null, queryable:Queryable | null}

class QueryToPropsComponent extends Component<{queryEngine:QueryEngine, children:(props:SqlResult) => JSX.Element}, SqlResult> implements QueryEngineListener {

    state:SqlResult = {srs:null, exception:null, queryable:null };

    tabChanged(queryable: Queryable, qTab: SmartRs): void { this.setState({srs:qTab, exception:null, queryable });  }
    queryError(queryable: Queryable, exception: string): void { this.setState({srs:null, exception, queryable });  }
    argChange(argKey: string, argVals: string[]): void { }
    connectionChange(connected: boolean): void { }
  
    componentDidMount()    {  this.props.queryEngine.addListener(this);   }
    componentWillUnmount() { this.props.queryEngine.removeListener(this); }
    render() { 
        return (<ErrorBoundary FallbackComponent={getDefaultErrorFallback()} resetKeys={[this.state]}>
                    <ChartWrapper><this.props.children {...this.state} /></ChartWrapper>
                </ErrorBoundary>); 
    }
  }

function JsonView(props:SqlResult) {
    if(props.exception !== null && props.exception.length>0) { return <ErrDisplay exception={props.exception} />;  }
    return (<>{props.srs && JSON.stringify(props.srs)}</>);
}

function ConsoleView(props:SqlResult) {
    const [txt,setTxt] = useState("q)");
    useEffect(() => {
        let t = "";
        if(props.srs && props.srs.rsdata) {
            const rsdata = props.srs.rsdata;
            if(rsdata.exception && rsdata.exception.length>0) {
                t = "q)" + props.queryable?.query + "\r\n" + rsdata.exception + "\r\n" + txt;
            } else if(props.exception !== null && props.exception.length>0) {
                t = "q)" + props.queryable?.query + "\r\n" + props.exception + "\r\n" + txt;
            } else if(props.srs && rsdata.console) {
                t = "q)" + props.queryable?.query + "\r\n" + rsdata.console  + txt;
            }  
        }
        setTxt(t.length > 5000 ? t.substring(0,10000) : t);
    // If you add txt it just keeps calling recursively
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[props])
    return <textarea style={{width:"100%", height:"98%"}} rows={200} value={txt} readOnly />;
}

function ChartView(props:SqlResult) {
    let context = useContext(ThemeContext);
    const [chartType, setChartType] = useState<ChartType>("timeseries"); // setChartType

    useEffect(() => {
        let sp = new URLSearchParams(window.location.search);
        let ct = sp.get("chart");
        if(ct != null && ct.length>0) {
            setChartType(ct as ChartType);
        }
    },[]);

    const handleChartTypeChange = (chartType:ChartType) => {
        let newUrl = addParameter(window.location.href,"chart",chartType);
		window.history.replaceState({}, '', newUrl);
        setChartType(chartType);
    }

    if(props.exception !== null && props.exception.length>0) { return <ErrDisplay exception={props.exception} />;  }
    if(props.srs) {
        return <>
            <div style={{position:"absolute", zIndex:1000, top:0, left:100, display:"inline-flex"}}>
            <ChartForm chartType={chartType} onItemSelect={handleChartTypeChange} /></div>
            <ErrorBoundary FallbackComponent={getDefaultErrorFallback("Error Rendering Charts")} 
                    key={chartType}>{MyUpdatingChart.getChart(chartType,props.srs, context.theme)}</ErrorBoundary>
        </>
    }
    return (<></>);
}

function TblView(props:SqlResult):JSX.Element {
    const context = useContext(ThemeContext) as IThemeType;
    if(props.exception !== null && props.exception.length>0) { return <ErrDisplay exception={props.exception} />;  }
    if(props.srs && props.srs.rsdata !== undefined) {
        const rsdata = props.srs.rsdata;
        if(rsdata.tbl !== undefined) {
            let e = MyUpdatingChart.getChart("grid",props.srs, context.theme);
            if(e !== null) { return e; }
        } else if(rsdata.k !== undefined) {
            return <KView k={rsdata.k} />;
        } else  if(rsdata.exception && rsdata.exception.length>0) { 
            return <ErrDisplay exception={rsdata.exception} />;  
        }
    }
    return <></>;
}

function KView(props:{k:any}) {
    const {k} = props;
    return <>{
        k === null ? "::"
            : Array.isArray(k) ? 
                ((k as any[]).length === 0) ? "()" : 
                (k as any[]).every(it => typeof it === typeof k[0] && !Array.isArray(k[0])) ? (k[0] === "string" ? "`" : "") + (k as any[]).join(typeof k[0] === "string" ? "`" : " ") : 
                    <ul>{(k as any[]).map(e => <li><KView k={e} /></li>)}</ul>
            : typeof k === "object" ? "object"
            : ""+k
    }</>;
}

function getDefaultQueryCode(isKDB: boolean): string {

    const welcomeCode = "/* Welcome to Pulse   -  http://www.timestored.com/pulse   pulse@timestored.com"
        + "\n/"
        + "\n/ Pulse is a tool for real-time visual analysis of SQL data sources"
        + "\n/ To add your database click on the link: Connections->\"Add Connection\""
        + "\n/"
        + "\n/ Below are example queries to generate each chart type: "
        + "\n/ - Press Control + Enter to run a single line"
        + "\n/ - Press Control + E to execute multi-lines of highlighted text or all text if none is highlighted */\n";

    const qCode = "\n"
        + "([] dt:2013.01.01+til 21; cosineWave:cos a; sineWave:sin a:0.6*til 21)\n"
        + "\n"
        + "/ Multiple Series with Time X-Axis - Works with Time / Line / Bar / Area Chart\n"
        + "([Month:2000.01m + til 12]  \n"
        + "	 Costs:30.0 40.0 45.0 55.0 58.0 63.0 55.0 65.0 78.0 80.0 75.0 90.0 ; \n"
        + "	 Sales:10.0 12.0 14.0 18.0 26.0 42.0 74.0 90.0 110.0 130.0 155.0 167.0 )\n"
        + "\n"
        + "/ Multiple Series - bar / line /area / heatmap\n"
        + "([] Continent:`NorthAmerica`Asia`Asia`Europe`Europe`Africa`Asia`Africa`Asia;\n"
        + "	 Country:`US`China`japan`Germany`UK`Zimbabwe`Bangladesh`Nigeria`Vietnam; \n"
        + "	 Population:31347.0 133239.0 127938.0 81308.0 63047.0 13010.0 152518.0 166629.0 87840.0 ;\n"
        + "	 GDP:15080.0 11300.0 4444.0 3114.0 2228.0 9.9 113.0 196.0 104.0 ; \n"
        + "	GDPperCapita:48300.0 8400.0 34700.0 38100.0 36500.0 413.0 1788.0 732.0 3359.0 ;  \n"
        + "	LifeExpectancy:77.14 72.22 80.93 78.42 78.16 39.01 61.33 51.01 70.05 )\n"
        + "\n"
        + "\n"
        + "//### Bubble Chart / Scatter Plot\n"
        + "// The first numeric column is x-axis, 2nd is y-axis, 3rd is bubble size. Strings are used as labels. \n"
        + "update exports:(0.1+9?0.1)*GDP, exportsPerCapita:(0.4+9?0.1)*GDPperCapita from \n"
        + "	  ([] Country:`US`France`japan`Germany`UK`Zimbabwe`Bangladesh`Nigeria`Vietnam; \n"
        + "	  Population:(0.9+9?0.2)*313847.0 213847.0 127938.0 81308.0 63047.0 13010.0 152518.0 166629.0 87840.0 ;\n"
        + "	  GDP:(0.9+9?0.2)*15080.0 3333. 4444.0 3114.0 2228.0 9.9 113.0 196.0 104.0 ; \n"
        + "	  GDPperCapita:(0.9+9?0.2)*0.001*48300.0 37000 34700.0 38100.0 36500.0 413.0 1788.0 732.0 3359.0)\n"
        + "\n"
        + "/ 3d Surface or 3D bar Chart\n"
        + "update z:sin y from ([] x:(til 1000) mod 20; y:(til 1000)%100+rand[22])\n"
        + "\n"
        + "//### Candlestick Chart\n"
        + "([] t:09:00t+600000*til 44; high:c+30; low:c-44; open:70+til 44; close:c:55+2*til 44; volume:44?10)\n"
        + "\n"
        + "//### PieChart\n"
        + "/ single pie\n"
        + "([] Country:`US`China`japan`Germany`UK`Zimbabwe`Bangladesh`Nigeria`Vietnam; \n"
        + "	 GDP:15080.0 11300.0 4444.0 3114.0 2228.0 9.9 113.0 196.0 104.0 )\n"
        + "\n"
        + "/ Many Pies\n"
        + "([] Continent:`NorthAmerica`Asia`Asia`Europe`Europe`Africa`Asia`Africa`Asia;\n"
        + "	 Country:`US`China`japan`Germany`UK`Zimbabwe`Bangladesh`Nigeria`Vietnam; \n"
        + "	 Population:313847.0 1343239.0 127938.0 81308.0 63047.0 13010.0 152518.0 166629.0 87840.0 ;\n"
        + "	 GDP:15080.0 11300.0 4444.0 3114.0 2228.0 9.9 113.0 196.0 104.0 ; \n"
        + "	GDPperCapita:48300.0 8400.0 34700.0 38100.0 36500.0 413.0 1788.0 732.0 3359.0 ;  \n"
        + "	LifeExpectancy:77.14 72.22 80.93 78.42 78.16 39.01 61.33 51.01 70.05 )\n"
        + "\n";

    let query = welcomeCode;
    if(isKDB) {
        query += qCode;
    } else {
        query += "\n/* TimeSeries */\n" + getH2DemoQueryable("timeseries") + "\n\n";
        query += "/* Bar Line Area */\n" + getH2DemoQueryable("bar") + "\n\n";
        query += "/* Bubble Scatter */\n" + getH2DemoQueryable("bubble") + "\n\n";
        query += "/* BoxPlot */\n" + getH2DemoQueryable("boxplot") + "\n\n";
        query += "/* 3D Bar Surface */\n" + getH2DemoQueryable("3dbar") + "\n\n";
    }
    return query + "\n\n\n\n";
}
