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
 
import { createRef, useEffect, useState } from "react";
import { AnchorButton, Button, InputGroup } from '@blueprintjs/core';
import axios from 'axios';
import { SERVER } from '../engine/queryEngine';
import { HiMicrophone } from "react-icons/hi";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { marked } from "marked";
import { copyToClipboard } from "./AGridContextMenu";
import { notyf } from "../context";
import useLocalStorage from "./hooks";
import { MyOverlay } from "./CommonComponents";


export default function AIModal(props:{existingQuery:string, serverName:string, setQuery(txt:string|undefined):void}) {
	return <MyOverlay isOpen={true} handleClose={() => props.setQuery(props.existingQuery)} width={800} >
		<OpenAISql serverName={props.serverName} sqlGenerated={(sql) => { props.setQuery(sql ?? "")}} />
	</MyOverlay>;
}

 function OpenAISql(props:{serverName:string, existingQuery?:string, sqlGenerated:(sql:string|undefined)=>void}) {

  const [input, setInput] = useLocalStorage("aiQry","",false);
  const [runningAiquery, setRunningAiquery] = useState("");
  const [res, setRes] = useState("");
  const inputRef = createRef<HTMLDivElement>();
  const { transcript, listening, finalTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
  const listenOnce = () => SpeechRecognition.startListening({ continuous: false });
  
  const runAI = (txt:string) => {
      setRes("Running AI for: " + txt);
      const run = async () => {
          setRunningAiquery("Running AI for " + txt);
          axios.post(SERVER + "/txt2sql", {txt:txt,server:props.serverName})
              .then(r => {
                console.log(r.data);
                if(r.data.choices && r.data.choices[0].message.content) {
                  setRunningAiquery("");
                  const s = r.data.choices[0].message.content as string;
                  setRes(s.indexOf("nswer: ") > 0 ? s.substring(s.indexOf("nswer: ")+"nswer: ".length) : s);
                  if(inputRef.current) {
                    window?.getSelection()?.selectAllChildren(inputRef.current);
                  }
                } else {
                  setRunningAiquery("Failed to run query" + (r.data.errmsg ? ": "+r.data.errmsg : ""));
                  setRes("");
                }
              }).catch((e) => {
                setRunningAiquery("Failed to run query.");
                console.warn(e);
                setRes("");
              });
      };
      run();
  }

  useEffect(() => {
    if (!listening && finalTranscript && finalTranscript.length > 2) {
      setInput(finalTranscript);
      runAI(finalTranscript);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening,finalTranscript])

  const rightButtons = <><AnchorButton text={props.serverName}/>
            <Button disabled={listening} intent="primary" onClick={()=>runAI(input)} >Generate</Button>
            {browserSupportsSpeechRecognition && <Button intent={listening ? "danger" : "none"} onClick={()=>{listenOnce();}}><HiMicrophone /></Button>}
            </>;

    return <>
    <div><div style={{textAlign:"center",marginTop:50}}><img src="./img/duck256.png" height="32" width="32" alt="qDuck" /><span style={{fontSize:24}}>Experimental AI SQL Generation</span></div></div>
    <div><div style={{textAlign:"center", marginTop:10}}><span style={{fontSize:18,color:"red"}}>Warning: Using AI uploads data on your schema (table/column names) to a third party.</span></div></div>
    <div style={{height:"30px"}}>{listening && <span><HiMicrophone size="25" color="red" /> Listening... {transcript}</span>}</div>
      <form onSubmit={(e)=>{ runAI(input); e.preventDefault(); }}>        
            <div>
              <label><InputGroup leftIcon="search" autoFocus
                rightElement={rightButtons} 
                placeholder="Generate SQL to select..." value={input} onChange={txt => setInput(txt.target.value)}></InputGroup></label>
            </div>
      </form>

      {(res && res.length>0) ? <div ref={inputRef} className='dynamichtml' key="htmlo" onClick={e => window?.getSelection()?.selectAllChildren(e.currentTarget) } dangerouslySetInnerHTML={{__html:marked.parse(res, { breaks: true })}} ></div>
                    : <div>{runningAiquery}</div>}
      {(res && res.length>0) && <>
                                  <Button intent="success" onClick={()=>{copyToClipboard(res); props.sqlGenerated(undefined); notyf.success("Query has been copied to your clipboard"); }} 
                                          icon="clipboard">Copy to clipboard</Button>
                                  {/* <Button onClick={()=>{props.sqlGenerated(res)}} intent="success">Accept</Button> */}
                                  <Button onClick={()=>{props.sqlGenerated(undefined)}} >Cancel</Button></>}
    </>;
 }