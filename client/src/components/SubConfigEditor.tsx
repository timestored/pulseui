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
 
import { useState, useMemo } from 'react';
import { Button, Icon, IconName, InputGroup,  NumericInput, Slider } from '@blueprintjs/core';
import { merge,get,set, filter, unset, clone, cloneDeep, debounce } from 'lodash-es';
import Collapsible from 'react-collapsible';
import { ErrorBoundary } from '../ErrorBoundary';
import { getDefaultErrorFallback } from './CommonComponents';
import { AxisChoice, ChartType, ColConfig, ColFormat, getEmptySubConfig, SubConfig } from './ChartFactory';
import { DataTypeMap, DataTypes, SmartRs } from '../engine/chartResultSet';
import { FormatterButton  } from './AGridContextMenu';
import Checkbox from 'react-three-state-checkbox';
import { containsGridSDcol, defaultGridConfig } from './AGrid';
import { ActionEditor } from '../engine/actionHandlers';
import { ServerConfig } from './ConnectionsPage';


type MergFunction = (f:(v:any) => any, forceRefresh:boolean) => void;

/** Hide line/item configuration when bar chart as none of them have effect. */
function isCurrentlyBar(chartType:ChartType, colConfig:ColConfig, colName:string):boolean {
	const isBarType = (chartType === "bar" || chartType === "stack" || chartType === "stack_horizontal" || chartType === "bar_horizontal");
	return get(colConfig,colName+".type",isBarType ? "bar" : "line") === "bar";
}

export const SubConfigEditor = (props:{subConfig:SubConfig, onChange:((s:SubConfig, forceRefresh:boolean)=>void), srs:SmartRs|undefined, chartType:ChartType, serverConfigs:ServerConfig[]})=> {
	const { subConfig, onChange, srs, chartType } = props;
    const [filter,setFilter] = useState("");

	// Some components below here are only aware that they are editing JSON and pushing changes back up. 
	// These merge functions, merge the data back in and notify the parent.
	// label = The address location within the json we are editing
	// Useful to pass down almost full label - as that label is also used for search/filter for users
	const setOverrideMerg:MergFunction = (f, forceRefresh) => { 
		const oj = merge(clone(subConfig.overrideJson), f(clone(subConfig.overrideJson)));
		onChange({ ...subConfig, overrideJson:oj}, forceRefresh); 
	}
	const setColMerg:MergFunction = (f, forceRefresh) => { 
		const cc = merge(clone(subConfig.colConfig), f(clone(subConfig.colConfig)));
		onChange({ ...subConfig, colConfig:cc}, forceRefresh); 
	}
	const setGridMerg:MergFunction = (f, forceRefresh) => { 
		const oj =f(clone(subConfig.gridConfig));
		onChange({ ...subConfig, gridConfig:oj}, true); 
	}
	const setIntMerg:MergFunction = (f, forceRefresh) => { 
		const ic = merge(clone(subConfig.interactiveConfig), f(clone(subConfig.interactiveConfig)));
		onChange({ ...subConfig, interactiveConfig:ic}, forceRefresh); 
	}

	function onlyUnique(value: any, idx: number, self: any) { return self && self.indexOf(value) === idx; }
	const axisChosen = Object.entries(subConfig.colConfig).map(([k,v]) => v.axisChoice ?? "leftax").filter(onlyUnique) as AxisChoice[];
    const knownTypes:DataTypeMap = srs?.rsdata.tbl.types || {};
	const colsShown = Object.entries(knownTypes).filter(([k, value], index) => !containsGridSDcol(k));
	const isGrid = chartType === "grid";

	return <div className='AFormComponentEditor' id='SubConfigEditor'>
		<div className="JsonEditor aform aformVert" >
			<div style={{margin:10}} className="aform aformHorizontal">
				<div className="aformRow aformRowHorizontal"><Button icon="reset" small onClick={()=>onChange(getEmptySubConfig(), true)}>Reset All</Button></div>
				<div className="aformRow aformRowHorizontal">
					<InputGroup value={filter} onChange={txt => setFilter(txt.target.value) } leftIcon={"search"} placeholder="Search for setting" />
					<Button icon="filter-remove" small onClick={()=>setFilter("")}>Clear</Button>
				</div>
				</div>
			
			<ErrorBoundary FallbackComponent={getDefaultErrorFallback("Error rendering column editor")}>

			{isGrid && <GridEditor value={subConfig?.gridConfig ?? {}} setMerg={setGridMerg} label={""} filter={filter} />}
			<Collapsible trigger="Columns" open={true}>
				<CompactColEditor colConfig={subConfig.colConfig} setMerg={setColMerg} colsShown={colsShown} filter={filter} chartType={chartType}/>
				{ chartType === "metrics" ? null
					: isGrid ? 
					colsShown.map(([k, value], index) => {
						const niceColName = get(subConfig.colConfig,k+".name",k) as string;
						return <GridColEditor key={k} value={subConfig.gridConfig} label={k}  header={niceColName} filter={filter} setMerg={setGridMerg} />;
						})
					:  colsShown.map(([k, value], index) => {
						const niceColName = get(subConfig.colConfig,k+".name",k) as string;
						const isBar = isCurrentlyBar(chartType, subConfig.colConfig, k);
						return value === "number" ? 
							<ColSeriesEditor key={k} value={subConfig.colConfig} label={k}  header={niceColName} filter={filter} setMerg={setColMerg} isBar={isBar} /> 
							: null;
						})
					}
			</Collapsible>

			</ErrorBoundary>
			{!isGrid && chartType !== "metrics" && 
				<JsonEditor value={subConfig?.overrideJson ?? {}} setMerg={setOverrideMerg} label={""} filter={filter} axisChosen={axisChosen} >
						<BooleanFrow label="showPulsePivot" allowIndeterminate={false} customLabel={<Icon icon="pivot-table" size={16} />} 
									filter={''} value={subConfig?.gridConfig ?? {}} setMerg={setGridMerg} />
					</JsonEditor>}
			<InteractiveEditor label={''} filter={filter} value={subConfig?.interactiveConfig ?? {}} setMerg={setIntMerg} open={subConfig?.actionHandlers.length>0}>
				{<ActionEditor actionHandlers={subConfig?.actionHandlers ?? []} serverConfigs={props.serverConfigs}
						// Make sure hardRefresh=false, otherwise each key press causes slow full chart refresh.
						modify={(ahlist) => { onChange({ ...subConfig, actionHandlers: ahlist }, false); } } 
						triggerChoices={["Click","Menu"]}/>}
			</InteractiveEditor>
			
		</div>
		<div style={{height:"100px"}}></div>
	</div>;
}

