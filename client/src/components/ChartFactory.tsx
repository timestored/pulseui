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
 
import React, { Component, MouseEventHandler, Suspense, useEffect, useState } from 'react';
import QueryEngine, { getSensibleServer, Queryable, SetArgsType, UpdatingQueryable, UpdatingQueryableListener } from '../engine/queryEngine';
import { MyHelpLink, MyModal, getDefaultErrorFallback } from './CommonComponents';
import { Col, DataTypes, SmartRs } from '../engine/chartResultSet';
import ReactECharts from '../echarts-for-react';
import { Button, IconName, MenuItem, NonIdealState } from '@blueprintjs/core';
import { ServerConfig } from './ConnectionsPage';
import { TabNode } from 'flexlayout-react';
import { ChartWrapper,ChartWrapper90 } from '../styledComponents';
import { DataZoomComponentOption, EChartsOption, graphic, PieSeriesOption, SeriesOption, TitleComponentOption } from 'echarts';
import { Link } from 'react-router-dom';
import 'jsonic';
import { cloneDeep, get, merge, mergeWith, set } from "lodash-es";
import { IThemeType, ThemeContext, ThemeType } from '../context';
import SFormatters from './SFormatters';
// Think echarts is needed for theme import
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import echarts from 'echarts';
import "./customed.js";
import { ItemRenderer, Select2 } from '@blueprintjs/select';
import { TbChartBubble, TbChartCandle, TbChartRadar, TbCone } from 'react-icons/tb';
import { AiOutlineBoxPlot } from 'react-icons/ai';
import _uniqueId from 'lodash-es/uniqueId';

import { ErrorBoundary } from '../ErrorBoundary';
import { SubConfigEditor } from './SubConfigEditor';
import { GridConfig } from './AGrid';
import { ActionHandler,runActions } from '../engine/actionHandlers';
import ABreadcrumb from '../pro/ABreadcrumb';
import { getChartHelpFor, getH2DemoQueryable, getKdbDemoQueryable } from '../pro/ChartHelp';
const ESurface = React.lazy(() => import('./3DChartFactory'));
const AGrid = React.lazy(() => import('./AGrid'));

export const chartTypes = ["grid", 'timeseries', 'area', 'line', "bar", "stack", "bar_horizontal", "stack_horizontal", "pie",
    "scatter", "bubble", "candle", "radar", "treemap", "heatmap", "calendar", "boxplot", "3dsurface", "3dbar",
    "sunburst", "tree", "metrics"] as const;
export type ChartType = typeof chartTypes[number]; 


export function getChartIcon(ct:ChartType):JSX.Element|IconName  {
    switch(ct) {
        case "timeseries": return "series-add";
        case "bar": return "timeline-bar-chart";
        case "stack": return "stacked-chart";
        case "bar_horizontal": return "horizontal-bar-chart";
        case "stack_horizontal": return "horizontal-bar-chart-desc";
        case "line": return "timeline-line-chart";
        case "area": return "timeline-area-chart";
        case "pie": return "pie-chart";
        case "scatter": return "scatter-plot";
        case "bubble": return <TbChartBubble />;
        case "radar": return <TbChartRadar />;
        case "candle": return <TbChartCandle />;
        case "calendar": return "calendar";
        case "grid": return "th";
        case "treemap": return "diagram-tree";
        case "heatmap": return "heatmap";
        case "metrics": return "array-numeric";
        case "boxplot": return <AiOutlineBoxPlot />;
        case "sunburst": return "flash";
        case "3dsurface": return <TbCone />;
        case "3dbar": return "cube";
        case "tree": return "diagram-tree";
    }
}

/***********   Functions to access colors so consistent amonst chart types **********/
function getThm(context:IThemeType) { return context.theme === 'dark' ? 'customed' : ""; }
export function getThmT(theme:ThemeType) { return theme === 'dark' ? 'customed' : ""; }

export function getTooltipDefaults(theme: ThemeType) { 
    const backgroundColor = theme === 'dark' ? 'rgba(11,11,11,0.75);' : "rgba(210,210,210,0.75);";
    return {
        backgroundColor,
        borderWidth:0,
        textStyle:{color:theme === 'dark' ? "#EEE" : "#222"},
        valueFormatter:getTooltipFormatter("", "number"),
    }
}


function getTooltipFormatter(colName:string, dtype: DataTypes) { 
    const formatter = SFormatters.getFormatter(colName, dtype); 
    return (value:any) => formatter(0, 0, value, null, null);
}


interface MyChartProps {
    chartType: ChartType,
    selected: boolean,
    clearSelected: () => void,
    tabNode: TabNode|undefined,
    queryEngine: QueryEngine,
    serverConfigs: ServerConfig[]
}
interface MyUpdatingChartState {
    chartType: ChartType,
    config: any,
    subConfig: SubConfig,
    srs: SmartRs | undefined,
    exception: string | undefined,
    myKey:number,
}

// SubConfig is all the config for "Charts" where Charts actually includes AGrid.
// overrideJson - Is generic JSON editing in exact same shape as echarts - so override is merge
// colConfig = ColName => {seriesSettings, colFormat, colWidth, axisChoice } - Per column settings
//              seriesSettings - Is the SeriesOption from echarts but stored by columnName key. Meaning we don't need to know mapping.
// gridConfig - Grid specific configuration
// bug? - colConfig contains chart and grid specific settings, bad idea?
// bug? - gridConfig is always defined and stored. the UI toggles between true/false. Whereas overrideJson is optional tristate - true/false/default. Confusing.
export type SubConfig = { 
    overrideJson:EChartsOption, 
    colConfig:ColConfig, 
    gridConfig:DeepPartial<GridConfig>, 
    interactiveConfig:InteractiveConfig,
    actionHandlers:ActionHandler[],
};

export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]; };

export const getEmptySubConfig = ():SubConfig => { return {overrideJson:{}, colConfig:{}, gridConfig:{}, interactiveConfig:{}, actionHandlers:[]}; };
export type AxisChoice = "leftax"|"rightax";
export type ColumnConfig = SeriesOption & {colFormat?:ColFormat, colWidth?:number, axisChoice?:AxisChoice};
export type ColConfig = {[k:string]:ColumnConfig};
export type InteractiveConfig = {enabled?:boolean, wkeyName?:string};


// NUMBER3P - P = Plain - i.e. without commas
export type ColFormat = ""|"NUMBER0" |"NUMBER1" |"NUMBER2" |"NUMBER3" |"NUMBER4" |"NUMBER5" |"NUMBER6" |"NUMBER7" |"NUMBER8" |"NUMBER9"
            |"NUMBER0P"|"NUMBER1P"|"NUMBER2P"|"NUMBER3P"|"NUMBER4P"|"NUMBER5P"|"NUMBER6P"|"NUMBER7P"|"NUMBER8P"|"NUMBER9P" // P = Plain i.e. no commas
            |"DATE"|"DATEDD"|"DATEMM"|"DATEMONTH"|"DATEMON"|"TIME"|"TIMEMM"|"TIMESS" // P = Plain i.e. no commas
    |"PERCENT0"|"PERCENT1"|"PERCENT2"|"CURUSD"|"CUREUR"|"CURGBP"|"CURUSD0"|"CUREUR0"|"CURGBP0"|"TAG"|"HTML"|"SPARKLINE"|"SPARKBAR"|"SPARKDISCRETE"|"SPARKBULLET"|"SPARKPIE"|"SPARKBOXPLOT";

export function ChartForm(props:{ onItemSelect:(ct:ChartType)=>void, chartType:ChartType }) {
    const [ lastCT, setLastCT ] = useState<ChartType>(props.chartType === "grid" ? "area" : props.chartType);

    const ChartSelect = Select2.ofType<ChartType>();
    const chartRenderer:ItemRenderer<ChartType> = ( ct, { handleClick, modifiers,query }) => {
        return <MenuItem icon={getChartIcon(ct)} active={modifiers.active} disabled={modifiers.disabled} key={ct} text={ct} onClick={handleClick} 
                    onMouseEnter={() => props.onItemSelect(ct)} />;
    };
    const toggleCT = props.chartType === "grid" ? lastCT : "grid";

    return <>
            <Button style={{width:20, padding:0, marginRight:1}} icon={getChartIcon(toggleCT)} small onClick={()=>{props.onItemSelect(toggleCT);}}></Button>
            <ChartSelect items={Object.values(chartTypes)} itemRenderer={chartRenderer}  filterable={false} className="chartSelect"
                onItemSelect={ (ct) => {
                    props.onItemSelect(ct);
                    if(ct !== "grid") { setLastCT(ct); }
                }} >
                <Button small icon={getChartIcon(props.chartType)} text={props.chartType} rightIcon="caret-down" />
            </ChartSelect>
            <MyHelpLink href="help/chart" htmlTxt="Click link to see full demos of all display options" />
        </>;
}

