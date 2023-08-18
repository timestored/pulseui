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
 
import React, { Component, Dispatch, SetStateAction, useContext, useEffect, useRef, useState } from 'react';
import { SmartRs } from '../engine/chartResultSet';
import QueryEngine, { getSensibleServer, Queryable, QueryEngineAdapter, SERVER, ServerSelect } from './../engine/queryEngine';
import { ServerConfig, useServerConfigs } from './ConnectionsPage';
import { Button, Icon, IconName, NonIdealState, ProgressBar, Tree, TreeNodeInfo } from '@blueprintjs/core';
import { ChartForm, ChartType, MyUpdatingChart } from './ChartFactory';
import { IThemeType, ThemeContext } from '../context';
import { ChartWrapper } from '../styledComponents';
import { IJsonModel, IJsonRowNode, Layout, Model, TabNode } from 'flexlayout-react';
import { FlexContainer } from '../styledComponents';
import { Link } from 'react-router-dom';
import useLocalStorage from './hooks';
import { useCallback } from 'react';
import 'flexlayout-react/style/light.css';
import '../dark.css';
import { DEFAULT_GLOBAL } from './FlexPanel';
import { ErrorBoundary } from '../ErrorBoundary';
import { addParameter, getDefaultErrorFallback } from './CommonComponents';
import { HiShare } from 'react-icons/hi';
import { notyf } from './../context';
import { Array as RArray,String, Record, Static, Partial, Undefined } from 'runtypes';
import axios from 'axios';
import { SqlEditor } from './SqlEditor';
import { useCacheThenUpdate } from './hooks';
import { getH2DemoQueryable } from '../pro/ChartHelp';
import { copyToClipboard } from './AGridContextMenu';


export default function SqlEditorPage() {
    const [serverConfigs] = useServerConfigs();
    const [selectedSC,setSelectedSC] = useState<ServerConfig|undefined>(undefined);
    
    useEffect(() => { document.title = (selectedSC ? (selectedSC.name + " ") : "") + "SQL Editor" }, [selectedSC]);
    useEffect(() => { 
        if(selectedSC === undefined) {
            setSelectedSC(getSensibleServer(serverConfigs)); 
        }
    },[serverConfigs,selectedSC]);
    
    if(!selectedSC || !serverConfigs || serverConfigs.length === 0) {
        return <NonIdealState icon="error" title="No Connections found" 
                        action={<div>Try  <Link to="/connections"><Button intent="primary">Adding Connections</Button></Link></div>} />;
    }

    return <IdeFlexPanel serverConfigs={serverConfigs} selectedSC={selectedSC} setSelectedSC={sc => setSelectedSC(sc)} />;
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
    columns: String.Or(Undefined)
}));
export type ServerEntity = Static<typeof ServerEntityR>;

function onlyUnique(value: any, idx: number, self: any) { return self.indexOf(value) === idx; }

function toTree(ses:ServerEntity[], collapsed:string[], selectedServerName:string, selectedSE:ServerEntity|undefined):TreeNodeInfo<ServerEntity>[] {
    const serverNames = ses.map(s => s.server).filter(onlyUnique).sort(function (a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    });
    const namespaces = ses.map(s => s.namespace).filter(onlyUnique).sort();

    const toLeaf = (s:ServerEntity, isSelected:boolean):TreeNodeInfo<ServerEntity> => { 
        return {id: id++, label:<span title={s.columns ?? ""}>{s.name}</span>, icon: s.type === "table" ? "th" : "symbol-circle", nodeData:s, 
                        className:"entityNode", isSelected:isSelected} 
    };

    let id = 0;
    const t:TreeNodeInfo<ServerEntity>[] = serverNames.map(n => {
        const serverEntities = ses.filter(s => s.server === n);
        const childNodes:TreeNodeInfo<ServerEntity>[] = [];
        namespaces.forEach(ns => {
            const nsEntities = serverEntities.filter(s => s.namespace === ns).sort((a,b) => { 
                return (a.type === "table" && b.type !== "table") ? -1 :
                    (b.type === "table" && a.type !== "table") ? 1 
                    : a.fullName.localeCompare(b.fullName); 
            });
            function isSelected(aa:ServerEntity):boolean {
                return selectedSE ? (selectedSE.fullName===aa.fullName && selectedSE.server===aa.server) : false;
            }
            if(ns === ".") {
                nsEntities.forEach(aa => childNodes.push(toLeaf(aa, isSelected(aa))));
            } else {
                const isExpanded = !collapsed.includes(n+"-"+ns);
                childNodes.push({ 
                    id: id++, hasCaret: true, label: ns, icon: isExpanded ? "folder-open" : "folder-close",  isExpanded:isExpanded,
                        nodeData:{name:n, server:n, namespace:ns, fullName:n+"-"+ns, type:"namespace", info:"", db:"", query:"", columns:"" },  className:"namespaceNode ",
                        childNodes:nsEntities.map(aa => toLeaf(aa, isSelected(aa))),
                 });
            }
        });
        

        return  { 
            id: id++, hasCaret: true, label: n, icon: "data-connection",  isExpanded:!collapsed.includes(n),  isSelected:n === selectedServerName,
                nodeData:{name:n, server:n, namespace:n, fullName:n, type:"server", info:"", db:"", query:"", columns:"" },  className:"serverNode",
                childNodes:childNodes,
         };
    });
    return t;
}