type JsonEditorArgs = {label:string, filter:string, value:any, setMerg:MergFunction, newRow?:boolean, niceName?:string, description?:string};

const GridEditor = (props:JsonEditorArgs) => {

	const a = { filter:props.filter, value:props.value,  setMerg:props.setMerg, niceName:props.niceName, description:props.description };
	a.value = merge(cloneDeep(defaultGridConfig), a.value ?? {}); // This is ESSENTIAL to display defaults.

	return (<ErrorBoundary FallbackComponent={getDefaultErrorFallback("Error rendering editor")}>
		<Collapsible trigger="Grid" open>
			<BooleanFrow label="showPulsePivot" {...a} allowIndeterminate={false} customLabel={<Icon icon="pivot-table" size={16} />} />
			<ChoiceFrow label='pager' choices={["-2","0","25","50","100"]} niceNames={["none","All","25","50","100"]}  {...a} />
			<BooleanFrow label="showPreheaderPanel" {...a} allowIndeterminate={false} />
			<BooleanFrow label="autosizeColumns" {...a} allowIndeterminate={false}  />
			<BooleanFrow label="showFilters" {...a} allowIndeterminate={false}  />
			<BooleanFrow label="showContextMenu" {...a}  niceName="show Right-Click Menu" allowIndeterminate={false}  />
			<NumFrow label="frozenRow" {...a} />
		</Collapsible>
		</ErrorBoundary>);
}


/**
 * JSON Editor provides "Typed" editors within a form
 * Each FROW = Form Row -> typically allows modifying one json entry e.g. title.text.size 
 */
