import { useState, FormEvent } from 'react';
import { Button, InputGroup,  Menu, NumericInput, Slider } from '@blueprintjs/core';
import { merge,get,set, filter, unset, clone } from 'lodash-es';
import Collapsible from 'react-collapsible';
import { ErrorBoundary } from '../ErrorBoundary';
import { getDefaultErrorFallback } from './CommonComponents';
import { ColFormat, getEmptySubConfig, SubConfig } from './ChartFactory';
import { DataTypeMap, DataTypes, SmartRs } from '../engine/chartResultSet';
import { getNumberFormatMenuOptions, getTextFormatMenuOptions } from './AGridContextMenu';
import { Popover2 } from '@blueprintjs/popover2';
import { Position } from '@blueprintjs/core';
import Checkbox from 'react-three-state-checkbox';


type MergFunction = (f:(v:any) => any, forceRefresh:boolean) => void;

export const SubConfigEditor = (props:{subConfig:SubConfig, onChange:((s:SubConfig, forceRefresh:boolean)=>void), srs:SmartRs|undefined, isGrid:boolean})=> {
	const { subConfig, onChange, isGrid, srs } = props;
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

    const knownTypes:DataTypeMap = srs?.rsdata.tbl.types || {};
	const colsShown = Object.entries(knownTypes).filter(([k, value], index) => !k.toLowerCase().includes("_sd_"));

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
			<Collapsible trigger="Columns" open={true}>
				<CompactColEditor subConfig={subConfig} setMerg={setColMerg} colsShown={colsShown} filter={filter} isGrid={isGrid}/>
				{isGrid ? null : colsShown.map(([k, value], index) => {
					return value === "number" ? <ColSeriesEditor key={k} value={subConfig.colConfig} label={k} 
						header={get(subConfig.colConfig,k+".name",k) as string} filter={filter} setMerg={setColMerg} /> : null;
				})}
			</Collapsible>
			</ErrorBoundary>
			{!isGrid && <JsonEditor value={subConfig?.overrideJson ?? {}} setMerg={setOverrideMerg} label={""} filter={filter} />}
		</div>
	</div>;
}

type JsonEditorArgs = {label:string, filter:string, value:any, setMerg:MergFunction, newRow?:boolean, niceName?:string, description?:string};

/**
 * JSON Editor provides "Typed" editors within a form
 * Each FROW = Form Row -> typically allows modifying one json entry e.g. title.text.size 
 */
const JsonEditor = (props:JsonEditorArgs) => {

	/* Considered using a JSON editor component that could have defined schema
	 * But realised making it myself would be better and allow sticking to exact same data format as eCharts
	 */
	const opn = props.filter.length > 0;
	const a = { filter:props.filter, value:props.value,  setMerg:props.setMerg, niceName:props.niceName, description:props.description };

	return (<ErrorBoundary FallbackComponent={getDefaultErrorFallback("Error rendering editor")}>
		<Collapsible trigger="Basics" open={opn}>
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

		<Collapsible trigger="xAxis"  open={opn}>	 <AxisOptions label="xAxis"  {...a}  /> </Collapsible>
		<Collapsible trigger="yAxis"  open={opn}>	 <AxisOptions label="yAxis"  {...a}  /> </Collapsible>
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

		<div style={{height:"100px"}}></div>
		{/* <Collapsible trigger="Data Zoom">	
			<BooleanFrow label="datazoom.disabled" {...a} />
    	</Collapsible> */}
		</ErrorBoundary>);
}



////////////       ColEditor


const CompactColEditor = (props:{subConfig:SubConfig, setMerg:MergFunction, colsShown:[string,DataTypes][], filter:string, isGrid:boolean}) => {
    
	const rows = props.colsShown.map(([k, value], index) => {
		let menuItems = null;
		const colConfig = props.subConfig.colConfig;
		const doChange = (colName:string, colFormat:ColFormat) => { props.setMerg((v:any) => {set(colConfig, k+".colFormat", colFormat); return colConfig;}, true) };

        if(value === "number") {
			menuItems = getNumberFormatMenuOptions({ colName: k, setColumnFormat:doChange });
        } else {
			menuItems = getTextFormatMenuOptions({ colName: k, setColumnFormat:doChange });
        }
		let typeTxt = colConfig && k in colConfig ? colConfig[k].colFormat : " \t ";
		if(typeTxt===undefined || typeTxt.length <= 0) {
			typeTxt = " \t ";
		}
		const formatter = <Popover2 content={<Menu>{menuItems}</Menu>} position={Position.BOTTOM}><Button text={typeTxt} key={k} rightIcon="caret-down" small/></Popover2>;
		const a = {filter:props.filter, value:colConfig, setMerg:props.setMerg };
		if(value === "number" && !props.isGrid) {
			return <tr key={k}>
				<td><TextFrow niceName='' label={k+".name"} {...a} placeholder={k} /></td>
				<td>{formatter}</td>
				{/* // need idPrefix to prevent clash between compact and non-compact control */}
				<td><ChoiceFrow niceName='' label={k+".type"} choices={["bar","line"]} {...a} idPrefix="compact" /></td>
				<td><ColorFrow niceName='' label={k+".itemStyle.color"} {...a} /></td>
				<td><ColorFrow niceName='' label={k+".lineStyle.color"} {...a} /></td>
				<td><ColorFrow niceName='' label={k+".areaStyle.color"} {...a} /></td>
			</tr>;
		}
		return <tr key={k}>
				<td><TextFrow niceName='' label={k+".name"} {...a} placeholder={k} /></td>
				<td>{formatter}</td>
			</tr>;
      });

	


    return <div>
		<table>
			<thead><tr><th>Column</th><th>Formatter</th>{!props.isGrid && <><th>Type</th><th>Item</th><th>Line</th><th>Area</th></>}</tr></thead>
			<tbody>{rows}</tbody>
			</table>
	</div>;
}

