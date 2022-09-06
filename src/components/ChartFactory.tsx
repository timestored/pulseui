import React, { Component, Suspense } from 'react';
import QueryEngine, { getSensibleServerIdx, Queryable, UpdatingQueryable, UpdatingQueryableListener } from '../engine/queryEngine';
import { ErrorBoundary, MyHelpLink, MyModal } from './CommonComponents';
import { SmartRs } from '../engine/chartResultSet';
import ReactECharts from 'echarts-for-react';
import { FormGroup, NonIdealState } from '@blueprintjs/core';
import { ServerConfig } from './ConnectionsPage';
import { TabNode } from 'flexlayout-react';
import { ChartWrapper } from '../styledComponents';
import { ExampleTestCases } from '../engine/ViewStrategy';
import { EmptySmartRs } from './../engine/chartResultSet';
import { DataZoomComponentOption, EChartsOption, graphic } from 'echarts';
import { Link } from 'react-router-dom';
import { ThemeContext, ThemeType } from '../context';

const AGrid = React.lazy(() => import('./AGrid'));

export enum ChartType {
    timeseries = "Time Series", area = "Area", line = "Line", bar = "Bar", stack = "Stack", pie = "Pie",
    scatter = "Scatter", bubble = "Bubble", grid = "Grid", candle = "Candle", treemap = "Treemap", heatmap = "Heatmap"
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
    subConfig: any,
    srs: SmartRs,
    exception: string | undefined,
}
export class MyUpdatingChart extends Component<MyChartProps, MyUpdatingChartState> implements UpdatingQueryableListener {
    state: MyUpdatingChartState = {
        chartType: ChartType.area,
        config: undefined,
        subConfig: undefined,
        srs: EmptySmartRs,
        exception: undefined,
    }
    private uQueryable: UpdatingQueryable;
    context!: React.ContextType<typeof ThemeContext>;

    handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const chartType: ChartType = ChartType[e.target.value as keyof typeof ChartType];
        this.setState({ chartType: chartType });
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
        this.props.tabNode.setEventListener("save", (p) => {
            config.dashstate = { chartType: this.state.chartType, config: this.state.config, queryable: this.uQueryable.queryable, subConfig: this.state.subConfig, };
        });
        // Then load in the saved overrides
        let ds = config.dashstate ?? {};
        this.state = { ...this.state, ...props, ...ds };
    }

    componentDidMount() { this.uQueryable.start(); }
    componentWillUnmount() { this.uQueryable.stop(); }

    update(srs: SmartRs, exception: string | undefined): void {
        this.setState({ srs, exception });
    }

    onConfigChange = (subConfig:any) => { this.setState({subConfig:subConfig}); }

    render() {
        const { srs, exception, chartType } = this.state;

        let Display: JSX.Element | null = <div>Error!</div>;
        try {
            Display = exception ?
                <NonIdealState icon="error" title="Error Generating Visualization" description={exception}
                    action={<div>Try changing a query setting in the editor</div>} />
                : MyUpdatingChart.getChart(chartType, srs, this.context.theme, this.state.subConfig, this.onConfigChange);
        } catch (error) {
            console.error(error);
        }

        return <ChartWrapper>
            <ErrorBoundary>{Display}</ErrorBoundary>
            {this.props.selected &&
                <MyModal title="MyEditor:" isOpen={true} handleClose={this.props.clearSelected}>
                    {this.uQueryable.getEditor(<FormGroup label="Display:" labelFor="editorChartSelect" inline>
                        <select id="editorChartSelect" title="editorChartSelect" onChange={this.handleSelect} >
                            {Object.keys(ChartType).map(key => (
                                <option key={key} value={key} selected={ChartType[key as keyof typeof ChartType] === chartType}>
                                    {ChartType[key as keyof typeof ChartType]}
                                </option>
                            ))}
                        </select>
                        <MyHelpLink href="/help/chart" htmlTxt="Click link to see full demos of all display options" />
                    </FormGroup>)}
                </MyModal>}
        </ChartWrapper>;
    }

    public static getChart(ct: ChartType | undefined, srs: SmartRs, theme: ThemeType = "light", subConfig:any = undefined, onConfigChange:(s:any)=>void = ()=>{}): JSX.Element | null {
        switch (ct) {
            case ChartType.area: return (<EChart srs={srs} filled />);
            case ChartType.line: return (<EChart srs={srs} />);
            case ChartType.bar: return (<EChart srs={srs} etype="bar" />);
            case ChartType.stack: return (<EChart srs={srs} etype="bar" stacked />);
            case ChartType.candle: return (<ECandleSeries srs={srs} />);
            case ChartType.pie: return (<ReactECharts option={toPieOption(srs)} theme={theme} />);
            case ChartType.scatter: return (<EScatter srs={srs} etype="scatter" />);
            case ChartType.bubble: return (<EScatter srs={srs} etype="bubble" />);
            case ChartType.grid: return (<Suspense fallback={<div>Loading...</div>}><AGrid srs={srs} subConfig={subConfig} onConfigChange={onConfigChange} /></Suspense>);
            case ChartType.timeseries: return (<ETimeSeries srs={srs} />);
            case ChartType.treemap: return (<ETreeMap srs={srs} />);
            case ChartType.heatmap: return (<ReactECharts option={toHeatmapOption(srs)} theme={theme} />);
            case undefined:
            default:
                return null;
        }
    }
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
        grid: { left: '100' },
        visualMap: { min: MIN, max: MAX, calculable: true, },
        series: [{ type: 'heatmap', label: { show: true }, data: d }],
    };
}