const JsonEditor = (props:JsonEditorArgs & {axisChosen:AxisChoice[], children?:React.ReactNode,}) => {

	/* Considered using a JSON editor component that could have defined schema
	 * But realised making it myself would be better and allow sticking to exact same data format as eCharts
	 */
	const opn = props.filter.length > 0;
	const a = { filter:props.filter, value:props.value,  setMerg:props.setMerg, niceName:props.niceName, description:props.description };

	return (<ErrorBoundary FallbackComponent={getDefaultErrorFallback("Error rendering editor")}>
		<Collapsible trigger="Basics" open={opn}>
			{props.children}
			<BooleanFrow label="legend.show" {...a} />
			<BooleanFrow label="tooltip.show" {...a}  />
			<BooleanFrow label="custom.dataZoom.show" {...a} />
			<ColorFrow label="backgroundColor"  {...a} />
			<BooleanFrow label="animation" {...a} />
			<TrblFrow label="grid" {...a} newRow={false}/>
			<BooleanFrow label="grid.containLabel" {...a} />
		</Collapsible>

		<Collapsible trigger="Title"  open={opn}>	
			<CommonFrow label="title"  {...a} >
				<TextFrow label="title.text"  {...a} />
				<TextStyleFrow label="title.textStyle" {...a} newRow={true} />
			</CommonFrow>
		</Collapsible>

		<Collapsible trigger="Legend"  open={opn}>	
			<CommonFrow label="legend"  {...a} >
				<ChoiceFrow label="legend.orient"  {...a} choices={["horizontal","vertical"]} />
				<ChoiceFrow label="legend.align"  {...a} choices={["auto","left","right"]} />
				<LineStyleFrow label="legend.lineStyle"  {...a} />
			</CommonFrow>
		</Collapsible>

		<Collapsible trigger="xAxis"  open={opn}>	 <AxisOptions label="xAxis[0]"  {...a}  /> </Collapsible>
		<Collapsible trigger={"yAxis" + (props.axisChosen.includes("rightax") ? " Left" : "")}  open={opn}>	 <AxisOptions label="yAxis[0]"  {...a}  /> </Collapsible>
		{props.axisChosen.includes("rightax") && <Collapsible trigger="yAxis Right"  open={opn}> <AxisOptions label="yAxis[1]"  {...a}  /> </Collapsible>}
		<Collapsible trigger="tooltip"  open={opn}>	 <TooltipOptions label="tooltip"  {...a}  /> </Collapsible>

		<Collapsible trigger="Data Zoom"  open={opn}>	
			<DataZoomBooleanFrow label="custom.dataZoom.show" {...a} /> {/* Non-standard - hacked in */}
			<ColorFrow label="custom.dataZoom.backgroundColor" {...a} />
			<TrblFrow label="custom.dataZoom" {...a} newRow={false}/>
		</Collapsible>

		<Collapsible trigger="Axis Pointer"  open={opn}>	
			<BooleanFrow label="axisPointer.show" {...a} />
			<BooleanFrow label="axisPointer.triggerTooltip" {...a} />
			<ChoiceFrow label="axisPointer.type"  {...a} choices={["line","shadow","none"]} />
			<ChoiceFrow label="axisPointer.triggerOn"  {...a} choices={["mousemove","click"]} />
			<LineStyleFrow label="axisPointer.lineStyle"  {...a} />
		</Collapsible>

		{/* <Collapsible trigger="Data Zoom">	
			<BooleanFrow label="datazoom.disabled" {...a} />
    	</Collapsible> */}
		</ErrorBoundary>);
}

const CompactColEditor = (props:{colConfig:ColConfig, setMerg:MergFunction, colsShown:[string,DataTypes][], filter:string, chartType:ChartType}) => {
    
	const isGrid = props.chartType === "grid";

	const rows = props.colsShown.map(([colName, value], index) => {
		const colConfig = props.colConfig;
		const doChange = (colName:string, colFormat:ColFormat) => { props.setMerg((v:any) => {set(colConfig, colName+".colFormat", colFormat); return colConfig;}, true) };

		const formatter = <FormatterButton type={value} colName={colName} setColumnFormat={doChange} selected={colConfig[colName]?.colFormat ?? ""}/>;

		const a = {filter:props.filter, value:colConfig, setMerg:props.setMerg };
		const isBar = isCurrentlyBar(props.chartType, a.value, colName);

		if(value === "number" && !isGrid) {
			return <tr key={colName}>
				<td><TextFrow niceName='' label={colName+".name"} {...a} placeholder={colName} /></td>
				<td>{formatter}</td>
				{/* // need idPrefix to prevent clash between compact and non-compact control */}
				<td><ChoiceFrow niceName='' label={colName+".type"} choices={["bar","line"]} {...a} idPrefix="compact" /></td>
				<td><ChoiceFrow niceName='' label={colName+".axisChoice"} choices={["leftax","rightax"] /*AxisChoice*/} {...a} idPrefix="compact" niceNames={["𝖫","ᒧ"]} /></td>
				<td><ColorFrow niceName='' label={colName+".itemStyle.color"} {...a} /></td>
				{/* For bar charts only item color has effect. So hide other options */}
				<td>{!isBar && <ColorFrow niceName='' label={colName+".lineStyle.color"} {...a} />}</td>
				<td>{!isBar && <ColorFrow niceName='' label={colName+".areaStyle.color"} {...a} />}</td>
			</tr>;
		}
		return <tr key={colName}>
				<td><TextFrow niceName='' label={colName+".name"} {...a} placeholder={colName} /></td>
				<td>{formatter}</td>
				{isGrid && <>
					<td><NumFrow niceName='' label={colName + ".colWidth"} {...a} /></td>
					</>}
			</tr>;
      });

    return <div>
		<table>
			<thead><tr><th>Column</th><th>Formatter</th>
				{isGrid ? 
					<><th>width</th></> : 
					<><th>Type</th><th>Axis</th><th>Item</th><th>Line</th><th>Area</th></>}
				</tr></thead>
			<tbody>{rows}</tbody>
			</table>
	</div>;
}

