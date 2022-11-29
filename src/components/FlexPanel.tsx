import React, { Component, createRef, ReactNode, RefObject } from 'react';
import { Action, TabNode, Layout, Model, Actions, TabSetNode, BorderNode, IJsonModel } from "flexlayout-react";
import { Button, ButtonGroup, EditableText, H1, Icon, Menu, MenuItem, NonIdealState, Popover, Position } from "@blueprintjs/core";
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

import { FlexContainer } from '../styledComponents';
import { fetchProcessServers, ServerConfig } from './ConnectionsPage';
import { Link } from 'react-router-dom';
import AVariables from './AVariables';
import AText from './AText';
import { isAdmin } from './../context';
import 'flexlayout-react/style/light.css';
import '../dark.css';
import AEditor from './AEditor';
import html2canvas from 'html2canvas';

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
    selectedId: string,
    model: Model | null,
    dash: Dash | null,
    serverConfigs: ServerConfig[] | undefined,
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
        selectedId: "",
        model: null,
        dash: null,
        serverConfigs: undefined,
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
            if (dash.data) {
                model = Model.fromJson(dash.data);
            } else {
                model = Model.fromJson(defaultJson);
            }
            const header = <H1>
                    <EditableText className='dashTitle' maxLength={25} defaultValue={dash?.name} selectAllOnFocus={true} onConfirm={this.changeName}/>
                </H1>;
            this.props.setTitle(header);
            this.setState({ dash, model });
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
        const selected = this.isEditPermitted() && this.state.selectedId === node.getId();
        const clearSelected = () => this.setState({selectedId:""});
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
            r = (<AText {...widgetProps} />);
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
        return <span onClick={() => this.setState({selectedId:node.getId()})} id={"widget-"+node.getId().replaceAll("#","")} className={"widget widget-"+node.getName()}>{r}</span>;
    }

    handleAddWidget = (name: WidgetType) => {
        console.log('trying to add tab');
        var jsonChild = { component: name, name: name, config: {} };
        let a:TabNode[] = [];
        let m = this.state?.model;
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

        return (
            <div className={"FlexPanel dashname-"+this.state.dash?.name.replaceAll(" ","-")} id={"dashid-"+this.props.dashId}>
            {this.isEditPermitted() && <TopMenu addWidget={this.handleAddWidget} saveDashboard={this.saveDashboard} />}
            
            {sc?.length === 0 && 
                    <NonIdealState icon="error" title="No Connections found" 
                        action={<div>Try  <Link to="/connections"><Button intent="primary">Adding Connections</Button></Link></div>} />}

            {(sc && sc.length > 0) && 
            <FlexContainer isSelected={this.isEditPermitted() && this.state.selectedId} id="dashScreenshotContainer" >
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
        if (action.type === "FlexLayout_SelectTab") {
            console.log("FlexLayout_SelectTab:", action.data['tabNode']);
            let nodeId: string = action.data['tabNode'];
            this.setState({ selectedId: nodeId });
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
                    console.log(tabSetNode.getId());
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
                notyf.success("Saved successfully.");
                if(this.state.dash !== null) {
                    let dash = {...this.state.dash,version:this.state.dash.version+1};
                    this.setState({dash})
                }
            }).catch((e) => {
                notyf.error("Save Failed.");
            });

            // After saving the critical data. Try to get a screenshot for the thumbnail.
            let el = document.getElementById("dashScreenshotContainer") || document.body;
            el.style.width = (16*(el.clientHeight/9.0)) + "px"; // Setting width and height messed up the layout
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
}




function TopMenu(props:TopMenuProps) {
    const { addWidget } = props;
    const s = true;
    const cts:ChartType[] = ["bar", "stack", "bar_horizontal", "stack_horizontal", "line", "area", "pie"];
    const makeBut = (c:ChartType, txt:string|null = null) => <Button  key={c} small={true} onClick={() => addWidget(c)} icon={getChartIcon(c)}>{txt}</Button>;
    const makeMenu = (c:ChartType, txt:string) => <MenuItem onClick={() => addWidget(c)} key={c} icon={getChartIcon(c)} text={txt}></MenuItem>;
    return <div className="TopMenu">
        <ButtonGroup onMouseEnter={()=>{}} >
            {makeBut("grid","Table")}
            {makeBut("timeseries","Time Series")}
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
                </Menu>
                }  position={Position.BOTTOM} minimal>
                <Button icon="series-add" key="other" rightIcon="caret-down" >Other Charts</Button>
            </Popover>

            <Button small={s} icon="form" key="aform" onClick={() => addWidget("aform")}>User Form</Button>
            
            <Button small={s} key="iframe"  onClick={() => addWidget("iframe")} icon="globe" text="Website" />
            <Button small={s} key="aeditor" onClick={() => addWidget("aeditor")} icon="annotation" text="Editor" />
            <Button small={s} key="atext"   onClick={() => addWidget("atext")} icon={<DiWebplatform />} text="HTML" />
            
            <Button small={s} key="variables"  onClick={() => addWidget("variables")} icon={<VscSymbolVariable />} text="Debug" />
            
            <Button small={s} key="save"  icon="floppy-disk" onClick={() => { props.saveDashboard();}} intent="primary">Save</Button>
        </ButtonGroup>
    </div>;
}

