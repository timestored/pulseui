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
 
import React, { useState, useEffect, Component, SetStateAction, Dispatch } from 'react';
import axios from 'axios';
//import '../dbsprites.css';
import { Number, String, Array, Record, Static, Undefined, Partial } from 'runtypes';
import { Alert, Button, FormGroup, HTMLTable, InputGroup, Intent, Spinner, MaybeElement, Icon, IconName, HTMLSelect, SpinnerSize, Collapse, NonIdealState, RadioGroup, Radio } from '@blueprintjs/core';
import { SERVER } from '../engine/queryEngine';
import { MyInput, MyOverlay } from './CommonComponents';
import { Enumify } from 'enumify';
import { notyf } from '../context';
import { SiMysql, SiPostgresql } from "react-icons/si";
import { DiMsqlServer } from "react-icons/di";
import { analytics } from '../App';
import { useCacheThenUpdate } from './hooks';

const newServerConfig: ServerConfig = { id: -1, name: "", host: "localhost", port: 5000, jdbcType: "KDB", database: "", username: "", password: "", 
                url: undefined, queryWrapPre:"", queryWrapPost:"" };

const ServerConfigR = Record({
    id: Number,
    name: String,
    host: String,
    port: Number,
    jdbcType: String
}).And(Partial({
    database: String.Or(Undefined),
    url: String.Or(Undefined),
    username: String.Or(Undefined),
    password: String.Or(Undefined),
    queryWrapPre: String.Or(Undefined),
    queryWrapPost: String.Or(Undefined),}));
export type ServerConfig = Static<typeof ServerConfigR>;


export function useServerConfigs(): [serverConfigs:ServerConfig[], setServerConfigs:Dispatch<SetStateAction<ServerConfig[]>>, refresh:()=>void] {    
    async function fetchProcessServers() {
        const r = await axios.get<ServerConfig[]>(SERVER + "/dbserver");
        Array(ServerConfigR).check(r.data);
        return (r.data as unknown as ServerConfig[]);
    }
    return useCacheThenUpdate<ServerConfig[]>("connections", [], fetchProcessServers, ()=>{});
  }

export function containsUserConn(serverConfigs:ServerConfig[]) {
    return serverConfigs.length > 1 || (serverConfigs.length === 1 && serverConfigs[0].name.toUpperCase() !== "DEMODB");
}

function ConnectionsPage() {
    const [serverConfigs, , refreshServerConfigs] = useServerConfigs();
    const [deleteId, setDeleteId] = useState<ServerConfig>();
    const [editId, setEditId] = useState<ServerConfig>();
    const [editServerList, setEditServerList] = useState<boolean>(false);

    const addConn = (jc: jdbcConnection) => {
        const sc: ServerConfig = {
            id: -1, name: jc.name + ":" + jc.defaultPort, username: "", port: jc.defaultPort,
            host: "localhost", jdbcType: jc.name, database: undefined, url: undefined, password: undefined,
            queryWrapPre: undefined, queryWrapPost:undefined
        };
        setEditId(sc);
    }

    async function deleteItem(id: number) {
        await axios.delete<ServerConfig[]>(SERVER + "/dbserver/" + id);
        refreshServerConfigs();
        analytics.track("Connection - Deleted: " + id);
        console.log("Connection - Deleted: " + id);
    }

    useEffect(() => { document.title = "Connections" }, []);
    const clearSelection = () => {
        setEditId(undefined);
        setEditServerList(false);
        refreshServerConfigs();
    }
    const isEmpty = serverConfigs.length === 0;
    const addDCbutton = <Button icon="add" small onClick={() => { setEditId(newServerConfig); }} intent={containsUserConn(serverConfigs) ? "primary" : "success"}>Connect Data</Button>;

    return <><div>
        <h1>Connections</h1>
        <div className="topButtons">
            {addDCbutton}
            <Button icon="edit" small onClick={() => { setEditServerList(true); }} >Add Server List</Button>
        </div>
        {!containsUserConn(serverConfigs) && <NonIdealState className="firstSteps" layout='horizontal' icon="data-connection" title="Data Connection Required" 
                                            description="You should first add a connection to access your own data."  action={addDCbutton}/>}
        { !isEmpty  && <HTMLTable condensed striped bordered interactive>
                <thead><tr><th>name</th><th>type</th><th>host:port</th><th>database</th><th>credentials</th><th>edit</th><th>delete</th></tr></thead>
                <tbody>
                    {serverConfigs.map(sc => {
                        const jdbcConn = (jdbcConnection.enumValueOf(sc.jdbcType) as jdbcConnection);
                        return (<tr key={sc.id} onClick={() => { setEditId(sc) }} >
                            <td>{sc.name}</td>
                            <td>{jdbcConn.niceName}</td>
                            <td>{sc.host}:{sc.port}</td><td>{sc.database}</td><td>{sc.username}</td>
                            <td><Button icon="edit" small onClick={() => { setEditId(sc) }} /></td>
                            <td><Button icon="delete" intent={Intent.DANGER} small onClick={(e) => { e.stopPropagation(); setDeleteId(sc); }} /></td>
                        </tr>)
                    })
                    }

                    <Alert cancelButtonText="Cancel" confirmButtonText="Delete" icon="trash" intent={Intent.DANGER} isOpen={deleteId?.id ? true : false}
                        onCancel={() => setDeleteId(undefined)} onConfirm={() => { deleteId?.id && deleteItem(deleteId.id); setDeleteId(undefined) }}
                        canEscapeKeyCancel canOutsideClickCancel>
                        <p>
                            Are you sure you want to delete this connection.
                            This will cause any users references to that connection to break.
                        </p>
                    </Alert>
                </tbody>
            </HTMLTable>
        }
        <ConnectionHelp addConn={addConn} />
        <MyOverlay isOpen={editId !== undefined} handleClose={clearSelection} title={(editId?.id === -1 ? "Add" : "Edit") + " Data Connection"}>
            <ConnectionsEditor serverConfig={editId!} clearSelection={clearSelection} />
        </MyOverlay>
        <MyOverlay isOpen={editServerList} handleClose={clearSelection} title="Add Server List">
            <ServerListEditor clearSelection={clearSelection} />        
        </MyOverlay>

    </div></>
}
export default ConnectionsPage;



