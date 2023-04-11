import { Component } from 'react';
import { MyModal, WidgetProperties, MyHelpLink } from './CommonComponents';
import { ChoiceRow, Row } from './SubConfigEditor';
import { html } from '@codemirror/lang-html';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from "@codemirror/language-data";
import { MyEditor } from './SqlEditor';
import { marked } from 'marked';
import Mustache from 'mustache';
import { SmartRs } from '../engine/chartResultSet';
import { getDefaultQueryable, getSensibleServer, Queryable, UpdatingQueryable, UpdatingQueryableListener } from '../engine/queryEngine';


type ATextState = {   useDynamicQry:boolean, queryable:Queryable, html:string, tformat:"html"|"markdown"|"handlebar" }

export default class AText extends Component<ATextState & WidgetProperties<ATextState>,ATextState & {srs:SmartRs|undefined, exception:string|undefined}> implements UpdatingQueryableListener {
    static defaultProps:ATextState = { 
        html:  "# Markdown Header\n"
        + "\n"
        + "## html list\n"
        + "\n"
        + "{{^tbl}}<p>No Users</p>{{/tbl}}\n"
        + "<ul>\n"
        + "{{#tbl}}<li>{{NAME}} -  {{QUANTITY}}</li>{{/tbl}}\n"
        + "</ul>\n"
        + "\n"
        + "\n"
        + "## markdown table\n"
        + "\n"
        + "| Name         | Quantity     |\n"
        + "|--------------|--------------|\n"
        + "{{#tbl}} \n"
        + "| {{NAME}}  | {{QUANTITY}} |\n"
        + "{{/tbl}}\n"
        + "\n"
        + "<button onClick=\"alert('hello')\">Alert</button>",
        tformat:"handlebar",
        useDynamicQry:true,
        queryable:getDefaultQueryable()
    };
    uQueryable: UpdatingQueryable;

    constructor(props:any) {
        super(props);
         // for queryable - Now that we know serverConfigs we can generate a more sensible defult BUT still prefer saved state if it exists
        let srv = getSensibleServer(props.serverConfigs);
        let qry = "select name, quantity from position WHERE name<>'BRK.A'AND name<>'GOOG';";
        let qbl:Queryable = getDefaultQueryable(props.serverConfigs);
        if(srv) {
            if(srv.jdbcType === "KDB") {
                qry = "([] NAME:`Microsoft`Oracle`Paypal`Monero`FXC`Braint`MS`UBS; \n\tQUANTITY:(0.8+rand[0.2])*31847.0 13239.0 127938.0 81308.0 63047.0 13010.0 152518.0 166629.0)";
            }
            qbl = new Queryable(srv.name, qry, 30000);
        }

         // overwrite props with saved state
        this.state = { ...this.props, queryable:qbl, ...this.props.savedState, srs:undefined, exception:undefined };
        this.props.setConfigSaver(() => {
            const {html,tformat,useDynamicQry } = this.state;
            // Notice we are using the queryable from updateableQueryable
            return {html, tformat, useDynamicQry, queryable:this.uQueryable.queryable};
        });
        this.uQueryable = new UpdatingQueryable(props.serverConfigs, props.queryEngine, this, this.state.queryable);
    }

    update(srs: SmartRs, exception: string | undefined): void {
        this.setState({ srs, exception });
    }

    componentDidMount() { this.uQueryable.start(); }
    componentWillUnmount() { this.uQueryable.stop(); }

    render() {  
        const { tformat } = this.state;
        let disphtml = this.state.html;
        if(tformat === "markdown") {
            disphtml = marked.parse(this.state.html);
        } else if(tformat === "handlebar") {
            try {
                const md = marked.parse(this.state.html);
                disphtml = Mustache.render(md, { tbl:this.state.srs?.d() ?? []});
            } catch(e) {
                disphtml = ""+e;
            }
        }

        return <div>
            <div className='dynamichtml' dangerouslySetInnerHTML={{__html:disphtml}} ></div>

            {this.props.selected ? 
                <MyModal handleClose={this.props.clearSelected} title="Dynamic HTML Panel">
                    {/* <BooleanRow label="Use data query" onChange={ b => this.setState({useDynamicQry:b}) } checked={this.state.useDynamicQry} /> */}
                    {this.uQueryable.getEditor(null)}
                    {/* Saving as handlebar as that's the framework I wanted to use and hope to use in future. But showing mustache so as not to confuse user now */}
                    <Row label='Format:'>
                    <ChoiceRow idPrefix='dynamichtml' choices={["handlebar","markdown","html"]} niceNames={["mustache","markdown","html"]} 
                            label='Format' selected={tformat} onChange={s => this.setState({tformat:s})}  newRow={false}/>
                        <span>&nbsp;</span><MyHelpLink htmlTxt={''} href={'help/dynamic-html'} />
                    </Row>
                    <label>Enter {this.state.tformat === "handlebar" ? "Mustache" : this.state.tformat === "html" ? "HTML" : "Markdown"}: </label>
                        <MyEditor value={this.state.html} onChange={s => { this.setState({html:s})}} 
                                lang={ tformat === "markdown" ? markdown({base: markdownLanguage, codeLanguages: languages}) : html()} />
                </MyModal> : null}
        </div>;
    }
}
