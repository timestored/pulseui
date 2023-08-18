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
 
import { EmptySmartRs, RsData, SmartRs } from "./chartResultSet";
import { LRUBuffer, Websocket, WebsocketBuilder } from 'websocket-ts';
import { Button, MaybeElement, NonIdealState } from '@blueprintjs/core';
import { useState } from 'react';
import { ServerConfig } from "../components/ConnectionsPage";
import axios, { AxiosError, AxiosResponse } from "axios";
import { useCallback } from 'react';
import { ASelectSingle, IOptionRow } from "../components/AForm";
import { addParameter } from "../components/CommonComponents";
import { SqlEditor } from "../components/SqlEditor";
import { isDEV } from "../context";
import { get, merge } from "lodash-es";
import { getSubdomain } from "../App";
import { isStringArray } from "../components/ChartFactory";
import { Popover2 } from "@blueprintjs/popover2";
import AIModal from "../components/AIModal";

const rootURL = get(window,"pulseconfig.rootURL",undefined) as unknown as string;
export const SERVER = (rootURL !== undefined && rootURL.length>0 ? rootURL + 'api' : (isDEV ? 'http://localhost:8080' : '') + '/api'); // 'http://localhost:8080/api'

export type ArgType = "number"|"string"|"strings"|"date";
export type ArgMap = { [argKey: string]: string[] };
type ArgTypeMap = { [argKey: string]: ArgType };


export function toUrlPart(argVals: string[], argType: ArgType): string {
	const ty = (argType === "string" ? "" : argType + ".");
	return argVals.length>0 ? ty+argVals.map(s=>(s.replaceAll("~","_~"))).join("~") : "";
}

export function addArgParameter(url:string, argKey:string, argVals:string[], argType:ArgType) {
	return addParameter(url,argKey,toUrlPart(argVals, argType));
}

export function urlToMaps(queryString:string):[ArgMap,ArgTypeMap] {
	const m:ArgMap  = {};
	const tm:ArgTypeMap  = {};
	if(queryString.length>0) {
		const sp = new URLSearchParams(queryString);
		sp.forEach((v,k) => {
			const s = sp.get(k);
			let val = v;
			if(s !== null) {
				const p = v.indexOf(".");
				const t = v.substring(0, p || 0);
				let argType:ArgType = "string";
				if(t === "strings" || t === "number"  || t === "date" || t === "string") {
					argType = t;
					val = val.substring(p+1);
				}
				let argVals = t === "strings" ? [] : [val.replaceAll("_~","~")];
				let prevI = 0;
				if(t === "strings") { // split on ~ but avoid double _~
					let i=1;
					for(; i<val.length; i++) {
						if(val.charAt(i) === '~') {
							if(val.charAt(i-1) === '_') {
								// skip as it's _~ which means one ~
							} else {
								argVals.push(val.substring(prevI,i).replaceAll("_~","~"));
								prevI = i+1;
							}
						}
					}
					argVals.push(val.substring(prevI,++i).replaceAll("_~","~"));
				} else if(t === "date" && val.includes("~")) {
					argVals = val.split("~");
				}
				m[k] = argVals;
				tm[k] = argType;
			}
		});
	}
	return [m,tm];
}


function mapToMaps(argMapWithTypes: { [argKey: string]: any }):[ArgMap,ArgTypeMap] {
	const m:ArgMap  = {};
	const tm:ArgTypeMap  = {};
	Object.entries(argMapWithTypes).forEach(([argKey, argVals]) => {
		if(typeof argVals === 'string') {
			m[argKey] = [argVals];
			tm[argKey] = "string";
		} else if(isStringArray(argVals)) {
			m[argKey] = argVals;
			tm[argKey] = "strings";
		} else if(typeof argVals === 'number') {
			m[argKey] = [""+argVals];
			tm[argKey] = "number";
		} else if(argVals instanceof Date) {
			m[argKey] = [argVals.toISOString()];
			tm[argKey] = "string";
		} else if(argVals === null) {
			m[argKey] = [""];
			tm[argKey] = "string";
		} else if(argVals === undefined) {
			// do nothing.
		} else {
			m[argKey] = [""+argVals];
			tm[argKey] = "string";
			console.error("unrecognised arg type" + JSON.stringify(argVals));
		}
	});
	return [m,tm];
}	