function toPieOption(srs: SmartRs): EChartsOption {
    const nc = srs.chartRS.numericColumns[0];
    return {
        tooltip: { trigger: 'item' },
        series: [{
            type: 'pie',
            radius: '80%',
            label: { position: 'inside' },
            data: srs.chartRS.rowLabels.map((lbl, idx) => {
                return { value: nc.vals[idx], name: lbl };
            }),
        }]
    };
}


class ETreeMap extends Component<{ srs: SmartRs }> {
    context!: React.ContextType<typeof ThemeContext>;
    render() {
        const chartRS = this.props.srs.chartRS;
        if (chartRS.numericColumns.length < 1 || chartRS.stringyColumns.length < 1) {
            return (<NonIdealState title="No Data" description={"No Data."}
                action={<div>Try changing a query setting in the editor</div>} />);
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
                tooltip: {},
                series: [{
                    type: 'treemap',
                    data: getChildren(sa, na),
                    upperLabel: { show: true, height: 30, },
                    visualDimension: 1,
                    levels: [
                        { itemStyle: { borderWidth: 3, borderColor: '#333', gapWidth: 3 } },
                    ],
                }],
            };
            return <ReactECharts option={options} theme={this.context.theme} />;
        } catch {
            return <div>
                <h2>For the correct data formats see <Link to="/help/chart">chart help</Link>.</h2>
            </div>;
        }
    }
}


class EChart extends Component<{ srs: SmartRs, stacked?: boolean, filled?: boolean, etype?: "bar" | "line" }> {
    context!: React.ContextType<typeof ThemeContext>;
    render() {
        const { srs, stacked, filled, etype } = this.props;
        const nc = srs.chartRS.numericColumns;
        try {
            const options: EChartsOption = {
                legend: { data: nc.map(e => e.name), show: nc.length > 1 },
                tooltip: { trigger: 'axis' },
                xAxis: {
                    type: 'category', name: srs.chartRS.rowTitle,
                    data: srs.chartRS.rowLabels, nameRotate: 90,
                    axisLabel: { rotate: 45 }
                },
                yAxis: { name: nc.length === 1 ? nc[0].name : undefined },
                series: nc.map(arra => {
                    return {
                        type: etype ?? 'line', data: arra.vals, name: arra.name,
                        stack: stacked ? '总量' : undefined,
                        areaStyle: filled ? {} : undefined,
                    }
                }),
            }
            return <ReactECharts option={options} theme={this.context.theme} />;
        } catch {
            return <div>
                <h2>For the correct data formats see <Link to="/help/chart">chart help</Link>.</h2>
            </div>;
        }
    }
}



