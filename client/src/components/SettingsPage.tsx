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
 
import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Button, HTMLTable, NonIdealState } from '@blueprintjs/core';
import { isAdmin, notyf, ThemeContext } from '../context';
import {  ANAME } from '../App';
import { get } from 'lodash-es';
import { AjaxResButton, AjaxResult } from './ConnectionsPage';
import { SERVER } from '../engine/queryEngine';

function toTable(dict:object) {
    if(Object.keys(dict).length === 0) {
        return <p>Empty</p>
    }
    return <HTMLTable condensed striped bordered>
            <thead><tr><th>name</th><th>value</th></tr></thead>
            <tbody> {Object.entries(dict).map(([s,v]) => <tr><td>{s}</td><td>{v}</td></tr>)} </tbody>
        </HTMLTable>;
}

export default function SettingsPage() {
    useEffect(() => { document.title = ANAME + " - Settings" }, []);
    const context = useContext(ThemeContext);
    const [backupAjax,setBackupAjax] = useState<AjaxResult>({state:""});
    const [serverInfo,setServerInfo] = useState<Object>({});

    useEffect(() => {
        async function get() {
            axios.get<Object>(SERVER + "/serverinfo")
            .then(r => { console.log("then"); setServerInfo(r.data); })
            .catch(r => { setServerInfo({failed:true}); });
        }
        get();
    },[]);

    const runBackup = () => {
        setBackupAjax({ state: "running" });
        axios.get<String>(SERVER + "/backup").then(r => {
                setBackupAjax({ state: "succeeded", msg:"Saved to " + r.data });
                notyf.success("Saved to " + r.data);
            }).catch((e) => {
                notyf.error("Could not create backup." + e)
                setBackupAjax({ state: "failed", msg: e.message });
            });
    }

    if(!isAdmin(context)) {
        return <NonIdealState icon="error" title="You are not permitted on this page." ></NonIdealState>;
    }
    return (<div><h1>Settings</h1>
        <h2>Server Information</h2>
        {toTable(serverInfo)}

        <h2>Backup</h2>
        <Button intent="success" onClick={runBackup}>Run Backup</Button>
        <AjaxResButton mystate={backupAjax} />

        <h3>pulseconfig</h3>
        {toTable(get(window,"pulseconfig",{}))}
    </div>);
}