export type SetArgsType = (argMapWithTypes: { [argKey: string]: any })=>void;



/**
 * QueryEngine represents the full querying engine where all events happen.
 * Most users should use UpdatingQueryable to listen/edit one query. 
 * Mostly the QueryEngine should use websockets to receive updates dynamicallly.
 * Alternatively the websocket can be turned off and then sendQuery can be used to send single specific queries.
 * Useful for reusing the listener logic in a single query editor.
 */
export default class QueryEngine {

	private notifyListenersSuccess(queryable: Queryable, srs: SmartRs, exceededMaxRows:boolean) {
		// console.debug("QE: notify " + this.listeners.length + " Listeners(" + queryable.query + "," + srs?.count() + " rows)");
		// set(window, "glob." + queryable.query, merge({srs:srs, },get(window, "glob." + queryable.query,{})));
		this.lastResultReceivedTime = new Date();
		this.listeners.forEach(l => {
			try {
				l.tabChanged(queryable, srs, exceededMaxRows);
			} catch (error) {
				console.error("Error notifying listener" + error);
			}
		});
	}
	private notifyListenersError(queryable: Queryable,  err = "") {
		this.lastResultReceivedTime = new Date();
		this.listeners.forEach(l => {
			try {
				l.queryError(queryable, err);
			} catch (error) {
				console.error("Error notifying listener" + error);
			}
		});
	}

	private intervalID: NodeJS.Timeout | null = null;
	private listeners: Array<QueryEngineListener> = [];
	public queryables: Array<Queryable> = [];
	private queryLastResultCache: { [s: string]: RsData } = {};
	private ws: Websocket | undefined = undefined;
	private lastResultReceivedTime = new Date();
	public argMap: ArgMap = {};
	public argTypeMap:ArgTypeMap = {};
	public dashId: number;
	public versionId: number;
	

	constructor(firstListener: QueryEngineListener | null = null, connectToWebsocket = true, queryString = "", dashId = -1, versionId = -1) {
		if (firstListener !== null) { this.addListener(firstListener); }
		const maps = urlToMaps(queryString);
		this.argMap = {...this.argMap, ...maps[0]};
		this.argTypeMap = {...this.argTypeMap, ...maps[1]};
		if(connectToWebsocket && (dashId === -1 || versionId === -1)) {
			throw new Error("If using QueryEngine Websocket, you must specify dashboard/version");
		}
		this.dashId = dashId;
		this.versionId = versionId;
		if(connectToWebsocket) {
			this.ws = this.requestReconnect();
		}
		// @ts-ignore
		// window.glob = {}; // @ts-ignore
		// window.getg = () => window.glob; // @ts-ignore
		// window.getp = (a:undefined) => { if(a === undefined) { return this.argMap } else { return this.argMap[a] } };  // @ts-ignore
		// window.setp = (a:any, b:any = undefined) => { if(b === undefined) { this.setArgsWithType(a) } else { this.setArgsWithType({[a]:b}) }};
	}

