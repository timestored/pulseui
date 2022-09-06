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
        {this.props.selected ? <MyModal handleClose={this.props.clearSelected}>
        <label>url:<input type="text" name="name" value={this.state.url} onChange={(e) => this.setState({url:e.target.value})}/></label></MyModal> : null}
        </div> 
    }
}