export function useServerTree(): [serverTree:ServerEntity[], setServerTree:Dispatch<SetStateAction<ServerEntity[]>>, refresh:()=>void] {    
    async function fetch() {
        const r = await axios.get<ServerConfig[]>(SERVER + "/servertree");
        const ses:ServerEntity[] = RArray(ServerEntityR).check(r.data)
        return ses;
    }
    return useCacheThenUpdate<ServerEntity[]>("servertree", [], fetch, ()=>{});
  }

function ServerTree(props:{queryEngine:QueryEngine, serverConfigs:ServerConfig[], selectedSC:ServerConfig, setSelectedSC:(sc:ServerConfig)=>void}) {
    const [ serverTree] = useServerTree();
    const [ selectedSE,setSelectedSE] = useState<ServerEntity|undefined>(undefined);
    const [ collapsed, setCollapsed ] = useLocalStorage<string[]>("EditorCollapsedEntities",[]);

    useEffect(() => {
        if(collapsed.length === 0) {
            const serverNames = serverTree.map(s => s.server).filter(onlyUnique).sort();
            const namespaceFullNames = serverTree.map(s => s.server + "-" + s.namespace).filter(onlyUnique).sort();
            let collaps = namespaceFullNames;
            if(serverTree.length > 20 && serverNames.length > 7) {
                collaps = [...serverNames, ...collaps];
            }
            setCollapsed(collaps);
        }
    },[serverTree, collapsed.length, setCollapsed]);

    const tree = toTree(serverTree, collapsed, props.selectedSC.name, selectedSE);

    const handleClick = (node:TreeNodeInfo<ServerEntity>) => {
        if(node.nodeData && node.nodeData.server) {
            const sc = props.serverConfigs.find(sc => sc.name === node.nodeData!.server);
            if(sc) {
                props.setSelectedSC(sc);
            }
            if(node.nodeData?.type !== "server" && node.nodeData?.type !== "namespace") {
                const d = node.nodeData;
                setSelectedSE(d);
                props.queryEngine.sendQuery({query:d.query, serverName:d.server, refreshPeriod:0, serverCmd:""});
            }
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

function CodeEditor(props:{queryEngine:QueryEngine, serverConfigs:ServerConfig[], selectedSC:ServerConfig, setSelectedSC:(sc:ServerConfig)=>void}) {
    const [queryable, setQueryable] = useState<Queryable>();
    const [exception, setException] = useState<string | undefined>("");
    const [lastQuerySent, setLastQuerySent] = useState<string>("");
    const { serverConfigs, selectedSC } = props;

    useEffect(() => {
        const foo = new class extends QueryEngineAdapter {
            tabChanged(queryable: Queryable, qTab: SmartRs, exceededMaxRows:boolean): void { 
                if(exceededMaxRows) {
                    notyf.error("Query result larger than maximum rows permitted.")
                    setException("exceededMaxRows"); 
                } else {
                    setException("");
                }
            }
            queryError(queryable: Queryable, exception: string): void { setException(exception); }
        }();
        props.queryEngine.addListener(foo);
        return () => { props.queryEngine.removeListener(foo); }
    },[props.queryEngine]); 
    
    useEffect(() => {
        if(serverConfigs.length>0 && queryable === undefined) {
            const sp = new URLSearchParams(window.location.search);
            let query = sp.get("qry");
            if(query === null) {
                query = window.localStorage.getItem("sqlEditorPageQuery");
            }
            if(query === null) {
                query = getDefaultQueryCode(selectedSC.jdbcType === "KDB");
            }

            setQueryable(new Queryable(selectedSC.name, query, -1));
        }
        if(queryable && queryable.serverName !== selectedSC.name) {
            setQueryable({...queryable, serverName:selectedSC.name});
        }
    },[serverConfigs,queryable,selectedSC]);

    const sendQuery = useCallback((qr:Queryable) => {
        const newq = {...queryable,...qr};
        setException(undefined);
        setLastQuerySent(newq.query);
        props.queryEngine.sendQuery(newq);
    },[queryable,props.queryEngine]);
    
    
    const rightChildren = <>
        <Button small icon={<HiShare />} onClick={() => {
            const qcode = window.localStorage.getItem("sqlEditorPageQuery") ?? "";
            const newUrl = addParameter(window.location.href,"qry",qcode);
            copyToClipboard(newUrl); 
            notyf.success("Shareable URL has been copied to your clipboard"); 
        }} >Share All Code</Button>
        <Button small icon={<HiShare />} disabled={lastQuerySent.length <= 0} onClick={() => {
            const newUrl = addParameter(window.location.href,"qry",lastQuerySent);
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
            {/* 
                Notice this select/editor are very similar in layout to QueryableEditor
                Not easy to reuse QueryableEditor, as it contains the Server Selected State. 
                We wanted ServerSelect at higher level to allow clicking server in tree to cause server select as well.
            */}
            {queryable && <div>
                <div className="QueryableEditorControls">
                    <ServerSelect selectedServer={props.selectedSC.name} serverOptions={props.serverConfigs} 
                        onSelect={e => { 
                            const sc = props.serverConfigs.find(sc => sc.name === e);
                            if(sc) { props.setSelectedSC(sc); }
                        }} />
                    {rightChildren}
                </div>
                <SqlEditor runLine={t => sendQuery({...queryable, query:t})}  runSelection={t => sendQuery({...queryable, query:t})} 
                            value={queryable.query}  onChange={t => setQueryable({...queryable, query:t})} />
            </div>}
        
        </div>
    </div>
}

type EditorType = "editorv"|"chartv"|"treev"|"jsonv"|"tablev"|"consolev";

function IdeFlexPanel(props:{serverConfigs:ServerConfig[], selectedSC:ServerConfig, setSelectedSC:(sc:ServerConfig)=>void}) {
    const queryEngine = useRef<QueryEngine | null>(null);

    useEffect(() => {
        queryEngine.current = new QueryEngine(null, false);
        return () => { 
            queryEngine?.current?.shutDown(); 
        };
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
                    //    { type: "tab", name: "JSON1", component: "jsonv", },
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
        const cname = node.getComponent() as EditorType;
        const qc = queryEngine.current;
        if(qc === null) { return <></>; }
        switch(cname) {
            case "editorv": return <CodeEditor queryEngine={qc} {...props} />;
            case "chartv": return  <QueryToPropsComponent queryEngine={qc} children={ChartView} />;
            case "jsonv": return  <QueryToPropsComponent queryEngine={qc} children={JsonView} />;
            case "tablev": return  <QueryToPropsComponent queryEngine={qc} children={TblView} />;
            case "consolev": return  <QueryToPropsComponent queryEngine={qc} children={ConsoleView} />;
            case "treev": return  <ServerTree queryEngine={qc}  {...props} />;
        }
    }

    let m = undefined;
    try {
        m = Model.fromJson(modelJson);
    } catch(e:any) {
        m = Model.fromJson(json);
    }

    const iconFactory = (node: TabNode) => {
        const cname = node.getComponent() as EditorType;
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

class QueryToPropsComponent extends Component<{queryEngine:QueryEngine, children:(props:SqlResult) => JSX.Element}, SqlResult> {

    state:SqlResult = {srs:null, exception:null, queryable:null };

    queryListener =  new class extends QueryEngineAdapter {
        constructor(private parent: QueryToPropsComponent) { super(); }
        tabChanged(queryable: Queryable, qTab: SmartRs, exceededMaxRows:boolean): void { 
            this.parent.setState({srs:qTab, exception:null, queryable });  
        }
        queryError(queryable: Queryable, exception: string): void { 
            this.parent.setState({srs:null, exception, queryable });  
        }
    }(this);

    componentDidMount()    {  this.props.queryEngine.addListener(this.queryListener);   }
    componentWillUnmount() { this.props.queryEngine.removeListener(this.queryListener); }
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
        if(props && props.queryable?.query) {
            let t = "q)" + props.queryable?.query + "\r\n";
            if(props.srs && props.srs.rsdata) {
                const rsdata = props.srs.rsdata;
                if(rsdata.exception && rsdata.exception.length>0) {
                    t = t + rsdata.exception + "\r\n";
                } else if(props.exception !== null && props.exception.length>0) {
                    t = t + props.exception + "\r\n";
                } else if(rsdata.console) {
                    t = t + rsdata.console;
                }  
            }
            t = t + txt;
            setTxt(t.length > 5000 ? t.substring(0,10000) : t);
        }
    // If you add txt it just keeps calling recursively
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[props]);
    return <textarea style={{width:"100%", height:"98%"}} rows={200} value={txt} readOnly />;
}

function ChartView(props:SqlResult) {
    const context = useContext(ThemeContext);
    const [chartType, setChartType] = useState<ChartType>("timeseries"); // setChartType

    useEffect(() => {
        const sp = new URLSearchParams(window.location.search);
        const ct = sp.get("chart");
        if(ct != null && ct.length>0) {
            setChartType(ct as ChartType);
        }
    },[]);

    const handleChartTypeChange = (chartType:ChartType) => {
        const newUrl = addParameter(window.location.href,"chart",chartType);
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
        if(rsdata.tbl === undefined || (rsdata.tbl.data.length === 0 && rsdata.k !== undefined)) {
            return <KView k={rsdata.k} />;
        } else if(rsdata.tbl !== undefined) {
            const e = MyUpdatingChart.getChart("grid",props.srs, context.theme);
            if(e !== null) { return e; }
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
                (k as any[]).every(it => typeof it === typeof k[0] && !Array.isArray(k[0])) ? (typeof k[0] === "string" ? "`" : "") + (k as any[]).join(typeof k[0] === "string" ? "`" : " ") : 
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
