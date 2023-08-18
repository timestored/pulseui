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
 
import { Button, ButtonGroup } from '@blueprintjs/core';
import React from 'react';
import { Component } from 'react';
import { QueryEngineAdapter } from '../engine/queryEngine';
import { KeyParamInput, MyModal, WidgetProperties } from './CommonComponents';
import { SqlEditor } from './SqlEditor';

type AEditorState = {  code:string, key:string, format:"Text"|"Code", typedCode?:string, defaultCode?:string, typedDefaultCode?:string, num?:number }


export default class AEditor extends Component<AEditorState & WidgetProperties<AEditorState>,AEditorState> {
    static defaultProps = { code: "select * from table", key:"code1" };
    listener:QueryEngineAdapter|null = null; 

    constructor(props:any) {
        super(props);
        const key = this.props.savedState?.key ?? this.props.key;
        const defaultCode = this.props.savedState?.code ?? this.props.code;
        const format = this.props.savedState?.format ?? this.props.format;
        let code = defaultCode;
        const arg = this.props.queryEngine.argMap[key];
        if(arg && arg.length>0) {
            code = arg[0];
        } else {
            this.props.queryEngine.setArg(key, [code], "string");
        }
        this.state = {  code,  key, format, typedCode:code, defaultCode, typedDefaultCode:defaultCode, num:0 };
        this.props.setConfigSaver(() => {return {code:this.state.defaultCode, key:this.state.key, format:this.state.format}});
    }
    
    render() {  
        const {  code,  key, format, typedCode, defaultCode, typedDefaultCode, num } = this.state;
        const setCode = (code:string) => { 
            this.props.queryEngine.setArg(key, [code], "string");
            this.setState({code, typedCode:code})
        }
        // We change the key to force the uncontolled component to be newly rendered.
        const resetHack = (s:string) =>  { 
            setCode(s); 
            this.setState({num:(num ?? 0) + 1}) 
        };
        const rows = (code.split("\n").length - 1) | 1;
        const isCode = format === "Code";

        return <div className='aeditor'>
            <ButtonGroup className="aeditor-controls">
                <Button icon="floppy-disk" disabled={code === typedCode} onClick={() =>  setCode(typedCode ?? "")} small>Save Query</Button>
                <Button icon="reset" disabled={typedCode === defaultCode} onClick={() => resetHack(defaultCode ?? "")} small>Reset</Button>
            </ButtonGroup>
            <br style={{clear:"both"}}/>

            {isCode?
                <SqlEditor  key={"ed"+num} runLine={s => {}}  runSelection={s => {}}  value={code}  onChange={s => this.setState({typedCode:s})}  />
                : <textarea key={"ta"+num} rows={rows} defaultValue={code} onChange={s => this.setState({typedCode:s.target.value})} />}
        
        {this.props.selected ? 
        <MyModal title={(format) + " Editor"} handleClose={this.props.clearSelected} className='aeditorModal'>
            <Button icon="floppy-disk" disabled={typedDefaultCode === defaultCode} 
                onClick={() =>  { this.setState({defaultCode:typedDefaultCode}); resetHack(typedDefaultCode ?? "")}} small>Set Default Query</Button>
                
            <Button icon={isCode ? "code" : "italic"}
                onClick={() =>  { this.setState({format:format === "Text" ? "Code" : "Text"}); resetHack(typedDefaultCode ?? "")}} small>{format}</Button>
            <KeyParamInput label="Key" value={key} name="myKey" onComplete={(s) => this.setState({key:s})}/>
            <br style={{clear:"both"}}/>
            {isCode ?
                <SqlEditor runLine={s => {}}  runSelection={s => {}}  value={defaultCode!}  onChange={s => this.setState({typedDefaultCode:s})}  />
                : <textarea defaultValue={defaultCode} onChange={s => this.setState({typedDefaultCode:s.target.value})}  rows={10} />}
        </MyModal> : null}
        </div> 
    }
}