export const GridColEditor = (props:JsonEditorArgs & { header:string}) => {
	const a = props; 
	const l = "gridclmConfig." + props.label;
	return <Collapsible trigger={props.header}  open={props.filter.length>0} >	
		<ChoiceButtonFrow {...a} label={l+".textAlign"} choices={["left","center","right"] /* GridclmConfig.textAlign */} idPrefix="compact" icons={["align-left","align-center","align-right"]} />
		<ColorFrow {...a}  label={l + ".color"}/>
		<ColorFrow {...a}  label={l + ".backgroundColor"}/>
		<ChoiceFrow {...a} label={l+".fontWeight"} choices={["normal","bold"]} />
		{/*  Started to implement excel like bars but don't have a direct ask for them and implementation became complicated. Likely best implementation of bars was going to be linear-gradients in CSS.
		<BooleanFrow {...a} label={l+".cfDataBar"} niceName="show Data Bar" allowIndeterminate={false} ><span className="cficon_databarformatdialog"></span></BooleanFrow>
		<BooleanFrow {...a} label={l+".cfColorScale"} niceName="show Color Scale" allowIndeterminate={false} ><span className="cficon_colorscaleformatdialog"></span></BooleanFrow>
		<BooleanFrow {...a} label={l+".cfIconSet"} niceName="show Icon Set" allowIndeterminate={false} ><span className="cficon_iconsetformatdialog"></span></BooleanFrow> */}
	</Collapsible>
}

export const ColSeriesEditor = (props:JsonEditorArgs & { header:string, isBar:boolean}) => {
	const a = props; 
	const l = props.label;
	if(props.isBar) {
		return <Collapsible trigger={props.header}  open={props.filter.length>0} >	
			<TextFrow {...a} label={l+".name"} />	
			<ChoiceFrow {...a} label={l+".type"} choices={["bar","line","scatter"]} />
		</Collapsible>;
	}
	return <Collapsible trigger={props.header}  open={props.filter.length>0} >	
		<TextFrow {...a} label={l+".name"} />	
		<ChoiceFrow {...a} label={l+".type"} choices={["bar","line","scatter"]} />
		<ColorFrow {...a} label={l+".itemStyle.color"} />
		<LineStyleFrow {...a} label={l+".lineStyle"} />
		<BooleanFrow {...a} label={l+".showSymbol"} />
		<ChoiceFrow {...a} label={l+".symbol"} choices={["circle","rect","roundRect","triangle","diamond","pin","arrow","none"]}  />
		<SliderFrow {...a} label={l+".symbolSize"} min={0} max={20} stepSize={0.5} labelStepSize={2} />
		<SliderFrow {...a} label={l+".symbolRotate"} min={0} max={360} stepSize={45} labelStepSize={90} />	
		<BooleanFrow {...a} label={l+".connectNulls"} />
		<ChoiceFrow {...a} label={l+".step"} choices={["true","false","start","middle","end"]} showReset  />
		
		<Collapsible trigger="Area Style"  open={props.filter.length>0} >	
			<ColorFrow {...a} label={l+".areaStyle.color"} />
			<SliderFrow {...a} label={l+".areaStyle.opacity"} min={0.0} max={1.0} stepSize={0.05} labelStepSize={0.2} /> 
		</Collapsible>
	</Collapsible>;
}