class EScatter extends Component<{ srs: SmartRs, etype: "scatter" | "bubble" }> {
    context!: React.ContextType<typeof ThemeContext>;
    render() {
        const SHAPES = ['circle', 'rect', 'triangle', 'diamond', 'pin', 'arrow'];
        const srs = this.props.srs;
        const xAxis = srs.chartRS.numericColumns[0];
        let nc = srs.chartRS.numericColumns.slice(1);
        let sizeCols: undefined | number[][] = undefined;

        // For bubble assume every other column is size, remove it from nc
        const isBubble = this.props.etype === "bubble";
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
            return <ReactECharts option={options} theme={this.context.theme} />;
        } catch {
            return <div><h2>For the correct data formats see <Link to="/help/chart">chart help</Link>.</h2> </div>;
        }
    }
}

const rawData = [
    ["2004-01-05", 10411.85, 10544.07, 10411.85, 10575.92, 221290000],
    ["2004-01-06", 10543.85, 10538.66, 10454.37, 10584.07, 191460000],
    ["2004-01-07", 10535.46, 10529.03, 10432, 10587.55, 225490000],
    ["2004-01-08", 10530.07, 10592.44, 10480.59, 10651.99, 237770000],
    ["2004-01-09", 10589.25, 10458.89, 10420.52, 10603.48, 223250000],
    ["2004-01-08", 10530.07, 10592.44, 10480.59, 10651.99, 237770000],
    ["2004-01-09", 10589.25, 10458.89, 10420.52, 10603.48, 223250000],
    ["2004-01-12", 10461.55, 10485.18, 10389.85, 10543.03, 197960000],
    ["2004-01-13", 10485.18, 10427.18, 10341.19, 10539.25, 197310000],
    ["2004-01-14", 10428.67, 10538.37, 10426.89, 10573.85, 186280000],
    ["2004-01-15", 10534.52, 10553.85, 10454.52, 10639.03, 260090000],
];



