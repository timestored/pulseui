import React, { Component, Suspense, useState } from 'react';
import QueryEngine, { getSensibleServerIdx, Queryable, UpdatingQueryable, UpdatingQueryableListener } from '../engine/queryEngine';
import { MyHelpLink, MyModal, getDefaultErrorFallback } from './CommonComponents';
import { Col, DataTypes, SmartRs } from '../engine/chartResultSet';
import ReactECharts from '../echarts-for-react';
import { Button, IconName, MenuItem, NonIdealState } from '@blueprintjs/core';
import { ServerConfig } from './ConnectionsPage';
import { TabNode } from 'flexlayout-react';
import { ChartWrapper } from '../styledComponents';
import { ExampleTestCases } from '../engine/ViewStrategy';
import { DataZoomComponentOption, EChartsOption, graphic, PieSeriesOption, SeriesOption, TitleComponentOption } from 'echarts';
import { Link } from 'react-router-dom';
import 'jsonic';
import { clone, get, merge, set } from "lodash-es";
import { IThemeType, ThemeContext, ThemeType } from '../context';
import { SFormatters } from './AGrid';
// Think echarts is needed for theme import
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import echarts from 'echarts';
import "./customed.js";
import { ItemRenderer, Select2 } from '@blueprintjs/select';
import { TbChartBubble, TbChartCandle, TbChartRadar, TbCone } from 'react-icons/tb';
import { AiOutlineBoxPlot } from 'react-icons/ai';

import { ErrorBoundary } from '../ErrorBoundary';
import { SubConfigEditor } from './SubConfigEditor';
const ESurface = React.lazy(() => import('./3DChartFactory'));
const AGrid = React.lazy(() => import('./AGrid'));

