import React, { Component, createRef, ReactNode, RefObject, Suspense } from 'react';
import { Action, TabNode, Layout, Model, Actions, TabSetNode, BorderNode, IJsonModel } from "flexlayout-react";
import { Button, ButtonGroup, EditableText, H1, Icon, Intent, Menu, MenuItem, NonIdealState, Popover, Position } from "@blueprintjs/core";
import Counter from './Counter';
import AIFrame from './AIFrame';
import { notyf, ThemeContext, topNotyf } from '../context';
import { ChartType, getChartIcon, MyUpdatingChart } from './ChartFactory';
import axios, { AxiosError } from "axios";
import { Dash, getDash, saveDash } from "./DashPage";
import QueryEngine, { SERVER } from "../engine/queryEngine";
import { VscSymbolVariable } from "react-icons/vsc";
import { DiWebplatform } from "react-icons/di";
import AForm from './AForm';
import { isBorderless } from './../App';

import { FlexContainer } from '../styledComponents';
import { fetchProcessServers, ServerConfig } from './ConnectionsPage';
import { Link } from 'react-router-dom';
import AVariables from './AVariables';
import { isAdmin } from './../context';
import 'flexlayout-react/style/light.css';
import '../dark.css';
import AEditor from './AEditor';
import html2canvas from 'html2canvas';
import { Popover2 } from '@blueprintjs/popover2';
const AText = React.lazy(() => import('./AText'));

export const DEFAULT_GLOBAL = {
    tabEnableClose:false, tabEnableFloat:true, tabSetAutoSelectTab:true, 
    splitterSize:1, splitterExtra:10,
    // This option is essential. Because we use a listener pattern
    // If the tabs are only created after a query, they do not contain that queries result.
    tabEnableRenderOnDemand:false, 
}

const defaultJson : IJsonModel = {
    global: DEFAULT_GLOBAL,
    borders: [],
    // layout: { type: "row", weight: 100,  children:  [] }
    "layout": {
        "type": "row",
        "id": "#481b8859-f414-4607-9872-130e1c4e7aa5",
        "children": [ { "type": "tabset", "id": "#8c7aa838-3d1e-4feb-af09-a32b41446ebc",
                "children": [
                    { "type": "tab", "id": "#07bd8ea1-7e79-4d63-b507-18d1a7626c12", "name": "Welcome", "component": "atext",
                        "config": { "dashstate": { "html": "<div style='margin:5px 40px;'>\n<h1>Welcome</h1>\n<p>This is a new empty dashboard.</p>\n<p>If you are an admin, you can <b>click the Design Mode toggle button at the top of the page.</b></p><p>This will display a toolbar row that allows you to add components to your dashboard. <br />You can double-click on the dashboard title or on the tab titles to rename either. </p>\n\n<p>Click the small <span style=\"width:50px; background:#EEEEEE\">grid <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" style=\"width: 1em; height: 1em;  align-items: center;\"><path fill=\"none\" d=\"M0 0h24v24H0z\"></path><path stroke=\"var(--color-icon)\" fill=\"var(--color-icon)\" d=\"M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z\"></path></svg></span> on the tab header of this component to delete it.</p>\n\n<p>Once you have made any changes you want to save and publish for others. Click <button type=\"button\" disabled=\"\" class=\"bp4-button bp4-intent-primary\"><span icon=\"floppy-disk\" aria-hidden=\"true\" tabindex=\"-1\" class=\"bp4-icon bp4-icon-floppy-disk\"><svg data-icon=\"floppy-disk\" width=\"16\" height=\"16\" viewBox=\"0 0 16 16\"><path d=\"M15.71 2.29l-2-2A.997.997 0 0013 0h-1v6H4V0H1C.45 0 0 .45 0 1v14c0 .55.45 1 1 1h14c.55 0 1-.45 1-1V3c0-.28-.11-.53-.29-.71zM14 15H2V9c0-.55.45-1 1-1h10c.55 0 1 .45 1 1v6zM11 1H9v4h2V1z\" fill-rule=\"evenodd\"></path></svg></span><span class=\"bp4-button-text\">Save</span></button>.\n\n</div>" } }
                    } ],
                "active": true }
        ]
    }
};


interface FlexPanelState {
    displayEditor: boolean,
    model: Model | null,
    dash: Dash | null,
    serverConfigs: ServerConfig[] | undefined,
    isNew:boolean,
}
interface FlexPanelProps {
    queryEngine:QueryEngine, dashId:number, versionId?:number, editMode:boolean, setTitle:(txt:JSX.Element) => void
}

type WidgetType = "iframe"|"aeditor"|"atext"|"variables"|"aform"|ChartType;

/**
 * Note either a dashId alone is specified OR dashId+version, if a verison is specified it meants
 * that the user wants to READ-ONLY see an old verison, hence why !editPermitted. They could choose to restore it elsewhere.
 */
