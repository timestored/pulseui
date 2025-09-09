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
 
import React, { Component, createRef, ReactNode, RefObject, Suspense } from 'react';
import { Action, TabNode, Layout, Model, Actions, TabSetNode, BorderNode, IJsonModel } from "flexlayout-react";
import { Button, ButtonGroup, EditableText, H1, Icon, Intent, MaybeElement, Menu, MenuItem, NonIdealState, Popover, Position } from "@blueprintjs/core";
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
import { ServerConfig, useServerConfigs } from './ConnectionsPage';
import { Link } from 'react-router-dom';
import AVariables from './AVariables';
import { isAdmin } from './../context';
import 'flexlayout-react/style/light.css';
import '../dark.css';
import AEditor from './AEditor';
import html2canvas from 'html2canvas';
import { Popover2 } from '@blueprintjs/popover2';
import { debounce, get } from 'lodash-es';
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
    isNew:boolean,
    hasUnsavedChanges: boolean,
}
interface FlexPanelProps {
    queryEngine:QueryEngine, dashId:number, versionId?:number, editMode:boolean, setTitle:(txt:JSX.Element) => void
}

type WidgetType = "iframe"|"aeditor"|"atext"|"variables"|"aform"|ChartType;


export default function FlexPanel(props:FlexPanelProps) {
    const [serverConfigs] = useServerConfigs();
            
    return serverConfigs.length === 0 ?
            <NonIdealState icon="error" title="No Connections found" 
                action={<div>Try  <Link to="/connections"><Button intent="primary">Adding Connections</Button></Link></div>} />
                : <InnerFlexPanel serverConfigs={serverConfigs} {...props} />;
}

/**
 * Note either a dashId alone is specified OR dashId+version, if a verison is specified it meants
 * that the user wants to READ-ONLY see an old verison, hence why !editPermitted. They could choose to restore it elsewhere.
 */
