
import { Button, HTMLTable } from '@blueprintjs/core';
import { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { RsData, SmartRs } from '../engine/chartResultSet';
import ChartTypeHelp, { ChartType, getChartHelp, MyUpdatingChart } from './ChartFactory';
import { useInterval } from './CommonComponents';
import { random, sample, sampleSize } from 'lodash-es';
import { ANAME } from '../App';


function HelpNavMenu() {
    return  <aside>
    <div className="docs-nav-wrapper">
				
        <div className="docs-nav">
            <div className="docs-nav-divider"></div>            
            <h1><Link to="/help">Help</Link></h1>
            <ul className="docs-nav-menu bp4-list-unstyled">
                <li><Link to="/help/install">Installation</Link></li>
                <li><Link to="/help/connections">Connections</Link>
                    <ul>
                        <li><Link to="/help/subscriptions">Subscribing To Data</Link></li>
                    </ul>
                </li>
                <li><Link to="/help/table">Tables</Link></li>
                <li><Link to="/help/chart">Charting</Link>
                    <ul>
                        <li><Link to="/help/chart/timeseries">Time-Series</Link></li>
                    </ul>
                </li>
                <li><Link to="/help/forms">Forms</Link></li>
                <li><Link to="/help/email-reports">Email Reports</Link></li>
                <li><Link to="/help/faq">FAQ</Link></li>
                <li><Link to="/help/security">Security</Link></li>
                <li><Link to="/help/release-changes">Release Notes</Link></li>
            </ul>
            <div className="docs-nav-divider"></div>   
        </div></div>
    </aside>;
}

export default function HelpPage() {
    useEffect(() => { document.title = ANAME + " Help" }, []);
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
                            <Route path="/install" element={<HelpPageInstall />} />
                            <Route path="/connections" element={<HelpPageConnections />} />
                            <Route path="/subscriptions" element={<HelpPageSubscriptions />} />
                            <Route path="/table" element={<HelpPageTable />} />
                            <Route path="/chart"  element={<HelpPageChart/>} />
                            <Route path="/chart/timeseries"  element={<HelpPageTimeSeries/>} />
                            <Route path="/forms" element={<HelpPageForm />} />
                            <Route path="/email-reports"  element={<HelpPageEmailReports/>} />
                            <Route path="/faq"  element={<HelpPageFAQ/>} />
                            <Route path="/security"  element={<HelpPageSecurity/>} />
                            <Route path="/release-changes"  element={<HelpPageReleaseNotes/>} />
                        </Routes>
                    </div>
                </main>
    </div></div></div></>
}


function HelpPageHome() {
    useEffect(() => { document.title = ANAME + " Help" }, []);
    return <><div>
        <h2>What is {ANAME}?</h2>
        <p>{ANAME} is a tool for real-time visual analysis, email reporting and alerting.
            <br />It allows you to create and share real-time interactive applications with your team 
            <br/> and to send emails and alerts when selected situations occur.
        </p>
        
        <img src="/img/help/tool-overview.png" width="742" height="364" alt="Visual analysis, emailing reports and alerting." style={{padding:"10px"}}/>
    </div></>
}

function ChartTypeHelpDiv(props: { chartTypeHelp: ChartTypeHelp }) {
    let h = props.chartTypeHelp;
    return <div>
        <h2>{h.chartType + " - " + h.description}</h2>
        {h.formatExplainationHtml}
        <table><tr><td>
            <div style={{ width: 600, height: 300, position: "relative" }}> {MyUpdatingChart.getChart(h.chartType, h.testCase.srs)} </div>
        </td><td>
                <div style={{ width: 500, height: 300 }}> {MyUpdatingChart.getChart(ChartType.grid, h.testCase.srs)}
                </div> </td></tr></table>
    </div>
}


function ExamplesFor(props: { chartType?: ChartType }) {
    let ct = props.chartType;
    let helpEs = getChartHelp().filter(c => ct === undefined || c.chartType === ct)
        .map(h => <ChartTypeHelpDiv chartTypeHelp={h} />);
    return <>
        {helpEs.length === 0 ? undefined :
            <h2>{ct && (ct + " ")} Example Charts</h2>}
        {helpEs}
    </>;
}

function HelpPageChart() {
    useEffect(() => { document.title = ANAME + " Help - Charts" }, []);
    return <><h1>Help - Charts</h1> <ExamplesFor /></>;
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
            {MyUpdatingChart.getChart(ChartType.timeseries, new SmartRs(rsData))}
    </div></>;
}

function HelpPageTimeSeries() {

    const [rsData, setRsData] = useState<RsData>(getTimeseriesExampleRsData(true));
    const [rsData2, setRsData2] = useState<RsData>(getTimeseriesExampleRsData(false));
    const [isPlaying, setPlaying] = useState<boolean>(true);
    useEffect(() => { document.title = ANAME + " Help - Time Series Charts" }, []);

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
            {MyUpdatingChart.getChart(ChartType.timeseries, new SmartRs(rsData))}
        </div>


        <h3>Configuration</h3>
        <p>You can configure the appearance of a column by adding an <b>_SD_FORMATTER</b> at the end of the column name.
            <br />For example is a column was call itemPrice, you could name it itemPrice<b>_SD_CIRCLE</b> to show the chart
            without a line and instead showing circle markers.
        </p>

        <HTMLTable condensed striped bordered>
            <thead><tr><th>Area</th><th>Example</th><th>Options</th><th>Description</th></tr></thead>
            <tbody>
                <tr><th>Shape</th><td>_SD_<b><i>CIRCLE</i></b></td><td>CIRCLE, RECT, ROUNDRECT, TRIANGLE, DIAMOND, PIN, ARROW, NONE</td><td>The shape to use for displaying points in the chart.</td></tr>
            </tbody>
        </HTMLTable>


        <h2>Highlighting and Formatting by Row: &nbsp; {playButton}</h2>

        <div style={{ width: 1100, height: 350, position: "relative" }}>
            {MyUpdatingChart.getChart(ChartType.timeseries, new SmartRs(rsData2))}
        </div>

    </div></>
}


function HelpPageTable() {

    const [rsData, setRsData] = useState<RsData>(getGridExampleRsData());
    const [rsData2, setRsData2] = useState<RsData>(getGridHighlightExampleData());
    const [isPlaying, setPlaying] = useState<boolean>(true)
    const [isTableShown ] = useState<boolean>(false)
    useEffect(() => { document.title = ANAME + " Help - Tables" }, []);

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
            {MyUpdatingChart.getChart(isTableShown ? ChartType.line : ChartType.grid, new SmartRs(rsData))}
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
        <img src="/img/help/set-formatter-by-column.png" width="755" height="427" alt="Right-Click Set Formatter Options"/>        

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
            {MyUpdatingChart.getChart(ChartType.grid, new SmartRs(rsData2))}
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
                <tr><th>CSS Style Name(s)</th><td>_SD_STYLE</td><td>sd_cell_red sd_cell_green</td><td>Set the CSS class of the original column.</td></tr>
                <tr><th>Format Code</th><td>_SD_CODE</td><td>0.xXXx 0.xxXX 0.xXX</td><td>Configure the number of decimal places displayed AND which of the digits are shown larger. 
                                                This is useful for emphasising basis points for FX currencies etc.</td></tr>
            </tbody>
        </HTMLTable>

        
        <h2>Column Groupings</h2>
        <p>Note in the table above, that ASK is a column grouping and that the columns 1/2 occur below ASK. 
            To achieve this the columns are named ASK_1,ASK_2 and Pulse then recognises the grouping automatically.</p>

    </div></>
}

function HelpPageConnections() {
    useEffect(() => { document.title = ANAME + " Help - Connections" }, []);
    return <><div>
        <h1>Help - Connections</h1>
        <p>Admin users can create a Connection to a data source. Once a connection is created it can be used within dashboards.</p>
    </div></>
}

function HelpPageSubscriptions() {
    useEffect(() => { document.title = ANAME + " Help - Subscriptions" }, []);

    const cod = '// On the kdb process - define subscription function and timer. \n' 
        + '.u.sub:{[tblName;symList] bb::.z.w; tName::tblName;};\n'
        + '.z.ts:{neg[bb] (`.u.upd;`t;update tName:@[get;`tName;`noTname] from ([] t:3#.z.t; a:2 3 4; s:`pp`oo`ii))};\n'
        + 'system "t 500";\n'
        + '// From the query box on the dashboard:\n'
        + '.u.sub[`demoName;::]\n';

    return <><div>
        <h1>Help - Subscriptions</h1>
        <p>Most database <Link to="/connections">Connections</Link> use polling to regularly fetch data on a user specified timer.
        Alternatively you can create a subscription. This means <b>the data source will push updates rather than polling</b>.
        It can be more efficient for frequently updating data.</p>
        <p>Currently to create a subscription you should:</p>
        <ol>
            <li>Create a "Kdb Streaming" connection type.</li>
            <li>Specify that connection as a source and set the query. e.g. <code>.u.sub[`tblname;::]</code></li>
        </ol>
        <p>Behind the scenes, for every unique subscription including query the server will:</p>
        <ol>
            <li>Open a connection to the streaming data source.</li>
            <li>Send the subscription query.</li>
            <li>Await incoming data and forward results to the dashboard. For kdb the result format is expected to be (`.u.upd;`tableName;tableData).</li>
            <li>Keep the connection open until the dashboard is closed.</li>
        </ol>
        <p>Basic example kdb code to create a subscription:</p>
        <textarea value={cod} readOnly rows={10} cols={80} />   
    </div></>
}

function HelpPageInstall() {

    const cod = '' 
    + 'wget http://sqldashboards.com/files/sqldash.zip && unzip sqldash.zip\n'
    + 'java -jar sqldash/server-0.1-all.jar/\n'
    + '\n'
    + '#https://geekflare.com/systemd-start-services-linux-7/\n'
    + '\n'
    + 'wget -qO /etc/apt/trusted.gpg.d/google_linux_signing_key.asc https://dl.google.com/linux/linux_signing_key.pub\n' 
    + 'echo "deb http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google_chrome.list\n' 
    + 'sudo apt update\n' 
    + 'sudo apt install -y google-chrome-stable\n' 
    + 'google-chrome --version\n' 
    + 'google-chrome --headless --disable-gpu --screenshot=test.png --window-size=1920,1080 https://www.google.com --no-sandbox\n';

    const portset = '' 
    + 'export SERVER_PORT=8080\n'
    + 'set SERVER_PORT=8080\n'

    useEffect(() => { document.title = ANAME + " Help - Installation" }, []);
    return <><div>
        <h1>Help - Installation</h1>
        <p>{ANAME} can be installed and ran on windows/linux and mac by downloading the package for that platform and simply running it.
            The only requirement is to have a java version 1.8+ installed.
            To enable extra functionality e.g. email reporting  may require additional setup detailed below.
        </p>
        <h2 id="linux">Linux</h2>
        <h3>Reporting - Install Headless Chrome</h3>
        <p>For Ubuntu:</p>
        <textarea rows={5} cols={80} value={cod}  readOnly />
        <p>umask of systemd service should be set to allow file creation in home folder. 
            As app automatically downloads appropriate driver.
        </p>
        <h1>Changing Port</h1>
        <p>To change port from the default 80, set the environment variable SERVER_PORT.</p>
        <textarea rows={2} cols={80} value={portset}  readOnly />
    </div></>
}

function HelpPageFAQ() {
    useEffect(() => { document.title = ANAME + " Help - FAQ" }, []);
    return <><div>
        <h1>Help - FAQ - Frequently Asked Questions</h1>

        <ul>
            <li><a href="#export">Exporting Data</a></li>
            <li><a href="#keyboard">Keyboard Shortcuts</a></li>
        </ul>

        <h2 id="export">Exporting Data</h2>
        <p>Data can be exported by right-clicking on any data table and selecting one of the export options: CSV/Excel/Tab separated.</p>
        <img src="/img/help/context-menu.png" width="590" height="351" alt="table right-click context menu showing export excel options"/>

        <h2 id="keyboard">Keyboard Shortcuts</h2>
        <p>You can press shift+? to get a listing of what shortcuts are available.</p>
    </div></>
}

function HelpPageEmailReports() {
    useEffect(() => { document.title = ANAME + " Help - Email Reports" }, []);
    return <><div>
        <h1>Help - Email Reports</h1>
        <p><b>Dashboard Reports</b> allow emailing a specific configuration of dashboard at a selected time.</p>
        <ul>
            <li>Any user with access can create a report configuration for a dashboard.</li>
            <li>Any user with access can then subscribe to that report.</li>
        </ul>
        <h2>Subscribe to Emailed Report</h2>
        <p>To subscribe to emails for a dashboard, click on the </p>
        <img src="/img/help/subscribe-email-report.png" width="752" height="202" alt="Subscribing to an emailed report"/>
        <img src="/img/help/subscribe-email-report-dropdown.png" width="215" height="245" alt="Subscribing to an emailed report"/>
        <p>A Dashboard configration includes any form arguments, a time, a screenshot size and other options.</p>
    </div></>;
}

function HelpPageSecurity() {
    useEffect(() => { document.title = ANAME + " Help - Security" }, []);
    return <><div>
        <h1>Help - Security</h1>
        <h2>Authentication</h2>
        <p>User names and passwords can be validated by either:
            <ul>
                <li>The dashboard database. Password hasshes are stored and when a user requests access that hash is checked.</li>
                <li>A REST call. If parameter XXX is set, that parameter defines where to find an HTTP endpoint that will be used to authenticate username/password.
                    By default the password is over SSL. The remote call either returns true or false.
                </li>
            </ul>
        </p>
        <h2>Authorization</h2>
        <p>All access roles are stored within the internal database. There are currently only 2 levels of access:
            <ul>
                <li>Admin - Can access and edit everything.</li>
                <li>Standard - Can only view everything.</li>
            </ul>
        </p>
    </div></>
}

function HelpPageReleaseNotes() {
    useEffect(() => { document.title = ANAME + " Help - Release Notes" }, []);
    return <div>
        <h1>Releases</h1>
        <ul>
            <li>Version 0.7.4
                <ul>
                    <li>Add KDB Streaming Subscriptions</li>
                    <li>Add ability to set column formatter from context menu</li>
                    <li>Allow setting query refresh rates</li>
                </ul>
            </li>
            <li>Version 0.7.3
                <ul>
                    <li>Add HTML component</li>
                    <li>Added default queries when new chart added</li>
                    <li>Reports - screenshot and HTML output can now run</li>
                    <li>Reports - Add HTML table to email</li>
                    <li>SQL Editor - Improved kdb support. Added console and list view for non-table objects</li>
                    <li>Form parameters now use {"{arg}"} and ((arg))</li>
                </ul>
            </li>
            <li>Version 0.7.2
                <ul>
                    <li>Add Dashboard history tracking to allow quick restoration of old versions</li>
                    <li>Users can quick open favourite dashboards</li>
                    <li>Add User Analytics</li>
                    <li>Dashboard user arguments to URL allows bookmarking</li>
                    <li>Add User logins</li>
                    <li>Add reports / subscriptions CRUD</li>
                </ul>
            </li>
            <li>Version 0.7.1
                <ul>
                    <li>Popouts which remember location</li>
                    <li>Table context menu allows excel/csv download</li>
                </ul>
            </li>
            <li>Version 0.6.6 - Add Screenshot capability</li>
            <li>Version 0.6.5 - Added SlickGrid table</li>
            <li>Version 0.6.4 - Automated .exe installer</li>
            <li>Version 0.6.3 - Added SQL editor.</li>
            <li>Version 0.6.2 - Alpha Release
                <ul>
                    <li>Dashboards - Ability to add charts/tables, save dashboards</li>
                    <li>Automated Continuous Integration</li>
                </ul>
            </li>
        </ul>
    </div>;
}

function HelpPageForm() {
    return <><div>
        <h1>Help - Forms</h1>
        <h2>Query Prameters</h2>
        <p>Chart and table <b>queries</b> can use <b>Keys</b> to reference parameters.
        Values can be selected in forms and this will populate the key.</p>

        <p>This form contains one dropdown.
            <ol>
                <li> The dropdown is populated from a user supplied list of value|nice name|descriptions. </li>
                <li>When a user selects a an option, the value gets placed into the key. 
                    <br />i.e. 1 Hour is selected, the key <i>mins</i> is populated with the value <i>60</i>.</li>
                <li>This means any query that references the key mins using <b>{"{mins}"}</b> will be updated with the the value 60.</li>
            </ol>
        </p>
        <img src="/img/help/form-creation.png" width="1045" height="439" alt="Creating a form"/>
        <p>
        e.g. below is a chart that uses the <i><b>{"{mins}"}</b></i> parameter to configure how many minutes of data to display.
        <br />Notice the curly braces are used within queries to allow your parameters to be detected and replaced.</p>
        
        <img src="/img/help/query-parameter-select.png" width="658" height="523" alt="Creating a form"/>

        <h3>Do I need to use curly braces {"{curlyBraces}"} ?</h3>
        <p>Yes. Within the SQL code you need a way to identify variables you want to set. 
            The clearest way to do this is by using containing braces similar BASH script.
            Other alternatives such as $prefix were considered but these clashed with functions used in some databases.
        </p>
        <p><b>OK but I really don't like {"{variable}"} or they are causing problems</b></p>
        <p>
            You have two options:
            <ul>
                <li><b>Escape characters</b> e.g. {"\\{"} can be used to force {"{"} to be sent. 
                If you need to send a curly brace and do NOT want it relpaced or used as a parameter, escapte it.</li>
                <li><b>((keyName)) can alternatively be used.</b> Instead of {"{variableName}"} you can do ((variableName)) 
                this is currently not recommended as we think it will be more fragile for some databases longer term.
                <br />
                One benefit of this notation is that with the kdb database, this is valid code and would just run within the query editor assuming the variable is defined.</li>
            </ul>
        </p>
    </div></>
}