export type ActionRunner = (actionHandlers:ActionHandler[], argMapWithTypes: { [argKey: string]: any }) => void;

export class MyUpdatingChart extends Component<MyChartProps, MyUpdatingChartState> implements UpdatingQueryableListener {
    state: MyUpdatingChartState = {
        chartType: "area",
        config: undefined,
        subConfig: getEmptySubConfig(),
        srs: undefined,
        exception: undefined,
        myKey:0, // myKey is used to force a full chart refresh when a config item is removed. 
                 // echarts replaceMerge doesn't include series so that data appends work. 
                 // So we need a way to insist on removal when a color or something is reset.
    }
    private uQueryable: UpdatingQueryable;
    static contextType?: React.Context<any> | undefined = ThemeContext;
    context!: React.ContextType<typeof ThemeContext>;

    remapOldChartTypes(oldct:string):ChartType {
        switch(oldct) {
            case "Time Series": return "timeseries";
            case "Grid": return "grid";
            case "Stack": return "stack";
            case "Candle": return "candle";
            case "Area": return "area";
            case "Bubble": return "bubble";
            case "Radar": return "radar";
            case "Scatter": return "scatter";
            case "Heatmap": return "heatmap";
            case "Pie": return "pie";
        }
        return oldct.toLowerCase() as ChartType;
    }

    constructor(props: MyChartProps) {
        super(props);
        const config = this.props.tabNode === undefined ? {} : this.props.tabNode.getConfig();

        let qb = config?.dashstate?.queryable as Queryable;
        if(qb === undefined) {
            const serverConfig = getSensibleServer(props.serverConfigs);
            qb = getDemoQueryable(serverConfig, props.chartType);
        } else {
            // Must let it know this query will be a pivot straight away to limit result set pulled back
            const isPiv = config.dashstate.subConfig?.gridConfig?.showPulsePivot === true;
            qb = new Queryable(qb.serverName, qb.query, qb.refreshPeriod, isPiv ? "pivot:||" : "");
        }
        this.uQueryable = new UpdatingQueryable(props.serverConfigs, props.queryEngine, this, qb);
        // save state in flexlayout node tree
        this.props.tabNode && this.props.tabNode.setEventListener("save", (p:any) => {
            config.dashstate = { chartType: this.state.chartType, config: this.state.config, queryable: this.uQueryable.queryable, subConfig: this.state.subConfig, };
        });
        // Then load in the saved overrides
        const ds = config.dashstate ?? {};
        const oldFix = Object.keys(ds).includes("chartType") ? { chartType:this.remapOldChartTypes(ds['chartType'])} : {};
        // merging subCOnfig in case loading an old subConfig that is missing keys
        const s = { ...this.state, ...props, ...ds, ...oldFix, subConfig:merge(getEmptySubConfig(),ds.subConfig ?? {}) };
        this.state = { ...s, lastNongridChartType:s.chartType === "grid" ? "area" : s.chartType};
    }

    componentDidMount() { this.uQueryable.start(); }
    componentWillUnmount() { this.uQueryable.stop(); }

    update(srs: SmartRs, exception: string | undefined): void {
        this.setState({ srs, exception });
    }

    onConfigChange = (subConfig:SubConfig) => { this.setState({subConfig:subConfig}); }

    render() {
        const { srs, exception, chartType, subConfig } = this.state;
        const setArgsWithType:SetArgsType = (argMapWithTypes: { [argKey: string]: any }) => {
            const iConfig = this.state.subConfig.interactiveConfig;
            if(iConfig.enabled !== false) {
                let pre = iConfig.wkeyName ?? '';
                pre = pre.replace(/[^0-9a-zA-Z_]/gi, '').replaceAll(" ","_"); // alphanumeric only
                const nObj:{ [argKey: string]: any } = {};
                for (const  key in argMapWithTypes) {
                    
                    nObj[(pre.trim().length === 0 ? "" : pre + ".") + key] = argMapWithTypes[key];
                }
                this.props.queryEngine.setArgsWithType(nObj);
            }
        }
        const actionRunner:ActionRunner = (actionHandlers, argMapWithTypes) => {
            runActions(this.props.queryEngine, actionHandlers, argMapWithTypes);
        }

        let Display: JSX.Element | null = <div>Error!</div>;

        try {
            // any of these big things change, redraw the whole chart. Else old column names etc can hang around.
            const chartKey = this.state.myKey + this.uQueryable.queryable.query + this.uQueryable.queryable.serverCmd;

            Display = srs === undefined ? null :
                exception ?
                    exception.includes("Awaiting Submit.") ? 
                        <NonIdealState icon="confirm" title="Awaiting Submit" description={""} action={<div>There should be a form on this dashboard. <br />Try completing the form and pressing submit.</div>} />
                    : exception.includes("Missing Required Arguments") ? 
                        <NonIdealState icon="confirm" title="Awaiting Required Arguments" description={""} action={<div>This display requires a user parameter.<br />Try selecting a form value or clicking a table row.</div>} />
                        : <NonIdealState icon="error" title="Error Generating Visualization" description={<>{exception.split("\n").map(s => <p>{s}</p>)}</>} action={<div>Try changing a query setting in the editor</div>} />
                : MyUpdatingChart.getChart(chartType, srs, this.context.theme, subConfig, setArgsWithType, this.onConfigChange, 
                    chartKey, actionRunner);
        } catch (error) {
            console.error(error);
        }
        const allowsSubconfig = ['timeseries', 'area', 'line', "bar", "stack", "bar_horizontal", "stack_horizontal", "scatter", "bubble", "grid","metrics"
                // "pie",  "candle", "radar", "treemap", "heatmap", "calendar", "boxplot", "3dsurface", "3dbar","sunburst", "tree", 
                ].includes(chartType);

        let Editor: JSX.Element | null = <div>Error!</div>;
        try {
            Editor = <>{this.uQueryable.getEditor(<ChartForm chartType={chartType} onItemSelect={ct => { this.setState({ chartType: ct})}} />)}
                    {allowsSubconfig && <SubConfigEditor subConfig={subConfig} srs={srs} chartType={chartType} serverConfigs={this.props.serverConfigs}
                            onChange={(s,forceRefresh) => { 
                                // Some changes to charts etc. can only be done by hard refreshing and regnerating the entire chart.
                                this.setState({subConfig:s, myKey:this.state.myKey + (forceRefresh ? 1 : 0)}); 
                            }} />}
                </>;
        } catch (error) {
            console.error(error);
        }
        const tabTitle = (this.props.tabNode && this.props.tabNode.getName()) || (this.props.chartType === "grid" ? "Grid" : "Chart");
        const content = <>
            {subConfig.gridConfig.showPulsePivot && srs && <ABreadcrumb key={this.uQueryable.queryable.query} srs={srs} allCols={[]} byorpivotCols={[]} changeEvent={(groupby,pivot,sel)=>{
                const s = "pivot:" + groupby.join(",") + "|" + pivot.join(",") + "|" + sel;
                this.uQueryable.setServerCmd(s);
                }}  />}
            <ErrorBoundary  resetKeys={[chartType]} FallbackComponent={getDefaultErrorFallback("Error displaying this chart. Try changing chart type.")} >{Display}</ErrorBoundary>
            {this.props.selected && <MyModal title={tabTitle} isOpen={true} handleClose={this.props.clearSelected}>
                    <ErrorBoundary  resetKeys={[chartType]} FallbackComponent={getDefaultErrorFallback("Error displaying editor. Raw json may be corrupt.")} >
                    {Editor}
                </ErrorBoundary>
                </MyModal>}</>;

        return subConfig.gridConfig.showPulsePivot ? <ChartWrapper90>{content}</ChartWrapper90> : <ChartWrapper>{content}</ChartWrapper>;
    }