export default class FlexPanel extends Component<FlexPanelProps,FlexPanelState> {
    state: FlexPanelState = {
        displayEditor: false,
        model: null,
        dash: null,
        serverConfigs: undefined,
        isNew: false,
    } 
    static contextType = ThemeContext;
    context!: React.ContextType<typeof ThemeContext>;
    private layoutRef: RefObject<Layout> = createRef<Layout>();
    private isEditPermitted = () => this.props.editMode && this.props.versionId === undefined;
    
    changeName = (newName:string) => { // @ts-ignore
        if(!this.isEditPermitted()) {
            alert("You must be in edit mode to change dashboard names.");
            return false;
        } else if(!isAdmin(this.context)) {
            alert("You must be an admin to change dashboard names.");
        } else if (newName.length < 1) {
            alert("You must enter a valid name");
        } else {
            if(this.state.dash) {
                let dash = {...this.state.dash,name:newName};
                this.setState({dash});
            }
        }
    }

    loadDashAndServers = async (id: number, version:number | undefined) => {
        let model = undefined;
        const v = typeof version === 'number' ? version : -1; // careful as version can be 0
        try {
            let dash = await getDash(id, v);
            let isNew = false;
            if (dash.data) {
                model = Model.fromJson(dash.data);
            } else {
                model = Model.fromJson(defaultJson);
                isNew = true;
            }
            const header = <H1>
                    <EditableText className='dashTitle' maxLength={25} defaultValue={dash?.name} selectAllOnFocus={true} onConfirm={this.changeName}/>
                </H1>;
            this.props.setTitle(header);
            this.setState({ dash, model, isNew });
            document.title = dash.name + (v >= 0  ? " version:" + v : "");
        } catch(err:any) {
            if(err instanceof AxiosError && err.response) {
                let msg = err.response.status === 404 ? "Dashboard not found." : "Unrecognised Error";
                this.props.setTitle(<H1>{msg}</H1>);
                notyf.error("Could not open dashboard." + msg)
                console.error("Error response:");
                console.error(err.response.data);   
                console.error(err.response.status); 
                console.error(err.response.headers);
            }
        }
    };

    constructor(props:FlexPanelProps) {
    	super(props);
        this.layoutRef= React.createRef();
    }

    componentDidMount() {
        this.loadDashAndServers(this.props.dashId, this.props.versionId);
        fetchProcessServers((s) => this.setState({serverConfigs:s}));
    }

    factory(node:TabNode) {
        var component = node.getComponent() ?? "";
        const selected = this.isEditPermitted() && this.state.displayEditor && node.getId() === this.state.model?.getActiveTabset()?.getSelectedNode()?.getId();
        const clearSelected = () => this.setState({displayEditor:false});
        let setConfigSaver = (callback:() => any) => {
            node.setEventListener("save", (p:any) => {
                node.getConfig().dashstate = callback();
            });
        }
        // See renderer, serverConfigs is ALWAYS defined by now else widgets would never receive updated list.
        let serverConfigs = this.state.serverConfigs ? this.state.serverConfigs : [];
        const widgetProps = {queryEngine:this.props.queryEngine, serverConfigs, 
                clearSelected, selected, setConfigSaver, savedState:node.getConfig()?.dashstate };

        let r = <div></div>;
        if (component === "atext") {
            r = (<Suspense fallback={<div>Loading...</div>}><AText {...widgetProps} /></Suspense>);
        } else if (component === "counter") {
            r = (<Counter {...widgetProps} />);
        } else if (component === "iframe") {
            r = (<AIFrame {...widgetProps} />);
        } else if (component === "aeditor") {
            r = (<AEditor {...widgetProps} format="Text" />);
        } else if (component === "aform") {
            r = (<AForm {...widgetProps} />);
        } else if (component === "variables") {
            r = (<AVariables {...widgetProps} />);
        } else {
            const chartType = component as ChartType;
            r = <MyUpdatingChart {...widgetProps} chartType={chartType} tabNode={node} />;
        }
        return <span onClick={() => { this.setState({displayEditor:true}); this.state.model?.doAction(Actions.selectTab(node.getId())) }} 
                        id={"widget-"+node.getId().replaceAll("#","")} className={"widget widget-"+node.getName()}>{r}</span>;
    }

    handleAddWidget = (name: WidgetType) => {
        console.log('trying to add tab');
        var jsonChild = { component: name, name: name, config: {} };
        let a:TabNode[] = [];
        let m = this.state?.model;
        this.setState({isNew:false});
        if(m != null) {
            m.visitNodes((nd) => { if(nd.getType()==="tab") { a.push(nd as TabNode); } })
            if(a.length === 1 && a[0].getName()==="Welcome") {
                m.doAction(Actions.deleteTab(a[0].getId()));
            }
            if(m.getRoot().getChildren()[0].getChildren().length === 0) {
                this.layoutRef.current!.addTabToActiveTabSet(jsonChild);
            } else {
                this.layoutRef.current!.addTabWithDragAndDrop("Click to position this panel<br>to your desired location", jsonChild);
                topNotyf('Click to drop the panel in that location.');
            }
        }
    }


