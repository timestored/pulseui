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
 
import { DataTypes } from "../engine/chartResultSet";

import _uniqueId from 'lodash-es/uniqueId';
import SFormatters from "./SFormatters";
import { GridclmConfig } from "../components/AGrid";

export type FilterType = "Equals"
export function FilterMenu(props:{x:number, y:number, selected:FilterType|undefined, selectionMade: (filterType:FilterType) => void; }) {
    return <></>;
}


export function getFilterResult(ft: string, filter: string, val: any) {
  return true;
}


export function getSlickFormatter(colNameUsed:string, dataType:DataTypes, gc:GridclmConfig) {
    // Pipeline with separate responsibilities to allow sensible nesting/cascading. 
    // formatter(CONTENT) -> TEXT -> render(TEXT) -> HTML -> cellRender(HTML) -> SPAN
    // [cssClass:(aligned|bold,  [ span?(class|bg/fg=, [render(tag/sparkline, [formatter(code|number|percent, CONTENT):txt] ):html] :span] ]

    // Useful to separate formatting of text and rendering. As other grids support that concept.
    // If we have both, we pipeline them ourselves.
    const formatter = SFormatters.getFormatter(colNameUsed, dataType);
    const renderer = SFormatters.getRenderer(colNameUsed);
    const slickFormatter = (row:number, cell:number, value:any, columnDef:any, dataContext:any) => {
        let v = formatter(row, cell, value, columnDef, dataContext);
        v = renderer ? renderer(row, cell, v, columnDef, dataContext) : v;
        return v;
      };
      return slickFormatter;
}

 export function doSparkLines(theme:"light"|"dark") {}



export function createAddlHeaderRow(grid:any, columns:Array<{columnGroup:string, width:number}>) {}