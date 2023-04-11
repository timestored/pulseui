import { useContext, useEffect, useRef, useState } from "react";
import { desktop, isAdmin, WorkspaceContext } from '../context';
import FlexPanel from './FlexPanel';
import { Button, NavbarDivider, NonIdealState } from '@blueprintjs/core';
import { useParams } from "react-router-dom";
import QueryEngine, { Queryable } from "../engine/queryEngine";
import { SmartRs } from "../engine/chartResultSet";
import { ThemeContext } from './../context';
import useInterval, { MyNavBar } from "./CommonComponents";
import { isBorderless } from './../App';
import { EmailReportButton } from "./DashReportPage";
import useLocalStorage from './hooks';

export type position = { h:number | undefined, w:number | undefined, x:number, y:number }

export default function DashboardPage(props:{rightOptions:JSX.Element}) {

    let { dashId } = useParams<{dashId: string | undefined}>();
    let { versionId } = useParams<{versionId: string | undefined}>();
    const [title,setTitle] = useState(<></>);
    const [connected,setConnected] = useState(false);
    const [editMode,setEditMode] = useLocalStorage("editMode", false, false);
    const queryEngine = useRef<QueryEngine | null>(null);
    const context = useContext(ThemeContext);

  useInterval(() => {
    if(isBorderless()) {
      const d:position = {h:$(window).height(), w:$(window).width(), x:window.screenX, y:window.screenY};
      window.localStorage.setItem("popuppos-" + dashId, JSON.stringify(d))
    }
  },5000)

  useEffect(() => {
    let ql = {
      queryError: (queryable: Queryable, exception: string) => { },
      tabChanged: (queryable: Queryable, srs: SmartRs) => {},
      connectionChange: (connected:boolean) => { setConnected(connected);  },
      argChange:() => {},
    };
    queryEngine.current = new QueryEngine(ql, true, window.location.search);    
    return () => {
      queryEngine?.current?.shutDown();
    };
  },[]);

  let dId = -1;
  if(dashId && !isNaN(parseInt(dashId))) {
    dId = parseInt(dashId);
  }

  const rightTopBarOptions = (<>
      <EmailReportButton dashId={dId} showAdminControls />   
      {isAdmin(context) &&  <Button intent="primary" icon={editMode ? "eye-open" : "edit"} onClick={() => setEditMode(!editMode)} >{editMode ? "view" : "edit"}</Button>}
      <NavbarDivider />
    {props.rightOptions}</>);

  return (<div id="appPage" className="dashboardPage">
      {!isBorderless() && <MyNavBar selected="dashboard" rightChildren={rightTopBarOptions}>{title}</MyNavBar>}<div>
      {connected && queryEngine.current &&
      <div><WorkspaceContext.Provider value={{ desktop:desktop, selectedNode:""}}>
      {dId === -1 ? <NonIdealState icon="error"  title="Can't find dashboard ID" action={<span>Check if that dashboard was deleted with your team.</span>} />
          : <FlexPanel dashId={dId} versionId={versionId ? parseInt(versionId) : undefined} editMode={editMode} setTitle={setTitle} queryEngine={queryEngine.current}/>}
      </WorkspaceContext.Provider>
        <div id="dashfooter"><div id="editor2"></div>
        </div>
      </div>}
      {!connected && <div>Not connected {queryEngine.current && <Button text="Force Reconnect" icon="globe-network" onClick={() => queryEngine.current?.requestReconnect()} />}</div>}
  </div></div>);
}