/**
 * JSON Editor provides "Typed" editors within a form
 * Each FROW = Form Row -> typically allows modifying one json entry e.g. title.text.size 
 */
 const InteractiveEditor = (props:JsonEditorArgs & {children:any, open?:boolean}) => {
	const opn = props.filter.length > 0 || props.open === true;
	const a = { filter:props.filter, value:props.value,  setMerg:props.setMerg, niceName:props.niceName, description:props.description };

	return (<ErrorBoundary FallbackComponent={getDefaultErrorFallback("Error rendering Interactive Editor")}>
		<>
		<Collapsible trigger="Interactive" open={opn}>	
			<BooleanFrow label="enabled" allowIndeterminate={false} {...a} value={{enabled:props.value.enabled ?? true}} />
			<TextFrow label="wkeyName" {...a} niceName='key prefix' />
			{props.children}
		</Collapsible>
		</>
	</ErrorBoundary>);
}




////////////       FROW = Form ROW = i.e. One row in the form. Though newRow allows nesting Frows without taking a new line.
const setVal = (props:JsonEditorArgs, val:any) => { props.setMerg((v:any) => {set(props.value, props.label, val); return props.value; }, false) } 
// careful that clearVal calls hardRefresh:true as echarts "merges" updates.
const clearVal = (props:JsonEditorArgs) => { props.setMerg((v:any) => {unset(props.value, props.label); return props.value; }, true) } 
const getVal = (props:JsonEditorArgs, defVal:any) => { return get(props.value,props.label,defVal); }


// Need a custom component, as turning off, removes the key
// Removing the key, requires forceRefresh=true
const DataZoomBooleanFrow = (props:JsonEditorArgs) => {
	const chk = getVal(props, undefined);
	const lookups = props.label.split(".");
	const sz = lookups.length;
	const niceName = sz > 1 ? lookups[sz - 1] + " " + lookups[sz - 2] : undefined;
	const s = <Checkbox checked={chk === true} indeterminate={chk===undefined} 
	onChange={(e)=> { 
		if(chk === true || chk === undefined) {
			const val = chk === true ? false : true;
			props.setMerg((v:any) => {set(props.value, props.label, val); return props.value; }, true);
		} else {
			clearVal(props); // must clear to force merge chart props
		}
	}} />;
	return ((props.newRow ?? true) ? <Frow  {...props} niceName={niceName} >{s}</Frow> : <>{s}</>);
}


const BooleanFrow = (props:JsonEditorArgs & {allowIndeterminate?:boolean, customLabel?: React.ReactNode}) => {
	const chk = getVal(props, undefined);
	const allowIndeterminate = props.allowIndeterminate ?? true;
	const lookups = props.label.split(".");
	const sz = lookups.length;
	let niceName = undefined;
	if(props.niceName !== undefined) {
		niceName = props.niceName;
	} else if(sz > 1) { // legends.show = show legends
		niceName = lookups[sz - 1] + " " + lookups[sz - 2];
	} else if(props.label.startsWith("show") && props.label.length > 5) { // showLegends = show Legends
		niceName = "show " + props.label.substring(4);
	}
	const s = <Checkbox checked={chk === true} indeterminate={allowIndeterminate && chk===undefined}
					onChange={(e)=> { 
						if(chk === true) {
							setVal(props, false);
						} else {
							allowIndeterminate && chk !== undefined ? clearVal(props) : setVal(props,true); // must clear to force merge chart props
						}
					}} />;
	return ((props.newRow ?? true) ? <Frow  {...props} niceName={niceName} labelSide="right" >{s}{props.customLabel}</Frow> : <>{s}</>);
}


const NumFrow = (props:JsonEditorArgs)  => {
	const s = <NumericInput allowNumericCharactersOnly placeholder='Enter a number' value={get(props.value,props.label)}
		onValueChange={(num,st) =>{ 
			st === '' ? clearVal(props) : setVal(props,num)
		}}/>;
	return ((props.newRow ?? true) ? <Frow  {...props}>{s}</Frow> : <>{s}</>);
}

const TextFrow = (props:JsonEditorArgs & {asNumber?:boolean, placeholder?:string}) => {
	const s = <InputGroup value={getVal(props, "")}  placeholder={props.placeholder}
		onChange={txt => {
			if(txt.target.value.length>0) {
				setVal(props,txt.target.value);
			} else {
				setVal(props,"");
				clearVal(props); // Don't just set to "", as that prevents falling back to actual default
			}
		} } />;
	return ((props.newRow ?? true) ? <Frow  {...props}>{s}</Frow> : <>{s}</>);
}


