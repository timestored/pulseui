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
 
import { useContext, useEffect, useRef, useState } from "react";
import { desktop, isAdmin, WorkspaceContext } from '../context';
import FlexPanel from './FlexPanel';
import { Button, ControlGroup, NonIdealState, Switch } from '@blueprintjs/core';
import { useParams } from "react-router-dom";
import QueryEngine, { Queryable } from "../engine/queryEngine";
import { SmartRs } from "../engine/chartResultSet";
import { ThemeContext, notyf } from './../context';
import useInterval, { MyNavBar } from "./CommonComponents";
import { isBorderless } from './../App';

export type position = { h:number | undefined, w:number | undefined, x:number, y:number }

function isValidHttpUrl(s:string) {
  try {
    const url = new URL(s);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;  
  }
  return false;  
}

export default function DashboardPage(props:{rightOptions:JSX.Element}) {

    const { dashId } = useParams<{dashId: string | undefined}>();
    const { versionId } = useParams<{versionId: string | undefined}>();
    const [title,setTitle] = useState(<></>);
    const [connected,setConnected] = useState(false);
    const [errorText,setErrorText] = useState<string | undefined>("");
    const [warningText,setWarningText] = useState<string | undefined>("");
    const [editMode,setEditMode] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
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
    const ql = {
      sendingQuery:() => {},
      queryError: (_queryable: Queryable, _exception: string) => { },
      tabChanged: (_queryable: Queryable, _srs: SmartRs, exceededMaxRows:boolean) => {
        if(exceededMaxRows) {
          notyf.error("Query result larger than maximum rows permitted.")
        }
      },
      connectionChange: (connected:boolean, errorText?:string) => { setConnected(connected); if(errorText){setErrorText(errorText);}  },
      argChange:() => {},
      argsChanged:() => {}
    };

    // In past Pulse didn't check thoroughly that saved URLs were valid 
    // AND contained a bug that saved param keys with percentage symbols '% avg' unencoded as '%%20avg'
    // Some of those were saved. We want to wipe them out when freshly loaded but warn the user.
    let urlQry = ""+window.location.search;
    if(!isValidHttpUrl(window.location.href) || window.location.search.includes("%%")) {
      notyf.error("Dashboard URL includes illegal characters. Trimming URL.");
      urlQry = "";
      const fullUrl = window.location.protocol + "//" + window.location.host + "/" + window.location.pathname;
      window.history.replaceState({}, '', fullUrl);
    }
    queryEngine.current = new QueryEngine(ql, true, urlQry, dId, versionId ? parseInt(versionId) : -2);    
    return () => {
      queryEngine?.current?.shutDown();
    };
  },[dId,versionId]);

  // Add beforeunload warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (editMode && hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    const checkForUnsavedChanges = () => {
      if (dashId) {
        const autoSaveKey = `dash-autosave-${dashId}`;
        const savedData = localStorage.getItem(autoSaveKey);
        setHasUnsavedChanges(!!savedData);
      }
    };

    // Check for unsaved changes on mount and periodically
    checkForUnsavedChanges();
    const interval = setInterval(checkForUnsavedChanges, 1000);

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(interval);
    };
  }, [editMode, hasUnsavedChanges, dashId]);


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