	requestReconnect = () => {
		if (this.ws === undefined || this.isClosed()) {
			axios.get<string>(SERVER + "/presubscribe").then(r => {
				const subDir = getSubdomain();
				const addy = (isDEV ? 'localhost:8080' : window.location.host) + (subDir ?? '') + '/api/subscribe/' + r.data;
				const ws = new WebsocketBuilder('ws://' + addy)
					.withBuffer(new LRUBuffer(1000))
					.onOpen((_i, _ev) => {
						console.log("opened");
						this.listeners.forEach(l => l.connectionChange(true));
						// TODO in case of disconnect we may need this?
						ws.send("setdash:" + this.dashId + "," + this.versionId);
						const args = Object.entries(this.argMap).map(([argKey,argVals]) => { return { argKey, argVals, argType:this.argTypeMap[argKey]} });
						ws.send("setk:" + JSON.stringify(args));
					})
					.onClose((_i, _ev) => { console.log("closed"); this.listeners.forEach(l => l.connectionChange(false)); })
					.onError((_i, _ev) => { console.log("error") })
					.onMessage((_i, ev) => { this.handleEvent(ev); })
					.build();
				this.ws = ws;
			}).catch((reason:AxiosError) => {
				console.error("Dashboard Connection Denied by server: " + reason.response?.data);
				if(reason.response?.status === 500 && typeof reason.response?.data === "string") {
					this.listeners.forEach(l => l.connectionChange(false, reason.response?.data as string));
				}
			})
			

		}
		return this.ws;
	}

	isClosed = () => { return this.ws ? this.ws.underlyingWebsocket?.readyState === WebSocket.CLOSED : true; }

	shutDown() {
		this.listeners = [];
		if(this.intervalID !== null) {
			clearInterval(this.intervalID);
		}
		this.ws?.close();
	}

	addListener(listener: QueryEngineListener) { this.listeners.push(listener); }
	addQueryable(queryable: Queryable) {
		this.queryables.push(queryable);
		this.ws?.send("addq:" + JSON.stringify(queryable));
		if (this.queryLastResultCache[queryable.query]) {
			const rsdata = this.queryLastResultCache[queryable.query];
			this.notifyListenersSuccess(queryable, new SmartRs(rsdata), false);
		}
	}

	removeListener(listener: QueryEngineListener) {
		this.listeners = this.listeners.filter(ql => ql !== listener);
	}

	removeQueryable(queryable: Queryable) {
		this.ws?.send("subq:" + JSON.stringify(queryable));
		this.queryables = this.queryables.filter(ql => ql !== queryable);
	}

	setArgsWithType:SetArgsType = (argMapWithTypes: { [argKey: string]: any }) => {
		const [argMap, argTypeMap] = mapToMaps(argMapWithTypes);
		Object.entries(argMapWithTypes).filter(([_k,v]) => v === undefined || v === null).forEach(([k,_v]) => { delete this.argMap[k]; delete this.argTypeMap[k]; });
		this.setArgs(argMap, argTypeMap);
	}

	setArgs(argMap: ArgMap, argTypeMap:ArgTypeMap) {
		console.log("setArgs " + JSON.stringify(argMap) + " of " + JSON.stringify(argTypeMap));

		let newUrl = window.location.href;
		Object.entries(argMap).forEach(([argKey,argVals]) => {
			const argType = argTypeMap[argKey];
				
			// Don't save submits as we DONT want them submitting on first load. 
			if(!argKey.toLowerCase().startsWith("submit_")) {
				newUrl = addArgParameter(newUrl,argKey, argVals, argType);
			}
			
			this.argMap[argKey] = argVals;
			this.listeners.forEach(l => {
				try {
					l.argChange(argKey, argVals);
				} catch (error) {
					console.error("Error notifying listener" + error);
				}
			});
		});
		this.listeners.forEach(l => l.argsChanged(argMap));
		// sendQuery and setK MUST use esact same args format
		const argsArray = Object.entries(argMap).map(([argKey,argVals]) => { return { argKey, argVals, argType:argTypeMap[argKey]} })
		this.ws?.send("setk:" + JSON.stringify(argsArray));
		
		window.history.replaceState({}, '', newUrl);
	}

	setArg(argKey: string, argVals: string[], argType:ArgType = "strings") {
		return this.setArgs({[argKey]:argVals}, {[argKey]:argType});
	}
	