export const TextRow = <T extends string>(props:{label:string, selected:T, onChange:(v:T)=>void, newRow?:boolean, children?:React.ReactNode, placeholder?:string}) => {
	const { selected, label, onChange, newRow, placeholder } = props;
	const s = <InputGroup value={selected}  placeholder={placeholder} onChange={txt => onChange(txt.target.value as T)} />;
	return ((newRow ?? true) ? <Row key={label} {...props}>{s}</Row> : <>{s}</>);
}


const ColorFrow = (props:JsonEditorArgs) => {
	const v = getVal(props, undefined);
	const debouncedChangeHandler = useMemo(() => debounce((val:any) => { setVal(props,val) }, 100), [props]);
	const s = <>
		<input type={"color"} value={v ?? "#888888"}  
			onChange={txt => debouncedChangeHandler(txt.currentTarget.value) } />
		<Button small icon="reset" onClick={() => clearVal(props)} disabled={v===undefined} />
		</>;
	return ((props.newRow ?? true) ? <Frow  {...props}>{s}</Frow> : <>{s}</>);
}

const SliderFrow = (props:JsonEditorArgs & {min?:number, max?:number, stepSize:number, labelStepSize:number}) => {
	// Copied from ASLider
	const s = <>
		<Slider value={getVal(props, props.min ?? 0)} min={props.min} max={props.max} stepSize={props.stepSize}  labelStepSize={props.labelStepSize}
			onChange={e => setVal(props,e) } />
		<Button small icon="reset" onClick={() => clearVal(props)} />
		</>;
	return ((props.newRow ?? true) ? <Frow  {...props}>{s}</Frow> : <>{s}</>);
}

/** Untyped wrapper for ChoiceRow */
const ChoiceFrow = (props:JsonEditorArgs & {choices:string[],niceNames?:string[], showReset?:boolean, idPrefix?:string}) => {
	const { choices, idPrefix, label,  niceNames } = props;
	const s = <ChoiceRow idPrefix={idPrefix??""} selected={getVal(props,"")} onChange={s => setVal(props,s) } newRow={false} {...{choices, label, niceNames}}  >
		{props.showReset ? <Button small icon="reset" onClick={() => clearVal(props)} /> : null}
	</ChoiceRow>;
	return ((props.newRow ?? true) ? <Frow key={props.label} {...props}>{s}</Frow> : <>{s}</>);
}

/**
 * Presents inline choices in format [opt1] [opt2] [opt3] to allow choosing one.
 * Note: ChoiceRow is very similar to ChoiceFrow in appearance. Main difference is that Rows are typed, Frows do no type checking.
 */
export const ChoiceRow = <T extends string>(props:{choices:T[], niceNames?:string[], idPrefix:string, label:string, selected:T, onChange:(v:T)=>void, newRow?:boolean, children?:React.ReactNode}) => {
	const { choices, selected, idPrefix, label, onChange, newRow, niceNames } = props;
	const s = <div className="switch-field">
		{choices.map((s,idx) => {
			const pre = (idPrefix ?? "");
			const n = pre + label.replaceAll(":","_") + "-" + s;
			return <span key={n} >
				<input type="radio" key={n} id={n} name={pre+label.replaceAll(":","_")} value={s} onChange={e => onChange(e.currentTarget.value as T)} checked={selected===s} />
				<label htmlFor={n} key={n+"-lbl"} >{niceNames ? niceNames[idx] :s}</label>
			</span>;
		})}
		{props.children}
	</div>;
	return ((newRow ?? true) ? <Row key={props.label} {...props}>{s}</Row> : <>{s}</>);
}

export const BooleanRow = (props:{label:string, onChange:(b:boolean)=>void, checked:boolean, customLabel?: React.ReactNode, newRow?:boolean}) => {
	const s = <Checkbox checked={props.checked} onChange={(e)=> { props.onChange(!props.checked)	}} />;
	return ((props.newRow ?? true) ? <Row  {...props} labelSide="right" >{s}{props.customLabel}</Row> : <>{s}</>);
}


