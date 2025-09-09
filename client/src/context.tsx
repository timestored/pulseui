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
 
import React from "react";
import desktopModel from './components/Workspace';
import { INotyfOptions, Notyf } from 'notyf';
import 'notyf/notyf.min.css'; // for React, Vue and Svelte
import { LoginResponse } from "./auth";

export const desktop = new desktopModel("foo");
export const WorkspaceContext = React.createContext({ desktop: desktop, selectedNode: "" });
export const notyf = new Notyf({types:[{type:"info", className:"infoNotyfy toast-notification", background:"transparent", icon:{}}]});
export const isDEV = true;


export type ThemeType = "light" | "dark";
export type IThemeType = { theme: ThemeType, login:LoginResponse | undefined }
export const ThemeContext = React.createContext<IThemeType>({ theme: 'light',login:undefined});
ThemeContext.displayName = 'ThemeContext';
export function isAdmin(context:IThemeType) { return context?.login?.roles?.includes("ADMIN") ? true : false; }

export function topNotyf(msg:string, opts?: Partial<INotyfOptions>) {
    notyf.success({type:"info",position:{y:"top",x:"center"},message:msg})
}