	handleEvent(ev: MessageEvent<any>) {
		if (typeof ev.data === "string") {
			try {
				if(ev.data.startsWith("ping:")) {
					const args = ev.data.substring(5).split(",");
					this.ws?.send("pong:" + (args.length > 0 ? args[0] : "?" ));
					return; // Ignore it's just an ACK
				}
				if(ev.data.startsWith("addq:") || ev.data.startsWith("subq:") || ev.data.startsWith("setk:")) {
					return; // Ignore it's just an ACK
				}
				if(ev.data.startsWith("nochange:")) {
					this.lastResultReceivedTime = new Date();
					return; // Ignore it's just to let us know result is fresh
				}
				if(ev.data.trim().startsWith("{")) {
					const d = JSON.parse(ev.data);
					const queryable: Queryable = d.queryable;
					// eslint-disable-next-line no-prototype-builtins
					if (d.hasOwnProperty("error") && d.error && typeof d.error === "string") {
						this.notifyListenersError(queryable, d.error);
					} else {
						const rsdata: RsData = d.data;
						this.notifyListenersSuccess(queryable, new SmartRs(rsdata), rsdata.exceededMaxRows === true);
						this.queryLastResultCache[queryable.query] = rsdata;
						if (Object.keys(this.queryLastResultCache).length > 1000) {
							this.queryLastResultCache = {};
						}
					}
				}
				// Ignore any other messages, as it may just be an ACK or something we don't recognise?
			} catch (error) {
				console.log("Error processing response:" + error);
			}
		}
	}


	public translateQuery(queryable: Queryable, params?:{[k:string]:any}, callback?:(translation?:string, err?:string)=>void) {
		if(params && callback) {
			const [myArgMap,myArgTypeMap] = mapToMaps(params);
			const argsArray = this.toArgsArray(myArgMap,myArgTypeMap);
			const a = axios.post<string>(SERVER + "/translate/" + queryable?.serverName, {query:queryable?.query, argsArray:argsArray});
			a.then(r => callback(r.data, undefined))
				.catch(e => callback(queryable.query, e))
		} else {
			callback && callback(queryable.query, undefined);
		}
	}

	public toArgsArray(myArgMap:ArgMap, myArgTypeMap:ArgTypeMap) {
		const totalArgMap = merge(myArgMap,this.argMap);
		const totalArgTypeMap = merge(myArgTypeMap,this.argTypeMap);
		// sendQuery and setK MUST use esact same args format
		return Object.entries(totalArgMap).map(([argKey,argVals]) => { return { argKey, argVals, argType:totalArgTypeMap[argKey]} });
	}

	/**
	 * @param params Optional variables that if accessible as part of query.
	 */
	public async sendQuery(queryable: Queryable, params?:{[k:string]:any}, callback?:(srs?:SmartRs, err?:string)=>void) {
		console.log("qe2-sendQuery " + queryable?.query);
		let a:AxiosResponse<RsData,any>|undefined = undefined;
		if(params) {
			// merge the specific query ARgs with the current global args.
			// Particularly need to do this as queries are sent to a.json NOT through websocket thread.
			const [myArgMap,myArgTypeMap] = mapToMaps(params);
			const argsArray = this.toArgsArray(myArgMap,myArgTypeMap);
			this.listeners.forEach(l => l.sendingQuery(queryable,myArgMap));
			a = await axios.post<RsData>(SERVER + "/a.json/" + queryable?.serverName, {query:queryable?.query, argsArray:argsArray, serverCmd:queryable?.serverCmd});
		} else {
			a = await axios.post<RsData>(SERVER + "/a.json/" + queryable?.serverName, queryable?.query, {headers:{"Content-Type":"text/plain"}});
		}
		try {
			// Must first check for exception as it's only present if problem.
			if(a.data && a.data.exception && a.data.exception !== undefined && a.data.exception.length > 0) {
				const err = "Problem Calling Query: " + a.data.exception;
				this.notifyListenersError(queryable, err);
				if(callback) { callback(undefined, err)}
			// kdb result can have no table but console view
			} else if(a.data && (a.data.tbl || a.data.console)) {
				const srs = new SmartRs(a.data); // empty table will be created if undefined
				this.notifyListenersSuccess(queryable, srs, a.data.exceededMaxRows === true);
				if(callback) { callback(srs,undefined)}
			} else {
				const err = "Undefined Error. Neither received an error not a result.";
				this.notifyListenersError(queryable, err);
				if(callback) { callback(undefined, err)}
			}
		} catch (error) {
			const err = ((error instanceof Error) ? error.message : 'Unknown Error');
			this.notifyListenersError(queryable, err);
			if(callback) { callback(undefined,err)}
		}
	}

