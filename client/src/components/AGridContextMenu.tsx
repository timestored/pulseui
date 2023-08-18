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
 
import { DataTypes, SmartRs } from "../engine/chartResultSet";
import { ColFormat } from "../components/ChartFactory";
import { ColAlignOptions } from "../components/AGrid";
import { ActionHandler } from "../engine/actionHandlers";

type GridArgs = { colName:string, selected:ColFormat, setColumnFormat:(colName:string, colFormat:ColFormat)=>void }

export default function AGridContextMenu(props: { srs: SmartRs | null; x: number; y: number; selectionMade: (ah?:ActionHandler) => void; setColumnAlign:(colAlign:ColAlignOptions)=>void, actionHandlers:ActionHandler[]} & GridArgs) {
   return <></>
}

export const FormatterButton = (props:GridArgs & { type:DataTypes}) => {
    return <></>
}


export function ContextMenu(props:{children:React.ReactNode, x: number; y: number;}) {
    return <div className="GRcontextMenu" style={{ top: props.y, left: props.x }}>
        {props.children}
    </div>;
}


export function copyToClipboard(text:string) { // @ts-ignore
    if (window.clipboardData?.setData) {
        // @ts-ignore  Internet Explorer-specific code path to prevent textarea being shown while dialog is visible. 
        return window.clipboardData.setData("Text", text);

    }
    else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
        const textarea = document.createElement("textarea");
        textarea.textContent = text;
        textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in Microsoft Edge.
        document.body.appendChild(textarea);
        textarea.select();
        try {
            return document.execCommand("copy");  // Security exception may be thrown by some browsers.
        }
        catch (ex) {
            console.warn("Copy to clipboard failed.", ex);
            return prompt("Copy to clipboard: Ctrl+C, Enter", text);
        }
        finally {
            document.body.removeChild(textarea);
        }
    }
}