export const Row = (props:{children:React.ReactNode, label?:string, description?:string, layout?:"Horizontal" | "Vertical", labelSide?:"left"|"right"}) => {
	return (<div key={props.label} className={"aformRow aformRow"+ (props.layout === "Horizontal" ? "Horizontal" : "Vert")}>
		{props.labelSide !== "right" &&  <label>{props.label}</label>}
		{props.children}
		{props.labelSide === "right" &&  <label>{props.label}</label>}
	</div>);
}



const ChoiceButtonFrow = (props:JsonEditorArgs & {choices:string[],icons:IconName[], showReset?:boolean, idPrefix?:string}) => {
	const s = <div className="switch-field">
		{props.choices.map((s,idx) => {
			return <Button small  key={s} value={s} icon={props.icons[idx]} onClick={() => setVal(props,s)} active={getVal(props,"")===s}/>;
		})}
		{props.showReset ? <Button small icon="reset" onClick={() => clearVal(props)} /> : null}
	</div>;
	return ((props.newRow ?? true) ? <Frow key={props.label} {...props}>{s}</Frow> : <>{s}</>);
}

const TextStyleFrow = (props:JsonEditorArgs) => {
	const label = props.label;
	return (<Collapsible trigger={props.label + " Text Style"}  open={props.filter.length>0} default={false} >
		<ColorFrow {...props}  label={label + ".color"} />
		<NumFrow {...props} label={label + ".fontSize"} />
		<ChoiceFrow {...props} key=".fontStyle" label={label + ".fontStyle"} niceName="style" choices={["normal","italic","oblique"]} />
		<ChoiceFrow {...props} key=".fontWeight" label={label + ".fontWeight"} niceName="weight" choices={["normal","bold","bolder","lighter"]} />
		<ChoiceFrow {...props} key=".fontFamily"  label={label + ".fontFamily"} niceName="family" choices={["sans-serif","serif","monospace"]} />
		{/* // text width / height / border - left out for now */}
	</Collapsible>);
}


const LineStyleFrow = (props:JsonEditorArgs) => {
	const label = props.label;
	return (<Collapsible trigger={props.label + " Line Style"}  open={props.filter.length>0}>
		<SliderFrow {...props} key=".width" label={label + ".width"} min={0} max={20} stepSize={0.5} labelStepSize={2} />
		<ColorFrow {...props}  key=".color" label={label + ".color"} />
		<ChoiceFrow {...props} key=".type" label={label + ".type"} choices={["solid","dashed","dotted"]} />
		<ChoiceFrow {...props} key=".cap" label={label + ".cap"} choices={["inherit","butt","round","square"]} />
		<ChoiceFrow {...props} key=".join" label={label + ".join"} choices={["inherit","bevel","round","miter"]} />
		<SliderFrow {...props} key=".opacity" label={label + ".opacity"} min={0.0} max={1.0} stepSize={0.05} labelStepSize={0.2} /> 
		{/* // text width / height / border - left out for now */}
	</Collapsible>);
}


const TrblFrow = (props:JsonEditorArgs) => {
	return (<Frow label={props.label} filter={props.filter} niceName="margin">
		<label>top</label><TextFrow {...props} label={props.label + ".top"} />
		<label>right</label><TextFrow {...props} label={props.label + ".right"} />
		<label>bottom</label><TextFrow {...props} label={props.label + ".bottom"} />
		<label>left</label><TextFrow {...props} label={props.label + ".left"} />
	</Frow>);
}


const CommonFrow = (props:JsonEditorArgs & {children?:React.ReactNode}) => {
	return (<>
	<BooleanFrow  {...props} label={props.label + ".show"} />
	<TrblFrow  {...props} label={props.label}  newRow={false}/>
	{props.children}
	{props.children && <div style={{height:10}}/>}
	<NumFrow  {...props} label={props.label + ".padding"} />
	<ChoiceFrow {...props} label={props.label + ".textAlign"} choices={["auto","left","right","center"]} newRow/>
	<ChoiceFrow {...props} label={props.label + ".textVerticalAlign"} choices={["auto","top","bottom","middle"]} newRow />
	<ColorFrow {...props} newRow label={props.label + ".backgroundColor"}   />
	<BorderFrow {...props} label={props.label} newRow={false} />
	</>);
}