    render() {
        const { model } = this.state;
        model?.doAction(Actions.updateModelAttributes({ tabEnableClose:this.isEditPermitted() }));
        let sc = this.state.serverConfigs;
        let tabCount = 0;
        model?.visitNodes(n => tabCount += (n.getType()==="tab" ? 1 : 0));
        const isNewOrEmpty = tabCount === 0 || this.state.isNew;
        
        const topMargin = isBorderless() ? '0px' : this.isEditPermitted() ? '70px' : '33px';
        const rightMargin = (!isBorderless() && (this.isEditPermitted() && this.state.displayEditor)) ? '600px' : '';

        return (
            <div className={"FlexPanel dashname-"+this.state.dash?.name.replaceAll(" ","-")} id={"dashid-"+this.props.dashId}>
            {this.isEditPermitted() && <TopMenu addWidget={this.handleAddWidget} saveDashboard={this.saveDashboard} highlightAddButtons={isNewOrEmpty}  />}
            
            {sc?.length === 0 && 
                    <NonIdealState icon="error" title="No Connections found" 
                        action={<div>Try  <Link to="/connections"><Button intent="primary">Adding Connections</Button></Link></div>} />}

            {(sc && sc.length > 0) && 
            <FlexContainer topMargin={topMargin} rightMargin={rightMargin} id="dashScreenshotContainer" >
                {model && <Layout ref={this.layoutRef} model={model} factory={this.factory.bind(this)}
                                onAction={this.handleAction}  
                                onRenderTabSet={this.onRenderTabSet} 
                                font={{size:"16px"}}
                                //onModelChange={() => this.setState({modelChangesSaved:false})} Could listen to detect unsaved changes
                />}
            </FlexContainer>}
            </div>);
    }

    handleAction = (action: Action): (Action | undefined) => {
        // The order is Action -> Factory -> Render
        // But because setState is async, the selectedId only updates after the render which is useless
        if (action.type === "FlexLayout_SelectTab") {
            console.log("FlexLayout_SelectTab:", action.data['tabNode']);
            this.setState({ displayEditor: true });
        } else if(action.type === "FlexLayout_AddNode") { 
            if(action.data.toNode) {
                this.setState({ displayEditor: true });
                this.state?.model?.doAction(Actions.selectTab(action.data.toNode));
            }
        }
        return action;
    }


    onRenderTabSet = (tabSetNode: TabSetNode | BorderNode, renderValues: { headerContent?: ReactNode; buttons: ReactNode[]; }) => {
        const node = tabSetNode.getSelectedNode()
        if (node && this.isEditPermitted()) {
            const id = 'tab_settings_popover_' + tabSetNode.getId();
            renderValues.buttons.push(<button className="dupeicon" key={id} onClick={() => { 
                this.state.model!.toJson(); // fake save, to force models to put state into JSON
                let n = this.state.model?.getNodeById(tabSetNode.getId());
                if(n) {
                    let tn = n.getChildren()[0] as TabNode;
                    if(tn) {
                        var jsonChild = { component: tn.getComponent(), name: tn.getName() + " copy", config:tn.getConfig() };
                        this.layoutRef.current!.addTabWithDragAndDrop("Click to position this panel<br>to your desired location", jsonChild);
                    }
                }
            }}><Icon icon="duplicate" size={14} color="#888" className="flexlayout__tab_toolbar_button flexlayout__tab_toolbar_button-float" title="Copy Chart"/></button>)
        }
    }

