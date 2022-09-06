import React from 'react';
import { Component } from 'react';
import { MyModal, WidgetProperties } from './CommonComponents';

type ATextState = {  html:string }

export default class AText extends Component<ATextState & WidgetProperties<ATextState>,ATextState> {
    static defaultProps = { html: "<div style='margin:5px 40px;'>\n<h1>Header</h1>"
                + "\n<p>Text Text Text Text Text Text Text .</p>"
                + "\n<ol>\n\t<li>One</li>\n\t<li>Two</li>\n\t<li>Three</li></ol>"
                + "\n<h2>subtitle</h2>"
                + "\n<p>Text Text Text Text Text Text Text .</p>"
                + "\n<p>Text Text Text Text Text Text Text .</p>"
            + "</div>"};

    constructor(props:any) {
        super(props);
        this.state = { html:this.props.savedState?.html ?? this.props.html };
        this.props.setConfigSaver(() => this.state);
    }

    render() {  
        return <div>
            {/* <textarea  name="textValue" onChange={(e) => this.setState({text:e.target.value})} value={value} style={{height:400, width:"100%"}}/> */}
            <div dangerouslySetInnerHTML={{__html:this.state.html}} ></div>
            {this.props.selected ? <MyModal handleClose={this.props.clearSelected}>
            <label>Enter HTML: </label><textarea  name="textValue" onChange={(e) => this.setState({html:e.target.value})} value={this.state.html} style={{height:400, width:"100%"}}/>
                </MyModal> : null}
        </div>;
    }
}