    public static getChart(ct: ChartType, srs: SmartRs, theme: ThemeType = "light", subConfig?:SubConfig, 
        setArgTyped:SetArgsType=()=>{} , onConfigChange:(s:SubConfig)=>void = ()=>{}, myKey?:string, actionRunner:ActionRunner=()=>{}): JSX.Element | null {
        if(ct === undefined) {
            return null;
        }
        const sc = subConfig === undefined ? getEmptySubConfig() : subConfig;
        const args = {  srs:srs, subConfig:sc, key:myKey, theme:theme, setArgTyped, actionRunner  };

        switch (ct) {
            case "area":
            case "line":
            case "bar":
            case "stack": 
            case "stack_horizontal":
            case "bar_horizontal":
                return <EChart chartType={ct} {...args} />;
            case "candle": return <ECandleSeries {...args} />;
            case "calendar": return <ECalendar {...args} />;
            case "radar": return <ERadar {...args} />;
            case "pie": return <EPie {...args}/>;
            case "scatter": return <EScatter etype="scatter" {...args} />;
            case "bubble": return <EScatter etype="bubble" {...args} />;
            case "grid": return (<Suspense fallback={<div>Loading...</div>}><AGrid onConfigChange={onConfigChange} {...args} /></Suspense>);
            case "timeseries": return <ETimeSeries {...args} />;
            case "treemap": return <ETreeMap {...args} />;
            case "heatmap": return <EHeatMap {...args} />;
            case "metrics": return <EMetrics {...args} />;
            case "boxplot": return <EBoxPlot {...args}/>;
            case "sunburst": 
            case "tree":
                return <ESunburst {...args} chartType={ct} />;
            case "3dsurface": 
            case "3dbar": 
                return (<Suspense fallback={<div>Loading...</div>}><ESurface {...args} chartType={ct}/></Suspense>);
        }
    }
}


function performClick(props:EChartProps, name:string, series:string, val:string, ts?:string) { 
    const args = { name, series, val }
    props.setArgTyped(args); 
    props.actionRunner(props.subConfig.actionHandlers.filter(a => a.trigger === "Click"), args);
}

function getClickHandler(c:Component<EChartProps>):Record<string,Function> { 
    return {
        click: (e:any) => { 
            const series = (e.seriesName && !e.seriesName.includes("series")) ? e.seriesName : '';
            const val = (e.value && typeof e.value === "number") ? e.value : '';
            performClick(c.props, e.name ?? '', series, val);
        },
        // contextmenu: (e:any) => {  alert("contextty"); e.preventDefault(); e.stopPropogation(); },
      };
}


const DEF_GRID = { left: 0, top: 10, right: 10, bottom: 0,containLabel: true };

// Without replaceMerge - removing an existing key, i.e. resetting a default such as background color would NOT take effect.
// However notMerge causes a full redraw on all new data. So we need to specify which entries may have keys reset AND
// let eCharts know to always fully replace those parts.
const REP = ["grid","title","axisPointer","xAxis","yAxis"]; // Legend not included else it means you can't toggle the legend showing
type EChartProps = {  srs: SmartRs, subConfig:SubConfig, theme: ThemeType, setArgTyped:SetArgsType, actionRunner:ActionRunner };

class EPie extends Component<EChartProps> {
    
    onEvents: Record<string,Function> = getClickHandler(this);
    
    render() {
        const { srs, theme } = this.props;
        const s = needs({srs:this.props.srs, needsNumbers:1});
        if(s !== null) { 
            return <ChartHelp chartType="pie" reason={s} /> 
        }
        try {
            const myOptions:EChartsOption = carefulOverride(toPieOption(srs, theme), this.props.subConfig);
            return <>{srs.count() > 200 ? 
                        <NonIdealState icon="error" title="Too Many Rows" >
                            Pie Chart with &gt; 200 segments makes little sense.
                            <br />We recommend merging some of the segments into groups.
                        </NonIdealState>
                        : <ReactECharts key={srs.chartRS.numericColumns.length} option={myOptions} theme={getThmT(theme)} replaceMerge={REP} onEvents={this.onEvents} />}
                </>;
        } catch {
            return <ChartHelp chartType="pie" />
        }
    }
}



function toPieOption(srs: SmartRs, theme: ThemeType): EChartsOption {
    const ncs = srs.chartRS.numericColumns;
    let s:PieSeriesOption[] = [];
    let t:TitleComponentOption[] = [];

    function toSeries(nc:Col<number>, overrides:PieSeriesOption):PieSeriesOption {
        return {
            name:nc.name,
            type: 'pie', label: { position: 'inside' },
            tooltip:{ valueFormatter:getTooltipFormatter(nc.name, srs.rsdata.tbl.types[nc.name]),},
            data: srs.chartRS.rowLabels.map((lbl, idx) => {
                return { value: nc.vals[idx], name: lbl };
            }),
            ...overrides
        };
    }

    // Ideally you would dynamically calculate spacing for any number like this: https://echarts.apache.org/examples/en/editor.html?c=line-easing
    // For now went hardcoded to support 1-4 pie charts
    if(ncs.length === 1) {
        s = [toSeries(ncs[0], { radius: '80%',})];
    } else if(ncs.length === 2)  {
        s = [toSeries(ncs[0], { radius: '45%', center: ['25%', '50%']}), toSeries(ncs[1], { radius: '45%', center: ['75%', '50%']})];
        t = [{text:ncs[0].name, top:"15%", left:"21%"},{text:ncs[1].name, top:"15%", left:"51%"}];
    } else if(ncs.length > 2) {
        const s1 = toSeries(ncs[0], { radius: '39%', center: ['25%', '30%']});
        const s2 = toSeries(ncs[1], { radius: '39%', center: ['75%', '30%']});
        const s3 = toSeries(ncs[2], { radius: '39%', center: ['25%', '75%']});
        s = ncs.length === 3 ? [s1,s2,s3] : [s1,s2,s3,toSeries(ncs[2], { radius: '40%', center: ['75%', '75%']})];
        t = [{text:ncs[0].name, top:"5%", left:"21%"}, {text:ncs[1].name, top:"5%", left:"71%"}, {text:ncs[2].name, top:"51%", left:"21%"}];
        if(ncs.length > 3) { t.push({text:ncs[3].name, top:"51%", left:"71%"}) }
    }
    return {
        tooltip: { trigger: 'item', ...getTooltipDefaults(theme)},
        series: s, title:t,
    };
}


function toHeatmapOption(srs: SmartRs): EChartsOption {
    const nc = srs.chartRS.numericColumns;
    const MIN = Math.min(0, ...nc.map(n => Math.min(...n.vals)));
    const MAX = Math.max(1, ...nc.map(n => Math.max(...n.vals)));
    // Create [[column,row,val],[column,row,val]...]
    const d: number[][] = [];
    for (let c = 0; c < nc.length; c++) {
        const va = nc[c].vals;
        for (let r = 0; r < va.length; r++) {
            d.push([c, r, va[r]]);
        }
    }
    return {
        xAxis: {
            type: 'category', data: nc.map(n => n.name), splitNumber: 20,
            nameRotate: 90, axisLabel: { rotate: 60 }
        },
        yAxis: { type: 'category', name: srs.chartRS.rowTitle, data: srs.chartRS.rowLabels, splitNumber: 20, },
        grid: { ...DEF_GRID, left: '100', },
        visualMap: { min: MIN, max: MAX, calculable: true, },
        series: [{ type: 'heatmap', label: { show: true, formatter:(v:any) => getTooltipFormatter("","number")(v.value[2]) }, data: d}],
    };
}


class EHeatMap extends Component<EChartProps> {
    render() {
        const { srs, theme } = this.props;
        const s = needs({srs:this.props.srs, needsNumbers:1});
        if(s !== null) { 
            return <ChartHelp chartType="heatmap" reason={s} /> 
        }

        try {
            const myOptions:EChartsOption = carefulOverride(toHeatmapOption(srs), this.props.subConfig);
            return <>{srs.count() > 800 ? 
                <NonIdealState icon="error" title="Too Many Rows" >
                    Heat Map with &gt; 800 rows is not reasonably displayable.
                </NonIdealState>
                : <ReactECharts option={myOptions} theme={getThmT(theme)} replaceMerge={REP} />}
        </>;
        } catch {
            return <ChartHelp chartType="heatmap"  />
        }
    }
}