class InnerFlexPanel extends Component<FlexPanelProps & {serverConfigs:ServerConfig[]},FlexPanelState> {
    state: FlexPanelState = {
        displayEditor: false,
        model: null,
        dash: null,
        isNew: false,
        hasUnsavedChanges: false,
    } 
    static contextType = ThemeContext;
    context!: React.ContextType<typeof ThemeContext>;
    private layoutRef: RefObject<Layout> = createRef<Layout>();
    private autoSaveTimer: NodeJS.Timeout | null = null;
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
                const dash = {...this.state.dash,name:newName};
                this.setState({dash});
            }
        }
    }

    loadDashAndServers = async (id: number, version:number | undefined) => {
        let model = undefined;
        const v = typeof version === 'number' ? version : -1; // careful as version can be 0
        try {
            const dash = await getDash(id, v);
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
                const msg = err.response.status === 404 ? "Dashboard not found." : "Unrecognised Error";
                this.props.setTitle(<H1>{msg}</H1>);
                notyf.error("Could not open dashboard." + msg)
                console.error("Error response:");
                console.error(err.response.data);   
                console.error(err.response.status); 
                console.error(err.response.headers);
            }
        }
    };

    constructor(props:FlexPanelProps & {serverConfigs:ServerConfig[]}) {
        super(props);
        this.layoutRef= React.createRef();
    }

    componentDidMount() {
        this.loadDashAndServers(this.props.dashId, this.props.versionId);
        this.checkForUnsavedChanges();
    }

    componentWillUnmount() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
    }

    private getAutoSaveKey = () => `dash-autosave-${this.props.dashId}`;

    private checkForUnsavedChanges = () => {
        const autoSaveKey = this.getAutoSaveKey();
        const savedData = localStorage.getItem(autoSaveKey);
        if (savedData && this.isEditPermitted()) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.timestamp && parsed.data) {
                    const timeDiff = Date.now() - parsed.timestamp;
                    // Only restore if saved within last 24 hours
                    if (timeDiff < 24 * 60 * 60 * 1000) {
                        notyf.success({
                            type: "info",
                            message: "Found unsaved changes from your previous session. Click 'Restore' to recover them.",
                            duration: 10000
                        });
                        this.setState({ hasUnsavedChanges: true });
                    }
                }
            } catch (e) {
                console.warn("Failed to parse auto-save data", e);
                localStorage.removeItem(autoSaveKey);
            }
        }
    };

    private autoSaveToLocal = () => {
        if (!this.isEditPermitted() || !this.state.model || !this.state.dash) {
            return;
        }

        const autoSaveKey = this.getAutoSaveKey();
        const saveData = {
            timestamp: Date.now(),
            data: this.state.model.toJson(),
            dashData: this.state.dash
        };

        try {
            localStorage.setItem(autoSaveKey, JSON.stringify(saveData));
            this.setState({ hasUnsavedChanges: true });
        } catch (e) {
            console.warn("Failed to auto-save to localStorage", e);
        }
    };

    private scheduleAutoSave = () => {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        if (this.isEditPermitted()) {
            this.autoSaveTimer = setTimeout(() => {
                this.autoSaveToLocal();
            }, 5000); // Auto-save every 5 seconds
        }
    };

    private clearUnsavedChanges = () => {
        const autoSaveKey = this.getAutoSaveKey();
        localStorage.removeItem(autoSaveKey);
        this.setState({ hasUnsavedChanges: false });
    };

    private restoreFromAutoSave = () => {
        const autoSaveKey = this.getAutoSaveKey();
        const savedData = localStorage.getItem(autoSaveKey);
        
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.data) {
                    const model = Model.fromJson(parsed.data);
                    this.setState({ model, hasUnsavedChanges: true });
                    notyf.success("Restored from auto-save");
                }
            } catch (e) {
                console.warn("Failed to restore from auto-save", e);
                notyf.error("Failed to restore auto-saved changes");
            }
        }
    };

    factory(node:TabNode) {
        const component = node.getComponent() ?? "";
        const selected = this.isEditPermitted() && this.state.displayEditor && node.getId() === this.state.model?.getActiveTabset()?.getSelectedNode()?.getId();
        const clearSelected = () => this.setState({displayEditor:false});
        const setConfigSaver = (callback:() => any) => {
            node.setEventListener("save", (p:any) => {
                node.getConfig().dashstate = callback();
            });
        }
        // See renderer, serverConfigs is ALWAYS defined by now else widgets would never receive updated list.
        const widgetProps = {queryEngine:this.props.queryEngine, serverConfigs:this.props.serverConfigs, 
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
        return <span 
                /**  
                   See: https://github.com/caplin/FlexLayout/issues/303 
                        https://github.com/timestored/pulse-client/issues/91 
                   Beforce changing this, particularly to onCLick as it's tricky.
                */
                onMouseDown={(e)=>{ 
                    this.setState({displayEditor:true}); 
                    this.state.model?.doAction(Actions.selectTab(node.getId()));
                }} 
                id={"widget-"+node.getId().replaceAll("#","")} className={"widget widget-"+node.getName()}>{r}</span>;
    }

    handleAddWidget = (name: WidgetType) => {
        console.log('trying to add tab');
        const jsonChild = { component: name, name: name, config: {} };
        const a:TabNode[] = [];
        const m = this.state?.model;
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
                topNotyf('Move the mouse<br /> to drop the panel in that location.');
            }
        }
    }


    render() {
        const { model } = this.state;
        model?.doAction(Actions.updateModelAttributes({ tabEnableClose:this.isEditPermitted() }));
        let tabCount = 0;
        model?.visitNodes(n => tabCount += (n.getType()==="tab" ? 1 : 0));
        const isNewOrEmpty = tabCount === 0 || this.state.isNew;
        
        const topMargin = isBorderless() ? '0px' : this.isEditPermitted() ? '70px' : '33px';
        const rightMargin = (!isBorderless() && (this.isEditPermitted() && this.state.displayEditor)) ? '600px' : '';

        return (
            <div className={"FlexPanel dashname-"+this.state.dash?.name.replaceAll(" ","-")} id={"dashid-"+this.props.dashId}>
            {this.isEditPermitted() && <TopMenu addWidget={this.handleAddWidget} saveDashboard={this.saveDashboard} highlightAddButtons={isNewOrEmpty} hasUnsavedChanges={this.state.hasUnsavedChanges} restoreFromAutoSave={this.restoreFromAutoSave} />}

            {(this.props.serverConfigs.length > 0) && 
            <FlexContainer topMargin={topMargin} rightMargin={rightMargin} id="dashScreenshotContainer" >
                {model && <Layout ref={this.layoutRef} model={model} factory={this.factory.bind(this)}
                                onAction={this.handleAction}  
                                onRenderTabSet={this.onRenderTabSet} 
                                font={{size:"16px"}}
                                onModelChange={() => {
                                    if (this.isEditPermitted()) {
                                        this.scheduleAutoSave();
                                    }
                                }}
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
                const n = this.state.model?.getNodeById(tabSetNode.getId());
                if(n) {
                    const tn = n.getChildren()[0] as TabNode;
                    if(tn) {
                        const jsonChild = { component: tn.getComponent(), name: tn.getName() + " copy", config:tn.getConfig() };
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
            const d: Dash = { ...this.state.dash, ...{ data: this.state.model!.toJson(), defaultParams:params } };
            
            saveDash(d).then(r => {
                this.clearUnsavedChanges(); // Clear unsaved changes after successful save
                if(typeof r.data.data === 'string') {
                    const sz = (r.data.data as string).length;
                    if(sz > 500*1024) { // roughly 5000*80 lines of text. Warn as it makes versioning and database grow in size.
                        notyf.success({type:"info", message:"Warning: Dashboard is large. <br />Size = " + sz});
                    }
                }
                notyf.success("Saved successfully.");
                if(this.state.dash !== null) {
                    const dash = {...this.state.dash,version:this.state.dash.version+1};
                    this.setState({dash})
                }
            }).catch((e) => {
                if(get(e,"response.status",0) === 405) {
                    notyf.error("Save Failed as your dashboard is out of sync. Someone else may have made modifications.");
                } else {
                    console.error("Save failed", e);
                    notyf.error("Save Failed.");
                }
            });

            // After saving the critical data. Try to get a screenshot for the thumbnail.
            const el = document.getElementById("dashScreenshotContainer") || document.body;
            el.style.width = (16*(el.clientHeight/9.0)) + "px"; // Setting width and height messed up the layout
            const footEl = document.getElementById("dashfooter");
            let origDisplay:string|null = null;
            if(footEl) {
                origDisplay = footEl.style.zIndex;
                footEl.style.zIndex = '-2000';
            }
            delay(500).then(() => {  notyf.success({type:"info", message:"Saving thumbnail"});})
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
    hasUnsavedChanges: boolean;
    restoreFromAutoSave: () => void;
}




function TopMenu(props:TopMenuProps) {
    const { addWidget, highlightAddButtons, hasUnsavedChanges, restoreFromAutoSave } = props;

    const wrapTip = (children?: React.ReactNode) => {
        return <Popover2 defaultIsOpen placement="bottom" canEscapeKeyClose={false}
                    content={<NonIdealState className="firstStepsNonIdeal" title="Add Component" description="This is the component bar. Click on a button to add that component to the dashboard" />}>
            {children}
        </Popover2>
    }

    const s = true;

    // Using debounce onMouseDown and onCLick to allow either clicking the button OR dragging the button to place a component.
    // Debounce needed to prevent 2 popups and to make it work. Without it activates the drag but click happened so nothing drops.
    // @TODO There is one bug where expanding "More Charts" and dragging, leaves the expanded menu still open.
    const MILLIS = 200;
    const cts:ChartType[] = ["bar", "stack", "bar_horizontal", "stack_horizontal", "line", "area", "pie"];
    const makeBut = (c:ChartType, txt:string|null = null, intent?:Intent) => {
        const addCt = debounce(() => addWidget(c),MILLIS);
        return <Button  key={c} small={true} onMouseDown={addCt} onClick={()=>addCt.flush()} icon={getChartIcon(c)} intent={intent}>{txt}</Button>};
    const makeMenu = (icon: MaybeElement, txt:string, f:()=>void) => {
        const addCt = debounce(f,MILLIS);
        return <MenuItem onMouseDown={addCt} onClick={()=>addCt.flush()} key={txt} icon={icon} text={txt}></MenuItem> };
    const makeCMenu = (c:ChartType, txt:string) => makeMenu(getChartIcon(c), txt, () => addWidget(c));
    const addForm = debounce(() => addWidget("aform"),MILLIS);
    const addDebug = debounce(() => addWidget("variables"),MILLIS);

    return <div className="TopMenu">
        <ButtonGroup onMouseEnter={()=>{}}  >
            <div  key={"c"} style={{textAlign:"center", verticalAlign:"middle", height:"30px", lineHeight:"30px"}}>Add Component:</div>
            {highlightAddButtons ? wrapTip(makeBut("grid","Table","success")) : makeBut("grid","Table")}
            {makeBut("timeseries","Time Series", highlightAddButtons ? "success" : "none")}
            {cts.map(c => makeBut(c))}
            <Popover content={<Menu>
                    {makeCMenu("bubble","Bubble")}
                    {makeCMenu("radar","Radar")}
                    {makeCMenu("candle","Candlestick")}
                    {makeCMenu("calendar","Calendar")}
                    {makeCMenu("boxplot","Boxplot")}
                    {makeCMenu("sunburst","Sunburst")}
                    {makeCMenu("tree","Tree")}
                    {makeCMenu("3dsurface","Surface")}
                    {makeCMenu("3dbar","3D Bar Chart")}
                    {makeCMenu("metrics","Metrics Panels")}
                </Menu>
                }  position={Position.BOTTOM} minimal>
                <Button icon="series-add" key="other" rightIcon="caret-down" >More Charts</Button>
            </Popover>

            <Popover content={<Menu>
                    {makeMenu("globe", "Website",() => addWidget("iframe"))}
                    {/* {makeMenu("annotation", "Editor",() => addWidget("aeditor"))} */}
                    {makeMenu(<DiWebplatform />, "HTML",() => addWidget("atext"))}
                    {/* {makeMenu(<VscSymbolVariable />, "Debug",() => addWidget("variables"))} */}
                </Menu>
                }  position={Position.BOTTOM} minimal>
                <Button key="other" rightIcon="caret-down" >Other</Button>
            </Popover>

            <Button small={s} icon="form" key="aform" onClick={()=>addForm.flush()} onMouseDown={addForm}>User Form</Button>
            <Button small={s} icon={<VscSymbolVariable />} key="variables" onClick={()=>addDebug.flush()} onMouseDown={addDebug}>Debug</Button>
            
            {hasUnsavedChanges && 
                <Button small={s} key="restore" icon="history" onClick={restoreFromAutoSave} style={{marginLeft:"20px"}} intent="warning">Restore Auto-saved</Button>
            }
            
            <Button small={s} key="save"  icon="floppy-disk" onClick={() => { props.saveDashboard();}} style={{marginLeft: hasUnsavedChanges ? "10px" : "60px"}} intent="primary">
                Save {hasUnsavedChanges && <span style={{marginLeft:"5px", fontSize:"10px"}}>●</span>}
            </Button>
        </ButtonGroup>
    </div>;
    
}

