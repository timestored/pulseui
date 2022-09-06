import React, { Component, useContext, useEffect, useRef, useState } from 'react';
import { SmartRs } from '../engine/chartResultSet';
import QueryEngine, { getSensibleServerIdx, Queryable, QueryableEditor, QueryEngineAdapter, QueryEngineListener } from './../engine/queryEngine';
import { fetchProcessServers, ServerConfig } from './ConnectionsPage';
import { Button, Icon, IconName, NonIdealState, ProgressBar } from '@blueprintjs/core';
import { ChartType, MyUpdatingChart } from './ChartFactory';
import { IThemeType, ThemeContext } from '../context';
import { ChartWrapper } from '../styledComponents';
import { IJsonModel, IJsonRowNode, Layout, Model, TabNode } from 'flexlayout-react';
import { FlexContainer } from '../styledComponents';
import { ErrorBoundary } from './CommonComponents';
import { Link } from 'react-router-dom';
import useLocalStorage from './hooks';
import { isEqual } from 'lodash-es';
import { useCallback } from 'react';

export default function SqlEditorPage() {
    useEffect(() => { document.title = "SQL Editor" }, []);

    return (<><IdeFlexPanel /></>);
}


function CodeEditor(props:{queryEngine:QueryEngine}) {

    const [serverConfigs, setServerConfigs] = useLocalStorage<ServerConfig[]>("serverConfigs", [], false);
    const [queryable, setQueryable] = useState<Queryable>();
    const [exception, setException] = useState<string | undefined>("");
    const context = useContext(ThemeContext) as IThemeType;
    
    require("flexlayout-react/style/" + (context.theme === "dark" ? "dark" : "light") + ".css");

    useEffect(() => {
        const foo = new class extends QueryEngineAdapter {
            tabChanged(queryable: Queryable, qTab: SmartRs): void { setException(""); }
            queryError(queryable: Queryable, exception: string): void { setException(exception); }
        }();
        props.queryEngine.addListener(foo);
        fetchProcessServers((scs => { 
            // WIthout this isEquals or If you add serverConfigs to useEffect [] it goes crazy and downloads repeatedly
            if(!isEqual(scs, serverConfigs)) {
                setServerConfigs(scs);
            }
        })); 
        return () => { props.queryEngine.removeListener(foo); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[]); 
    
    useEffect(() => {
        if(serverConfigs.length>0 && queryable === undefined) {
            let serverIdx = getSensibleServerIdx(serverConfigs);
            const serverName = serverIdx === undefined ? "" : serverConfigs[serverIdx].name;
            let query = window.localStorage.getItem("sqlEditorPageQuery");
            if(query === null) {
                query = "SELECT * FROM table";
                if(serverIdx !== undefined && serverConfigs[serverIdx]) {
                    query = serverConfigs[serverIdx].jdbcType === "KDB" ? "([] a:1 2 3)" 
                            : serverName === "DEMODB" ? "SELECT * FROM QUOTE LIMIT 10;"
                            : "SHOW TABLES;"
                }
            }

            setQueryable(new Queryable(serverName, query, -1));
        }
    },[serverConfigs,queryable]);

    const sendQuery = useCallback((qr:Queryable) => {
        let newq = {...queryable,...qr};
        setException(undefined);
        props.queryEngine.sendQuery(newq);
        window.localStorage.setItem("sqlEditorPageQuery", newq.query);
    },[queryable,props.queryEngine]);
    
    
    if(!serverConfigs || serverConfigs.length === 0) {
        return <NonIdealState icon="error" title="No Connections found" 
                        action={<div>Try  <Link to="/connections"><Button intent="primary">Adding Connections</Button></Link></div>} />;
    }

    return <div>
        <div>
            {/* undefined exception means query sent */}
            {exception === undefined ?  <div style={{height:11}}><ProgressBar intent="primary" /></div> : <div style={{height:11}}></div>}
        </div>
        <div id="editor2"> 
            {queryable && <QueryableEditor queryable={queryable} serverConfigs={serverConfigs} sendQuery={sendQuery} showRefreshSelect={false} />}
        </div>
    </div>
}

function IdeFlexPanel() {

    const queryEngine = useRef<QueryEngine | null>(null);
    useEffect(() => {
        queryEngine.current = new QueryEngine(null, false);    
        return () => { queryEngine?.current?.shutDown(); };
    },[]);
    
    // If you change the layout json you MUST change the name of the localStorage else the component won't show
    const jsonRow:IJsonRowNode = { type: "row", weight: 100, 
        children: 
        [{ type: "tabset", weight: 50, children: [{ type: "tab", name: "Editor", component: "editorv", } ] },
        { type: "tabset", weight: 50, 
            children: [{ type: "tab", name: "Table", component: "tablev", },
                       { type: "tab", name: "JSON1", component: "jsonv", },
                       { type: "tab", name: "Console", component: "consolev", },
                       { type: "tab", name: "Chart", component: "chartv", }, ] }
        ]
    };
    const jsonRowToCol:IJsonRowNode = { type: "row", weight: 100,  children: [jsonRow] };
    const json : IJsonModel = {
        global: {tabEnableClose:false, tabEnableFloat:true, tabSetAutoSelectTab:true, 
            // This option is essential. Because we use a listener pattern
            // If the tabs are only created after a query, they do not contain that queries result.
            tabEnableRenderOnDemand:false, 
        },
        borders: [],
        layout: jsonRowToCol
    };
    const [modelJson, setModelJson] = useLocalStorage("editorModel1",json, false);

    // To ensure height/width stretch within flexlayout, the first and only div should have heigh:100% i.e. use chartwrapper
    const factory = (node:TabNode) => {
        var cname = node.getComponent();
        const qc = queryEngine.current;
        if (cname === "editorv") {
            return <>{qc && <CodeEditor queryEngine={qc}/>}</>;
        } else if (cname === "chartv") {
            return <>{qc && <QueryToPropsComponent queryEngine={qc} children={ChartView} />}</>;
        } else if (cname === "jsonv") {
            return <>{qc && <QueryToPropsComponent queryEngine={qc} children={JsonView} />}</>;
        }  else if (cname === "tablev") {
            return <>{qc && <QueryToPropsComponent queryEngine={qc} children={TblView} />}</>;
        }  else if (cname === "consolev") {
            return <>{qc && <QueryToPropsComponent queryEngine={qc} children={ConsoleView} />}</>;
        } else {
            return <div className='panel'>unknown</div>;
        }
    }

    let m = undefined;
    try {
        m = Model.fromJson(modelJson);
    } catch(e:any) {
        m = Model.fromJson(json);
    }

    const iconFactory = (node: TabNode) => {
        let n = node.getComponent();
        let ic:IconName =  n === "jsonv" ? "diagram-tree" : n === "tablev" ? "grid" : n === "chartv" ? "chart" : n === "consolev" ? "console" : "annotation";
        return <><Icon icon={ic} /></>
    }

    return (<div><FlexContainer>
        <ErrorBoundary message={<NonIdealState icon="error" title="Bad Component State" 
                        action={<div>Try <Button intent="primary" onClick={()=>setModelJson(json)}>Resetting Layout</Button></div>} />}>
        {m && <Layout model={m} factory={factory} onModelChange={m => setModelJson(m.toJson()) } popoutURL="/popout.html" iconFactory={iconFactory} />}
        </ErrorBoundary>
    </FlexContainer></div>);
}

function ErrDisplay(props:{exception:string}) {
    return <NonIdealState icon="error" title="Query Error" description={props.exception} action={<div>Try  changing the query or server</div>} />;
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
        return (<ChartWrapper><this.props.children {...this.state} /></ChartWrapper>); 
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
    const [chartType] = useState<ChartType>(ChartType.timeseries); // setChartType
    if(props.exception !== null && props.exception.length>0) { return <ErrDisplay exception={props.exception} />;  }
    return (<>{props.srs && MyUpdatingChart.getChart(chartType,props.srs,"dark")}</>);
}

function TblView(props:SqlResult):JSX.Element {
    if(props.exception !== null && props.exception.length>0) { return <ErrDisplay exception={props.exception} />;  }
    if(props.srs && props.srs.rsdata !== undefined) {
        const rsdata = props.srs.rsdata;
        if(rsdata.tbl !== undefined) {
            let e = MyUpdatingChart.getChart(ChartType.grid,props.srs,"dark");
            if(e !== null) { return e; }
        } else if(rsdata.k !== undefined) {
            return <KView k={rsdata.k} />;
        } else  if(rsdata.exception && rsdata.exception.length>0) { 
            return <ErrDisplay exception={rsdata.exception} />;  
        }
    }
    return <ErrDisplay exception="Couldn't render result." />;
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