const  SparkSpan = (props:{
    onClick: MouseEventHandler<HTMLDivElement> | undefined, name:string, sparkType:"line"|"bar", latestVal:string, vals:number[], id:string,
    itemColor?:string, areaColor?:string, lineColor?:string}) => {

    const {name, id, sparkType, vals, itemColor, lineColor, areaColor, latestVal} = props;

    useEffect(() => {
        const hw = {height:'75px', width:'151px'};
        if(sparkType === "bar") {
            const barWidth = Math.floor(150/(vals.length ?? 1)) - 1;
            //@ts-ignore
            $(id).sparkline('html', {type: 'bar', ...hw, barWidth:barWidth + 'px', barColor: itemColor} ); 
        } else { //@ts-ignore
            $(id).sparkline('html', {type: 'line', ...hw,  lineColor: lineColor, fillColor: areaColor } );
        }
    }, [id, sparkType, vals, itemColor, lineColor, areaColor]);

    const vst = vals.join(",");
    return <div key={name} className="lat-container" onClick={props.onClick}>
    <div className="lat-box"> <div className={"lat-spacer lat-spacer-" + sparkType} ></div>   
        <div className="lat-chart" dangerouslySetInnerHTML={{__html: "<span id='" + id + "' values='" + vst + "'></span>"}}></div> 
    </div>
    <div className="lat-box lat-overlay"> <h2>{name}</h2> <h1>{latestVal}</h1> </div>
</div>;
}

/** Draw MEtric Panel for each column. Mostly to show key KPIs so only show latest value. */
class EMetrics extends Component<EChartProps> {
    private myOptions:EChartsOption = {};
    private id:string;

    constructor(props:EChartProps) {
        super(props);
        this.id = _uniqueId("prefix-");
    }
    
    render() {
        const { srs } = this.props;
        const s = needs({srs:this.props.srs, needsNumbers:1});
        if(s !== null) { 
            return <ChartHelp chartType="metrics" reason={s} /> 
        }

        try {
            // TODO support non-numeric columns. Support sd_bg/fg?
            // Fake the options and perform merge to get tooltip formatter AND name override.
            const fakeOptions = {series:srs.chartRS.numericColumns.map(nc => {return {name:nc.name, oname:nc.name, data:nc.vals}})};
            this.myOptions = carefulOverride(fakeOptions, this.props.subConfig);

            if(srs.count() > 100) {
                return <NonIdealState icon="error" title="Too Many Rows" >Metrics &gt; 100 rows is not reasonably displayable.</NonIdealState>;
            } else if(srs.count() < 1) {
                return <NonIdealState icon="error" title="Data has zero rows." >Metrics with 0 rows is not displayable.</NonIdealState>;
            }
            return <div className='lat-outer' id={this.id}>
                {this.myOptions.series && (this.myOptions.series as SeriesOption[]).map((sery,idx) => {
                    // @ts-ignore - Assuming latest at bottom as that's currently required for time-series chart speed
                    let latestVal:string = sery.data && sery.data[sery.data.length-1]; 
                    if(sery?.tooltip?.valueFormatter) { 
                        latestVal = sery!.tooltip.valueFormatter(latestVal);
                    } else {
                        latestVal = getTooltipFormatter("","number")(latestVal);
                    }

                    const oName = srs.chartRS.numericColumns[idx].name;
                    const cc = this.props.subConfig.colConfig;
                    const itemColor = get(cc, oName + ".itemStyle.color","green") as string; // These defaults should agree with sparklines in table
                    const areaColor = get(cc, oName + ".areaStyle.color",'#102040') as string;
                    const lineColor = get(cc, oName + ".lineStyle.color",'#2C92B6') as string;
                    const args = {itemColor,areaColor, lineColor, latestVal };
                    
                    return <SparkSpan name={"" + sery.name} vals={sery.data as number[]} id={this.id + "-" + idx}  {...{...args}} 
                                    sparkType={sery.type === "bar" ? "bar" : "line"} onClick={()=>{ performClick(this.props, "" + sery.name, "latest", latestVal) }} />; 
                })}
            </div>;
        } catch {
            return <ChartHelp chartType="metrics"  />
        }
    }

    componentDidUpdate() {
        const hw = {height:'75px', width:'151px'};
        this.props.srs.chartRS.numericColumns.forEach((nc,idx) => {
            const eId = "#" + this.id + "-" + idx; // id tallies with the aboce id generation in span
             // this relies on series/numericColumns mapping 1 to 1. AND only nc is the original name.(in case of user column renaming)
            const sery = (this.myOptions.series as SeriesOption[])[idx];
            const itemColor = get(this.props.subConfig.colConfig,nc.name + ".itemStyle.color","green"); // These defaults should agree with sparklines in table
            const areaColor = get(this.props.subConfig.colConfig,nc.name + ".areaStyle.color",'#102040');
            const lineColor = get(this.props.subConfig.colConfig,nc.name + ".lineStyle.color",'#2C92B6');
            
            if(sery.type === "bar") {
                const barWidth = Math.floor(150/(sery.data?.length ?? 1)) - 1;
                //@ts-ignore
                $(eId).sparkline('html', {type: 'bar', ...hw, barWidth:barWidth + 'px', barColor: itemColor} ); 
            } else { //@ts-ignore
                $(eId).sparkline('html', {type: 'line', ...hw,  lineColor: lineColor, fillColor: areaColor } );
            }
        })
      
    }
}


class ETreeMap extends Component<EChartProps> {
    static contextType?: React.Context<any> | undefined = ThemeContext;
    context!: React.ContextType<typeof ThemeContext>;
    render() {
        const chartRS = this.props.srs.chartRS;

        const s = needs({srs:this.props.srs, needsNumbers:1, needsStringy:true});
        if(s !== null) { 
            return <ChartHelp chartType="treemap" reason={s} /> 
        }

        const na = chartRS.numericColumns[0].vals;
        const sa = chartRS.stringyColumns.map(sCol => sCol.vals);

        /** Given a list, return a map from it's unique entries to the indices where they occur */
        function groupIndices<T>(list: T[]) {
            const map = new Map<T, number[]>();
            list.forEach((k, idx) => {
                const collection = map.get(k);
                if (!collection) {
                    map.set(k, [idx]);
                } else {
                    collection.push(idx);
                }
            });
            return map;
        }

        // Group the leftMost string column, use those indices to "groupBy", then remove that stringCOl and dive to next level recursively
        function getChildren(names: string[][], nums: number[]) {
            const nameToIndices = groupIndices(names[0]);
            const s = Array.from(nameToIndices.keys()).map(n => {
                const indices = nameToIndices.get(n)!;
                const sum = nums.filter((v, idx) => indices.indexOf(idx) >= 0).reduce((a, b) => a + b, 0);
                const d: { name: string, value: number | number[], children?: any } = { name: n, value: [sum, Math.sqrt(sum)] };
                if (names.length > 1) {
                    const selectedIndices = function (s: any, sIdx: number) { return indices.indexOf(sIdx) >= 0; };
                    const newNames = names.slice(1).map(stAr => stAr.filter(selectedIndices));
                    const newNums = nums.filter(selectedIndices);
                    d.children = getChildren(newNames, newNums);
                }
                return d;
            });
            return s;
        }

        try {
            const options: EChartsOption = {
                tooltip: { ...getTooltipDefaults(this.context.theme), valueFormatter:getTooltipFormatter("","number")},
                series: [{
                    type: 'treemap',
                    data: getChildren(sa, na),
                    upperLabel: { show: true, height: 30, },
                    visualDimension: 1,
                    tooltip:{valueFormatter:getTooltipFormatter("","number")},
                    levels: [
                        { itemStyle: { borderWidth: 3, borderColor: '#333', gapWidth: 3 } },
                    ],
                }],
            };
            const myOptions:EChartsOption = carefulOverride(options, this.props.subConfig);
            return <ReactECharts option={myOptions} theme={getThm(this.context)} replaceMerge={REP} />;
        } catch {
            return <ChartHelp chartType="treemap"  />
        }
    }
}



class EChart extends Component<EChartProps & { chartType:ChartType }> {
    static contextType?: React.Context<any> | undefined = ThemeContext;
    context!: React.ContextType<typeof ThemeContext>;
    
    onEvents: Record<string,Function> = getClickHandler(this);

