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
 
import React, { useState } from 'react';
import { WidgetProperties } from './CommonComponents';
import  { ArgMap, Queryable, QueryEngineAdapter } from './../engine/queryEngine';
import { HTMLTable } from '@blueprintjs/core';
import { useEffect } from 'react';
import { SmartRs } from '../engine/chartResultSet';
import Collapsible from 'react-collapsible';

const  AVariables = (props:WidgetProperties<null>, state:{argMap:{[argKey:string]:string[]}}) => {

    const [argMap, setArgMap] = useState(props.queryEngine.argMap);
    const [changedArgs, setChangedArgs] = useState<string[]>([]);
    const [exception, setException] = useState<string>("");
    
    const [actionArgMap, setActionArgMap] = useState(props.queryEngine.argMap);
    const [actionQuery, setActionQuery] = useState<Queryable|undefined>(undefined);

    useEffect(() => {
        const listener = new class extends QueryEngineAdapter {
            argsChanged(argMap: ArgMap): void {
                setChangedArgs(Object.keys(argMap));
                setArgMap(props.queryEngine.argMap);
            }
            tabChanged(queryable: Queryable, qTab: SmartRs, exceededMaxRows:boolean): void { }
            queryError(queryable: Queryable, exception: string): void {  setException(exception); }

            sendingQuery(queryable: Queryable, argMap: ArgMap): void {
                setActionArgMap(argMap);
                setActionQuery(queryable);
            }
        }();
        props.queryEngine.addListener(listener);
        return () => props.queryEngine.removeListener(listener);
    },[props.queryEngine]);

    return (<div className="adebug">
        <Collapsible trigger="Globals" open={true} >
            <ArgTable argMap={argMap} highlightedArgs={changedArgs} />
        </Collapsible>
        <Collapsible trigger="Latest Error">
            <p>{exception}</p>
        </Collapsible>
        <Collapsible trigger="Latest Action Event">
            {actionQuery ? <><p>{actionQuery.serverName} &lt;- {actionQuery.query}</p>
                                <ArgTable argMap={actionArgMap} highlightedArgs={[]} />
                            </>
                        : <p>No Action</p>}
        </Collapsible>
        </div>);
}


const  ArgTable = (props:{argMap:ArgMap, highlightedArgs:string[] }) => {
    const { argMap, highlightedArgs } = props;
    return <HTMLTable bordered interactive condensed>
        <thead><tr><th>Key</th><th>Value(s)</th></tr></thead>
        <tbody>{argMap &&  Object.keys(argMap).map(s => <tr key={s}>
                <th>{s}</th>
                <td className={highlightedArgs.includes(s) ? "selected" : undefined}>{argMap[s].join(",")}</td>
        </tr>)}</tbody>
    </HTMLTable>
}

export default AVariables;