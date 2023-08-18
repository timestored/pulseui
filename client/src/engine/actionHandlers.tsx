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
 
import { ServerConfig } from '../components/ConnectionsPage';
import QueryEngine, { getSensibleServer, } from './queryEngine';

export function runActions(queryEngine:QueryEngine, actionHandlers:ActionHandler[], argMapWithTypes: { [argKey: string]: any }) { }

type TriggerTypes = "Change"|"Click"|"Right-Click"|"Double-Click"|"Mouse-Down"|"Menu"|"Named";
export type ActionHandler = {
    trigger:TriggerTypes,
    name:string, // Used for name in menu. Preferably shuld be unique over array.
    jscode:string,
    serverName:string,
    querycode:string,
	urlToOpen:string,
	urlNewWindow:boolean,
	columnName:string, // Certain actions only trigger on particular columns. THis allows filtering
};
export function getDefaultActionHandler(serverConfigs:ServerConfig[], trigger:TriggerTypes="Click"):ActionHandler { 
	const sc = getSensibleServer(serverConfigs);
	const server = sc ? sc.name : "";
	return {trigger:trigger, jscode:"", querycode:"", serverName:server, name:"", columnName:"", urlToOpen:"", urlNewWindow:true };
}


export const ActionEditor = (props:{actionHandlers:ActionHandler[], modify:(actionHandlers:ActionHandler[])=>void, triggerChoices:TriggerTypes[], serverConfigs:ServerConfig[]}) => {
    return <></>;
}
const ActionCodeEditor = (props:any) => {
	return <></>;
}