function ServerListEditor(props:{clearSelection:()=>void}) {
    const DEFAULT_LIST = "my-server-name@localhost:5000\npro-server@localhost:5002:username:password\n127.0.0.1:5001";
    const [txt, setTxt] = useState(DEFAULT_LIST);
    const [ajax, setAjax] = useState<AjaxResult>({state:""});

    const saveConnections = () => {
        setAjax({ state: "running" });
        const run = async () => {
            axios.post(SERVER + "/dbserver/add-conns", txt, {headers:{"Content-Type":"text/plain"}, responseType: 'text'})
            .then(r => {
                if(typeof r.data === "string") {
                    if(r.data.length > 0) {
                        notyf.error("Error saving connections.");
                        setAjax({ state: "failed" });
                        setTxt(r.data);
                    } else {
                        setAjax({ state: "succeeded" });
                        props.clearSelection();
                    }
                }
            }).catch((e) => {
                notyf.error("Error saving connections.");
                setAjax({ state: "failed", msg:e });
            });
        };
        run();
        analytics.track("Connection - Bulk Add");
    }

    return (<div>
        <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); saveConnections(); }}>
            <textarea rows={20} cols={100} style={{width:"90%"}} placeholder={txt} value={txt} onChange={s => setTxt(s.target.value)} />
            <br /><Button intent="primary" type="submit" disabled={txt === DEFAULT_LIST || txt.length === 0}>Add</Button>  
                  <Button onClick={props.clearSelection}>Close</Button>    
            <br/><AjaxResButton mystate={ajax} succeededMsg="Saved" />
        </form></div>);
  }

interface EditorProps {
    serverConfig: ServerConfig | undefined;
    clearSelection: () => void;
}

export interface AjaxResult {
    state: "running" | "failed" | "succeeded" | "";
    msg?: string;
}

interface ConnectionsEditorState {
    serverConfig: ServerConfig,
    testState: AjaxResult,
    saveState: AjaxResult,
    showAdvanced: boolean,
}



class ConnectionsEditor extends Component<EditorProps, ConnectionsEditorState> {

    constructor(props: EditorProps) {
        super(props);
        const sc = this.props.serverConfig ?
            this.props.serverConfig :
            newServerConfig;
        this.state = { serverConfig: sc, testState: { state: "" }, saveState: { state: "" }, showAdvanced:false };
    }

    testConn = () => {
        this.setState({ testState: { state: "running" } });
        const run = async () => {
            axios.post<string>(SERVER + "/dbserver/test", this.state.serverConfig)
                .then(r => {
                    this.setState({ testState: { state: r.data === "success" ? "succeeded" : "failed", msg: r.data } });
                }).catch((e) => {
                    this.setState({ testState: { state: "failed", msg: e.message } });
                });
        };
        run();
    }