    render() {
        const { srs, chartType } = this.props;
        const s = needs({srs:this.props.srs, needsNumbers:1});
        if(s !== null) { 
            return <ChartHelp chartType={chartType} reason={s} /> 
        }
        const filled = chartType === "area" ? true : undefined;
        const stacked = (chartType === "stack") || (chartType === "stack_horizontal") ? true : undefined;
        const etype = ((stacked === true) || (chartType === "bar") || (chartType === "bar_horizontal")) ? "bar" : "line";
        const isHorizontal = (chartType === "bar_horizontal") || (chartType === "stack_horizontal");

        const nc = srs.chartRS.numericColumns;
        const myXAxis:any = {
            type: 'category', name: getReName(srs.chartRS.rowTitle, this.props.subConfig),
            data: srs.chartRS.rowLabels, 
            nameRotate: isHorizontal ? undefined : 90,
            axisLabel: isHorizontal ? {} : { rotate: 45 }
        };
        const myYAxis = [{ type:'value', name: nc.length === 1 ? nc[0].name : undefined, scale:true, alignTicks:true },
                         { type:'value', name: nc.length === 1 ? nc[0].name : undefined, scale:true, alignTicks:true }];

        try {
            const options: EChartsOption = {
                legend: { data: nc.map(e => e.name), show: nc.length > 1 },
                tooltip: { ...getTooltipDefaults(this.context.theme), trigger: 'axis' },
                xAxis: isHorizontal ? myYAxis : myXAxis,
                yAxis: isHorizontal ? myXAxis : myYAxis,
                // Horizontal needs slightly more space in case top bar is full width and onto legend.
                grid:(chartType === "bar_horizontal" || chartType === "stack_horizontal") ? { ...DEF_GRID, top:20  } : DEF_GRID,
                series: nc.map(arra => {
                    const sery:SeriesOption = {
                        type: etype ?? 'line', data: arra.vals, 
                        name: arra.name,
                        stack: stacked ? '总量' : undefined,
                        areaStyle: filled ? { opacity:0.8} : undefined,
                        itemStyle: { opacity:0.8 },
                        tooltip:{ valueFormatter:getTooltipFormatter(arra.name, srs.rsdata.tbl.types[arra.name]),},
                    };
                    return sery;
                }),
            }

            const myOptions:EChartsOption = carefulOverride(options,this.props.subConfig, isHorizontal);
            return <ReactECharts option={myOptions} theme={getThm(this.context)} replaceMerge={REP}   onEvents={this.onEvents}/>;
        } catch {
            return <ChartHelp chartType={chartType} />
        }
    }
}



class EScatter extends Component<EChartProps & {etype: "scatter" | "bubble" }> {
    static contextType?: React.Context<any> | undefined = ThemeContext;
    context!: React.ContextType<typeof ThemeContext>;
    onEvents: Record<string,Function> = {
        click: (e:any) => {
            if(e.seriesName && e.value && Array.isArray(e.value) && e.value.length >= 3) {
                performClick(this.props, e.value[2] ?? '', e.seriesName ?? '', e.value[0] ?? undefined); 
            }
        },
      }
    render() {
        const { srs, etype } = this.props;
        if(this.props.srs.chartRS.numericColumns.length <= 0) { return <ChartHelp chartType={etype} reason="No numeric column found" /> }

        const SHAPES = ['circle', 'rect', 'triangle', 'diamond', 'pin', 'arrow'];
        const xAxis = srs.chartRS.numericColumns[0];
        let nc = srs.chartRS.numericColumns.slice(1);
        let sizeCols: undefined | number[][] = undefined;

        // For bubble assume every other column is size, remove it from nc
        const isBubble = etype === "bubble";
        if (isBubble) {
            const newNC = nc.slice(0, 0);
            sizeCols = [];
            for (let i = 0; i < nc.length; i++) {
                newNC.push(nc[i++]);
                // wasn't a size column to pair with, assume all 1s
                sizeCols.push(i === nc.length ? nc[0].vals.map(v => 50) : nc[i].vals);
            }
            nc = newNC;
        }

        try {
            const options: EChartsOption = {
                legend: { data: nc.map(e => e.name) },
                xAxis: { type: 'value', name: xAxis.name, data: xAxis.vals },
                grid: DEF_GRID,
                yAxis: { scale: true },
                // @ts-ignore
                series: nc.map((arra, colIdx) => {
                    let sdata = undefined;
                    if (sizeCols !== undefined) {
                        sdata = arra.vals.map((v, idx) => [xAxis.vals[idx], v, srs.chartRS.rowLabels[idx], sizeCols![colIdx][idx]]);
                    } else {
                        sdata = arra.vals.map((v, idx) => [xAxis.vals[idx], v, srs.chartRS.rowLabels[idx]]);
                    }
                    const s: any = {
                        type: 'scatter',
                        data: sdata,
                        name: arra.name,
                        tooltip:{ valueFormatter:getTooltipFormatter(arra.name, srs.rsdata.tbl.types[arra.name]),},
                        emphasis: {
                            focus: 'series', label: {
                                show: true,
                                formatter: function (param: { data: any[] }) { return param.data[2]; },
                            }
                        },
                    };
                    if (isBubble) {
                        s.symbolSize = sizeCols ? function (data: number[]) { return data[3]; } : undefined;
                        s.symbol = "circle";
                    } else {
                        s.symbol = SHAPES[colIdx % SHAPES.length];
                    }
                    return s;
                }),
            }
            const myOptions:EChartsOption = carefulOverride(options,this.props.subConfig);
            return <ReactECharts option={myOptions} theme={getThm(this.context)} replaceMerge={REP} onEvents={this.onEvents} />;
        } catch {
            return <ChartHelp chartType={etype} />
        }
    }
}

export type CandleData = {
    labels:(string | number)[];
    colh:number[][];
    volume:undefined | number[];
}

export function toCandleData(srs: SmartRs): CandleData {

    if(srs.d().length === 0) {
        return  { labels:[], colh:[], volume:[] };
    }

    // TODO date/time string formatting
    const labels = srs.chartRS.rowLabels.length > 0 ? srs.chartRS.rowLabels :  [];
    const closeCol = srs.findColumn("close");
    const openCol = srs.findColumn("open");
    const lowCol = srs.findColumn("low");
    const highCol = srs.findColumn("high");
    const volumeCol = srs.findColumn("volume");

    const isPlottable = (openCol !== undefined && closeCol !== undefined) || (lowCol !== undefined && highCol !== undefined);
    if(!isPlottable) {
        throw new Error("need open/close or high/low");
    }
    const data = srs.d().map(function (item) {
        const c = item[closeCol ?? lowCol!] || 0;
        const o = item[openCol ?? highCol!] || 0;
        const l = item[lowCol ?? closeCol!] || 0;
        const h = item[highCol ?? openCol!] || 0;
        return [+c, +o, +l, +h];
    });

    let volCol:number[] | undefined = undefined;
    if(volumeCol !== undefined) {
        volCol = srs.d().map(it => it[volumeCol] === null ? 0 : +it[volumeCol]!);
    }
    return { labels:labels, colh:data, volume:volCol };
}



