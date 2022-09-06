import React, { useState, useEffect, Component } from 'react';
import axios from 'axios';
import { Number, String, Array, Record, Static, Undefined, Partial } from 'runtypes';
import { Alert, Button, FormGroup, HTMLTable, InputGroup, Intent, Spinner, MaybeElement, Icon, IconName, HTMLSelect, SpinnerSize } from '@blueprintjs/core';
import { SERVER } from '../engine/queryEngine';
import { MyInput, MyOverlay } from './CommonComponents';
import { Enumify } from 'enumify';
import { notyf } from '../context';
import { SiMysql, SiPostgresql } from "react-icons/si";
import { DiMsqlServer } from "react-icons/di";
import { analytics } from '../App';

const newServerConfig: ServerConfig = { id: -1, name: "", host: "localhost", port: 5000, jdbcType: "KDB", database: "", username: "", password: "", url: undefined };

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
    password: String.Or(Undefined)}));
export type ServerConfig = Static<typeof ServerConfigR>;


export async function fetchProcessServers(process: (s: ServerConfig[]) => void) {
    axios.get<ServerConfig[]>(SERVER + "/dbserver")
        .then(r => {
            let scee:ServerConfig[] = Array(ServerConfigR).check(r.data)
            process(scee);
        })
};


function ConnectionsPage() {
    const [serverConfigs, setServerConfigs] = useState<ServerConfig[]>([]);
    const [deleteId, setDeleteId] = useState<ServerConfig>();
    const [editId, setEditId] = useState<ServerConfig>();

    const addConn = (jc: jdbcConnection) => {
        let sc: ServerConfig = {
            id: -1, name: jc.name + ":" + jc.defaultPort, username: jc.defaultUsername, port: jc.defaultPort,
            host: "localhost", jdbcType: jc.name, database: undefined, url: undefined, password: undefined
        };
        const run = async () => {
            axios.post<ServerConfig>(SERVER + "/dbserver", sc)
                .then(r => {
                    ServerConfigR.check(r.data);
                    notyf.success("Connection Added");
                    fetchProcessServers(setServerConfigs);
                }).catch((e) => {
                    notyf.error("Connection Failed to Add");
                });
        };
        run();
    }

    async function deleteItem(id: number) {
        await axios.delete<ServerConfig[]>(SERVER + "/dbserver/" + id);
        fetchProcessServers(setServerConfigs);
        analytics.track("Connection - Deleted: " + id);
        console.log("Connection - Deleted: " + id);
    };

    useEffect(() => { fetchProcessServers(setServerConfigs); }, []);
    useEffect(() => { document.title = "Connections" }, []);
    const clearSelection = () => {
        setEditId(undefined);
        fetchProcessServers(setServerConfigs);
    }
    const isEmpty = serverConfigs.length === 0;

    return <><div>
        <Button icon="add" small onClick={() => { setEditId(newServerConfig); }} intent="success">Add Data Connection</Button>
        {isEmpty ?
            <ConnectionHelp addConn={addConn} />
            : <HTMLTable condensed striped bordered interactive>
                <thead><tr><th>name</th><th>type</th><th>host:port</th><th>database</th><th>credentials</th><th>edit</th><th>delete</th></tr></thead>
                <tbody>
                    {serverConfigs.map(sc => {
                        let jdbcConn = (jdbcConnection.enumValueOf(sc.jdbcType) as jdbcConnection);
                        return (<tr key={sc.id} onClick={() => { setEditId(sc) }} >
                            <td>{sc.name}</td>
                            <td><Icon icon={jdbcConn.icon} /> {jdbcConn.niceName}</td>
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
        <MyOverlay isOpen={editId !== undefined} handleClose={clearSelection} title={(editId?.id === -1 ? "Add" : "Edit") + " Data Connection"}>
            <ConnectionsEditor serverConfig={editId!} clearSelection={clearSelection} />
        </MyOverlay>

    </div></>
}
export default ConnectionsPage;

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
}
class ConnectionsEditor extends Component<EditorProps, ConnectionsEditorState> {

    constructor(props: EditorProps) {
        super(props);
        let sc = this.props.serverConfig ?
            this.props.serverConfig :
            newServerConfig;
        this.state = { serverConfig: sc, testState: { state: "" }, saveState: { state: "" } };
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
        let sc = this.state.serverConfig;
        if (sc.name === undefined || sc.name.length < 1) {
            sc.name = sc.jdbcType + ":" + sc.host + ":" + sc.port;
        }
        const isAdd = sc.id === -1;
        this.setState({ saveState: { state: "running" } });

        const run = async () => {
            let upsert = isAdd ? axios.post : axios.put;
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
        let sc = this.state.serverConfig;
        const isAdd = sc.id === -1;

        const setMerged = (name: string, val: any) => {
            let sc = { ...this.state.serverConfig, ...{ [name]: val } as unknown as ServerConfig };
            this.setState({ serverConfig: sc, testState: { state: "" } });
        }

        const handleChange = (e: React.FormEvent<HTMLInputElement>) => {
            setMerged(e.currentTarget.name, e.currentTarget.value);
        };

        return <>
            <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); this.saveConn(); }}>
                <MyInput label="Name:" value={sc.name} name="name" onChange={handleChange} placeholder={sc.name.length > 0 ? sc.name : (sc.jdbcType + ":" + sc.host + ":" + sc.port)} />
                <JdbcSelect jdbcTypeSelected={sc.jdbcType} onChange={e => { setMerged("jdbcType", e.currentTarget.value) }} />
                <MyInput label="Host:" value={sc.host} name="host" onChange={handleChange} placeholder="localhost or server.com" />
                <MyInput label="Port:" value={sc.port ? "" + sc.port : ""} name="port" onChange={e => { setMerged("port", parseInt(e.currentTarget.value)) }} placeholder="3306" />
                {(sc.jdbcType !== "KDB") && <MyInput label="Database:" value={sc.database} name="database" onChange={handleChange} />}
                <br />
                <FormGroup label="Username:" labelFor="connUser" inline labelInfo="(optional)" >
                    <InputGroup id="connUser" value={sc.username} name="username" onChange={handleChange} />
                </FormGroup>
                <FormGroup label="Password:" labelFor="connPass" inline labelInfo="(optional)">
                    <InputGroup id="connPass" value={sc.password} type="password" name="password" onChange={handleChange} /></FormGroup>
                <p className="bp4-text-muted">If the username/password is supplied it will be shared by all users.
                    <br />If not supplied, each user will have to supply their database login details.</p>
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
    const types = { "KDB": "Kdb", "KDB_STREAMING":"Kdb Streaming", "POSTGRES": "Postgres", "CLICKHOUSE": "Clickhouse", "MSSERVER": "Microsoft SQL Server", "H2": "H2", "MYSQL": "MySQL" };
    return <>
        <FormGroup label="Type:" labelFor="connType" inline>
            <HTMLSelect onChangeCapture={props.onChange}>
                {Object.entries(types).map(e => <option value={e[0]} selected={e[0] === props.jdbcTypeSelected}>{e[1]}</option>)}
            </HTMLSelect><span> (default port:{props.jdbcTypeSelected && (jdbcConnection.enumValueOf(props.jdbcTypeSelected) as jdbcConnection).defaultPort})</span>
        </FormGroup>
    </>
}

export function AjaxResButton(props: { mystate: AjaxResult, succeededMsg: string }) {
    const st = props.mystate.state;
    return <>{st === undefined ? null :
        st === "running" ? <Spinner size={SpinnerSize.SMALL} intent="primary" />
            : st === "succeeded" ? <Button icon="tick" minimal>{props.succeededMsg}</Button>
                : st === "failed" ? <div><Button icon="cross" minimal intent="danger">Failed</Button> {props.mystate.msg}</div>
                    : null}</>
        ;
}



export function ConnectionHelp(props: { addConn: (jc: jdbcConnection) => void }) {
    return <><div>
        <h1>Help - Connections</h1>
        <div>Connections Supported:
            <ul>
                {jdbcConnection.enumValues.map(v => { const n = (v as jdbcConnection).niceName;  return <li key={n}>{n}</li> })}
            </ul>
        </div>
        <div>
            <h2>Create Connection:</h2>
            <p>Click on one of the below to create a connection using default settings on your local machine:</p>
            <div>
                <JdbcCoverPanel jdbcConn={jdbcConnection.MSSERVER} addConn={props.addConn} />
                <JdbcCoverPanel jdbcConn={jdbcConnection.POSTGRES} addConn={props.addConn} />
                <JdbcCoverPanel jdbcConn={jdbcConnection.MYSQL} addConn={props.addConn} />
            </div>
            <br style={{ clear: "left" }} />
            <div>
                <JdbcCoverPanel jdbcConn={jdbcConnection.H2} addConn={props.addConn} />
                <JdbcCoverPanel jdbcConn={jdbcConnection.KDB} addConn={props.addConn} />
                <JdbcCoverPanel jdbcConn={jdbcConnection.CLICKHOUSE} addConn={props.addConn} />
            </div>
            <br style={{ clear: "left" }} />
        </div>
    </div></>
}


function JdbcCoverPanel(props: { jdbcConn: jdbcConnection, addConn: (jc: jdbcConnection) => void }) {
    return <div className="floatbox" style={{ minWidth:"170px", minHeight:"90px", }}>
        <h4>{props.jdbcConn.niceName}</h4>
        <p><img src={props.jdbcConn.img} width="80" height="80" alt={props.jdbcConn.niceName + " logo"} /></p>
        <p><Button small title="Add this connection." icon="add" onClick={() => props.addConn(props.jdbcConn)} >Add Connection</Button></p>
    </div>
}



class jdbcConnection extends Enumify {
    static KDB = new jdbcConnection("KDB", "Kdb", "database", "/img/kx.png", 5000, undefined, false);
    static KDB_STREAMING = new jdbcConnection("KDB_STREAMING", "Kdb Subscription", "database", "/img/kx.png", 5000, undefined, false);
    static POSTGRES = new jdbcConnection("POSTGRES", "Postgres", <SiPostgresql />, "/img/postgres-logo.png", 5432, "postgres");
    static CLICKHOUSE = new jdbcConnection("CLICKHOUSE", "Clickhouse", "database", "/img/clickhouse-logo.png", 8123);
    static MSSERVER = new jdbcConnection("MSSERVER", "Microsoft SQL Server", <DiMsqlServer />, "/img/mssql-logo.png", 1433, "sa");
    static H2 = new jdbcConnection("H2", "H2", "database", "/img/h2-logo.png", 8082);
    static MYSQL = new jdbcConnection("MYSQL", "MYSQL", <SiMysql />, "/img/mysql-logo.png", 3306, "root");
    static _ = jdbcConnection.closeEnum();

    constructor(readonly name: string, readonly niceName: string, readonly icon: IconName | MaybeElement,
        readonly img: string, readonly defaultPort: number, readonly defaultUsername: string | undefined = undefined,
        readonly databaseRequired: boolean = true) {
        super();
    }
}