    saveConn = () => {
        const sc = this.state.serverConfig;
        if (sc.name === undefined || sc.name.length < 1) {
            sc.name = sc.jdbcType + ":" + sc.host + ":" + sc.port;
        }
        const isAdd = sc.id === -1;
        this.setState({ saveState: { state: "running" } });

        const run = async () => {
            const upsert = isAdd ? axios.post : axios.put;
            upsert<ServerConfig>(SERVER + "/dbserver", sc)
                .then(r => {
                    ServerConfigR.check(r.data);
                    this.setState({ saveState: { state: "succeeded" } });
                    this.props.clearSelection();
                }).catch((e) => {
                    notyf.error("Could not save connection." + e)
                    this.setState({ saveState: { state: "failed", msg: e.message } });
                });
        };
        run();
        analytics.track("Connection - Add");
    }

    render() {
        const sc = this.state.serverConfig;
        const isAdd = sc.id === -1;

        const setMerged = (name: string, val: any) => {
            const sc = { ...this.state.serverConfig, ...{ [name]: val } as unknown as ServerConfig };
            this.setState({ serverConfig: sc, testState: { state: "" } });
        }

        const handleChange = (e: React.FormEvent<HTMLInputElement>) => {
            setMerged(e.currentTarget.name, e.currentTarget.value);
        };
        const isKDB = (sc.jdbcType === "KDB" || sc.jdbcType === "KDB_STREAMING");
        const jdbcConn = (jdbcConnection.enumValueOf(this.state.serverConfig.jdbcType) as jdbcConnection);

        return <>
            <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); this.saveConn(); }}>
                <MyInput label="Name:" value={sc.name} name="name" onChange={handleChange} placeholder={sc.name.length > 0 ? sc.name : (sc.jdbcType + ":" + sc.host + ":" + sc.port)} />
                <JdbcSelect jdbcTypeSelected={sc.jdbcType} onChange={e => { 
                        const jdbcT = e.currentTarget.value;
                        const newJdbcConn = (jdbcConnection.enumValueOf(jdbcT) as jdbcConnection);
                        let port = this.state.serverConfig.port;
                        let database = this.state.serverConfig.database;
                        if(!newJdbcConn.exampleURL.toLowerCase().includes("{host}")) {
                            port = 0; 
                        }
                        if(port === 0) {
                            database = newJdbcConn.exampleURL;
                        }
                        const sc = { ...this.state.serverConfig, ...{ jdbcType: jdbcT, port:port, database:database } };
                        this.setState({ serverConfig: sc, testState: { state: "" } });
                }} />
                
                <RadioGroup inline className="urlHostRadio" label="Connect By: " onChange={e => {
                        const port = e.currentTarget.value === "url" ? 0 : (jdbcConn.defaultPort > 0 ? jdbcConn.defaultPort : 5000);
                        const database = e.currentTarget.value === "url" ? jdbcConn.exampleURL : "";
                        const sc = { ...this.state.serverConfig, ...{ port:port, database:database } };
                        this.setState({ serverConfig: sc, testState: { state: "" } });
                    }} selectedValue={sc.port === 0 ? "url" : "host"} >
                    <Radio label="Host" value="host" />
                    <Radio label="URL" value="url" />
                </RadioGroup>

                <MyInput label="URL:" value={sc.port === 0 ? sc.database : jdbcConn.exampleURL} name="database" onChange={handleChange} disabled={sc.port !== 0} size={50} />

                {sc.port !== 0 && 
                        <><MyInput label="Host:" value={sc.host} name="host" onChange={handleChange} placeholder="localhost or server.com" size={40} />
                        <MyInput label="Port:" value={sc.port ? "" + sc.port : ""} name="port" onChange={e => { setMerged("port", parseInt(e.currentTarget.value)) }} placeholder="3306" />
                        {(!isKDB) && <MyInput label="Database:" value={sc.database} name="database" onChange={handleChange} />}</>
                }
                
                <br />
                <FormGroup label="Username:" labelFor="connUser" inline labelInfo="(optional)" >
                    <InputGroup id="connUser" value={sc.username} name="username" onChange={handleChange} />
                </FormGroup>
                <FormGroup label="Password:" labelFor="connPass" inline labelInfo="(optional)">
                    <InputGroup id="connPass" value={sc.password} type="password" name="password" onChange={handleChange} /></FormGroup>
                {/* <p className="bp4-text-muted">If the username/password is supplied it will be shared by all users.
                    <br />If not supplied, each user will have to supply their database login details.</p> */}

                {isKDB &&  
                    <div>
                        <Button onClick={() => this.setState({showAdvanced:!this.state.showAdvanced})}>{(this.state.showAdvanced ? "Hide" : "Show") + " Advanced Options"}</Button>
                        <Collapse isOpen={this.state.showAdvanced}>
                        <MyInput label="Query Pre-Wrap:" value={sc.queryWrapPre} name="queryWrapPre" onChange={handleChange} />
                        <MyInput label="Query Post-Wrap:" value={sc.queryWrapPost} name="queryWrapPost" onChange={handleChange} />
                        </Collapse>
                    </div>}

                <Button intent="primary" type="submit" disabled={this.state.testState.state === "failed" || this.state.saveState.state === "running"}>{isAdd ? "Add" : "Save"}</Button>&nbsp;
                <Button intent="success" onClick={this.testConn}>Test</Button>
                <AjaxResButton mystate={this.state.testState} succeededMsg="Connected" />
                <AjaxResButton mystate={this.state.saveState} succeededMsg="Saved" />
                < br />
                < br />
            </form></>;
    }
}