class ECandleSeries extends Component<EChartProps> {
    static contextType?: React.Context<any> | undefined = ThemeContext;
    context!: React.ContextType<typeof ThemeContext>;
    onEvents: Record<string,Function> = { click: (e:any) => { 
        if(e.value && typeof e.value === "number") {
            performClick(this.props, "candle", "volume", e.value ?? undefined, e.name ?? ''); 
        } else {
            performClick(this.props, "candle", "open", e.value[1] ?? undefined, e.name ?? ''); 
        }
        }, };
    render() {
        try {
            if(this.props.srs.chartRS.numericColumns.length <= 0) { return <ChartHelp chartType="candle" /> }
            const candleData = toCandleData(this.props.srs);
            const noVol = candleData.volume  === undefined;

            const candleAxis = {
                type: 'category', data: candleData.labels, scale: true,
                boundaryGap: [0,0], axisLine: { onZero: false }, splitLine: { show: false }, splitNumber: 20, min: 'dataMin', max: 'dataMax',
                axisPointer: { z: 100 }
            };
            const chartAxis = {
                type: 'category',
                gridIndex: 1,
                data: candleData.labels,
                boundaryGap: false, axisLine: { onZero: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
                min: 'dataMin', max: 'dataMax'
            };
            const candleSeries = {
                type: 'candlestick',
                data: candleData.colh,
                itemStyle:{opacity:0.8 },
                areaStyle:{opacity:0.8 },
                tooltip: { ...getTooltipDefaults(this.context.theme) },
            };

            const canNOToption: EChartsOption = {
                tooltip: { ...getTooltipDefaults(this.context.theme), trigger: 'axis', axisPointer: { type: 'cross' } },
                // @ts-ignore
                xAxis: noVol ? candleAxis : [candleAxis,chartAxis],
                yAxis: noVol ? { scale: true, splitArea: { show: true } } : [{ scale: true, splitArea: { show: true } },{ scale: true, gridIndex: 1 }],
                grid: noVol ? { left: '5%', right: '1%',  top: '5%', height: '90%' } : [{ left: '5%', right: '1%', top: 10, height: '60%' },{ left: '5%', right: '1%', top: '69%', height: '28%' }],
                // @ts-ignore
                series: noVol ? candleSeries : [candleSeries,{ name: 'Volume', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: candleData.volume, itemStyle:{opacity:0.8 } }]
            };

            const myOptions:EChartsOption = carefulOverride(canNOToption, this.props.subConfig);
            return <ReactECharts option={myOptions} theme={getThm(this.context)} replaceMerge={REP} onEvents={this.onEvents}  />;
        } catch {
            return <ChartHelp chartType="candle" />
        }
    }
}

export function ChartHelp(props:{chartType:ChartType, reason?:string}) {
    const cHelp = getChartHelpFor(props.chartType);
    const { reason } = props;
    if(!cHelp) { return <></>; }
    return <div>
            <NonIdealState icon="error" title={reason}>
                Try changing a query setting in the editor
                <h3>{cHelp.chartType} Format</h3>
                <div style={{textAlign:"left"}}>{cHelp.formatExplainationHtml}</div>
                <div key="generalChartHelp">General help on charting and examples are available <Link to="/help/chart">here</Link></div>
            </NonIdealState>
        </div>
}


function onlyUnique(value: any, idx: number, self: any) { return self.indexOf(value) === idx; }

export function needs(props:{srs:SmartRs, needsData?:boolean, needsNumbers?:number, needsDates?:boolean, needsStringy?:boolean }) {
    const c = props.srs.chartRS;
    if(props.needsData !== undefined && props.srs.count() <= 0) {
        return "Zero rows. Data required to render chart."
    }
    if(props.needsNumbers !== undefined && c.numericColumns.length < props.needsNumbers) {
        return "Found " + c.numericColumns.length + " numeric columns. " + props.needsNumbers + " numeric column" +(props.needsNumbers>1 ? "s" : "") + " needed.";
    } else  if(props.needsDates !== undefined && c.dateColumns.length < 1) {
        return "At least one date column is required.";
    } else  if(props.needsStringy !== undefined && c.stringyColumns.length < 1) {
        return "At least one string column is required.";
    }
    return null;
}

class ECalendar extends Component<EChartProps> {
    // TODO THis context isn't updating on toggle
    static contextType?: React.Context<any> | undefined = ThemeContext;
    context!: React.ContextType<typeof ThemeContext>;
    onEvents: Record<string,Function> =  {
        click: (e:any) => { 
            if(e.value && Array.isArray(e.value) && e.value.length >= 2) {
                const series = (e.seriesName && !e.seriesName.includes("series")) ? e.seriesName : '';
                performClick(this.props, e.name ?? '', series, e.value[1], e.value[0]);
            }
        }
      };

    render() {
        const s = needs({srs:this.props.srs, needsNumbers:1, needsDates:true});
        if(s !== null) { 
            return <ChartHelp chartType="calendar" reason={s} /> 
        }
        function getDataForYear(srs: SmartRs , year:number) {
            const dates = srs.chartRS.dateColumns[0].vals;
            const nums = srs.chartRS.numericColumns[0].vals;
            const tvdata = [];
            for(let i=0; i<dates.length; i++) {
                const d = dates[i];
                if(d.getFullYear() === year) {
                    tvdata.push([d.toISOString().split('T')[0], nums[i]]);
                }
            }
            return tvdata;
        }
        try {
            const srs = this.props.srs;
            const valRange = srs.getRange(srs.chartRS.numericColumns.length > 0 ? srs.chartRS.numericColumns[0].vals : []);
            const years = srs.chartRS.dateColumns[0].vals.map(d => d.getFullYear()).filter(onlyUnique).sort();
            const calendars = years.map((year,idx) => {return { range: ''+year, cellSize: ['auto', 20], top: 30+idx*200, left:100 }});
            const series = years.map((year,idx) => {
                return { type: 'heatmap', coordinateSystem: 'calendar', calendarIndex: idx, data: getDataForYear(srs, year), name:srs.chartRS.numericColumns[0].name}
            });

            const option:EChartsOption = {
                tooltip: { ...getTooltipDefaults(this.context.theme), position: 'top'},
                visualMap: { min: valRange[0], max: valRange[1], calculable: true, orient: 'vertical', left: 'left', top: 'center' },
                // @ts-ignore
                calendar: calendars, series: series,
                grid:DEF_GRID,
            };
            const myOptions:EChartsOption = carefulOverride(option, this.props.subConfig);
            return <ReactECharts option={myOptions} theme={getThm(this.context)} replaceMerge={REP} onEvents={this.onEvents} />;
        } catch {
            return <ChartHelp chartType="calendar" /> 
        }
    }
}


class ERadar extends Component<EChartProps> {
    // TODO THis context isn't updating on toggle
    static contextType?: React.Context<any> | undefined = ThemeContext;
    context!: React.ContextType<typeof ThemeContext>;
    onEvents: Record<string,Function> = {
        click: (e:any) => { 
            if(e.name && e.value && Array.isArray(e.value) && e.value.length >= 1) {
                this.props.setArgTyped({name:e.name ?? '', val:e.value[0] ?? undefined}); 
            }
        },
      }
    render() {
        try {
            const srs = this.props.srs;

            const s = needs({srs:this.props.srs, needsNumbers:1});
            if(s !== null) { 
                return <ChartHelp chartType="radar" reason={s} /> 
            }

            const indicators = srs.chartRS.numericColumns.map(nc => {return { name: nc.name}});  // { name: 'Marketing', max: undefined }
            const legends = srs.chartRS.rowLabels;
            const data = legends.map((rowLabel, row) => {return { value:srs.chartRS.numericColumns.map(nc => nc.vals[row]), name:rowLabel}});
            
            const option:EChartsOption = {
                legend:{ data: legends, show:srs.count() <= 10 }, // No point showing massive legend overdrawing the chart
                radar: { indicator: indicators, },
                series: [ { type: 'radar', data: data, areaStyle: { } } ],
                grid:DEF_GRID,
                animation:false,
              };

            const myOptions:EChartsOption = carefulOverride(option, this.props.subConfig);
            return <>{srs.count() > 500 ? 
                <NonIdealState icon="error" title="Too Many Rows" >
                    Radar with &gt; 500 rows, where each row is a color, does not make sense.
                    <br />We recommend merging some of the segments into groups.
                </NonIdealState> 
                : <ReactECharts option={myOptions} theme={getThm(this.context)} replaceMerge={REP} onEvents={this.onEvents} />}</>;
        } catch {
            return <ChartHelp chartType="radar"  />;
        }
    }
}


type sym = 'circle' | 'rect' | 'roundRect' | 'triangle' | 'diamond' | 'pin' | 'arrow' | 'none';
function toNameSymbols(tnc: string[]): { name: string, sdname: string, sym: sym }[] {
    function toSymbol(sdname: string): sym {
        const s = sdname.toLowerCase();
        const names: Array<sym> = ['circle', 'rect', 'roundRect', 'triangle', 'diamond', 'pin', 'arrow', 'none'];
        for (const n of names) {
            if (s.endsWith(n.toLowerCase())) {
                return n;
            }
        }
        return "none";
    }

    return tnc.map(name => {
        const p = name.toLowerCase().indexOf("_sd_");
        const sdname = p === -1 ? name : name.substring(0, p);
        const sym = p === -1 ? "none" : toSymbol(name.substring(p));
        return { name: name, sdname, sym };
    });
}

function addTSclickHandler(echartRef:ReactECharts, setArgTyped:SetArgsType) {
    if(echartRef) {        
        const eChart = echartRef.getEchartsInstance();
        const zr = eChart.getZr();
        zr.on('click', (e:any) => { 
            const pointInPixel = [e.offsetX, e.offsetY];
            const pointInGrid = eChart.convertFromPixel('grid', pointInPixel);    
            const r:{[k:string]:any} = {ts:new Date(pointInGrid[0]), val:pointInGrid[1]};
            // If only showing one series, we can set it.
            if(eChart.getOption().series) {
                const s = eChart.getOption().series;
                if(Array.isArray(s) && s.length === 1 && s[0].name && s[0].name.length > 0) {
                    r['series'] = s[0].name;
                }
            }
            setArgTyped(r);
        }); 
    }
}

class ETimeSeries extends Component<EChartProps> {
    static contextType?: React.Context<any> | undefined = ThemeContext;
    context!: React.ContextType<typeof ThemeContext>;
    echartRef: ReactECharts | null = null;