    saveDashboard = () => {
        console.debug("saving FlexPanel layout");
        if (this.state.dash) {
            const url = window.location.href;
            const p = url.indexOf("?");
            const params = p !== -1 ? url.substring(p) : "";
            let d: Dash = { ...this.state.dash, ...{ data: this.state.model!.toJson(), defaultParams:params } };
            
            saveDash(d).then(r => {
                if(typeof r.data.data === 'string') {
                    const sz = (r.data.data as string).length;
                    if(sz > 500*1024) { // roughly 5000*80 lines of text. Warn as it makes versioning and database grow in size.
                        notyf.success({type:"info", message:"Warning: Dashboard is large. <br />Size = " + sz});
                    }
                }
                notyf.success("Saved successfully.");
                if(this.state.dash !== null) {
                    let dash = {...this.state.dash,version:this.state.dash.version+1};
                    this.setState({dash})
                }
            }).catch((e) => {
                console.error(e);
                notyf.error("Save Failed.");
            });

            // After saving the critical data. Try to get a screenshot for the thumbnail.
            let el = document.getElementById("dashScreenshotContainer") || document.body;
            el.style.width = (16*(el.clientHeight/9.0)) + "px"; // Setting width and height messed up the layout
            let footEl = document.getElementById("dashfooter");
            let origDisplay:string|null = null;
            if(footEl) {
                origDisplay = footEl.style.zIndex;
                footEl.style.zIndex = '-2000';
            }
            delay(500).then(() => {  notyf.success({type:"info", message:"Taking screenshot"});})
            delay(1500).then(() => { // Delay needed to let layout "adjust"
                // Without background, the screenshot had left/right edges.
                html2canvas(el, {scale:0.5, backgroundColor:this.context.theme === "dark" ? "#444" : "#CCC"}).then((canvas) => { 
                    axios.post<Dash>(SERVER + "/dashboard/" + d.id + "/img", canvas.toDataURL(),  {headers:{"Content-Type":"text/plain"}});
                }).catch(e => {
                    notyf.error("Screenshot Failed.");
                }).finally(() => {    
                    el.style.width = '';
                    el.style.filter = '';
                    if(footEl && origDisplay !== null) {
                        footEl.style.zIndex = origDisplay;
                    }
                });
            });
            // localStorage.setItem("bobby", jsonStr);
        }
    }

}

function delay(ms:number) {
    return new Promise((resolve) => {
       setTimeout(resolve, ms);
    })
 }
 

interface TopMenuProps {
    addWidget: (name: WidgetType) => void;
    saveDashboard: () => void;
    highlightAddButtons: boolean,
}




function TopMenu(props:TopMenuProps) {
    const { addWidget, highlightAddButtons } = props;

    const wrapTip = (children?: React.ReactNode) => {
        return <Popover2 defaultIsOpen placement="bottom" canEscapeKeyClose={false}
                    content={<NonIdealState className="firstStepsNonIdeal" title="Add Component" description="This is the component bar. Click on a button to add that component to the dashboard" />}>
            {children}
        </Popover2>
    }

    const s = true;
    const cts:ChartType[] = ["bar", "stack", "bar_horizontal", "stack_horizontal", "line", "area", "pie"];
    const makeBut = (c:ChartType, txt:string|null = null, intent?:Intent) => <Button  key={c} small={true} onClick={() => addWidget(c)} icon={getChartIcon(c)} intent={intent}>{txt}</Button>;
    const makeMenu = (c:ChartType, txt:string) => <MenuItem onClick={() => addWidget(c)} key={c} icon={getChartIcon(c)} text={txt}></MenuItem>;
    return <div className="TopMenu">
        <ButtonGroup onMouseEnter={()=>{}}  >
            <div  key={"c"} style={{textAlign:"center", verticalAlign:"middle", height:"30px", lineHeight:"30px"}}>Add Component:</div>
            {highlightAddButtons ? wrapTip(makeBut("grid","Table","success")) : makeBut("grid","Table")}
            {makeBut("timeseries","Time Series", highlightAddButtons ? "success" : "none")}
            {cts.map(c => makeBut(c))}
            <Popover content={<Menu>
                    {makeMenu("bubble","Bubble")}
                    {makeMenu("radar","Radar")}
                    {makeMenu("candle","Candlestick")}
                    {makeMenu("calendar","Calendar")}
                    {makeMenu("boxplot","Boxplot")}
                    {makeMenu("sunburst","Sunburst")}
                    {makeMenu("tree","Tree")}
                    {makeMenu("3dsurface","Surface")}
                    {makeMenu("3dbar","3D Bar Chart")}
                    {makeMenu("metrics","Metrics Panels")}
                </Menu>
                }  position={Position.BOTTOM} minimal>
                <Button icon="series-add" key="other" rightIcon="caret-down" >More Charts</Button>
            </Popover>

            <Popover content={<Menu>
                    <MenuItem key="iframe"  onClick={() => addWidget("iframe")} icon="globe" text="Website" />
                    <MenuItem key="aeditor" onClick={() => addWidget("aeditor")} icon="annotation" text="Editor" />
                    <MenuItem key="atext"   onClick={() => addWidget("atext")} icon={<DiWebplatform />} text="HTML" />
                    
                    <MenuItem key="variables"  onClick={() => addWidget("variables")} icon={<VscSymbolVariable />} text="Debug" />
                </Menu>
                }  position={Position.BOTTOM} minimal>
                <Button key="other" rightIcon="caret-down" >Other</Button>
            </Popover>

            <Button small={s} icon="form" key="aform" onClick={() => addWidget("aform")}>User Form</Button>
            
            
            <Button small={s} key="save"  icon="floppy-disk" onClick={() => { props.saveDashboard();}} style={{marginLeft:"60px"}} intent="primary">Save</Button>
        </ButtonGroup>
    </div>;
}