const BorderFrow = (props:JsonEditorArgs) => {
	return <Frow label={props.label + ".border"} filter={props.filter}>
		<label>Color</label><ColorFrow {...props} niceName="Color" label={props.label + ".borderColor"} />
		<label>Width</label><SliderFrow {...props} label={props.label + ".borderWidth"} min={0} max={20} stepSize={0.5} labelStepSize={2} />
		{/* <label>radius</label><NumFrow {...props} label={props.label + ".borderRadius"} /> */}
	</Frow>;
}

const TooltipOptions = (props:JsonEditorArgs) => {
	return (<>
		<BooleanFrow {...props} label={"tooltip.show"}/>
		<ColorFrow {...props} newRow label={props.label + ".backgroundColor"}   />
		<ChoiceFrow   {...props} label="tooltip.trigger" choices={["item","axis","none"]} />
		<NumFrow  {...props} label="tooltip.showDelay" />
		<NumFrow  {...props} label="tooltip.hideDelay" />
		<ChoiceFrow   {...props} label="tooltip.position" choices={["inside","top","left","right","bottom"]} />
		<BorderFrow {...props} label={props.label} newRow={false} />
		<TextStyleFrow  {...props} label={props.label + ".textStyle"} newRow={true} />
	</>);
}


const AxisOptions = (props:JsonEditorArgs & {label:"xAxis[0]"|"yAxis[0]"|"yAxis[1]"}) => {
	const a = props;
	const l = props.label;
	return (<>
		<ChoiceFrow {...a} label={l + ".position"}  choices={l!=="xAxis[0]"? ["left","right"] : ["top","bottom"]} />
		<TextFrow {...a} label={l + ".min"} />
		<TextFrow {...a} label={l + ".max"} />
		<BooleanFrow {...a} label={l + ".axisLabel.show"} />
		<SliderFrow {...a} label={l + ".axisLabel.rotate"} min={0} max={360} stepSize={15} labelStepSize={90} />	
		<BooleanFrow {...a} label={l + ".axisLine.show"} />
		<BooleanFrow {...a} label={l + ".splitLine.show"} />
		<BooleanFrow {...a} label={l + ".inverse"} />
		<BooleanFrow {...a} label={l + ".scale"} />
		{l!=="xAxis[0]" && <ChoiceFrow {...a} label={l + ".type"}  choices={["value","log"]} />}
		<NumFrow {...a} label={l + ".splitNumber"} />
		<NumFrow {...a} label={l + ".minInterval"} />
		<NumFrow {...a} label={l + ".maxInterval"} />
		<TextFrow {...a} label={l + ".name"} />
		<ChoiceFrow {...a} label={l + ".nameLocation"} choices={["start","middle","end"]} />
		<TextFrow {...a} label={l + ".nameRotate"} />
		<NumFrow {...a} label={l + ".nameGap"} />
		<TextStyleFrow {...a} label={l + ".nameTextStyle"} newRow={true} />
		<LineStyleFrow  {...a} label={l + ".splitLine.lineStyle"} />
		<LineStyleFrow  {...a} label={l + ".lineStyle"} />
	</>);
}

const Frow = (props:{children:React.ReactNode, label:string, filter:string, niceName?:string, description?:string, layout?:"Horizontal" | "Vertical", labelSide?:"left"|"right"}) => {
	const lookups = props.label.split(".");
	const lbl = props.filter.trim().length === 0 ? lookups[lookups.length - 1] : props.label;

	const strs = props.filter.trim().toLowerCase().split(" ");
	const lowbl = props.label.toLowerCase();

	// If search specified and not all terms found, return empty.
	if(filter && filter.length>0) {
		for(let i=0; i<strs.length; i++) {
			if(strs[i].trim().length>0 && !lowbl.includes(strs[i])) {
				return null;
			}
		}
	}
	const labelTxt = props.niceName ?? lbl;
	const index = (strs.length > 0 && strs[0].length > 0) ? lowbl.indexOf(strs[0]) : -1; // only highlight first word
	let labelShown = undefined;
	if(index >= 0) {
		const lth = strs[0].length;
		labelShown = <>{lbl.substring(0,index)}<span style={{color:"red"}}>{lbl.substring(index,index+lth)}</span>{lbl.substring(index + lth)}</>;
	}
	return (<div key={props.label} className={"aformRow aformRow"+ (props.layout === "Horizontal" ? "Horizontal" : "Vert")}>
		{props.labelSide !== "right" &&  <label>{labelShown ?? labelTxt}</label>}
		{props.children}
		{props.labelSide === "right" &&  <label>{labelShown ?? labelTxt}</label>}
	</div>);
}