    componentDidMount() { if(this.echartRef) { addTSclickHandler(this.echartRef, this.props.setArgTyped); } }

    render() {
        try {
            const srs = this.props.srs;

            const s = needs({srs:this.props.srs, needsNumbers:1, needsDates:true});
            if(s !== null) { 
                return <ChartHelp chartType="timeseries" reason={s} /> 
            }
            const timCol = srs.chartRS.dateColumns[0];
            const tnc = srs.chartRS.numericColumns.filter(nc => !nc.name.toUpperCase().endsWith("_SD_SIZE"));
            const nameSymbols = toNameSymbols(tnc.map(nc => nc.name));
            const headers = [...[timCol.name], ...tnc.map(tc => tc.name)];
            const dDayData = timCol.vals.map((dt, idx) => {
                const a: (string | number)[] = [dt.toISOString()];
                tnc.forEach(nc => a.push(nc.vals[idx]));
                return a;
            })
            const isSingle = tnc.length === 1;
            let hadSymbol = false;
            const symCols = nameSymbols.filter(ns => ns.sym !== "none");

            const timFormatter = getTooltipFormatter(timCol.name, srs.rsdata.tbl.types[timCol.name]);
            const options: EChartsOption = {
                legend: { show: symCols.length > 0,  data: symCols.map(sc => sc.sdname)  },
                grid: { right: '65px', left: '8%', top: '5%', bottom: '5.12%' },
                dataset: {
                    source: dDayData,
                    dimensions: headers,
                },
                xAxis: { type: 'time', splitLine: { show: true, lineStyle: { type: 'dashed' } }, },
                yAxis: [{ scale: true, splitLine: { show: true, lineStyle: { type: 'dashed' } }, alignTicks:true },
                        { scale: true, splitLine: { show: true, lineStyle: { type: 'dashed' } }, alignTicks:true }],
                series: tnc.map((tc, idx) => {
                    const isSymbol = nameSymbols[idx].sym !== "none";
                    hadSymbol = hadSymbol || isSymbol;
                    return {
                        name: nameSymbols[idx].sdname,
                        type: 'line',
                        step: 'middle',
                        animation: true,
                        symbol: nameSymbols[idx].sym,
                        symbolSize: function (value: any, params: Object) {
                            const a = srs.chartRS.numericColumns.find(nc => nc.name.toUpperCase() === nameSymbols[idx].sdname.toUpperCase()+"_SD_SIZE");
                            // @ts-ignore
                            return a === undefined ? 5 : a.vals[params.dataIndex];
                        },
                        encode: { x: timCol.name, y: tc.name },
                        endLabel: {
                            show: !isSymbol, valueAnimation: false, precision: 6, borderWidth: 0, padding: 4, borderRadius: 0, 
                            borderColor: '#777777', backgroundColor: isSingle ? '#1D43A7' : 'inherit', color:isSingle ? '#ddd' : '#222',
                            formatter: function (params: any) {
                                if (!params.value[idx + 1]) {
                                    return '';
                                }
                                return (isSingle ? '' : params.seriesName + ':\r\n') + (params.value[idx + 1] as number).toFixed(4); // No need to say what line is, if it's only line
                            }
                        },
                        lineStyle: { width: isSymbol ? 0 : 1, },
                        connectNulls: !isSymbol,
                        tooltip: {
                            ...getTooltipDefaults(this.context.theme),
                            valueFormatter:getTooltipFormatter(nameSymbols[idx].sdname, srs.rsdata.tbl.types[nameSymbols[idx].name]),
                        },
                        emphasis: { focus: isSingle ? 'none' : 'series', lineStyle: { width: undefined } }, // prevent line thickening on hovver/tooltip
                    }
                }),
                animation: true,
                // These lines are duped in candlestick
                tooltip: {
                    ...getTooltipDefaults(this.context.theme),
                    trigger: 'axis', 
                    axisPointer: {  type: 'cross', label: { precision:4,  formatter:(param:any) => timFormatter(new Date(param.value)), } },
                },
            };
            // If only one series, shade it in and add markers.
            if (Array.isArray(options.series) && options.series.length === 1) {
                //@ts-ignore
                const markLine: MarkLineOption = {
                    symbol: ['none'],
                    silent: true, precision: 4,
                    data: [
                        { type: 'min', name: '平均值', label: { show: true, borderWidth: 0, padding: 4, borderColor: '#777777', backgroundColor: '#AAA', borderRadius: 0 } },
                        { type: 'max', name: '平均值', label: { show: true, borderWidth: 0, padding: 4, borderColor: '#777777', backgroundColor: '#AAA', borderRadius: 0 } },
                    ]
                };
                //@ts-ignore
                options.series[0].markLine = markLine;
                //@ts-ignore
                options.series[0].areaStyle = {
                    opacity: 0.5,
                    color: new graphic.LinearGradient(0, 0, 0, 1, [{
                        offset: 0, color: 'rgb(255, 255, 255)'
                    }, { offset: 1, color: 'rgba(99, 125, 255)' }])
                };
            } else if (Array.isArray(options.series)) {
                options.series.forEach(s => {
                    //@ts-ignore
                    s.areaStyle = {
                        opacity: 0,
                        color: 'rgba(255, 255, 255)'
                    };
                    s.markLine = undefined;
                });
            }

            const latestOptions:EChartsOption = carefulOverride(options,this.props.subConfig);
            return <ReactECharts option={latestOptions} theme={getThm(this.context)}
                            replaceMerge={REP} ref={(e) => { this.echartRef = e; }} />;
        } catch {
            return <ChartHelp chartType="timeseries" />;
        }
    }
}

class EBoxPlot extends Component<EChartProps> {

    boxPlotFormatter = function(param:any) {
        return [
        //   'Experiment ' + param.name + ': ',
          'upper: <b>' + param.data[5] + '</b>',
          'Q3: <b>' + param.data[4] + '</b>',
          'median: <b>' + param.data[3] + '</b>',
          'Q1: <b>' + param.data[2] + '</b>',
          'lower: <b>' + param.data[1] + '</b>'
        ].join('<br/>')
      };

    // Assumes each numericColumn has 5 values   (min, Q1, avg, Q3, max)
    toBoxPlotOption(srs: SmartRs, theme: ThemeType): any {
        const ncs = srs.chartRS.numericColumns;
        const option = {
            xAxis: {type: 'category', data: ncs.map(n => n.name)},
            yAxis: { type: 'value', }, 
            series: ncs.map(n => { return { type: 'boxplot', data:[n.vals]} }),
            tooltip: { trigger: 'item', ...getTooltipDefaults(theme), formatter: this.boxPlotFormatter },
          };
        return option; 
    }
    
    // Each column represents a data set whos min/avg/med will be calculated. Obviously inefficient but handy to chart existing data.
    toBoxPlotOption3(srs: SmartRs, theme: ThemeType): any {
        const ncs = srs.chartRS.numericColumns;
        const option = {
            dataset: [
                    {source:ncs.map(n => n.vals)}, 
                    {fromDatasetIndex:0,  transform: { type: 'boxplot',config: { itemNameFormatter: (params:any) => params.value}}}
                ],
            xAxis: { type: 'category', data:ncs.map(n => n.name),  },
            yAxis: { type: 'value' },
            series: {
                type: 'boxplot', 
                datasetIndex:1,
                itemStyle:{
                    color:'rgba(99, 125, 255, 0.5)',
                    borderColor:'#999',
                    borderWidth:1,
                }
            },
            grid:DEF_GRID,
            tooltip: { trigger: 'item', ...getTooltipDefaults(theme), formatter: this.boxPlotFormatter  },
          };
        return option; 
    }
    