	/**
	 * @returns true Iff the 
	 */
	isBadlyDelayed():boolean {
		if(this.queryables.length < 1) {
			return false;
		}
		const minRefesh = this.queryables.map(q => q.refreshPeriod).reduce((prev, cur) => prev < cur ? prev : cur);
		const millisPassed = new Date().getTime() - this.lastResultReceivedTime.getTime();
		return millisPassed > 5100 + (2*(minRefesh+100));
	}
}



export function isSameQuery(p: Queryable, q: Queryable): boolean {
	return p.serverName === q.serverName && p.query === q.query && p.serverCmd === q.serverCmd;
}

export class Queryable {
	constructor(readonly serverName: string, readonly query: string, readonly refreshPeriod: number, readonly serverCmd: string = "") { }
}

export interface QueryEngineListener {
	sendingQuery(queryable: Queryable, argMap: ArgMap): void;
	tabChanged(queryable: Queryable, qTab: SmartRs, exceededMaxRows:boolean): void;
	queryError(queryable: Queryable, exception: string): void;
	argChange(argKey: string, argVals: string[]): void;
	argsChanged(argMap:ArgMap): void;
	connectionChange(connected: boolean, errorText?:string): void;
}


export class QueryEngineAdapter implements QueryEngineListener {
	sendingQuery(queryable: Queryable, argMap: ArgMap):  void { }
	tabChanged(queryable: Queryable, qTab: SmartRs, exceededMaxRows:boolean): void { }
	queryError(queryable: Queryable, exception: string): void { }
	argChange(key: string, newValue: any): void { }
	argsChanged(argMap:ArgMap): void { }
	connectionChange(connected: boolean, errorText?:string): void { }

}


/*****************  UpdatingQueryable  - Allows listening/editing one query and ignoring connections etc. ***********************/


export interface UpdatingQueryableListener {
	update(srs: SmartRs, exception: string | undefined): void
}


/** Given an array of servers, return which would be the most sensible one to make the selected default. */
export function getSensibleServer(serverConfigs:ServerConfig[]):ServerConfig|undefined {
	const names = serverConfigs.map(sc => sc.name);
	// Try 1. Latest used name 2. First one found unless it's demo 3. Second one.
	const lastName = window.localStorage.getItem("LastServerConfigsName");
	if(lastName !== null && names.includes(lastName)) {
		return serverConfigs[names.indexOf(lastName)];
	} else if(serverConfigs.length > 0) {
		if(serverConfigs[0].name === "DEMODB" && serverConfigs.length > 1) {
			return serverConfigs[1];
		}
		return serverConfigs[0];
	}
	return undefined;
}

export function getDefaultQueryable(serverConfigs?: ServerConfig[]) { 
	const serverName = (serverConfigs && getSensibleServer(serverConfigs)?.name) ?? "";
	return new Queryable(serverName, "([] name:`peter`paul`james; nice:(\"Peter Jones\";\"James Dunn\";\"James Rudolph\"))", 30000, "");
}

export class UpdatingQueryable implements QueryEngineListener {

	queryable: Queryable;
	private running = false;