export const ColSeriesEditor = (props:JsonEditorArgs & { header:string}) => {
	const a = props; 
	const l = props.label;
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
	</Collapsible>
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
	let lookups = props.label.split(".");
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


const BooleanFrow = (props:JsonEditorArgs) => {
	const chk = getVal(props, undefined);
	let lookups = props.label.split(".");
	const sz = lookups.length;
	const niceName = sz > 1 ? lookups[sz - 1] + " " + lookups[sz - 2] : undefined;
	const s = <Checkbox checked={chk === true} indeterminate={chk===undefined} 
	onChange={(e)=> { 
		if(chk === true || chk === undefined) {
			setVal(props, chk === true ? false : true);
		} else {
			clearVal(props); // must clear to force merge chart props
		}
	}} />;
	return ((props.newRow ?? true) ? <Frow  {...props} niceName={niceName} >{s}</Frow> : <>{s}</>);
}


const NumFrow = (props:JsonEditorArgs)  => {
	const s = <NumericInput allowNumericCharactersOnly placeholder='Enter a number' 
		onValueChange={(num,st) =>setVal(props,num)}/>;
	return ((props.newRow ?? true) ? <Frow  {...props}>{s}</Frow> : <>{s}</>);
}

const TextFrow = (props:JsonEditorArgs & {asNumber?:boolean, placeholder?:string}) => {
	const s = <InputGroup value={getVal(props, "")}  placeholder={props.placeholder}
		onChange={txt => {
			if(txt.target.value.length>0) {
				setVal(props,txt.target.value);
			} else {
				clearVal(props); // Don't just set to "", as that prevents falling back to actual default
			}
		} } />;
	return ((props.newRow ?? true) ? <Frow  {...props}>{s}</Frow> : <>{s}</>);
}

const ColorFrow = (props:JsonEditorArgs) => {
	const v = getVal(props, undefined);
	const s = <>
		<input type={"color"} value={v ?? "#000000"}  
			onChange={txt => setVal(props,txt.currentTarget.value) } />
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

const ChoiceFrow = (props:JsonEditorArgs & {choices:string[], showReset?:boolean, idPrefix?:string}) => {
	const doChange = (e:FormEvent<HTMLInputElement>) => setVal(props,e.currentTarget.value);
	let s = <div className="switch-field">
		{props.choices.map(s => {
			const pre = (props.idPrefix ?? "");
			const n = pre + props.label + "-" + s;
			return <span key={n} >
				<input type="radio" key={n} id={n} name={pre+props.label} value={s} onChange={doChange} checked={getVal(props,"")===s} />
				<label htmlFor={n} key={n+"-lbl"} >{s}</label>
			</span>;
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
	return (<Frow label={props.label} filter={props.filter}>
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


const AxisOptions = (props:JsonEditorArgs & {label:"xAxis"|"yAxis"}) => {
	const a = props;
	const l = props.label;
	return (<>
		<ChoiceFrow {...a} label={l + ".position"}  choices={l==="yAxis" ? ["left","right"] : ["top","bottom"]} />
		<TextFrow {...a} label={l + ".min"} />
		<TextFrow {...a} label={l + ".max"} />
		<BooleanFrow {...a} label={l + ".axisLabel.show"} />
		<SliderFrow {...a} label={l + ".axisLabel.rotate"} min={0} max={360} stepSize={15} labelStepSize={90} />	
		<BooleanFrow {...a} label={l + ".axisLine.show"} />
		<BooleanFrow {...a} label={l + ".splitLine.show"} />
		<BooleanFrow {...a} label={l + ".inverse"} />
		<BooleanFrow {...a} label={l + ".scale"} />
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

const Frow = (props:{children:React.ReactNode, label:string, filter:string, niceName?:string, description?:string, layout?:"Horizontal" | "Vertical"}) => {
	let lookups = props.label.split(".");
	let lbl = props.filter.trim().length === 0 ? lookups[lookups.length - 1] : props.label;

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
	let labelTxt = props.niceName ?? lbl;
	let index = lowbl.indexOf(strs[0]); // only highlight first word
	let labelShown = undefined;
	if(index >= 0) {
		const lth = strs[0].length;
		labelShown = <>{lbl.substring(0,index)}<span style={{color:"red"}}>{lbl.substring(index,index+lth)}</span>{lbl.substring(index + lth)}</>;
	}
	return (<div key={props.label} className={"aformRow aformRow"+ (props.layout === "Horizontal" ? "Horizontal" : "Vert")}>
		<label>{labelShown ?? labelTxt}</label>
		{props.children}
	</div>);
}