export const chartTypes = ["grid", 'timeseries', 'area', 'line', "bar", "stack", "bar_horizontal", "stack_horizontal", "pie",
    "scatter", "bubble", "candle", "radar", "treemap", "heatmap", "calendar", "boxplot", "3dsurface", "3dbar",
    "sunburst", "tree"] as const;
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
    let backgroundColor = theme === 'dark' ? 'rgba(11,11,11,0.75);' : "rgba(210,210,210,0.75);";
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
    tabNode: TabNode,
    queryEngine: QueryEngine,
    serverConfigs: ServerConfig[]
};
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
// colFormats - Are our specific formatters
// seriesSettings - Is the SeriesOption from echarts but stored by columnName key. Meaning we don't need to know mapping.
export type SubConfig = {overrideJson:EChartsOption, colConfig:ColConfig};
export const getEmptySubConfig = ():SubConfig => { return {overrideJson:{}, colConfig:{}}; };
export type ColConfig = {[k:string]:SeriesOption & {colFormat?:ColFormat}};
export type ColFormat = ""|"NUMBER0"|"NUMBER1"|"NUMBER2"|"NUMBER3"|"NUMBER4"|"NUMBER5"|"NUMBER6"|"NUMBER7"|"NUMBER8"|"NUMBER9"|"PERCENT0"|"PERCENT1"|"PERCENT2"
  |"CURUSD"|"CUREUR"|"CURGBP"|"TAG"|"HTML";


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
            <MyHelpLink href="/help/chart" htmlTxt="Click link to see full demos of all display options" />
        </>;
}

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
        var config = this.props.tabNode.getConfig();

        let qb = config?.dashstate?.queryable;
        if(qb === undefined) {
            let serverIdx = getSensibleServerIdx(props.serverConfigs);
            let serverConfig = serverIdx === undefined ? undefined : props.serverConfigs[serverIdx];
            qb = getDemoQueryable(serverConfig, props.chartType);
        }

        this.uQueryable = new UpdatingQueryable(props.serverConfigs, props.queryEngine, this, qb);
        // save state in flexlayout node tree
        this.props.tabNode.setEventListener("save", (p:any) => {
            config.dashstate = { chartType: this.state.chartType, config: this.state.config, queryable: this.uQueryable.queryable, subConfig: this.state.subConfig, };
        });
        // Then load in the saved overrides
        let ds = config.dashstate ?? {};
        let oldFix = Object.keys(ds).includes("chartType") ? { chartType:this.remapOldChartTypes(ds['chartType'])} : {};
        const s = { ...this.state, ...props, ...ds, ...oldFix };
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

        let Display: JSX.Element | null = <div>Error!</div>;

        try {
            Display = srs === undefined ? null :
                exception ?
                <NonIdealState icon="error" title="Error Generating Visualization" description={exception}
                    action={<div>Try changing a query setting in the editor</div>} />
                : MyUpdatingChart.getChart(chartType, srs, this.context.theme, subConfig, this.onConfigChange, this.state.myKey);
        } catch (error) {
            console.error(error);
        }
        const allowsSubconfig = ['timeseries', 'area', 'line', "bar", "stack", "bar_horizontal", "stack_horizontal", "scatter", "bubble", "grid",
                // "pie",  "candle", "radar", "treemap", "heatmap", "calendar", "boxplot", "3dsurface", "3dbar","sunburst", "tree"
                ].includes(chartType);

        return <ChartWrapper>
            <ErrorBoundary  resetKeys={[chartType]} FallbackComponent={getDefaultErrorFallback("Error displaying this chart. Try changing chart type.")} >{Display}</ErrorBoundary>
            {this.props.selected &&
                <MyModal title="MyEditor:" isOpen={true} handleClose={this.props.clearSelected}>
                    {this.uQueryable.getEditor(<ChartForm chartType={chartType} onItemSelect={ct => { this.setState({ chartType: ct})}} />)}
                    {allowsSubconfig && <SubConfigEditor subConfig={subConfig} srs={srs} isGrid={chartType==="grid"}
                            onChange={(s,forceRefresh) => { this.setState({subConfig:s, myKey:this.state.myKey + (forceRefresh ? 1 : 0)}); }} />}
                </MyModal>}
        </ChartWrapper>;
    }

    public static getChart(ct: ChartType, srs: SmartRs, theme: ThemeType = "light", subConfig?:SubConfig, onConfigChange:(s:SubConfig)=>void = ()=>{}, myKey?:number): JSX.Element | null {
        if(ct === undefined) {
            return null;
        }
        const sc = subConfig === undefined ? getEmptySubConfig() : subConfig;
        const args = {  srs:srs, subConfig:sc, key:myKey, theme:theme  };

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


const DEF_GRID = { left: 0, top: 10, right: 10, bottom: 0,containLabel: true };

// Without replaceMerge - removing an existing key, i.e. resetting a default such as background color would NOT take effect.
// However notMerge causes a full redraw on all new data. So we need to specify which entries may have keys reset AND
// let eCharts know to always fully replace those parts.
const REP = ["grid","title","axisPointer","xAxis","yAxis"]; // Legend not included else it means you can't toggle the legend showing
type EChartProps = {  srs: SmartRs, subConfig:SubConfig, theme: ThemeType };

class EPie extends Component<EChartProps> {
    render() {
        const { srs, theme } = this.props;
        let s = needs({srs:this.props.srs, needsNumbers:1});
        if(s !== null) { 
            return <ChartHelp chartType="pie" reason={s} /> 
        }
        try {
            let myOptions:EChartsOption = carefulOverride(toPieOption(srs, theme), this.props.subConfig);
            return <>{srs.count() > 200 ? 
                        <NonIdealState icon="error" title="Too Many Rows" >
                            Pie Chart with &gt; 200 segments makes little sense.
                            <br />We recommend merging some of the segments into groups.
                        </NonIdealState>
                        : <ReactECharts key={srs.chartRS.numericColumns.length} option={myOptions} theme={getThmT(theme)} replaceMerge={REP} />}
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
        const s1 = toSeries(ncs[0], { radius: '39%', center: ['25%', '30%'], name:"asd"});
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
    let nc = srs.chartRS.numericColumns;
    const MIN = Math.min(0, ...nc.map(n => Math.min(...n.vals)));
    const MAX = Math.max(1, ...nc.map(n => Math.max(...n.vals)));
    // Create [[column,row,val],[column,row,val]...]
    let d: number[][] = [];
    for (let c = 0; c < nc.length; c++) {
        let va = nc[c].vals;
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
        let s = needs({srs:this.props.srs, needsNumbers:1});
        if(s !== null) { 
            return <ChartHelp chartType="heatmap" reason={s} /> 
        }

        try {
            let myOptions:EChartsOption = carefulOverride(toHeatmapOption(srs), this.props.subConfig);
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

class ETreeMap extends Component<EChartProps> {
    static contextType?: React.Context<any> | undefined = ThemeContext;
    context!: React.ContextType<typeof ThemeContext>;
    render() {
        const chartRS = this.props.srs.chartRS;

        let s = needs({srs:this.props.srs, needsNumbers:1, needsStringy:true});
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
            let nameToIndices = groupIndices(names[0]);
            let s = Array.from(nameToIndices.keys()).map(n => {
                let indices = nameToIndices.get(n)!;
                let sum = nums.filter((v, idx) => indices.indexOf(idx) >= 0).reduce((a, b) => a + b, 0);
                let d: { name: string, value: number | number[], children?: any } = { name: n, value: [sum, Math.sqrt(sum)] };
                if (names.length > 1) {
                    let selectedIndices = function (s: any, sIdx: number) { return indices.indexOf(sIdx) >= 0; };
                    let newNames = names.slice(1).map(stAr => stAr.filter(selectedIndices));
                    let newNums = nums.filter(selectedIndices);
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
            let myOptions:EChartsOption = carefulOverride(options, this.props.subConfig);
            return <ReactECharts option={myOptions} theme={getThm(this.context)} replaceMerge={REP} />;
        } catch {
            return <ChartHelp chartType="treemap"  />
        }
    }
}


class EChart extends Component<EChartProps & { chartType:ChartType }> {
    static contextType?: React.Context<any> | undefined = ThemeContext;
    context!: React.ContextType<typeof ThemeContext>;

    render() {
        const { srs, chartType } = this.props;
        let s = needs({srs:this.props.srs, needsNumbers:1});
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
        const myYAxis = { type:'value', name: nc.length === 1 ? nc[0].name : undefined };

        try {
            const options: EChartsOption = {
                legend: { data: nc.map(e => e.name), show: nc.length > 1 },
                tooltip: { ...getTooltipDefaults(this.context.theme), trigger: 'axis' },
                xAxis: isHorizontal ? myYAxis : myXAxis,
                yAxis: isHorizontal ? myXAxis : myYAxis,
                // Horizontal needs slightly more space in case top bar is full width and onto legend.
                grid:(chartType === "bar_horizontal" || chartType === "stack_horizontal") ? { ...DEF_GRID, top:20  } : DEF_GRID,
                series: nc.map(arra => {
                    let sery:SeriesOption = {
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
            
            let myOptions:EChartsOption = carefulOverride(options,this.props.subConfig);
            return <ReactECharts option={myOptions} theme={getThm(this.context)} replaceMerge={REP} />;
        } catch {
            return <ChartHelp chartType={chartType} />
        }
    }
}



class EScatter extends Component<EChartProps & {etype: "scatter" | "bubble" }> {
    static contextType?: React.Context<any> | undefined = ThemeContext;
    context!: React.ContextType<typeof ThemeContext>;
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
            let newNC = nc.slice(0, 0);
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
                    let s: any = {
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
            let myOptions:EChartsOption = carefulOverride(options,this.props.subConfig);
            return <ReactECharts option={myOptions} theme={getThm(this.context)} replaceMerge={REP} />;
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

            let myOptions:EChartsOption = carefulOverride(canNOToption, this.props.subConfig);
            return <ReactECharts option={myOptions} theme={getThm(this.context)} replaceMerge={REP} />;
        } catch {
            return <ChartHelp chartType="candle" />
        }
    }
}

export function ChartHelp(props:{chartType:ChartType, reason?:string}) {
    const cHelp = getChartHelpFor(props.chartType);
    const { reason } = props;
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
    render() {
        let s = needs({srs:this.props.srs, needsNumbers:1, needsDates:true});
        if(s !== null) { 
            return <ChartHelp chartType="calendar" reason={s} /> 
        }
        function getDataForYear(srs: SmartRs , year:number) {
            const dates = srs.chartRS.dateColumns[0].vals;
            const nums = srs.chartRS.numericColumns[0].vals;
            let tvdata = [];
            for(let i=0; i<dates.length; i++) {
                let d = dates[i];
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
                return { type: 'heatmap', coordinateSystem: 'calendar', calendarIndex: idx, data: getDataForYear(srs, year),}
            });

            let option:EChartsOption = {
                tooltip: { ...getTooltipDefaults(this.context.theme), position: 'top'},
                visualMap: { min: valRange[0], max: valRange[1], calculable: true, orient: 'vertical', left: 'left', top: 'center' },
                // @ts-ignore
                calendar: calendars, series: series,
                grid:DEF_GRID,
            };
            let myOptions:EChartsOption = carefulOverride(option, this.props.subConfig);
            return <ReactECharts option={myOptions} theme={getThm(this.context)} replaceMerge={REP} />;
        } catch {
            return <ChartHelp chartType="calendar" /> 
        }
    }
}


class ERadar extends Component<EChartProps> {
    // TODO THis context isn't updating on toggle
    static contextType?: React.Context<any> | undefined = ThemeContext;
    context!: React.ContextType<typeof ThemeContext>;
    render() {
        try {
            const srs = this.props.srs;

            let s = needs({srs:this.props.srs, needsNumbers:1});
            if(s !== null) { 
                return <ChartHelp chartType="radar" reason={s} /> 
            }

            const indicators = srs.chartRS.numericColumns.map(nc => {return { name: nc.name}});  // { name: 'Marketing', max: undefined }
            const legends = srs.chartRS.rowLabels;
            const data = legends.map((rowLabel, row) => {return { value:srs.chartRS.numericColumns.map(nc => nc.vals[row]), name:rowLabel}});
            
            let option:EChartsOption = {
                legend:{ data: legends, show:srs.count() <= 10 }, // No point showing massive legend overdrawing the chart
                radar: { indicator: indicators, },
                series: [ { type: 'radar', data: data, areaStyle: { } } ],
                grid:DEF_GRID,
                animation:false,
              };

            let myOptions:EChartsOption = carefulOverride(option, this.props.subConfig);
            return <>{srs.count() > 500 ? 
                <NonIdealState icon="error" title="Too Many Rows" >
                    Radar with &gt; 500 rows, where each row is a color, does not make sense.
                    <br />We recommend merging some of the segments into groups.
                </NonIdealState> 
                : <ReactECharts option={myOptions} theme={getThm(this.context)} replaceMerge={REP} />}</>;
        } catch {
            return <ChartHelp chartType="radar"  />;
        }
    }
}


type sym = 'circle' | 'rect' | 'roundRect' | 'triangle' | 'diamond' | 'pin' | 'arrow' | 'none';
function toNameSymbols(tnc: string[]): { name: string, sdname: string, sym: sym }[] {
    function toSymbol(sdname: string): sym {
        let s = sdname.toLowerCase();
        let names: Array<sym> = ['circle', 'rect', 'roundRect', 'triangle', 'diamond', 'pin', 'arrow', 'none'];
        for (const n of names) {
            if (s.endsWith(n.toLowerCase())) {
                return n;
            }
        }
        return "none";
    }

    return tnc.map(name => {
        let p = name.toLowerCase().indexOf("_sd_");
        let sdname = p === -1 ? name : name.substring(0, p);
        let sym = p === -1 ? "none" : toSymbol(name.substring(p));
        return { name: name, sdname, sym };
    });
}

class ETimeSeries extends Component<EChartProps> {
    static contextType?: React.Context<any> | undefined = ThemeContext;
    context!: React.ContextType<typeof ThemeContext>;
    prevOverride:EChartsOption = {};

    render() {
        try {
            const srs = this.props.srs;

            let s = needs({srs:this.props.srs, needsNumbers:1, needsDates:true});
            if(s !== null) { 
                return <ChartHelp chartType="timeseries" reason={s} /> 
            }
            let timCol = srs.chartRS.dateColumns[0];
            let tnc = srs.chartRS.numericColumns.filter(nc => !nc.name.toUpperCase().endsWith("_SD_SIZE"));
            const nameSymbols = toNameSymbols(tnc.map(nc => nc.name));
            let headers = [...[timCol.name], ...tnc.map(tc => tc.name)];
            let dDayData = timCol.vals.map((dt, idx) => {
                let a: (string | number)[] = [dt.toISOString()];
                tnc.forEach(nc => a.push(nc.vals[idx]));
                return a;
            })
            const isSingle = tnc.length === 1;
            var hadSymbol = false;
            const symCols = nameSymbols.filter(ns => ns.sym !== "none");

            const options: EChartsOption = {
                legend: { show: symCols.length > 0,  data: symCols.map(sc => sc.sdname)  },
                grid: { right: '65px', left: '8%', top: '5%', bottom: '5.12%' },
                dataset: {
                    source: dDayData,
                    dimensions: headers,
                },
                xAxis: { type: 'time', splitLine: { show: true, lineStyle: { type: 'dashed' } }, },
                yAxis: { scale: true, splitLine: { show: true, lineStyle: { type: 'dashed' } }, },
                series: tnc.map((tc, idx) => {
                    let isSymbol = nameSymbols[idx].sym !== "none";
                    hadSymbol = hadSymbol || isSymbol;
                    return {
                        name: nameSymbols[idx].sdname,
                        type: 'line',
                        step: 'middle',
                        animation: true,
                        symbol: nameSymbols[idx].sym,
                        symbolSize: function (value: any, params: Object) {
                            let a = srs.chartRS.numericColumns.find(nc => nc.name.toUpperCase() === nameSymbols[idx].sdname.toUpperCase()+"_SD_SIZE");
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
                    trigger: 'axis', axisPointer: { type: 'cross', label: { precision: 4 } },
                },
            };
            // If only one series, shade it in and add markers.
            if (Array.isArray(options.series) && options.series.length === 1) {
                //@ts-ignore
                let markLine: MarkLineOption = {
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

            let latestOptions:EChartsOption = carefulOverride(options,this.props.subConfig);
            return <ReactECharts option={latestOptions} theme={getThm(this.context)} 
                            replaceMerge={REP}  />;
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
        let option = {
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
        let option = {
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
    

    render() {
        const { srs, theme } = this.props;
        let s = needs({srs:this.props.srs, needsNumbers:1});
        if(s !== null) { 
            return <ChartHelp chartType="boxplot" reason={s} /> 
        }
        try {
            let myOptions:EChartsOption = carefulOverride(this.toBoxPlotOption3(srs, theme), this.props.subConfig);
            return <ReactECharts option={myOptions} theme={getThmT(theme)} replaceMerge={REP} />;
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
            let res:leaf[] = [];
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
        let data = getChildren(0, "");

        let option = {
            series: {
              type: chartType,
              data: isTree ? [{name:"", children:data}] : data,
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

    render() {
        const { srs, theme, chartType } = this.props;
        let s = needs({srs:this.props.srs, needsNumbers:1});
        if(s !== null) { 
            return <ChartHelp chartType={chartType} reason={s} /> 
        }
        try {
            let myOptions:EChartsOption = carefulOverride(this.toSunburstOption(srs, theme, chartType), this.props.subConfig);
            return <ReactECharts option={myOptions} theme={getThmT(theme)} replaceMerge={REP} />;
        } catch {
            return <ChartHelp chartType={chartType} />
        }
    }
}



/////////////////////////////// HELP //////////////////////////////////////////

export default interface ChartTypeHelp {
    chartType: ChartType;
    /** a textual description of this chart type */
    description: string;
    /** Simplest Example TestCase */
    testCase: TestCase;
    /** An explanation of the Data Table format best used and how it affects what is displayed. */
    formatExplainationHtml: JSX.Element;
    /**  @return Examples of queries.   */
    examples: Array<ExampleView>;
    icon: string;
}

class ChartTypeHelpC implements ChartTypeHelp {
    constructor(readonly chartType: ChartType, readonly description: string, readonly testCase: TestCase,
        readonly formatExplainationHtml: JSX.Element, readonly examples: Array<ExampleView> = [], readonly icon: string = "") { }
}
class ExampleView { constructor(readonly name: string, readonly description: string, readonly testCase: TestCase) { } }
class TestCase { constructor(readonly kdbQuery: string, readonly name: string, readonly srs: SmartRs) { } }




export function getChartHelp(): ChartTypeHelp[] {
    let r: ChartTypeHelp[] = [];
    let simpleFormatExplain = <ul>
        <li>The first string columns are used as category labels.</li>
        <li>Whatever numeric columns appear after the strings represents a separate series in the chart.</li>
    </ul>;

    const timeSeriesExplain = <ol>
        <li>The first date/time column found will be used for the x-axis.</li>
        <li>Each numerical column represents one time series line on the chart.</li>
    </ol>;
    
    const calendarFormatExplain = <ul>
        <li>The table should contain a date and atleast one numeric column.</li>
        <li>The first numeric column will be used as the value for that date.</li>
        <li>Dates should not be repeated. If they are the value selected is not guaranteed.</li>
        </ul>;

    const candleFormatExplain = <ul>
        <li>The table should contain columns labelled open/high/low/close/volume.</li>
        <li>The table must atleast contain high/low or open/close to allow it to be drawn.</li>
        </ul>;
        
    const pieFormatExplain = <ul>
        <li>Each numeric column represents one pie chart. The title of each pie chart will be the column title.</li>
        <li>The segments of the pie chart use the string columns as a title where possible.
            If there are no string columns, row numbers are used.
        </li>
    </ul>;
    
    const scatterFormatExplain = <ul>
        <li>Two or more numeric columns are required.</li>
        <li>The values in the first column are used for the X-axis.</li>
        <li>The values in following columns are used for the Y-axis. Each column is displayed with a separate color.</li>
    </ul>;

    const radarFormatExplain = <ul>
        <li>A radar chart requires 3 or more numeric columns to render sensibly.</li>
        <li>Each numeric column represents one spoke in the radar. The column titles are used as spoke titles.</li>
        <li>Each row in the data represents one circle withing the radar.</li>
    </ul>;

    const bubbleFormatExplain = <ul>
        <li>The first string columns are used as category labels.</li>
        <li>There must then be 3 numeric columns which are used for x-coord, y-coord, size in that order.</li>
    </ul>;

    const surfaceFormatExplain = <ul>
        <li>Three numeric columns are required.</li>
        <li>The 3 numeric columns represent x-coord, y-coord, z-coord in that order.</li>
        </ul>;

    const gridFormatExplain = <ul>
        <li>Data table where everything exept special _SD_ columns are shown.</li>
        <li>Columns can have formatters set based on name or stored preferences.</li>
        <li>Rows can have individual highlighting OR fully specified HTML content.</li>
        </ul>;
    
    const treeFormatExplain = <ul>
        <li>Starting from the left each string column is taken as one nesting level</li>
        <li>The first numerical column will be taken as size.</li>
    </ul>;

    const heatmapFormatExplain = <ul>
        <li>Each numerical column in the table becomes one column in the chart.</li>
        <li>The numerical values represent the shading within the chart.</li>
    </ul>;


    const boxplotFormatExplain = <ul>
        <li>Each numerical column in the table becomes one boxplot item in the chart.</li>
        <li>The min/max/median/Q1/Q3 are calculated from the raw data.</li>
        <li>This is inefficient as a lot more data is being passed than needed but useful for toggling an existing data set view quickly.</li>
    </ul>;

    r.push(new ChartTypeHelpC("candle", "Candlestick Chart", ExampleTestCases.OHLC_TESTCASE, candleFormatExplain));

    r.push(new ChartTypeHelpC("area", "Area Chart", ExampleTestCases.COUNTRY_STATS, simpleFormatExplain));
    r.push(new ChartTypeHelpC("line", "Line Chart", ExampleTestCases.COUNTRY_STATS, simpleFormatExplain));
    r.push(new ChartTypeHelpC("bar", "Bar Chart", ExampleTestCases.COUNTRY_STATS, simpleFormatExplain));
    r.push(new ChartTypeHelpC("bar_horizontal", "Horizontal Bar Chart", ExampleTestCases.COUNTRY_STATS, simpleFormatExplain));
    r.push(new ChartTypeHelpC("stack", "Stacked Bar Chart", ExampleTestCases.COUNTRY_STATS, simpleFormatExplain));
    r.push(new ChartTypeHelpC("stack_horizontal", "Horizontal Stacked Bar Chart", ExampleTestCases.COUNTRY_STATS, simpleFormatExplain));

    r.push(new ChartTypeHelpC("pie", "Pie Chart", ExampleTestCases.COUNTRY_STATS, pieFormatExplain));
    r.push(new ChartTypeHelpC("scatter", "Scatter Graph", ExampleTestCases.COUNTRY_STATS, scatterFormatExplain));
    r.push(new ChartTypeHelpC("bubble", "Bubble Map", ExampleTestCases.COUNTRY_STATS, bubbleFormatExplain));
    r.push(new ChartTypeHelpC("radar", "Radar", ExampleTestCases.COUNTRY_STATS, radarFormatExplain));
    r.push(new ChartTypeHelpC("calendar", "Calendar Heatmap", ExampleTestCases.CALENDAR_TESTCASE, calendarFormatExplain));
    
    r.push(new ChartTypeHelpC("heatmap", "Heatmap", ExampleTestCases.COUNTRY_STATS, heatmapFormatExplain));
    r.push(new ChartTypeHelpC("treemap", "Treemap", ExampleTestCases.COUNTRY_STATS, treeFormatExplain));

    r.push(new ChartTypeHelpC("grid", "Data Grid", ExampleTestCases.COUNTRY_STATS, gridFormatExplain));
    r.push(new ChartTypeHelpC("timeseries", "Time-Series Chart", ExampleTestCases.COUNTRY_STATS, timeSeriesExplain));

    r.push(new ChartTypeHelpC("boxplot", "Boxplot", ExampleTestCases.COUNTRY_STATS, boxplotFormatExplain));
    r.push(new ChartTypeHelpC("3dsurface", "3D Surface", ExampleTestCases.COUNTRY_STATS, surfaceFormatExplain));
    r.push(new ChartTypeHelpC("3dbar", "3D Bar Chart", ExampleTestCases.COUNTRY_STATS, surfaceFormatExplain));
    r.push(new ChartTypeHelpC("sunburst", "Sunburst", ExampleTestCases.COUNTRY_STATS, treeFormatExplain));
    r.push(new ChartTypeHelpC("tree", "Tree", ExampleTestCases.COUNTRY_STATS, treeFormatExplain));

    

    return r;
}

export function getChartHelpFor(chartType:ChartType): ChartTypeHelp { return getChartHelp().find(c => c.chartType === chartType)!; }

function getKdbDemoQueryable(ct: ChartType):string {
    switch(ct) {
        case "timeseries": 
            return "// Time Series display can be configured by column names. See help->timeseries for details"
            + "\n{  walk:{ [seed;n]"
                + "\n\t r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};"
                + "\n\t prds (100+((r[seed;n]) mod 11)-5)%100};"
                + "\n\t c:{x mod `long$00:20:00.0t}x;   st:x-c;   cn:`long$c%1000;"
                + "\n\t ([] time:.z.d+st+1000*til cn; gold:walk[100;cn]; bitcoin:walk[2;cn])  }[.z.t]";  
        case "bar": 
        case "stack": 
        case "bar_horizontal": 
        case "stack_horizontal": 
        case "line": 
        case "area": 
        case "pie": return "// See help->charts for details on format to customize your chart appearance"
            + "\n([] Company:`Microsoft`Oracle`Paypal`Monero`FXC`Braint`MS`UBS; "
            + "\n\t  PnL:(0.8+rand[0.2])*31847.0 13239.0 127938.0 81308.0 63047.0 13010.0 152518.0 166629.0;"
            + "\n\t  Revenue:(0.9+rand[0.1])*15080.0 11300.0 34444.0 3114.0 2228.0 88.9 1113.0 41196.0 ; "
            + "\n\t  Negatives:(0.95+rand[0.05])*48300.0 8400.0 34700.0 38100.0 36500.0 413.0 1788.0 11732.0 )";
        case "treemap":
        case "heatmap":
        case "scatter": 
        case "bubble": return "// The first numeric column is x-axis, 2nd is y-axis, 3rd is bubble size. Strings are used as labels. \n"
                + "update exports:(0.1+9?0.1)*GDP, exportsPerCapita:(0.4+9?0.1)*GDPperCapita from "
                + "\n\t  ([] Country:`US`France`japan`Germany`UK`Zimbabwe`Bangladesh`Nigeria`Vietnam; "
                + "\n\t  Population:(0.9+9?0.2)*313847.0 213847.0 127938.0 81308.0 63047.0 13010.0 152518.0 166629.0 87840.0 ;"
                + "\n\t  GDP:(0.9+9?0.2)*15080.0 3333. 4444.0 3114.0 2228.0 9.9 113.0 196.0 104.0 ; "
                + "\n\t  GDPperCapita:(0.9+9?0.2)*0.001*48300.0 37000 34700.0 38100.0 36500.0 413.0 1788.0 732.0 3359.0)";
        case "radar":  return "([] portfolio:`threadneedle`diamonte; agri:100 10; realEstate:100 10; tech:0 80; growthPotential:50 100; finance:60 20) \n";
        case "candle": return  "// Column names are used to identify Open/High/low/Close/Volume\n"
                            + "{  r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};"
                            + "\n\twalk:{ [r;seed;n] prds (100+((r[seed;n]) mod 11)-5)%100}[r;;];"
                            + "\n\tc:{x mod `long$00:05:00.0t}x;   st:x-c;   cn:100+`long$c%1000;"
                            + "\n\tt:([] time:`second$.z.d+st+1000*til cn; open:walk[9;cn]; close:walk[105;cn]);"
                            + "\n\t-100 sublist update low:?[open > close;close;open]-(r[11;cn] mod 11)*0.02,high:?[open < close;close;open]+(r[44;cn] mod 11)*0.02,volume:(r[44;cn] mod 110) from t}[.z.t]";;
        case "calendar": return "// A date and value column must be supplied. \n" + ExampleTestCases.CALENDAR_TESTCASE.kdbQuery;
        case "grid": 
            return "// Table display can be configured using column names. See help->charts for details on format."
                + "\nupdate percbar_SD_DATABAR:percent_SD_PERCENT0 ,bid_SD_FG:((`$(\"#FF6666\";\"#66FF66\";\"\"))!`$(\"#222\";\"#222\";\"\")) bid_SD_BG from  "
                + "\n\t ([] time:.z.t-til 50; "
                + "\n\t\t status:50?`partial`filled; "
                + "\n\t\t instrument:50?`GBPUSD`USDNZD`USDCAD`CHFJPY`EURUSD;"
                + "\n\t\t symbol_SD_TAG:50?`UBS`C`MS`HSBC`NOMURA`DB;"
                + "\n\t\t price_SD_CURUSD:50?100.0;"
                + "\n\t\t bid:50?20.0;"
                + "\n\t\t bid_SD_BG:50?`$(\"#FF6666\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"#66FF66\");"
                + "\n\t\t bid_SD_CODE:50?(\"0.xXXx\";\"0.XXx\";\"0.xxXX\");"
                + "\n\t\t percent_SD_PERCENT0:50?1.0 )";
        case "boxplot": return "([] gold:10?10; silver:til 10; crude:desc til 10; slick:13-til 10; copper:10?3; iron:10?8; diamond:4+10?8; rubber:6+10?10; lead:8+10?12)";
        case "sunburst": 
        case "tree":
            return "([] Continent:`NA`Asia`Asia`Europe`Asia`Europe`Europe`SA`Europe`NA`Europe`Asia`Australia`Europe`NA;"
            + "\n\t  TradingBloc:`US`China`Japan`EU`India`UK`EU`Brazil`EU`US`Russia`SouthKorea`Australia`EU`US; "
            + "\n\t  Country:`US`China`Japan`Germany`India`UK`France`Brazil`Italy`Canada`Russia`SouthKorea`Australia`Spain`Mexico; "
            + "\n\t  GDP:19.485 12.238 4.872 3.693 2.651 2.638 2.583 2.054 1.944 1.647 1.578  1.531 1.323 1.314 1.151 )";
        case "3dsurface": 
        case "3dbar":
            return "update z:sin y from ([] x:(til 1000) mod 20; y:(til 1000)%100+rand[22])";
    }
}


export function getH2DemoQueryable(ct: ChartType):string {
    switch(ct) {
        case "timeseries":  return "SELECT TIME,BID,ASK FROM quote WHERE NAME='NFLX' AND TIME>timestampadd(minute,-20,date_trunc('minute',CURRENT_TIMESTAMP())) ORDER BY TIME ASC;"
        case "bar": 
        case "stack": 
        case "bar_horizontal": 
        case "stack_horizontal": 
        case "line": 
        case "area":  return "select name, quantity,mid from position WHERE name<>'BRK.A'AND name<>'GOOG';";
        case "pie": return "select name,quantity from position ORDER BY quantity DESC LIMIT 7";
        case "treemap":
        case "heatmap":
        case "scatter": 
        case "bubble":  return "select NAME,MARKETVALUE,PNL,QUANTITY/5.  From position WHERE NAME<>'BRK.A' AND NAME<>'BABA' AND NAME<>'GOOG';";
        case "candle": return "select time,open,high,low,close,volume from candle ORDER BY time asc;";
        case "calendar": return "select date,close from vix;";
        case "grid":  
            return "SELECT `time`,`STATUS`,SYMBOL AS SYMBOL_SD_TAG,`INSTRUMENT NAME`,QUANTITY AS QUANTITY_SD_NUMBER0,"
                + "\n\t DESTINATION,ORDERTYPE AS ORDERTYPE_SD_TAG, PRICE AS PRICE_SD_CURUSD,"
                + "\n\t `PERCENT DONE` AS PERCENT_SD_PERCENT0, `AVG PX`, `PERCENT DONE` AS PERCENT_SD_DATABAR,"
                + "\n\t `UPNL` AS UPNL_SD_CURUSD"
                + "\nFROM TRADE ORDER BY TIME DESC LIMIT 300;";
        case "radar": return "select  name,mid,pnl,quantity,marketvalue,mid  From position ORDER BY quantity DESC,pnl desc LIMIT 8;";
        case "boxplot": 
            return "select 2+rand()*open AS gold, 4+rand()*2*high AS silver,2+rand()*1.5*low as crude, 2.2+rand()*3*close AS slick,"
            + "\n\t 1.5+rand()*open AS copper,1+rand()*2*high AS iron,4+rand()*1.5*low as diamond,rand()*3*close AS rubber, 1+rand()*3*close AS lead"
            + "\n\t from candle ORDER BY time asc;";
        case "3dsurface": 
        case "3dbar":
            return "select mod(rownum()-1,5) as x,(rownum()-1)/40.0 as y,sin((rownum()-1)/(40.0+floor(3*rand()))) as z from vix";
        case "sunburst": 
        case "tree":
            return "select ORDERTYPE,SYMBOL,SUM(QUANTITY) from trade GROUP BY ORDERTYPE,SYMBOL ORDER BY ORDERTYPE,SYMBOL LIMIT 36;";
    }
}

// For a selected database / type and chartType provide a sensibble query that will demo what that chart is capable of.
function getDemoQueryable(serverConfig:ServerConfig | undefined, ct: ChartType) {
    let qry = undefined;
    qry = serverConfig?.jdbcType === "KDB" ? getKdbDemoQueryable(ct) : getH2DemoQueryable(ct);
    return new Queryable(serverConfig?.name ?? "", qry, 5000);
}

function getReName(nm:string, subConfig: SubConfig): string {
    return get(subConfig.colConfig, nm+".name", nm) as string;
}

/**
 * Careful override as we don't want every chart to break and not render.
 * Also careful because it relies on ALL charts having a very specific series/tooltip data structure. 
 * e.g. Radar options are not a good fit but luckily don't collide to a broken setup.
 */
export function carefulOverride(options: EChartsOption, subConfig: SubConfig): EChartsOption {
    const mergeSeries = (sery:SeriesOption) => {
        const nm = sery.name as string;
        const colConfig = subConfig.colConfig;
        if(nm !== undefined && nm in colConfig) {
            sery = merge(sery, colConfig[nm]); // notice, this merge overwrites name in original series if colConfig has override
            
            // Must be careful with these ones, since they may or may not already by set in the various chart types
            // and since they are at depth, they may not have been merged.
            const colNameUsed = "colFormat" in colConfig[nm] ? "x_SD_" + colConfig[nm].colFormat : nm;
            const formatter = SFormatters.getFormatter(colNameUsed, "number"); // terrible HACK!!!
            set(sery, "tooltip.valueFormatter", (value:any) => formatter(0, 0, value, null, null));
        }
        return sery;
    }

    try {
        if(subConfig) {


            let opt:EChartsOption = clone(options);
            if(typeof subConfig?.overrideJson === "object") {
                opt = merge(opt, subConfig.overrideJson);

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
                if(Array.isArray(leg) && leg.length>0 && typeof leg[0] === "string") {
                    set(opt, "legend.data", (leg as string[]).map(nm => getReName(nm, subConfig)));
                }
            }
            return opt;
        }
    } catch (e) {}
    return options;
}