export function JdbcSelect(props: { jdbcTypeSelected?: string, onChange: (e: React.FormEvent<HTMLSelectElement>) => void }) {
    // THis line was mostly generated in java (see JdbcTypesTest) then reorded to put KDB first.
    const types = { "KDB": "Kdb","KDB_STREAMING": "Kdb_Streaming","MSSERVER": "Microsoft SQL Server","MYSQL": "MySQL","POSTGRES": "Postgres","REDIS": "Redis","APACHE_CALCITE_AVATICA": "Apache Calcite Avatica","APACHE_IGNITE": "Apache Ignite","APACHE_KYLIN": "Apache Kylin","KYUUBI_HIVE": "Apache Kyuubi","SPARK_HIVE": "Apache Spark","YANDEX_CLICKHOUSE": "ClickHouse (Yandex)","CLICKHOUSE_COM": "ClickHouse.com","CRATEDB": "CrateDB (Legacy)","CSVJDBC": "CSV","DB2_ISERIES": "Db2 for IBM i","DERBY": "Derby Embedded","DERBY_SERVER": "Derby Server","DOLPHINDB": "DolphinDB","DUCKDB": "DuckDB","ELASTICSEARCH": "Elasticsearch","GEMFIRE_XD": "Gemfire XD","H2": "H2","SAP_HANA": "HANA (Old)","HSQLDB_EMBEDDED": "HSQL Embedded","HSQLDB_SERVER": "HSQL Server","INFLUXDB": "InfluxDB","INFORMIX": "Informix","MONGODB": "MongoDB","MSACCESS_UCANACCESS": "MS Access (UCanAccess)","NEO4J": "Neo4j","NUODB": "NuoDB","OMNISCI": "OmniSci (formerly MapD)","ORACLE": "Oracle","PRESTO": "PrestoSQL","SNAPPYDATA": "SnappyData","SNOWFLAKE": "Snowflake","APACHE_SOLRJ": "Solr","SQLITE_JDBC": "SQLite","SQREAM": "SQream DB","TDENGINE": "TDengine","TERADATA": "Teradata","TRINO": "Trino", };
    return <>
        <FormGroup label="Type:" labelFor="connType" inline>
            <HTMLSelect onChangeCapture={props.onChange}>
                {Object.entries(types).map(e => <option value={e[0]} selected={e[0] === props.jdbcTypeSelected}>{e[1]}</option>)}
            </HTMLSelect><span> (default port:{props.jdbcTypeSelected && (jdbcConnection.enumValueOf(props.jdbcTypeSelected) as jdbcConnection).defaultPort})</span>
        </FormGroup>
    </>
}

export function AjaxResButton(props: { mystate: AjaxResult, succeededMsg?: string }) {
    const st = props.mystate.state;
    return <>{st === undefined ? null :
        st === "running" ? <Spinner size={SpinnerSize.SMALL} intent="primary" />
            : st === "succeeded" ? <Button icon="tick" minimal>{props.succeededMsg ?? props.mystate.msg ?? "Success"}</Button>
                : st === "failed" ? <div><Button icon="cross" minimal intent="danger">Failed</Button> {props.mystate.msg}</div>
                    : null}</>
        ;
}



