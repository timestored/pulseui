
import { Button, HTMLTable } from '@blueprintjs/core';
import { useContext, useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { RsData, SmartRs } from '../engine/chartResultSet';
import ChartTypeHelp, { getChartHelp, MyUpdatingChart } from './ChartFactory';
import { useInterval } from './CommonComponents';
import { random, sample, sampleSize } from 'lodash-es';
import { ThemeContext } from '../context';


function HelpNavMenu() {
    return  <aside>
    <div className="docs-nav-wrapper">
				
        <div className="docs-nav">
            <div className="docs-nav-divider"></div>            
            <h1><Link to="/help">Help</Link></h1>
            <ul className="docs-nav-menu bp4-list-unstyled">
                <li>
                    <ul>
                        <li><Link to="/help/table">Creating Tables</Link></li>
                        <li><Link to="/help/chart">Creating Charts</Link></li>
                        <li><Link to="/help/chart/timeseries">Time-Series Charts</Link></li>
                        <li><Link to="/help/chart/3d">3D Charts</Link></li>
                    </ul>
                </li>
            </ul>
            <div className="docs-nav-divider"></div>   
        </div></div>
    </aside>;
}

export default function HelpPage() {
    useEffect(() => { document.title = "Pulse Help" }, []);
    return <>
	<div id="pulse-documentation">
		<div className="docs-root">
			<div className="docs-app">
                {/* <DocsNav /> */}
                        <HelpNavMenu />
				<main className="docs-content-wrapper bp4-fill" role="main">
					<div className="docs-content" data-page-id="pulse">
                        <Routes>
                            <Route path="/" element={<HelpPageHome />} />
                            <Route path="/table" element={<HelpPageTable />} />
                            <Route path="/chart"  element={<HelpPageChart/>} />
                            <Route path="/chart/3d"  element={<HelpPageChart3D/>} />
                            <Route path="/chart/timeseries"  element={<HelpPageTimeSeries/>} />
                            
                        </Routes>
                    </div>
                </main>
    </div></div></div></>
}


function HelpPageHome() {
    useEffect(() => { document.title = "Pulse Help" }, []);
    return <>
    <div>
        <h2>What is Pulse?</h2>
        <p>Pulse is a tool for real-time visual analysis, email reporting and alerting.
            <br />It allows you to create and share real-time interactive applications with your team 
            <br/> and to send emails and alerts when selected situations occur.
        </p>
        
		<div className="row" style={{height:"20px"}}>
			<div className="col-lg-12">
                <p><b>Access <a href="https://www.timestored.com/pulse">Pulse help at timestored.com/pulse/help</a>.</b></p>
            </div>
        </div>

		<div className="row" style={{height:"20px"}}>
			<div className="col-lg-12">
                <p>Download the latest version at <a href="https://www.timestored.com/pulse">timestored.com/pulse</a>.</p>
            </div>
        </div>

		<div className="row" style={{height:"20px"}}>
			<div className="col-lg-4 col-md-6">
            </div>
        </div>

        <video width="98%" height="98%" controls poster="https://www.timestored.com/pulse/video/pulse-build-sql-dashboard.png">
				<source src="https://www.timestored.com/pulse/video/pulse-build-sql-dashboard.mp4" type="video/mp4" /></video>
        {/* <img src="./img/help/tool-overview.png" width="742" height="364" alt="Visual analysis, emailing reports and alerting." style={{padding:"10px"}}/> */}
        {/* <img src="./img/triple-monitor-dashboard.jpg" width="1000" height="563" alt="Visual analysis, emailing reports and alerting." style={{padding:"10px"}}/> */}
    </div></>
}

function ChartTypeHelpDiv(props: { chartTypeHelp: ChartTypeHelp }) {
    const context = useContext(ThemeContext);
    let h = props.chartTypeHelp;
    return <div>
        <h2 id={'chartHelp_'+h.chartType}>{h.chartType + " - " + h.description}</h2>
        {h.formatExplainationHtml}
        <table><tr><td>
            <div style={{ width: 600, height: 300, position: "relative" }}> {MyUpdatingChart.getChart(h.chartType, h.testCase.srs, context.theme)} </div>
        </td><td>
                <div style={{ width: 500, height: 300 }}> {MyUpdatingChart.getChart("grid", h.testCase.srs)}
                </div> </td></tr></table>
    </div>
}


function HelpPageChart() {
    useEffect(() => { document.title = "Pulse Help - Charts" }, []);
    return <><h1>Help - Charts</h1> 
        {getChartHelp()
            // timeseries best shown on it's own page. 3d throws error and breaks firefox.
            .filter(c => c.chartType !== "timeseries" && c.chartType !== "3dbar" && c.chartType !== "3dsurface")
            .map(h => <ChartTypeHelpDiv chartTypeHelp={h} />)}
    </>;
}


function HelpPageChart3D() {
    useEffect(() => { document.title = "Pulse Help - 3D Charts" }, []);
    return <><h1>Help - 3D Charts</h1> 
        {getChartHelp()
            .filter(c =>c.chartType === "3dbar" || c.chartType === "3dsurface")
            .map(h => <ChartTypeHelpDiv chartTypeHelp={h} />)}
    </>;
}

function getGridExampleRsData(): RsData {
    return {
        "tbl": {
            "data": [
                {
                    "STATUS": "Pending", "SYMBOL_SD_TAG": "AAPL", "INSTRUMENT NAME": "Apple", "QUANTITY_SD_NUMBER0": (1 + random(100)) * 1000, "DESTINATION": "NYSE", "PERCENT_SD_DATABAR": random(1, true), "PRICE": random(119.99, 119.91), "PERCENT DONE_SD_PERCENT0": 0, "UPNL_SD_CURGBP": null
                }, {
                    "STATUS": "Partially Filled", "SYMBOL_SD_TAG": "MSFT", "INSTRUMENT NAME": "Microsoft", "QUANTITY_SD_NUMBER0": (1 + random(500)) * 100, "DESTINATION": "NASDAQ", "PERCENT_SD_DATABAR": random(1, true), "PRICE": random(230.35, 230.36), "PERCENT DONE_SD_PERCENT0": 0.5, "UPNL_SD_CURGBP": 3249.99999999989
                }, {
                    "STATUS": "Partially Cancelled", "SYMBOL_SD_TAG": "AMZN", "INSTRUMENT NAME": "Amazon", "QUANTITY_SD_NUMBER0": (1 + random(48)), "DESTINATION": "ANY", "PERCENT_SD_DATABAR": random(1, true), "PRICE": random(3074.96, 3074.99), "PERCENT DONE_SD_PERCENT0": 0.479166666666667, "UPNL_SD_CURGBP": 574.080000000001
                }, {
                    "STATUS": "Filled", "SYMBOL_SD_TAG": "FB", "INSTRUMENT NAME": "Facebook", "QUANTITY_SD_NUMBER0": (1 + random(500)) * 10, "DESTINATION": "BEST", "PERCENT_SD_DATABAR": 1, "PRICE": random(290.1, 290.2), "PERCENT DONE_SD_PERCENT0": 1, "UPNL_SD_CURGBP": -49.9999999999545
                }, {
                    "STATUS": "Ready", "SYMBOL_SD_TAG": "BABA", "INSTRUMENT NAME": "Alibaba", "QUANTITY_SD_NUMBER0": (1 + random(250)) * 1000, "DESTINATION": "LSE", "PERCENT_SD_DATABAR": 0, "PRICE": random(30.1, 30.1), "PERCENT DONE_SD_PERCENT0": 0, "UPNL_SD_CURGBP": null
                }, {
                    "STATUS": "Pending Cancel", "SYMBOL_SD_TAG": "AAPL", "INSTRUMENT NAME": "Apple", "QUANTITY_SD_NUMBER0": 1 + random(1000), "DESTINATION": "NYSE", "PERCENT_SD_DATABAR": random(1, true), "PRICE": random(119.99, 122.0), "PERCENT DONE_SD_PERCENT0": 0.4, "UPNL_SD_CURGBP": 791.999999999996
                }, {
                    "STATUS": "Ready", "SYMBOL_SD_TAG": "TSLA", "INSTRUMENT NAME": "Tesla", "QUANTITY_SD_NUMBER0": (1 + random(98)) * 1000, "DESTINATION": "ANY", "PERCENT_SD_DATABAR": 0, "PRICE": 654.87, "PERCENT DONE_SD_PERCENT0": 0, "UPNL_SD_CURGBP": null
                }, {
                    "STATUS": "Filled", "SYMBOL_SD_TAG": "BRK.A", "INSTRUMENT NAME": "Berkshire Hathaway", "QUANTITY_SD_NUMBER0": (1 + random(100)), "DESTINATION": "NYSE", "PERCENT_SD_DATABAR": 1, "PRICE": 382698, "PERCENT DONE_SD_PERCENT0": 1, "UPNL_SD_CURGBP": 159800
                }, {
                    "STATUS": "New", "SYMBOL_SD_TAG": "JPM", "INSTRUMENT NAME": "JPMorgan Chase", "QUANTITY_SD_NUMBER0": (1 + random(24)) * 100, "DESTINATION": "NYSE", "PERCENT_SD_DATABAR": 0, "PRICE": 155.14, "PERCENT DONE_SD_PERCENT0": 0, "UPNL_SD_CURGBP": null
                }, {
                    "STATUS": "Filled", "SYMBOL_SD_TAG": "JNJ", "INSTRUMENT NAME": "Johnson & Johnson", "QUANTITY_SD_NUMBER0": (1 + random(999)), "DESTINATION": "NYSE", "PERCENT_SD_DATABAR": 1, "PRICE": random(160.04, 161.02), "PERCENT DONE_SD_PERCENT0": 1, "UPNL_SD_CURGBP": 919.079999999988
                }
            ],
            "types": {
                "STATUS": "string",
                "SYMBOL_SD_TAG": "string",
                "INSTRUMENT NAME": "string",
                "QUANTITY_SD_NUMBER0": "number",
                "DESTINATION": "string",
                "PERCENT_SD_DATABAR": "number",
                "PRICE": "number",
                "PERCENT DONE_SD_PERCENT0": "number",
                "UPNL_SD_CURGBP": "number"
            }
        }
    };
}


function getGridHighlightExampleData(): RsData {
    const randc = () => { return sample(["sd_cell_red", "sd_cell_green", ""]) ?? ""; };
    const randa = () => { return sample(["#11CC1180", "#CC111180", ""]) ?? ""; };
    const randrg = () => { return sample(["green", "red", ""]) ?? ""; };
    const rn = (n: number) => { return random(n, n + 0.05); };
    return {
        "tbl": {
            "data": [
                {
                    "NAME": "AUD/USD", BID_SD_CODE:"0.xxXXx", "BID": random(0.77417, 0.779), "BID_SD_CLASS": randc(), "ASK_1": 0.77474,  "ASK_2": 0.77473, "ASK_1_SD_BG": "#CC111180", "CHANGE": -0.00009, "CHANGE_SD_FG": "red"
                }, {
                    "NAME": "EUR/CHF", BID_SD_CODE:"0.xXXx", "BID": rn(1.10114), "BID_SD_CLASS": randc(), "ASK_1": 1.10203, "ASK_2": 1.10201, "ASK_1_SD_BG": randa(), "CHANGE": -0.0002, "CHANGE_SD_FG": "red"
                }, {
                    "NAME": "EUR/GBP", BID_SD_CODE:"0.xxXXx", "BID": rn(0.86017), "BID_SD_CLASS": randc(), "ASK_1": rn(0.86137),"ASK_2": rn(0.86127), "ASK_1_SD_BG": randa(), "CHANGE": 0.0001, "CHANGE_SD_FG": randrg()
                }, {
                    "NAME": "EUR/USD", BID_SD_CODE:"0.xXXx", "BID": 1.19316, "BID_SD_CLASS": randc(), "ASK_1": 1.19345, "ASK_2": 1.19343, "ASK_1_SD_BG": "#11CC1180", "CHANGE": 0.00005, "CHANGE_SD_FG": "green"
                }, {
                    "NAME": "EUR/JPY", BID_SD_CODE:"0.XXx", "BID": 129.82, "BID_SD_CLASS": randc(), "ASK_1": 129.937, "ASK_2": 129.935, "ASK_1_SD_BG": "", "CHANGE": 0, "CHANGE_SD_FG": ""
                }, {
                    "NAME": "GBP/USD", BID_SD_CODE:"0.xXXx", "BID": rn(1.38561), "BID_SD_CLASS": randc(), "ASK_1": 1.38661, "ASK_2": 1.38660, "ASK_1_SD_BG": randa(), "CHANGE": -0.00023, "CHANGE_SD_FG": randrg()
                }, {
                    "NAME": "NZD/USD", BID_SD_CODE:"0.xXXx", "BID": 0.71619, "BID_SD_CLASS": randc(), "ASK_1": rn(0.71659), "ASK_2": rn(0.71650), "ASK_1_SD_BG": randa(), "CHANGE": 0.00017, "CHANGE_SD_FG": randrg()
                }, {
                    "NAME": "USD/CAD", BID_SD_CODE:"0.xXXx", "BID": 1.25235, "BID_SD_CLASS": randc(), "ASK_1": 1.25269, "ASK_2": 1.25260, "ASK_1_SD_BG": "#11CC1180", "CHANGE": 0.0003, "CHANGE_SD_FG": "green"
                }, {
                    "NAME": "USD/JPY", BID_SD_CODE:"0.xXXx", "BID": rn(108.835), "BID_SD_CLASS": randc(), "ASK_1": 108.865, "ASK_2": 108.860, "ASK_1_SD_BG": randa(), "CHANGE": 0.004, "CHANGE_SD_FG": "green"
                }
            ],
            "types": { "NAME": "string", "BID": "number", "BID_SD_CLASS": "string", "ASK_1": "number",  "ASK_2": "number", "ASK_1_SD_BG": "string", "CHANGE": "number", "CHANGE_SD_FG": "string" }
        }
    };
}


export function PlayButton(props: { isPlaying: boolean, setPlaying: (isPlaying: boolean) => void }) {
    return <>
        <Button icon={props.isPlaying ? "stop" : "play"}
            onClick={() => props.setPlaying(!props.isPlaying)} intent={props.isPlaying ? "none" : "success"}>
            {props.isPlaying ? "Stop" : "Play"}</Button>
    </>
}


// This code uses the Box–Muller transform to give you a normal distribution between 0 and 1 inclusive. 
// It just resamples the values if it's more than 3.6 standard deviations away (less than 0.02% chance).
function randn_bm(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    if (num > 1 || num < 0) return randn_bm() // resample between 0 and 1
    return num
}

const BID = 231.2;
function getTimeseriesExampleRsData(addAskPriceCols: boolean, rows:number = 1): RsData {
    // Try filling these with null intitialy to find a bug
    // Also if the whole row is null, the chart doesn't update nicely, it jerks.
    let r:RsData = {
        "tbl": {
            "data": [
                addAskPriceCols ? { "TIME": new Date(1619273342344), "BID": BID, "ASK": BID, "PRICE_SD_CIRCLE": BID, "PRICE_SD_SIZE": 4, "PRICE2_SD_TRIANGLE": BID }
                    : { "TIME": new Date(1619273342344), "BID": BID }],
            "types": addAskPriceCols ? { "TIME": "Date", "BID": "number", "ASK": "number", "PRICE_SD_CIRCLE": "number", "PRICE2_SD_TRIANGLE": "number" }
                : { "TIME": "Date", "BID": "number" }
        }
    };

    
    for(let i=0; i<rows/10; i++) {
        r = genNextData1(r, 10);
    }
    return r;
}

let bid = BID;
let bid2 = BID;

export function genNextData1(rsData:RsData, rowsToAdd = 10):RsData {
    let data = rsData.tbl.data.slice(0);
    let t = data[data.length - 1]["TIME"];
    for (let i = 0; i < rowsToAdd; i++) {
        if (t instanceof Date) {
            t = new Date(t.getTime() + 1000);
            let printBA = random(7) > 1;
            if (printBA) {
                bid = bid + (bid * (randn_bm() - 0.4999) * 0.1);
            }
            let ask = printBA ? bid + 1 + 6 * randn_bm() : null;
            let price = random(20) > 18 ? bid - 10 * randn_bm() : null;
            let price2 = random(20) > 18 ? bid + 4 + 10 * randn_bm() : null;
            data.push({ "TIME": t, "BID": printBA ? bid : null, "ASK": ask, "PRICE_SD_CIRCLE": price, "PRICE_SD_SIZE": 1 + random(5), "PRICE2_SD_TRIANGLE": price2 });
        }
    }
    if (data.length > 3000) {
        data = data.slice(2800, 3000);
    }
    let nd: RsData = { tbl: { data: data, types: rsData.tbl.types } };
    return nd;
}

function genNextData2(rsData2:RsData):RsData {
    // Second data set update
    let data2 = rsData2.tbl.data.slice(0);
    let t2 = data2[data2.length - 1]["TIME"];
    for (let i = 0; i < 10; i++) {
        if (t2 instanceof Date) {
            t2 = new Date(t2.getTime() + 1000);
            bid2 = bid2 + (bid2 * (randn_bm() - 0.5) * 0.1);
            data2.push({ "TIME": t2, "BID": bid2 });
        }
    }
    if (data2.length > 3000) {
        data2 = data2.slice(2800, 3000);
    }
    let nd2: RsData = { tbl: { data: data2, types: { "TIME": "Date", "BID": "number" } } };
    return nd2;
}

export function DemoChartForHomepage() {
    const [rsData, setRsData] = useState<RsData>(getTimeseriesExampleRsData(true, 500));
    const [isPlaying, setPlaying] = useState<boolean>(false);
    
    useInterval(() => {
        if (isPlaying) {
            setRsData(genNextData1(rsData));
        }
    }, 500);
    const playButton = <PlayButton isPlaying={isPlaying} setPlaying={setPlaying} />;

    return <><div>
            <h2>{playButton}</h2>
            {MyUpdatingChart.getChart("timeseries", new SmartRs(rsData))}
    </div></>;
}

function HelpPageTimeSeries() {

    const [rsData, setRsData] = useState<RsData>(getTimeseriesExampleRsData(true));
    const [rsData2, setRsData2] = useState<RsData>(getTimeseriesExampleRsData(false));
    const [isPlaying, setPlaying] = useState<boolean>(true);
    useEffect(() => { document.title = "Pulse Help - Time Series Charts" }, []);

    useInterval(() => {
        if (isPlaying) {
            setRsData(genNextData1(rsData));
            setRsData2(genNextData2(rsData2));
        }
    }, 500);

    const playButton = <PlayButton isPlaying={isPlaying} setPlaying={setPlaying} />;

    return <><div>
        <h1>Help - Time Series Charts</h1>

        <h2>Single Series: &nbsp; {playButton}</h2>
        <div style={{ width: 1100, height: 350, position: "relative" }}>
            {MyUpdatingChart.getChart("timeseries", new SmartRs(rsData2))}
        </div>

        <div style={{ width: 1100, height: 350, position: "relative" }}>
            {MyUpdatingChart.getChart("timeseries", new SmartRs(rsData))}
        </div>


        <h3>Configuration</h3>
        <p>You can configure the appearance of a column by adding an <b>_SD_FORMATTER</b> at the end of the column name.
            <br />For example if a column was call itemPrice, you could name it itemPrice<b>_SD_CIRCLE</b> to show the chart
            without a line and instead showing circle markers. Additionally you could add a column named: itemPrice<b>_SD_SIZE</b> to set the size of the circle/symbol.
        </p>

        <HTMLTable condensed striped bordered>
            <thead><tr><th>Area</th><th>Example</th><th>Options</th><th>Description</th></tr></thead>
            <tbody>
                <tr><th>Shape</th><td>_SD_<b><i>CIRCLE</i></b></td><td>CIRCLE, RECT, ROUNDRECT, TRIANGLE, DIAMOND, PIN, ARROW, NONE</td><td>The shape to use for displaying points in the chart.</td></tr>
                <tr><th>Shape Size</th><td>_SD_<b><i>SIZE</i></b></td><td>Number 1-99</td><td>The size of the shape to use for displaying points in the chart. You MUST have set an SD_SHAPE first.</td></tr>
            </tbody>
        </HTMLTable>


        <h2>Highlighting and Formatting by Row: &nbsp; {playButton}</h2>


    </div></>
}


function HelpPageTable() {

    const [rsData, setRsData] = useState<RsData>(getGridExampleRsData());
    const [rsData2, setRsData2] = useState<RsData>(getGridHighlightExampleData());
    const [isPlaying, setPlaying] = useState<boolean>(true)
    const [isTableShown ] = useState<boolean>(false)
    useEffect(() => { document.title = "Pulse Help - Tables" }, []);

    useInterval(() => {
        if (isPlaying) {
            // First data set update
            let samp = sampleSize(getGridExampleRsData().tbl.data, 2);
            let data = samp.concat(rsData.tbl.data.slice(0));
            if (data.length > 200) {
                data = data.slice(0, 100);
            }
            let nd: RsData = { tbl: { data: data, types: rsData.tbl.types } };
            setRsData(nd);

            // Second data set update
            setRsData2(getGridHighlightExampleData());
        }
    }, 500);

    const playButton = <PlayButton isPlaying setPlaying={setPlaying} />;

    return <><div>
        <h1>Help - Tables</h1>
        <h2>Formatting Entire Columns: &nbsp; {playButton}</h2>

        <div style={{height:"350px", width:"100%"}}>
            {MyUpdatingChart.getChart(isTableShown ? "line" : "grid", new SmartRs(rsData))}
        </div>


        <h3>Configuration</h3>
        <p>You can configure the appearance of a column by either:
            <ul>
                <li>Right-Clicking on the column and selecting a formatter.</li>
                <li>Adding an <b>_SD_FORMATTER</b> at the end of the column name.
                    <br />For example is a column was call itemPrice, you could name it itemPrice<b>_SD_CURUSD</b> to show the price as a currency in US Dollars.</li>
            </ul>
        </p>

        <h3>UI Selected Formatting</h3>
        <p>Below is an example of the formatting menu options:</p>
        <img src="./img/help/set-formatter-by-column.png" width="755" height="427" alt="Right-Click Set Formatter Options"/>        

        <p>Alternatively by naming columns you can configure a formatter.
        </p>
        <HTMLTable condensed striped bordered>
            <thead><tr><th>Area</th><th>Example</th><th>Column Name Postfix</th><th>Options</th><th>Description</th></tr></thead>
            <tbody>
                <tr><th>Numbers</th><td>0.11</td><td>_SD_NUMBER<b><i>0</i></b></td><td>0-9 Decimal places shown</td><td>Display as a number with thousand separators and decimal places.</td></tr>
                <tr><th>Percentages</th><td>50%</td><td>_SD_PERCENT<b><i>0</i></b></td><td>0-9 Decimal places shown</td><td>Display as a percentage % with thousand separators and decimal places.</td></tr>
                <tr><th>Currencies</th><td>$1,000.01</td><td>_SD_CUR<b><i>USD</i></b></td><td>USD/GBP/CCY where CCY is an <a href="https://en.wikipedia.org/wiki/ISO_4217">ISO 4217 currency code</a>. </td>
                    <td>Display an amount in a given currency. Always showing decimal places as appropriate.</td></tr>
                <tr><th>Coloured Tags</th><td><span className="bp4-tag bp4-intent-primary .modifier">London</span></td><td>_SD_TAG</td><td>No options.</td><td>Highlight the text with a randomly selected color based on the text. So that the same text generates the same color.</td></tr>
                <tr><th>Status Flags</th><td><span className="bp4-tag bp4-intent-success .modifier">Done</span></td><td>_SD_STATUS</td><td>No options.</td>
                    <td>Highlight the text with an appropriate color based on the text content assuming the text repsents a task. e.g.
                        <ul>
                            <li>Blue = new, open, created, ready</li>
                            <li>Amber = runnable, waiting, partial, blocked, flagged, suspended</li>
                            <li>Red = removed, cancelled, rejected</li>
                            <li>Green = terminated, resolved, closed, done, complete, filled</li>
                        </ul>
                    </td>
                </tr>
                <tr><th>HTML</th><td></td><td>_SD_HTML</td><td></td><td>Display the column content exactly as-is, rendering any HTML tags.</td></tr>
                <tr><th>Databars</th><td><span className="databar" title='100%' style={{ color: "green" }}>██████████</span>
                </td><td>_SD_DATABAR</td><td>&nbsp;</td><td>Given a value between 0-1 i.e. a ratio or percent, draw it as a bar with size proportional to percentage.</td></tr>
            </tbody>
        </HTMLTable>


        <h2>Highlighting and Formatting by Row: &nbsp; {playButton}</h2>

        <div style={{ width: 500, height: 320, position: "relative" }}>
            {MyUpdatingChart.getChart("grid", new SmartRs(rsData2))}
        </div>

        <h3>Configuration</h3>
        <p><b>Highlighting and styling relies on having an additional column named similarly to the column you want to affect.</b>
            <br />For example to style a column called <b>itemPrice</b>, you could add an additional column called <b>itemPrice_SD_CURUSD</b> to show the price as a currency in US Dollars.
            <br />This allows you to customize the foreground/background and style per row.
        </p>

        <HTMLTable condensed striped bordered>
            <thead><tr><th>Area</th><th>Column Name Postfix</th><th>Example Value</th><th>Description</th></tr></thead>
            <tbody>
                <tr><th>Background Color</th><td>_SD_BG</td><td>#FF0000</td><td>Set the background colour of the original column.</td></tr>
                <tr><th>Foreground Color</th><td>_SD_FG</td><td>#FF0000</td><td>Set the foreground colour of the original column.</td></tr>
                <tr><th>CSS Style Name(s)</th><td>_SD_CLASS</td><td>sd_cell_red sd_cell_green</td><td>Set the CSS class of the original column.</td></tr>
                <tr><th>Format Code</th><td>_SD_CODE</td><td>0.xXXx 0.xxXX 0.xXX</td><td>Configure the number of decimal places displayed AND which of the digits are shown larger. 
                                                This is useful for emphasising basis points for FX currencies etc.</td></tr>
            </tbody>
        </HTMLTable>

        
        <h2>Column Groupings</h2>
        <p>Note in the table above, that ASK is a column grouping and that the columns 1/2 occur below ASK. 
            To achieve this the columns are named ASK_1,ASK_2 and Pulse then recognises the grouping automatically.</p>

    </div></>
}
