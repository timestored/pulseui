import React, { Component, createRef, ReactNode, RefObject } from 'react';
import { Action, TabNode, Layout, Model, Actions, TabSetNode, BorderNode, IJsonModel } from "flexlayout-react";
import { Button, EditableText, H1, Menu, MenuDivider, MenuItem, NonIdealState, Popover, Position } from "@blueprintjs/core";
import Counter from './Counter';
import AIFrame from './AIFrame';
import { notyf, ThemeContext } from '../context';
import { ChartType, MyUpdatingChart } from './ChartFactory';
import { AxiosError } from "axios";
import { Dash, getDash, saveDash } from "./DashPage";
import QueryEngine from "../engine/queryEngine";
import { VscDebug, VscSymbolVariable } from "react-icons/vsc";
import { DiWebplatform } from "react-icons/di";
import AForm from './AForm';

import { FlexContainer } from '../styledComponents';
import { fetchProcessServers, ServerConfig } from './ConnectionsPage';
import { Link } from 'react-router-dom';
import AVariables from './AVariables';
import AText from './AText';
import { isAdmin } from './../context';

const defaultJson : IJsonModel = {
    global: {tabEnableClose:false, tabEnableFloat:true, tabSetAutoSelectTab:true, 
        // This option is essential. Because we use a listener pattern
        // If the tabs are only created after a query, they do not contain that queries result.
        tabEnableRenderOnDemand:false, 
    },
    borders: [],
    // layout: { type: "row", weight: 100,  children:  [] }
    "layout": {
        "type": "row",
        "id": "#481b8859-f414-4607-9872-130e1c4e7aa5",
        "children": [ { "type": "tabset", "id": "#8c7aa838-3d1e-4feb-af09-a32b41446ebc",
                "children": [
                    { "type": "tab", "id": "#07bd8ea1-7e79-4d63-b507-18d1a7626c12", "name": "Welcome", "component": "atext",
                        "config": { "dashstate": { "html": "<div style='margin:5px 40px;'>\n<h1>Welcome</h1>\n<p>This is a new empty dashboard.</p>\n<p>If you are an admin, you can click the <button type=\"button\" disabled=\"\" class=\"bp4-button bp4-intent-primary\"><span icon=\"edit\" aria-hidden=\"true\" tabindex=\"-1\" class=\"bp4-icon bp4-icon-edit\"><svg data-icon=\"edit\" width=\"16\" height=\"16\" viewBox=\"0 0 16 16\"><path d=\"M3.25 10.26l2.47 2.47 6.69-6.69-2.46-2.48-6.7 6.7zM.99 14.99l3.86-1.39-2.46-2.44-1.4 3.83zm12.25-14c-.48 0-.92.2-1.24.51l-1.44 1.44 2.47 2.47 1.44-1.44c.32-.32.51-.75.51-1.24.01-.95-.77-1.74-1.74-1.74z\" fill-rule=\"evenodd\"></path></svg></span><span class=\"bp4-button-text\">edit</span></button> button on the top right<br /> this will display a toolbar row that allows you to add components to your dashboard. <br />You can double-click on the dashboard title or on the tab titles to rename either. </p>\n\n<p>Click the small <span style=\"width:50px; background:#EEEEEE\">grid <svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" style=\"width: 1em; height: 1em;  align-items: center;\"><path fill=\"none\" d=\"M0 0h24v24H0z\"></path><path stroke=\"var(--color-icon)\" fill=\"var(--color-icon)\" d=\"M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z\"></path></svg></span> on the tab header of this component to delete it.</p>\n\n<p>Once you have made any changes you want to save and publish for others. Click <button type=\"button\" disabled=\"\" class=\"bp4-button bp4-intent-primary\"><span icon=\"floppy-disk\" aria-hidden=\"true\" tabindex=\"-1\" class=\"bp4-icon bp4-icon-floppy-disk\"><svg data-icon=\"floppy-disk\" width=\"16\" height=\"16\" viewBox=\"0 0 16 16\"><path d=\"M15.71 2.29l-2-2A.997.997 0 0013 0h-1v6H4V0H1C.45 0 0 .45 0 1v14c0 .55.45 1 1 1h14c.55 0 1-.45 1-1V3c0-.28-.11-.53-.29-.71zM14 15H2V9c0-.55.45-1 1-1h10c.55 0 1 .45 1 1v6zM11 1H9v4h2V1z\" fill-rule=\"evenodd\"></path></svg></span><span class=\"bp4-button-text\">Save</span></button>.\n\n</div>" } }
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
        if(!isAdmin(this.context)) {
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
                    <EditableText maxLength={25} defaultValue={dash?.name} selectAllOnFocus={true} disabled={!this.isEditPermitted()} onConfirm={this.changeName}/>
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
            node.setEventListener("save", (p) => {
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
        } else if (component === "aform") {
            r = (<AForm {...widgetProps} />);
        } else if (component === "variables") {
            r = (<AVariables {...widgetProps} />);
        } else {
            const chartType = ChartType[component as keyof typeof ChartType];
            r = <MyUpdatingChart {...widgetProps} chartType={chartType} tabNode={node} />;
        }
        return <span onClick={() => this.setState({selectedId:node.getId()})}>{r}</span>;
    }

    handleAddWidget = (name: string) => {
        console.log('trying to add tab');
        var jsonChild = { component: name, name: name, config: {} };
        if(this.state?.model?.getRoot().getChildren()[0].getChildren().length === 0) {
            this.layoutRef.current!.addTabToActiveTabSet(jsonChild);
        } else {
            this.layoutRef.current!.addTabWithDragAndDrop("Drag this panel<br>to your desired location", jsonChild);
        }
    }

    render() {
        const { model } = this.state;
        require("flexlayout-react/style/" + (this.context.theme === "dark" ? "dark" : "light") + ".css");
        model?.doAction(Actions.updateModelAttributes({ tabEnableClose:this.isEditPermitted() }));
        let sc = this.state.serverConfigs;

        return (
            <div>
            {this.isEditPermitted() && <TopMenu addWidget={this.handleAddWidget} saveDashboard={this.saveDashboard} />}
            
            {sc?.length === 0 && 
                    <NonIdealState icon="error" title="No Connections found" 
                        action={<div>Try  <Link to="/connections"><Button intent="primary">Adding Connections</Button></Link></div>} />}

            {(sc && sc.length > 0) && 
            <FlexContainer isSelected={this.isEditPermitted() && this.state.selectedId} >
                {model && <Layout ref={this.layoutRef} model={model} factory={this.factory.bind(this)}
                                onAction={this.handleAction}  
                                onRenderTabSet={this.onRenderTabSet} 
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
            renderValues.buttons.push(<Button key={id} icon="duplicate" onClick={() => { 
                this.state.model!.toJson(); // fake save, to force models to put state into JSON
                let n = this.state.model?.getNodeById(tabSetNode.getId());
                if(n) {
                    console.log(tabSetNode.getId());
                    let tn = n.getChildren()[0] as TabNode;
                    if(tn) {
                        var jsonChild = { component: tn.getComponent(), name: tn.getName() + " copy", config:tn.getConfig() };
                        this.layoutRef.current!.addTabWithDragAndDropIndirect("Drag this panel<br>to your desired location", jsonChild);
                    }
                }
            }}></Button>)
        }
    }

    saveDashboard = () => {
        console.debug("saving FlexPanel layout");
        if (this.state.dash) {
            let d: Dash = { ...this.state.dash, ...{ data: this.state.model!.toJson() } };
            saveDash(d).then(r => {
                    notyf.success("Saved successfully.");
                    if(this.state.dash !== null) {
                        let dash = {...this.state.dash,version:this.state.dash.version+1};
                        this.setState({dash})
                    }
                }).catch((e) => {
                    notyf.error("Save Failed.");
                });
            // localStorage.setItem("bobby", jsonStr);
        }
    }

}

interface TopMenuProps {
    addWidget: (name: string) => void;
    saveDashboard: () => void;
}


function TopMenu(props:TopMenuProps) {
    const { addWidget } = props;

    return (

<div className="TopMenu">
    <Button onClick={() => addWidget("grid")} icon="th">Table</Button>

    <Popover content={<Menu>
            <MenuItem onClick={() => addWidget("timeseries")} icon="series-add" text="Time Series" />
            <MenuDivider />
            <MenuItem onClick={() => addWidget("bar")} icon="timeline-bar-chart" text="Bar" />
            <MenuItem onClick={() => addWidget("bar")} icon="horizontal-bar-chart" text="Bar Horizontal" />
            <MenuItem onClick={() => addWidget("stack")} icon="stacked-chart" text="Bar Stacked" />
            <MenuDivider />
            <MenuItem onClick={() => addWidget("line")} icon="timeline-line-chart" text="Line" />
            <MenuItem onClick={() => addWidget("area")} icon="timeline-area-chart" text="Area" />
            <MenuItem onClick={() => addWidget("pie")} icon="pie-chart" text="Pie" />
            <MenuItem onClick={() => addWidget("bubble")} icon="scatter-plot" text="Bubble" />
        </Menu>
        }  position={Position.BOTTOM} minimal>
        <Button icon="series-add">Add Chart</Button>
    </Popover>
    <Button icon="form" onClick={() => addWidget("aform")}>Add Form</Button>

    <Popover content={<Menu>
            <MenuItem onClick={() => addWidget("iframe")} icon="globe" text="IFrame" />
            <MenuItem onClick={() => addWidget("counter")} icon="numerical" text="counter" />
            <MenuItem onClick={() => addWidget("atext")} icon={<DiWebplatform />} text="Web Page" />
            </Menu>}  position={Position.BOTTOM} minimal>
        <Button icon="add">Add Other</Button>
    </Popover>
    
    <Popover content={<Menu>
            <MenuItem onClick={() => addWidget("variables")} icon={<VscSymbolVariable />} text="Variable Window" />
            </Menu>}  position={Position.BOTTOM} minimal>
        <Button icon={<VscDebug />}>Debug</Button>
    </Popover>
    <Button icon="floppy-disk" onClick={() => { props.saveDashboard();}} intent="primary">Save</Button>
    </div>
)};