	constructor(readonly serverConfigs: ServerConfig[], readonly queryEngine: QueryEngine,
		readonly listener: UpdatingQueryableListener, queryable: Queryable = getDefaultQueryable(serverConfigs)) {
		this.queryable = queryable;
		// Assume any serverConfig is chosen
		if (queryable.serverName.length === 0 && this.serverConfigs.length > 0) {
			const serverName = window.localStorage.getItem("LastServerConfigsName") || this.serverConfigs[0].name
			this.queryable = { ...this.queryable, serverName };
		}
		// The queryable could be loaded from a saved dashboard, if so we need to make it valid again.
		// This isn't the ideal place to perform this but the constructor is never called so can't be fixed?
		if(queryable.serverCmd === undefined) {
			this.queryable = { ...this.queryable, serverCmd:"" };
		}
	}

	sendingQuery(queryable: Queryable, argMap: ArgMap): void { }
	argChange(key: string, newValue: any): void { }
	argsChanged(argMap: ArgMap): void {}

	tabChanged(queryable: Queryable, srs: SmartRs): void {
		if (isSameQuery(this.queryable, queryable)) {
			this.listener.update(srs, undefined);
		}
	}
	queryError(queryable: Queryable, exception: string): void {
		if (isSameQuery(this.queryable, queryable)) {
			this.listener.update(EmptySmartRs, exception);
		}
	}

	saveQry = (queryable: Queryable) => {
		const o = this.queryable;
		this.queryEngine.removeQueryable(o);
		const n = { ...o, ...queryable };
		this.queryable = new Queryable(n.serverName, n.query, n.refreshPeriod, n.serverCmd);
		this.listener.update(EmptySmartRs, undefined);
		this.queryEngine.addQueryable(this.queryable);
	}

	connectionChange(connected: boolean) {
		if (!connected) {
			this.listener.update(EmptySmartRs, "disconnected");
		}
	}

	start() {
		if (!this.running) {
			console.debug("UpdatingQueryable: starting query = " + this.queryable.query)
			this.running = true;
			this.queryEngine.addListener(this);
			this.queryEngine.addQueryable(this.queryable);
		} else {
			console.log("You tried to start an already started UpdatingQueryable");
		}
	}

	stop() {
		if (this.running) {
			console.debug("UpdatingQueryable: stopping query = " + this.queryable.query)
			this.running = false;
			this.queryEngine.removeListener(this);
			this.queryEngine.removeQueryable(this.queryable);
		} else {
			console.log("You tried to stop an already stopped UpdatingQueryable");
		}
	}

	getEditor(children: MaybeElement) {
		return <QueryableEditor queryable={this.queryable} serverConfigs={this.serverConfigs} sendQuery={ qbl => {this.saveQry({...qbl, serverCmd:""})}} sendOnAnyChange showTooltip >
			{children}
		</QueryableEditor>;
	}
	
	setServerCmd(serverCmd:string) {  
		this.saveQry({ ...this.queryable, serverCmd:serverCmd}); 
	}
}


type QueryableEditorProps = { 
	queryable: Queryable, 
	serverConfigs: ServerConfig[], 
	children?: MaybeElement, 
	sendQuery: (queryable: Queryable) => void, 
	showRefreshSelect?:boolean,
	sendButtonText?:string,
	rightChildren?:MaybeElement,
	onChange?:(newTxt:string) => void,
	sendOnAnyChange:boolean,
	showTooltip?:boolean,
};