class ECandleSeries extends Component<{ srs: SmartRs }> {
    context!: React.ContextType<typeof ThemeContext>;
    render() {
        const dates = rawData.map(function (item) {
            return item[0];
        });

        const data = rawData.map(function (item) {
            return [+item[1], +item[2], +item[3], +item[4]];
        });
        const canNOToption: EChartsOption = {
            tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, },
            xAxis: [
                {
                    type: 'category', data: dates, scale: true,
                    boundaryGap: [0,0], axisLine: { onZero: false }, splitLine: { show: false }, splitNumber: 20, min: 'dataMin', max: 'dataMax',
                    axisPointer: { z: 100 }
                },
                {
                    type: 'category',
                    gridIndex: 1,
                    data: dates,
                    boundaryGap: false, axisLine: { onZero: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
                    min: 'dataMin', max: 'dataMax'
                }
            ],
            yAxis: [
                { scale: true, splitArea: { show: true } },
                { scale: true, gridIndex: 1 }
            ],
            grid: [{ left: '10%', right: '8%', top: 0, height: '60%' },
            { left: '10%', right: '8%', top: '69%', height: '28%' }
            ],
            series: [{
                type: 'candlestick',
                data: data,
                tooltip: {},
            },
            { name: 'Volume', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: data.map(r => r[1]) }]
        };

        try {
            return <ReactECharts option={canNOToption} theme={this.context.theme} />;
        } catch {
            return <div>
                <h2>Candlestick Chart Format</h2>
            </div>;
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

class ETimeSeries extends Component<{ srs: SmartRs }> {
    context!: React.ContextType<typeof ThemeContext>;
    render() {
        try {
            const srs = this.props.srs;
            let timCol = srs.chartRS.dateColumns[0];
            let tnc = srs.chartRS.numericColumns;
            const nameSymbols = toNameSymbols(tnc.map(nc => nc.name));
            let headers = [...[timCol.name], ...tnc.map(tc => tc.name)];
            let dDayData = timCol.vals.map((dt, idx) => {
                let a: (string | number)[] = [dt.toISOString()];
                tnc.forEach(nc => a.push(nc.vals[idx]));
                return a;
            })
            const isSingle = tnc.length === 1;
            const dataZoom: DataZoomComponentOption[] | undefined = tnc[0].vals.length > 500 ? [{ brushSelect: true }, { type: 'inside' }] : undefined;
            var hadSymbol = false;
            const symCols = nameSymbols.filter(ns => ns.sym !== "none");

            const options: EChartsOption = {
                legend: { show: symCols.length > 0, data: symCols.map(sc => sc.sdname) },
                grid: { right: '65px', left: '8%', top: '5%', bottom: '10%' },
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
                        symbolSize: function (data: number[]) {
                            return 2 * data[4];
                        },
                        encode: { x: timCol.name, y: tc.name },
                        endLabel: {
                            show: !isSymbol, valueAnimation: false, precision: 6, borderWidth: 1, padding: 4, borderRadius: 2, borderColor: '#777777', backgroundColor: '#FFFFFF',
                            formatter: function (params: any) {
                                if (!params.value[idx + 1]) {
                                    return '';
                                }
                                return (isSingle ? '' : params.seriesName + ':\r\n') + (params.value[idx + 1] as number).toFixed(4); // No need to say what line is, if it's only line
                            }
                        },
                        lineStyle: { width: isSymbol ? 0 : 1, },
                        connectNulls: !isSymbol,
                        emphasis: { focus: isSingle ? 'none' : 'series', lineStyle: { width: undefined } }, // prevent line thickening on hovver/tooltip
                    }
                }),
                animation: true,
                // These lines are duped in candlestick
                tooltip: {
                    trigger: 'axis', axisPointer: { type: 'cross', label: { precision: 4 } },
                },
                dataZoom: dataZoom,
            };
            // If only one series, shade it in and add markers.
            if (Array.isArray(options.series) && options.series.length === 1) {
                //@ts-ignore
                let markLine: MarkLineOption = {
                    symbol: ['none'],
                    silent: true, precision: 4,
                    data: [
                        { type: 'min', name: '平均值', label: { show: true, borderWidth: 1, padding: 4, borderColor: '#777777', borderRadius: 2 } },
                        { type: 'max', name: '平均值', label: { show: true, borderWidth: 1, padding: 4, borderColor: '#777777', borderRadius: 2 } },
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

            return <ReactECharts option={options} theme={this.context.theme} />;
        } catch {
            return <div>
                <h2>Time-Series Chart Format</h2>
                <ol>
                    <li>The first date/time column found will be used for the x-axis.</li>
                    <li>Each numerical column represents one time series line on the chart.</li>
                </ol>
            </div>;
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

    r.push(new ChartTypeHelpC(ChartType.area, "Area Chart", ExampleTestCases.COUNTRY_STATS, simpleFormatExplain));
    r.push(new ChartTypeHelpC(ChartType.line, "Line Chart", ExampleTestCases.COUNTRY_STATS, simpleFormatExplain));
    r.push(new ChartTypeHelpC(ChartType.pie, "Pie Chart", ExampleTestCases.COUNTRY_STATS, simpleFormatExplain));
    r.push(new ChartTypeHelpC(ChartType.scatter, "Scatter Graph", ExampleTestCases.COUNTRY_STATS, simpleFormatExplain));
    r.push(new ChartTypeHelpC(ChartType.stack, "Stacked Bar Chart", ExampleTestCases.COUNTRY_STATS, simpleFormatExplain));
    // r.push(new ChartTypeHelpC(ChartType.timeseries, "Time-Series Chart", ExampleTestCases.COUNTRY_STATS, simpleFormatExplain));
    return r;
}

// For a selected database / type and chartType provide a sensibble query that will demo what that chart is capable of.
function getDemoQueryable(serverConfig:ServerConfig | undefined, ct: ChartType) {
    let qry = undefined;
    if(serverConfig?.jdbcType === "KDB") {
        if(ct === ChartType.timeseries) {
            qry =  "// Time Series display can be configured by column names. See help->timeseries for details"
            + "\n{  walk:{ [seed;n]"
                + "\n\t r:{{ abs ((1664525*x)+1013904223) mod 4294967296}\\[y-1;x]};"
                + "\n\t prds (100+((r[seed;n]) mod 11)-5)%100};"
                + "\n\t c:{x mod `long$00:20:00.0t}x;   st:x-c;   cn:`long$c%1000;"
                + "\n\t ([] time:.z.d+st+1000*til cn; gold:walk[100;cn]; bitcoin:walk[2;cn])  }[.z.t]";
        } else if(ct === ChartType.grid) {
            qry =  "// Table display can be configured using column names. See help->charts for details on format."
            + "\nupdate percbar_SD_DATABAR:percent_SD_PERCENT0 from "
            + "\n\t ([] time:.z.t-til 50; "
               + "\n\t\t status:50?`partial`filled; "
               + "\n\t\t instrument:50?`GBPUSD`USDNZD`USDCAD`CHFJPY`EURUSD;"
               + "\n\t\t symbol_SD_TAG:50?`UBS`C`MS`HSBC`NOMURA`DB;"
               + "\n\t\t price_SD_CURUSD:50?100.0;"
               + "\n\t\t bid:50?20.0;"
               + "\n\t\t bid_SD_BG:50?(\"#FF6666\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"\";\"#66FF66\");"
               + "\n\t\t bid_SD_CODE:50?(\"0.xXXx\";\"0.XXx\";\"0.xxXX\");"
               + "\n\t\t percent_SD_PERCENT0:50?1.0 )";
        } else {
            qry =  "// See help->charts for details on format to customize your chart appearance"
                + "\n([] Group:`Corporate`Corporate`Retail`Retail`Retail`Retail`Bank`Bank;"
                + "\n\t  Country:`Microsoft`Oracle`Paypal`Monero`FXC`Braint`MS`UBS; "
                + "\n\t  PnL:(0.8+rand[0.2])*31847.0 13239.0 127938.0 81308.0 63047.0 13010.0 152518.0 166629.0;"
                + "\n\t  Revenue:(0.9+rand[0.1])*15080.0 11300.0 34444.0 3114.0 2228.0 88.9 1113.0 41196.0 ; "
                + "\n\t  Negatives:(0.95+rand[0.05])*48300.0 8400.0 34700.0 38100.0 36500.0 413.0 1788.0 11732.0 )";
        }
    } else {
        if(ct === ChartType.timeseries) {
            qry = "SELECT TIME,BID FROM QUOTE WHERE NAME='NFLX' AND TIME>timestampadd('minute',-20,CURRENT_TIMESTAMP()) ORDER BY TIME DESC;";
        } else if(ct === ChartType.grid) {
            qry =  "SELECT `time`,`STATUS`,SYMBOL AS SYMBOL_SD_TAG,`INSTRUMENT NAME`,QUANTITY AS QUANTITY_SD_NUMBER0,"
                    + "\n\t DESTINATION,ORDERTYPE AS ORDERTYPE_SD_TAG, PRICE AS PRICE_SD_CURUSD,"
                    + "\n\t `PERCENT DONE` AS PERCENT_SD_PERCENT0, `AVG PX`, `PERCENT DONE` AS PERCENT_SD_DATABAR,"
                    + "\n\t `UPNL` AS UPNL_SD_CURUSD"
                    + "\nFROM TRADE ORDER BY TIME DESC;";
        } else {
            qry = "([] Group:`Corporate`Corporate`Retail`Retail`Retail`Retail`Bank`Bank;"
                + "\n\t  Country:`Microsoft`Oracle`Paypal`Monero`FXC`Braint`MS`UBS; "
                + "\n\t  PnL:(0.8+rand[0.2])*31847.0 13239.0 127938.0 81308.0 63047.0 13010.0 152518.0 166629.0;"
                + "\n\t  Revenue:(0.9+rand[0.1])*15080.0 11300.0 34444.0 3114.0 2228.0 88.9 1113.0 41196.0 ; "
                + "\n\t  Negatives:(0.95+rand[0.05])*48300.0 8400.0 34700.0 38100.0 36500.0 413.0 1788.0 11732.0 )";
        }
    }
    return qry === undefined ? undefined : new Queryable(serverConfig?.name ?? "", qry, 5000);
}
