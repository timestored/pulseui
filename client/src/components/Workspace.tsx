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
 
import { Queryable } from "../engine/queryEngine";


export default class desktopModel {
	private listeners:Array<desktopListener> = [];
    private _workspaces:workspaceModel[] = [];
    private _selectedWorkspace:workspaceModel;

    constructor(readonly title:string){
        this._selectedWorkspace = new workspaceModel(this, "sheet1");
        this._workspaces = [this.selectedWorkspace];
    }

    addWorkspace(title:string) {
        const w = new workspaceModel(this, title);
        this.workspaces = this.workspaces.concat(w);
        this.listeners.map(l => l.configChanged());
    }
    
    renameWorkspace(index:number | workspaceModel, title:string) {
        if(typeof index !== "number") {
            index = this.workspaces.indexOf(index);
        }
        if(index >= this.workspaces.length || index < 0) {
            throw new Error("workspace outside range");
        }
        const ws = this.workspaces.slice();
        ws[index].title = title;
        this.workspaces = ws;
    }
    
    removeWorkspace(index:number | workspaceModel) {
        if(typeof index !== "number") {
            index = this.workspaces.indexOf(index);
        }
        if(this.workspaces.length <= 1) {
            throw new Error("can't remove the only workspace.");
        }
        if(index >= this.workspaces.length) {
            throw new Error("workspace outside range");
        }
        const deletedW = this.workspaces[index];
        // change selection before removing active workspace
        if(deletedW === this.selectedWorkspace) {
            this.selectedWorkspace = this.workspaces[index === 0 ? 1 : index - 1];
        }
        this.workspaces = this.workspaces.filter((e,i) => i !== index);
    }

    public getWorkspaces():workspaceModel[] { return this._workspaces; }
    private get workspaces():workspaceModel[] { return this._workspaces; }
    private set workspaces(workspaces) { 
        this._workspaces = workspaces;
        this.listeners.map(l => l.configChanged());
    }

    public get selectedWorkspace():workspaceModel { return this._selectedWorkspace; }
    
    public setSelectedWorkspace(index:number) { 
        this.selectedWorkspace = this.workspaces[index];
    }

    public set selectedWorkspace(workspace) { 
        const p = this.workspaces.indexOf(workspace)
        if (p === undefined) {
            throw new Error('desktop must contain workspace');
        }
        this._selectedWorkspace = workspace;
        this.listeners.map(l => l.workspaceSelected(workspace));
    }

	addListener(listener:desktopListener) { this.listeners.push(listener); }
	removeListener(listener:desktopListener) {
		this.listeners = this.listeners.filter(ql => ql !== listener);
	}
}

interface desktopListener {
    workspaceSelected(workspace:workspaceModel):void;
    configChanged():void;
}

export class workspaceModel {
	private listeners:Array<workspaceListener> = [];
    widgets:widget<any>[] = [];
    title = "sheet1";

    constructor(readonly desktop:desktopModel, title:string){
        this.title = title;
    }

	addListener(listener:workspaceListener) { this.listeners.push(listener); }
	removeListener(listener:workspaceListener) {
		this.listeners = this.listeners.filter(ql => ql !== listener);
	}
}

interface workspaceListener {
    configChanged():void;
    configChanged(widget:widget<any>):void;
}

export class widget<T> {
    public queryables:Array<Queryable> = [];
    constructor(readonly workspace:workspaceModel, readonly id:string, readonly config:T){}
}
