import { useContext, useEffect, useRef, useState } from "react";
import { desktop, isAdmin, WorkspaceContext } from '../context';
import FlexPanel from './FlexPanel';
import { Button, ControlGroup, NonIdealState, Switch } from '@blueprintjs/core';
import { useParams } from "react-router-dom";
import QueryEngine, { Queryable } from "../engine/queryEngine";
import { SmartRs } from "../engine/chartResultSet";
import { ThemeContext } from './../context';
import useInterval, { MyNavBar } from "./CommonComponents";
import { isBorderless } from './../App';

export type position = { h:number | undefined, w:number | undefined, x:number, y:number }

export default function DashboardPage(props:{rightOptions:JSX.Element}) {

    let { dashId } = useParams<{dashId: string | undefined}>();
    let { versionId } = useParams<{versionId: string | undefined}>();
    const [title,setTitle] = useState(<></>);
    const [connected,setConnected] = useState(false);
    const [errorText,setErrorText] = useState<string | undefined>("");
    const [warningText,setWarningText] = useState<string | undefined>("");
    const [editMode,setEditMode] = useState(false);
    const queryEngine = useRef<QueryEngine | null>(null);
    const context = useContext(ThemeContext);

  useInterval(() => {
    if(isBorderless()) {
      const d:position = {h:$(window).height(), w:$(window).width(), x:window.screenX, y:window.screenY};
      window.localStorage.setItem("popuppos-" + dashId, JSON.stringify(d))
    }
    if(queryEngine.current?.isBadlyDelayed()) {
      setWarningText("Data is badly delayed from server");
    } else {
      setWarningText(undefined);
    }
  },5000)

  let dId = -1;
  if(dashId && !isNaN(parseInt(dashId))) {
    dId = parseInt(dashId);
  }

  useEffect(() => {
    setEditMode(new URLSearchParams(window.location.search).get("sd_edit") === "1");
    let ql = {
      sendingQuery:() => {},
      queryError: (queryable: Queryable, exception: string) => { },
      tabChanged: (queryable: Queryable, srs: SmartRs) => {},
      connectionChange: (connected:boolean, errorText?:string) => { setConnected(connected); if(errorText){setErrorText(errorText);}  },
      argChange:() => {},
      argsChanged:() => {}
    };
    queryEngine.current = new QueryEngine(ql, true, window.location.search, dId, versionId ? parseInt(versionId) : -2);    
    return () => {
      queryEngine?.current?.shutDown();
    };
  },[dId,versionId]);


  const EditToggle = () => {
      /* <EmailReportButton dashId={dId} showAdminControls />    */
      return isAdmin(context) ?
        <ControlGroup vertical={false} className="editToggle">
            <Switch checked={editMode} onChange={() => setEditMode(!editMode)} innerLabel="off" innerLabelChecked="on" >Design Mode</Switch>
        </ControlGroup>
        : null;
    }
    let errAction:JSX.Element = <Button text="Force Reconnect" icon="globe-network" onClick={() => queryEngine.current?.requestReconnect()} />;
    if(errorText?.startsWith("Basic License:")) {
      errAction = <Button text="Upgrade To Pro" icon="globe-network" onClick={()=> window.open("https://www.timestored.com/pulse/pricing", "_blank")} />;
    } else if(errorText?.startsWith("License:")) {
      errAction = <Button text="Add Users" icon="globe-network" onClick={()=> window.open("https://www.timestored.com/pulse/pricing", "_blank")} />;
    }

  return (<div id="appPage" className="dashboardPage">
      {!isBorderless() && <MyNavBar selected="dashboard" rightChildren={props.rightOptions}>{title} <EditToggle /></MyNavBar>}
      <div>
      {warningText && <NonIdealState className="headerAlert" action={<p>{warningText}</p>} />}
      {connected && queryEngine.current &&
      //* id used for screenshots */
      <div id="dashContainer"> 
          <WorkspaceContext.Provider value={{ desktop:desktop, selectedNode:""}}>
      {dId === -1 ? <NonIdealState icon="error"  title="Can't find dashboard ID" action={<span>Check if that dashboard was deleted with your team.</span>} />
          : <FlexPanel dashId={dId} versionId={versionId ? parseInt(versionId) : undefined} editMode={editMode} setTitle={setTitle} queryEngine={queryEngine.current}/>}
      </WorkspaceContext.Provider>
        <div id="dashfooter" style={{display:editMode ? '' : 'none'}}><div id="editor2"></div></div>
      </div>}
      {!connected && <div>
              <NonIdealState icon="error" title="Not connected" description={errorText} action={errAction} />
        </div>}
    </div>
  </div>);
}