export function ConnectionHelp(props: { addConn: (jc: jdbcConnection) => void }) {
    return <><div>
        <h2>Create Connection:</h2>
        <p>Click on one of the below to create a connection using default settings on your local machine:</p>
        <div>
            <JdbcCoverPanel jdbcConn={jdbcConnection.KDB} addConn={props.addConn} />
            <JdbcCoverPanel jdbcConn={jdbcConnection.MSSERVER} addConn={props.addConn} />
            <JdbcCoverPanel jdbcConn={jdbcConnection.POSTGRES} addConn={props.addConn} />
            <JdbcCoverPanel jdbcConn={jdbcConnection.MYSQL} addConn={props.addConn} />
            <JdbcCoverPanel jdbcConn={jdbcConnection.CLICKHOUSE} addConn={props.addConn} />
        </div>
        <br style={{ clear: "left" }} />
    </div></>
}


function JdbcCoverPanel(props: { jdbcConn: jdbcConnection, addConn: (jc: jdbcConnection) => void }) {
    return <div className="floatbox" style={{ minWidth:"170px", minHeight:"90px", }}>
        <h4>{props.jdbcConn.niceName}</h4>
        <p><img src="/img/t.gif" height="64" width="64" className={"zu-"+props.jdbcConn.name.toLowerCase()} alt={props.jdbcConn.niceName + " logo"}  /></p>
        <p><Button small title="Add this connection." icon="add" onClick={() => props.addConn(props.jdbcConn)} >Add Connection</Button></p>
    </div>
}



