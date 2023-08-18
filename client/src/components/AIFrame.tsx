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
 
import React from 'react';
import { Component } from 'react';
import { MyModal, WidgetProperties } from './CommonComponents';

type AIFrameState = {  url:string }

export default class AIFrame extends Component<AIFrameState & WidgetProperties<AIFrameState>,AIFrameState> {
    static defaultProps = { url: "https://en.wikipedia.org/wiki/Main_Page"};

    constructor(props:any) {
        super(props);
        this.state = { url:this.props.savedState?.url ?? this.props.url };
        this.props.setConfigSaver(() => this.state);
    }

    render() {  
        return <div><iframe src={this.state.url} title="iframe" className="iframey" scrolling="no" frameBorder="no" />
        {this.props.selected ? 
            <MyModal handleClose={this.props.clearSelected} title="Website Panel">
                <label>url:<input type="text" name="name" value={this.state.url} onChange={(e) => this.setState({url:e.target.value})}/></label></MyModal> : null}
        </div> 
    }
}