    onEvents: Record<string,Function> = {
        click: (e:any) => { console.log(e);
            if(e.name && e.value && Array.isArray(e.value) && e.value.length >= 3) {
                performClick(this.props, e.name ?? '', 'average', e.value[2] ?? undefined);
            }
        },
      }

    render() {
        const { srs, theme } = this.props;
        const s = needs({srs:this.props.srs, needsNumbers:1});
        if(s !== null) { 
            return <ChartHelp chartType="boxplot" reason={s} /> 
        }
        try {
            const myOptions:EChartsOption = carefulOverride(this.toBoxPlotOption3(srs, theme), this.props.subConfig);
            return <ReactECharts option={myOptions} theme={getThmT(theme)} replaceMerge={REP} onEvents={this.onEvents}/>;
        } catch {
            return <ChartHelp chartType="boxplot" />
        }
    }
}



class ESunburst extends Component<EChartProps & { chartType:"sunburst"|"tree"}> {

    toSunburstOption(srs: SmartRs, theme: ThemeType, chartType:"sunburst"|"tree"): any {
        const ncs = srs.chartRS.numericColumns;
        const scs = srs.chartRS.stringyColumns;
        const isTree = chartType === "tree";
        type leaf = ({ name:string, value:number } | { name:string, children:leaf[]});

        function getChildren(depth:number, parentName:string) {
            const isLeaf = depth === scs.length - 1;
            const res:leaf[] = [];
            for(let row=0; row<scs[0].vals.length; row++) {
                if(depth === 0 || scs[depth-1].vals[row] === parentName) {
                    const name = scs[depth].vals[row];
                    if(isLeaf) {
                        res.push({name, value:ncs.length > 0 ? ncs[0].vals[row] : 1});
                    } else {
                        if(!res.find(l => l.name === name)) {
                            res.push({name, children:getChildren(depth+1, name)});
                        }
                    }
                }
            }
            return res;
        }
        const data = getChildren(0, "");

        const option = {
            series: {
              type: chartType,
              data: isTree ? [{name:ncs[0].name, children:data}] : data,
              radius: [0, '95%'],
              emphasis: { focus: 'ancestor' },
              tooltip: { trigger: 'item', ...getTooltipDefaults(theme), 
              triggerOn: 'mousemove' },
              lineStyle:{color:theme === 'dark' ? "#888" : undefined},
              label: isTree ? { color:theme === 'dark' ? "#FFF" : "#222", position: 'right', verticalAlign: 'middle', align: 'left' } : {},
            }
          };
        return option; 
    }

    onEvents: Record<string,Function> = getClickHandler(this);

    render() {
        const { srs, theme, chartType } = this.props;
        const s = needs({srs:this.props.srs, needsNumbers:1});
        if(s !== null) { 
            return <ChartHelp chartType={chartType} reason={s} /> 
        }
        try {
            const myOptions:EChartsOption = carefulOverride(this.toSunburstOption(srs, theme, chartType), this.props.subConfig);
            return <ReactECharts option={myOptions} theme={getThmT(theme)} replaceMerge={REP} onEvents={this.onEvents} />;
        } catch {
            return <ChartHelp chartType={chartType} />
        }
    }
}



/////////////////////////////// HELP //////////////////////////////////////////


// For a selected database / type and chartType provide a sensibble query that will demo what that chart is capable of.
function getDemoQueryable(serverConfig:ServerConfig | undefined, ct: ChartType) {
    const qry = serverConfig?.jdbcType === "REDIS" ? "" :
                "\r\n// DEMO QUERY - DELETE AND REPLACE ME\r\n\r\n" + (serverConfig?.jdbcType === "KDB" ? getKdbDemoQueryable(ct) : getH2DemoQueryable(ct));
    return new Queryable(serverConfig?.name ?? "", qry, 5000, "");
}

function getReName(nm:string, subConfig: SubConfig): string {
    return get(subConfig.colConfig, nm+".name", nm) as string;
}

/**
 * Careful override as we don't want every chart to break and not render.
 * Also careful because it relies on ALL charts having a very specific series/tooltip data structure. 
 * e.g. Radar options are not a good fit but luckily don't collide to a broken setup.
 */
export function carefulOverride(options: EChartsOption, subConfig: SubConfig, isHorizontal = false): EChartsOption {
    const mergeSeries = (sery:SeriesOption) => {
        const nm = sery.name as string;
        const colConfig = subConfig.colConfig;
        if(nm !== undefined && nm in colConfig) {
            sery = merge(sery, colConfig[nm]); // notice, this merge overwrites name in original series if colConfig has override
            const axisChoice = colConfig[nm].axisChoice ?? "leftax";
            set(sery,isHorizontal ? "xAxisIndex" : "yAxisIndex",axisChoice === "leftax" ? 0 : 1);
            // Must be careful with these ones, since they may or may not already by set in the various chart types
            // and since they are at depth, they may not have been merged.
            const colNameUsed = "colFormat" in colConfig[nm] ? "x_SD_" + colConfig[nm].colFormat : nm;
            const formatter = SFormatters.getFormatter(colNameUsed, "number"); // terrible HACK!!!
            set(sery, "tooltip.valueFormatter", (value:any) => formatter(0, 0, value, null, null));
        }
        // subConfig editor can only set everything to one type. step can be true/false or string. So convert.
        const s = get(sery,"step",undefined);
        if(s !== undefined) {
            set(sery,"step", (s === "false" ? false : s === "true" ? true : s));
        }
        return sery;
    }

    try {
        if(subConfig) {
            let opt:EChartsOption = cloneDeep(options);
            if(subConfig.overrideJson && typeof subConfig?.overrideJson === "object") {

                // Opt Variations
                // opt = {xAxis:{},yAxis:[{},{}]}
                // opt = {xAxis:[{}.{}],yAxis:{}} - this occurs when horizontal
                // overrideJson = { xAxis:{}, yAxis:[{},{}]} OR { xAxis:[{},{}], yAxis:{}} when horizontal
                const customizer = (objValue:any, srcValue:any, key:any, object:any, source:any, stack:any) => {
                    // If only override is an array. Use first item as override
                    const isAxis = key === "yAxis" || key === "xAxis";
                    if(isAxis && !Array.isArray(objValue) && Array.isArray(srcValue) && srcValue.length > 0) {
                        return merge(objValue, srcValue[0]);
                    }
                    return undefined; // otherwise perform simple merge
                }
                opt = mergeWith(opt, subConfig.overrideJson, customizer);

                const dzShow = get(opt,"custom.dataZoom.show",undefined);
                if(dzShow !== undefined) {
                    const o:object = get(opt,"custom.dataZoom",{}) as object;
                    const dz1:DataZoomComponentOption = {...{ brushSelect: true}, ...o};
                    const dz:DataZoomComponentOption[] = [dz1, { type: 'inside' }];
                    set(opt,"dataZoom",dzShow === false ? undefined: dz);

                    const bot = get(opt,"grid.bottom",undefined);
                    if(dzShow && (bot === "5.12%" || bot === 0)) {
                        set(opt,"grid.bottom","17%");
                    }
                } else {
                    // check if original options had it and if it did not make sure to remove it
                    if("dataZoom" in opt && !("dataZoom" in options)) {
                        delete opt["dataZoom"];
                    }
                }
            }
            if(typeof subConfig?.colConfig === "object") {
                if(Array.isArray(opt.series)) {
                    opt.series = opt.series.map(so => mergeSeries(so));
                } else {
                    opt.series = mergeSeries(opt.series as SeriesOption);
                }
                const leg = get(opt, "legend.data", undefined);
                if(isStringArray(leg)) {
                    set(opt, "legend.data", (leg as string[]).map(nm => getReName(nm, subConfig)));
                }
            }
            return opt;
        }
    } catch (e) {
        // Ignore
    }
    return options;
}

export function isStringArray(o:any):boolean {
    return Array.isArray(o) && o.length>0 && typeof o[0] === "string";
}