class jdbcConnection extends Enumify {
    static CLICKHOUSE = new jdbcConnection("CLICKHOUSE", "Clickhouse", "jdbc:clickhouse://{host}:{port}/{database}", 8123);
    static CUSTOM = new jdbcConnection("CUSTOM", "Custom JDBC Driver", "DriverUrlPrefixNotSpecified", 5000);
    static KDB = new jdbcConnection("KDB", "Kdb", "jdbc:q:{host}:{port}", 5000);
    static KDB_STREAMING = new jdbcConnection("KDB_STREAMING", "Kdb_Streaming", "jdbc:q:{host}:{port}", 5000);
    static MSSERVER = new jdbcConnection("MSSERVER", "Microsoft SQL Server", "jdbc:sqlserver://{host}[:{port}][;databaseName={database}];trustServerCertificate=true", 1433);
    static MYSQL = new jdbcConnection("MYSQL", "MySQL", "jdbc:mysql://{host}:{port}/{database}?allowMultiQueries=true", 3306);
    static POSTGRES = new jdbcConnection("POSTGRES", "Postgres", "jdbc:postgresql://{host}:{port}/{database}?", 5432);
    static REDIS = new jdbcConnection("REDIS", "Redis", "jdbc:redis://{host}:{port}[/{database}]", 6379);
    static APACHE_CALCITE_AVATICA = new jdbcConnection("APACHE_CALCITE_AVATICA", "Apache Calcite Avatica", "jdbc:avatica:remote:url=http://{host}:{port}/druid/v2/sql/avatica/", 8082);
    static APACHE_IGNITE = new jdbcConnection("APACHE_IGNITE", "Apache Ignite", "jdbc:ignite:thin://{host}[:{port}][;schema={database}]", 1000);
    static APACHE_KYLIN = new jdbcConnection("APACHE_KYLIN", "Apache Kylin", "jdbc:kylin://{host}:{port}/{database}", 443);
    static KYUUBI_HIVE = new jdbcConnection("KYUUBI_HIVE", "Apache Kyuubi", "jdbc:hive2://{host}[:{port}][/{database}]", 10009);
    static SPARK_HIVE = new jdbcConnection("SPARK_HIVE", "Apache Spark", "jdbc:hive2://{host}[:{port}][/{database}]", 10000);
    static YANDEX_CLICKHOUSE = new jdbcConnection("YANDEX_CLICKHOUSE", "ClickHouse (Yandex)", "jdbc:clickhouse://{host}:{port}[/{database}]", 8123);
    static CLICKHOUSE_COM = new jdbcConnection("CLICKHOUSE_COM", "ClickHouse.com", "jdbc:ch:{host}:{port}[/{database}]", 8123);
    static CRATEDB = new jdbcConnection("CRATEDB", "CrateDB (Legacy)", "crate://{host}[:{port}]/", 5432);
    static CSVJDBC = new jdbcConnection("CSVJDBC", "CSV", "jdbc:relique:csv:{folder}", 0);
    static DB2_ISERIES = new jdbcConnection("DB2_ISERIES", "Db2 for IBM i", "jdbc:as400://{host};[libraries={database};]", 446);
    static DERBY = new jdbcConnection("DERBY", "Derby Embedded", "jdbc:derby:{folder}", 0);
    static DERBY_SERVER = new jdbcConnection("DERBY_SERVER", "Derby Server", "jdbc:derby://{host}:{port}/{database};create=false", 1527);
    static DOLPHINDB = new jdbcConnection("DOLPHINDB", "DolphinDB", "jdbc:dolphindb://{host}:{port}", 9200);
    static DUCKDB = new jdbcConnection("DUCKDB", "DuckDB", "jdbc:duckdb:{file}", 0);
    static ELASTICSEARCH = new jdbcConnection("ELASTICSEARCH", "Elasticsearch", "jdbc:es://{host}:{port}/", 9200);
    static GEMFIRE_XD = new jdbcConnection("GEMFIRE_XD", "Gemfire XD", "jdbc:gemfirexd://{host}[:{port}]/", 1527);
    static H2 = new jdbcConnection("H2", "H2", "jdbc:h2:tcp://{server}[:{port}]", 8082);
    static SAP_HANA = new jdbcConnection("SAP_HANA", "HANA (Old)", "jdbc:sap://{host}[:{port}]", 30015);
    static HSQLDB_EMBEDDED = new jdbcConnection("HSQLDB_EMBEDDED", "HSQL Embedded", "jdbc:hsqldb:file:{folder}", 0);
    static HSQLDB_SERVER = new jdbcConnection("HSQLDB_SERVER", "HSQL Server", "jdbc:hsqldb:hsql://{host}[:{port}]/[{database}]", 9001);
    static INFLUXDB = new jdbcConnection("INFLUXDB", "InfluxDB", "jdbc:arrow-flight-sql://{host}:{port}?disableCertificateVerification=true[&database={database}]", 27017);
    static INFORMIX = new jdbcConnection("INFORMIX", "Informix", "jdbc:informix-sqli://{host}:{port}/{database}:INFORMIXSERVER={server}", 1533);
    static MONGODB = new jdbcConnection("MONGODB", "MongoDB", "jdbc:mongodb://{host}[:{port}][/{database}]", 27017);
    static MSACCESS_UCANACCESS = new jdbcConnection("MSACCESS_UCANACCESS", "MS Access (UCanAccess)", "jdbc:ucanaccess://{file}", 0);
    static NEO4J = new jdbcConnection("NEO4J", "Neo4j", "jdbc:neo4j:bolt://{host}[:{port}]/", 7687);
    static NUODB = new jdbcConnection("NUODB", "NuoDB", "jdbc:com.nuodb://{host}[:{port}]/[{database}]", 2000);
    static OMNISCI = new jdbcConnection("OMNISCI", "OmniSci (formerly MapD)", "jdbc:omnisci:{host}:{port}:{database}", 6274);
    static PRESTO = new jdbcConnection("PRESTO", "PrestoSQL", "jdbc:presto://{host}:{port}[/{database}]", 8080);
    static SNAPPYDATA = new jdbcConnection("SNAPPYDATA", "SnappyData", "jdbc:snappydata://{host}[:{port}]/", 1528);
    static SNOWFLAKE = new jdbcConnection("SNOWFLAKE", "Snowflake", "jdbc:snowflake://{host}[:port]/?[db={database}]", 443);
    static APACHE_SOLRJ = new jdbcConnection("APACHE_SOLRJ", "Solr", "jdbc:solr://{host}:{port}/[?collection={database}]", 9983);
    static SQLITE_JDBC = new jdbcConnection("SQLITE_JDBC", "SQLite", "jdbc:sqlite:{file}", 0);
    static SQREAM = new jdbcConnection("SQREAM", "SQream DB", "jdbc:Sqream://{host}:{port}/{database};cluster=true", 3108);
    static TDENGINE = new jdbcConnection("TDENGINE", "TDengine", "jdbc:TAOS-RS://{host}:{port}/[{database}]", 6041);
    static TERADATA = new jdbcConnection("TERADATA", "Teradata", "jdbc:teradata://{host}/DATABASE={database},DBS_PORT={port}", 1025);
    static TRINO = new jdbcConnection("TRINO", "Trino", "jdbc:trino://{host}:{port}[/{database}]", 8080);

    static _ = jdbcConnection.closeEnum();

    constructor(readonly name: string, readonly niceName: string, readonly exampleURL: string, readonly defaultPort: number) {
        super();
    }
}