export const QueryableEditor = (props:QueryableEditorProps) => {

	const [showTooltip, setShowTooltip] = useState(props.showTooltip);
	const [showAI, setShowAI] = useState(false);
	const [dirtyQuery, setDirtyQuery] = useState(props.queryable.query);
    const [stateQueryable, setQueryable] = useState<Queryable>(props.queryable);
	const { sendQuery } = props;
	const showRefresh = props.showRefreshSelect === undefined ? true : props.showRefreshSelect === true;

	const queryable = props.sendOnAnyChange ? props.queryable : stateQueryable;
	const {serverName, refreshPeriod } = queryable;

	const handleChange = (chg:any) => { 
		props.sendOnAnyChange ? 
			sendQuery({ ...queryable, query:dirtyQuery, ...chg} as Queryable) 
			: setQueryable({ ...queryable, ...chg} as Queryable) };

	const sendSqlQuery = useCallback((qry:string) => { 
		if(qry && qry.length>0) {
			sendQuery({ serverName, refreshPeriod, query: qry } as Queryable);
		}
		return true; 
	},[sendQuery,serverName,refreshPeriod]);
	
	const run = useCallback((t:string) => t && t.length>0  && sendSqlQuery(t),[sendSqlQuery]);
	const refreshOptions:IOptionRow[] = [{val:"0", niceName:"As fast as possible"},{val:"100", niceName:"Every 100 ms"},{val:"250", niceName:"Every 250 ms"},{val:"1000", niceName:"Every 1s"},{val:"5000", niceName:"Every 5 s"},{val:"10000", niceName:"Every 10 s"},{val:"30000", niceName:"Every 30 s"},{val:"60100", niceName:"Every 1 min"},{val:"300100", niceName:"Every 5 min"},{val:"1800100", niceName:"Every 30 min"},{val:"7200100", niceName:"Every 2 hours"},{val:"999999", niceName:"Only on Interaction"}];
	const selectArgs = refreshOptions.find(o => o.val === ""+(queryable.refreshPeriod ?? ""));
	const unsaved = dirtyQuery !== queryable.query;
	const ttClassname = showTooltip === true ? "firstStepsBorder" : undefined;

	return (<div>
		
		<div className="QueryableEditorControls">
				{props.children}
				<div><Button onClick={()=>setShowAI(!showAI)}>AI</Button>
					{showAI && <AIModal existingQuery={dirtyQuery} serverName={serverName} setQuery={()=>setShowAI(false)}></AIModal>}
				</div>
				<ServerSelect selectedServer={queryable.serverName} serverOptions={props.serverConfigs} className={ttClassname}
					onSelect={e => { handleChange({ serverName: e}) }} />
				{showRefresh && <ASelectSingle options={refreshOptions} onArgSelected={(e)=>{handleChange({  refreshPeriod:parseInt(e[0])})}} 
					selectedArgs={selectArgs ? [selectArgs] : []} className="refreshSelect" />}
				<Button intent={unsaved ? "primary" : "none"} rightIcon="arrow-right" small onClick={() => sendSqlQuery(dirtyQuery)}>{props.sendButtonText || "Save Query"}</Button>
				{props.rightChildren}
		</div>
		{showTooltip === true && <div style={{height:0}}><Popover2 placement="left-start" canEscapeKeyClose={false} defaultIsOpen onClose={(e) => setShowTooltip(false)}
                    content={<NonIdealState className="firstStepsNonIdeal" title="Edit SQL">
						<p>The panel on the right is the Editor Panel.</p>
						<p>Update the selected data source and SQL code then save query to change what is displayed.</p>
					</NonIdealState>}>
				<span></span>
			</Popover2></div>}
		<SqlEditor className={ttClassname} runLine={run}  runSelection={run} value={dirtyQuery} 
			onChange={(txt) => {setDirtyQuery(txt); if(props.onChange !== undefined) { props.onChange(txt); } }} />
		</div>);
}


export function ServerSelect(props: { selectedServer: string, serverOptions: ServerConfig[], onSelect: (serverName: string) => void, className?:string }) {

	function onlyUnique(value: any, idx: number, self: any) { return self.indexOf(value) === idx; }
	
	const options = [props.selectedServer, ...props.serverOptions.map(sc => sc.name)].filter(onlyUnique);

	return (<>
		<select className={props.className} title="server select" onChange={e => {
			window.localStorage.setItem("LastServerConfigsName", e.currentTarget.value); // Reuse users latest choice
			props.onSelect(e.currentTarget.value)
		}}>
			{options.map(s => <option selected={s === props.selectedServer} key={s}>{s}</option>)}
		</select>
	</>);
}

