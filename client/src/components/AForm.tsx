import { Button, ButtonGroup, Checkbox,   HTMLSelect,  HTMLTable, Icon, IconName, MaybeElement, MenuItem, NumericInput, Radio, RadioGroup, Slider, TextArea } from '@blueprintjs/core';
import { DateInput2, DateRange, DateRangeInput2 } from '@blueprintjs/datetime2';
import moment from 'moment';
import React, { useCallback, useState } from 'react';
import { Component } from 'react';
import { MyInput, MyModal, WidgetProperties, KeyParamInput, MyHelpLink, UncontrolledInput, getDefaultErrorFallback } from './CommonComponents';
import { GrCheckboxSelected, GrRadialSelected,  GrSelection, GrSort } from 'react-icons/gr';
import { ChartWrapper } from '../styledComponents';
import  { ArgType, Queryable, UpdatingQueryable, UpdatingQueryableListener } from '../engine/queryEngine';
import { ItemPredicate, ItemRenderer, MultiSelect2, Select2 } from '@blueprintjs/select';
import { BiSlider } from "react-icons/bi";
import { SmartRs } from '../engine/chartResultSet';
import { EmptySmartRs } from './../engine/chartResultSet';
import { clone, cloneDeep, debounce, merge, omit } from "lodash-es";
import { Enumify } from 'enumify';
import { ErrorBoundary } from '../ErrorBoundary';
import { ChoiceRow } from './SubConfigEditor';
import { ActionHandler, ActionEditor, getDefaultActionHandler, runActions } from '../engine/actionHandlers';


/**
 * Input Components used to influence the SQL queries, we want:
 * SelectSingle, SelectMulti, Radio, Checkbox, Date, Slider
 * Most types should support hardcoded lists and SQL defined entries.
 * All state of all possible types is stored at top-level to:
 *     1. Make saving the state easier
 *     2. Mean changing the type doesn't wipe out all your other configuration.
 */


class GooType extends Enumify  {
    static drop = new GooType("Dropdown", "Choose One:", <GrSelection />);
    static multi = new GooType("Dropdown MultiSelect", "Select:", <GrSort />);
    static radio = new GooType("Radio Buttons", "Choose One:", <GrRadialSelected />);
    static checkbox = new GooType("Checkboxes", "Select:", <GrCheckboxSelected />);
    static datepicker = new GooType("Date Picker", "Date:", "calendar");
    static aftext = new GooType("Text Field", "Enter Text:", "text-highlight");
    static textarea = new GooType("Text Area", "Enter Text:", "new-text-box");
    static slider = new GooType("Slider", "Select:", <BiSlider />);
    static submit = new GooType("Submit", "Submit", <Icon icon="widget-button" />);
    // static anumber = new GooType("Numeric Box", "Select:", "numerical");
    static _ = GooType.closeEnum();
    
    constructor(readonly nicename:string, readonly label:string, readonly icon:IconName | MaybeElement) {
      super();
    }
  }

type guiType = "drop"|"multi"|"radio"|"checkbox"|"slider"|"datepicker"|"submit"|"aftext"|"textarea";


type storedConfig = {
    datepickerAllowTimes?:boolean,
    datepickerAllowRange?:boolean, 
    sliderMin?:number,
    sliderMax?:number,
}

type FormWidet = storedConfig & {
    id:number,
    guiType:guiType, 
    key:string, 
    label:string, 
    optionsList:string[], 
    uQueryable:UpdatingQueryable | undefined,
    srs:SmartRs,
    exception:string | undefined,
    useHardcoded:boolean, 
    allowUserCreatedEntries:boolean,
    actionHandlers:ActionHandler[],
};

type guiTypeConfig = {
    label:string,
    icon:IconName | MaybeElement
}
function getConfig(ftype:guiType):guiTypeConfig {
    return GooType.enumValueOf(ftype) as GooType;
}

type AFormState = {  
    formWidgets:FormWidet[],
    queryables:Queryable[],
    layout:"Horizontal" | "Vertical",
    selectedIndex:number | undefined,
}

export default class AForm extends Component<WidgetProperties<AFormState>,AFormState> {

    constructor(props:any) {
        super(props);
        this.state = { 
            formWidgets:[],
            layout:"Vertical",
            selectedIndex:undefined,
            queryables:[], // This state only really used for saving
        };
        // We don't want to save the full UpdatingQueryables, so we have to pull the queryable itself out/in on save.
        this.state = { ...this.state,...this.props.savedState};
        this.state.formWidgets.forEach((fw,idx) => {
            fw.uQueryable = new UpdatingQueryable(this.props.serverConfigs, this.props.queryEngine, this.getUpdateStateListener(fw.id), this.state.queryables[idx]);
            fw.srs = (!fw.srs || fw.srs === undefined) ? EmptySmartRs : fw.srs; // was removed on savedown, so set to empty to prevent errors.
            // Action handlers were added later so saved instances may not have them.
            const def = getDefaultActionHandler(this.props.serverConfigs, "Change");
            fw.actionHandlers =  (!fw.actionHandlers || fw.actionHandlers === undefined) ? [def] : fw.actionHandlers.map(c => merge(clone(def), c));
        });
        this.props.setConfigSaver(() => {
            // We don't want to save full queryable state or cached srs as they can be very large.
            // Be careful, don't even cloneDeep the full SRS as it causes stack depth exceptions.
            let queryables = this.state.formWidgets.map(fw => fw.uQueryable?.queryable);
            let formWidgets = this.state.formWidgets.map(fw => cloneDeep(omit(fw,['uQueryable','srs'])));
            let r = { ...cloneDeep(omit(this.state,['queryables','formWidgets'])), queryables:queryables, formWidgets:formWidgets};
            return r;
        });
    }

    addFW = (ftype:guiType) => {
        let formWidgets = this.state.formWidgets.concat(this.newFormWidget(ftype));
        this.setState({formWidgets, selectedIndex:formWidgets.length-1});
    }

    getUpdateStateListener = (id:number) => {
          // start listening
          const OUTER = this;
          const uqListener:UpdatingQueryableListener = {
              update(srs,exception) {
                  console.log("uqListener: id = " + id + " srs = " + srs.rsdata.tbl.data.length);
                  OUTER.setState(prevState => {
                      const myFW = prevState.formWidgets.find(fw => fw.id === id);
                      if(myFW) {
                          myFW.srs = srs;
                          myFW.exception = exception;
                          return prevState;
                      }
                      return prevState;
                  } );
              }
          };
          return uqListener;
    }

    newFormWidget(ftype:guiType):FormWidet {
        const typeConfig = getConfig(ftype);
        let maxId = 0;
        this.state.formWidgets.forEach(fw => maxId = fw.id > maxId ? fw.id : maxId);
        maxId++;
        let uQueryable = new UpdatingQueryable(this.props.serverConfigs, this.props.queryEngine, this.getUpdateStateListener(maxId));
        const key = (ftype === "datepicker" ? "myDate" : (ftype === "slider" ? "myNumber" : (ftype === "submit" ? "submit_" : "key"))) + maxId;
        const optionsList = ["nyc|New York|United States","ldn|London|United Kingdom","washington|Washington, D.C.|United States","beijing|Beijing|China","delhi|New Delhi|India"];
        return {id:maxId, 
            guiType:ftype, key, label:typeConfig.label, optionsList, 
            uQueryable, useHardcoded:true, srs:EmptySmartRs, exception:undefined,
            allowUserCreatedEntries:false, sliderMin:0, sliderMax:100, datepickerAllowRange:false, datepickerAllowTimes:false,
            actionHandlers:[]};
    }

    canMove = (direction:number, selIdx:number | undefined)  => { 
        if(selIdx === undefined) {
            return false;
        }
        let newPos = selIdx + direction;
        return newPos >= 0 && newPos < this.state.formWidgets.length;
    }
    
    move = (direction:number, selIdx:number | undefined)  => {
        if(selIdx === undefined) {
            return false;
        }
        let newPos = selIdx + direction;
        let newWidgets = this.state.formWidgets.slice(0);
        let newW = newWidgets[newPos];
        newWidgets[newPos] = newWidgets[selIdx];
        newWidgets[selIdx] = newW;
        this.setState({formWidgets:newWidgets, selectedIndex:newPos});
    }

    delete = (selIdx:number | undefined) => {
        if(selIdx === undefined) {
            return;
        }
        let formWidgets = this.state.formWidgets.filter((e,i) => i !== this.state.selectedIndex);
        const selectedIndex = formWidgets.length === 0 ? undefined : (selIdx <= formWidgets.length-1 ? selIdx : selIdx-1);
        this.setState({formWidgets, selectedIndex});
    }

    modify = (selIdx:number, formWidgetUpdate:Partial<FormWidet>) => {
        let formWidgets = this.state.formWidgets.slice(0);
        if(selIdx === undefined || formWidgets[selIdx] === undefined) {
            return;
        }
        formWidgets[selIdx] = {...formWidgets[selIdx],...formWidgetUpdate};
        if(formWidgets[selIdx].useHardcoded) {
            formWidgets[selIdx].uQueryable?.stop();
        } else {
            formWidgets[selIdx].uQueryable?.start();
        }
        this.setState({formWidgets});
    }

    componentDidMount() {
        this.state.formWidgets.forEach(fw => {
            if(!fw.useHardcoded) {
                fw.uQueryable?.start();
            }
        });
    }
    componentWillUnmount() {
        this.state.formWidgets.forEach(fw => { fw.uQueryable?.stop(); });
    }

    gett(formWidget:FormWidet) {
        switch(formWidget.guiType) {
            case "drop": return ASelectSingle;
            case "multi": return ASelectMulti;
            case "radio": return ARadio;
            case "checkbox": return ACheckbox;
            case "slider": return ASlider;
            case "submit": return ASubmit;
            case "datepicker": return ADateInput;
            case "aftext": return ATextInput;
            case "textarea": return ATextAreaInput;
            default: return ADateInput;
        }
    }
    
    factory(formWidget:FormWidet) {
        let args = this.props.queryEngine.argMap[formWidget.key];
        let options = Array<IOptionRow>();
        if(formWidget.useHardcoded) {
            options = formWidget.optionsList ? toOptionRows(formWidget.optionsList) : [];
        } else {
            options = toOptionRowsFromRs(formWidget.srs);
        }
        const guiTypeToArgType = (guiType:guiType):ArgType => {
            return guiType === "slider" ? "number" : (guiType === "drop" || guiType === "radio" || guiType === "aftext"|| guiType === "textarea") ? "string" : guiType === "datepicker" ? "date" : "strings";
        }
        // If the widget only allows one choice, choose any option to allow displaying something
        let oneChoiceWidget = formWidget.guiType === "radio" || formWidget.guiType === "drop";
        if(oneChoiceWidget && args === undefined && options.length>0) {
            this.props.queryEngine.setArg(formWidget.key, [options[0].val], guiTypeToArgType(formWidget.guiType));
        }

        let props = { 
            onArgSelected:(e:string[])=>{
                this.props.queryEngine.setArg(formWidget.key, e, guiTypeToArgType(formWidget.guiType));
                const ahs = formWidget.actionHandlers.filter(ah => ah.trigger === "Change");
                if(ahs.length > 0) {
                    runActions(this.props.queryEngine, formWidget.actionHandlers, {[formWidget.key]:e, src:formWidget.key, val:e});
                }
            },
            args,
            options,
            selectedArgs:args ? options.filter(oRow => args.indexOf(oRow.val) !== -1) : [],
            // passing subset as don't want to expose all??
            allowUserCreatedEntries:formWidget.allowUserCreatedEntries,
            label:formWidget.label,
            datepickerAllowRange:formWidget.datepickerAllowRange,
            datepickerAllowTimes:formWidget.datepickerAllowTimes,
            sliderMin:formWidget.sliderMin,
            sliderMax:formWidget.sliderMax,
        };
        const showLabel = formWidget.label.length > 0 && formWidget.guiType !== "submit";
        return <>{showLabel ? <label>{formWidget.label}</label> : null}{React.createElement(this.gett(formWidget), props)}</>;
    }

    // FormTypeSelect = (props:{jdbcTypeSelected?:string, onChange:(e:React.FormEvent<HTMLSelectElement>)=>void}) => {
    FormTypeSelect = (props:{selected:guiType, onChange:(e:guiType)=>void}) => {
        let myGooType = (GooType.enumValueOf(props.selected) as GooType);
        return <div>
        {/*  */}
            {props.selected === "submit" ?
                <span style={{padding:2}}><Icon icon={myGooType.icon} /> {myGooType.nicename} </span>
                : <HTMLSelect onChangeCapture={(e)=>{props.onChange(e.currentTarget.value as guiType)}} >
                    {GooType.enumValues.filter(e => e.enumKey !== "submit").map(e => <option value={e.enumKey} key={e.enumKey} selected={e.enumKey === props.selected}>{(GooType.enumValueOf(e.enumKey) as GooType).nicename}</option>)}
                    </HTMLSelect>}
        </div>;
    }

    render() {  
        const {selectedIndex,formWidgets,layout } = this.state;
        const selectedFW = selectedIndex === undefined ? undefined : formWidgets[selectedIndex];

        return (<ChartWrapper><div className={"aform aform" + (this.state.layout === "Horizontal" ? "Horizontal" : "Vert")}>
            {formWidgets.length > 0 ?
                formWidgets.map((fw,idx) => 
                    <div onClick={() => this.setState({selectedIndex:idx})} key={idx} className={"aformRow aformRow"+ (layout === "Horizontal" ? "Horizontal" : "Vert")} >
                        <ErrorBoundary FallbackComponent={getDefaultErrorFallback("Error rendering form")}>{this.factory(fw)}</ErrorBoundary>
                    </div>)
                : <div style={{margin:10}}>
                    <p>Forms allow user interaction. Forms provide users options either from hardcoded lists or from SQL queries.
                        When a user selects an option, the configured "key" is set and can be used in queries.
                    </p>
                    <p>You must:</p><ol><li>Add a component to a form</li><li>Select and modify that component in the editor</li></ol>
                    <Button intent="success" icon={getConfig("datepicker").icon} onClick={() => this.addFW("datepicker")}>Click here to add a Date Picker</Button>

                  </div>}

        {this.props.selected && <MyModal title="Form Editor" handleClose={this.props.clearSelected} className="formMyModal">
            <div className='formMyModalContainer'>
            <fieldset key="FormComponents" className='FormComponents'>
            <legend>Form Components:</legend>
            <ChoiceRow idPrefix="vh" choices={["Vertical","Horizontal"]} label="Layout:" selected={layout} onChange={ s => {this.setState({layout:s === "Vertical" ? "Vertical" : "Horizontal"})}  } />
            <HTMLTable bordered condensed>
                <thead>
                <tr><th>Label</th><th>Type</th><th>key</th><th colSpan={3}></th></tr>
                </thead>
                <tbody>
                {this.state.formWidgets.map((fw, i) => 
                    <tr key={fw.key} onClick={() => { this.setState({selectedIndex:i})}} className={selectedIndex === i ? "selected" : undefined}>
                    <td><MyInput label="" value={fw.label} name="myLabel" onChange={(e) => this.modify(i, {label:e.currentTarget.value})}/></td>
                    <td>
                        <this.FormTypeSelect selected={fw.guiType} onChange={(gt)=>this.modify(i, {guiType:gt})} />
                    </td>
                    <td><KeyParamInput label="" value={fw.key} name="myKey" onComplete={(s) => this.modify(i, {key:s})} forcedPrefix={fw.guiType === "submit" ? "submit_" : ""}/></td>
                    <td><Button icon="arrow-up" minimal disabled={!this.canMove(-1, i)} onClick={() => this.move(-1, i)} intent="success" title="Move input up the form." /></td>
                    <td><Button icon="arrow-down" minimal disabled={!this.canMove(1, i)} onClick={() => this.move(1, i)} intent="success" title="Move input down the form." /></td>
                    <td><Button icon="delete" intent="danger" minimal onClick={() => this.delete(i)} title="Remove this input."/></td>
                </tr>)}
                <tr id="editor2-footer-controls" key="my-footer-row"><td colSpan={6}>
                <Button icon="add" onClick={() => this.addFW("drop")} intent="success" minimal/><label>Add Component: </label>
                    <ButtonGroup minimal id='editor2-footer-addbuttons'>
                        {(["drop", "multi", "radio", "checkbox", "aftext", "textarea", "datepicker", "slider", "submit"] as Array<guiType>)
                            .map(e => <Button key={e} title={(GooType.enumValueOf(e) as GooType).nicename} icon={getConfig(e).icon} onClick={() => this.addFW(e)} />)}
                    </ButtonGroup>
                </td></tr>
                </tbody>
            </HTMLTable>
            </fieldset>
            <div className="aform aformVert">
                <h3>{selectedFW && selectedFW.key}</h3>
                {/* The onComplete callback has to specify the index, incase the selection changes */}
                {selectedFW && selectedIndex !== undefined && selectedFW.guiType !== "submit" &&
                    <AFormComponentEditor key={selectedIndex} selectedFW={selectedFW} modify={(formWidgetUpdate) => { this.modify(selectedIndex, formWidgetUpdate)}} />
                }
                
                {selectedFW && selectedIndex !== undefined  &&
                    <ActionEditor key={selectedIndex+"asd"} actionHandlers={selectedFW.actionHandlers} triggerChoices={["Change"]} serverConfigs={this.props.serverConfigs}
                                    modify={(ahlist) => { this.modify(selectedIndex, {actionHandlers:ahlist}) }} />
                }
            </div>
            <div style={{height:90}}/>
        </div>
        </MyModal>}
      </div></ChartWrapper>)
    }
}

const AFormComponentEditor = (props:{selectedFW:FormWidet, modify:(formWidgetUpdate:Partial<FormWidet>)=>void}) => {
    const hardcodedTooltip = "<p>Enter every option on a new line, all options should be unique."
                        + "<br/>You can add longer descriptions and labels by using | separators as shown:"
                        + "<br/>"
                        + "<br/>nyc|New York|America"
                        + "<br/>ldn|London|United Kingdom"
                        + "<br/>atl|Atlanta International Airport|USA</p>";
    const sqlToolTip = "<p>Your SQL query can return between 1-3 columns. Column mappings:"
                        + "<ol><li>1st Column - Value sent to database when selected</li>"
                        + "<br/><li>2nd Column - Nice string diplayed to user</li>"
                        + "<br/><li>3rd Column - Tooltip/Title shown as additional info to user where possible</li></ol>"
                        + "<br/></p>";
    const {selectedFW, modify } = props;
    const { guiType, useHardcoded, uQueryable, sliderMin, sliderMax } = selectedFW;
    const isNumeric = selectedFW && (guiType === "slider");
    const isRecordBased = selectedFW && !(guiType === "slider" || guiType === "datepicker" || guiType === "aftext" || guiType === "textarea");

    return <fieldset className="ComponentEditor" key="ComponentEditor">
    <legend>Component Editor</legend>
    <div className='AFormComponentEditor'>
        {isRecordBased && <span>
            <ChoiceRow idPrefix="di" choices={["List","SQL"]} label="Data Source:" selected={useHardcoded ? "List" : "SQL"} onChange={s => modify({useHardcoded:s === "List" ? true : false}) } />
            {/* <Button icon={useHardcoded ? "numbered-list" : <AiOutlineConsoleSql />} rightIcon="caret-down" 
                    onClick={() => modify({useHardcoded:!useHardcoded})}>{useHardcoded ? "List" : "SQL"}</Button>|  */}
            </span>}
            <MyHelpLink href="help/forms" htmlTxt={useHardcoded ? hardcodedTooltip : sqlToolTip} />
        {/* {(guiType === "drop") &&
            <Checkbox checked={allowUserCreatedEntries} inline
                onChange={()=>modify({allowUserCreatedEntries:!allowUserCreatedEntries})}>
                <span>Allow user to create new entries</span></Checkbox>} */}
        {isRecordBased && 
            (useHardcoded ? 
            <div className="hardcodedQueryEditor"><span>value|nice name|description</span>
            <TextArea growVertically={true} large={true}  fill
                onChange={(e) => modify({optionsList:e.currentTarget.value.split("\n")})} 
                value={selectedFW.optionsList?.join("\n")} /></div>
            : <div className="smallQueryableEditor">{uQueryable?.getEditor(null)}</div>)}
        {isNumeric && <div>
            <label>Min:</label>
            <NumericInput allowNumericCharactersOnly max={sliderMax} 
                    onValueChange={(n,s) => { if(n <= (sliderMax || 0)) { modify({sliderMin:n}) }}} defaultValue={sliderMin} />
            <label>Max:</label>
            <NumericInput allowNumericCharactersOnly min={sliderMin} 
                    onValueChange={(n,s) => { if(n >= (sliderMin || 0)) { modify({sliderMax:n}) }}} defaultValue={sliderMax} />
        </div>}
        {guiType === "datepicker" && 
            <DatePickerConfigUI onChange={dpc => modify({datepickerAllowTimes:dpc.allowTimes, datepickerAllowRange:dpc.allowRange})}
                allowRange={selectedFW.datepickerAllowRange || false} allowTimes={selectedFW.datepickerAllowTimes || false} />}
    </div>
    </fieldset>;
}

type DatePickerConfig = {allowRange:boolean, allowTimes:boolean};
function DatePickerConfigUI(props:DatePickerConfig & {onChange:((chg:DatePickerConfig) => void)}) {
    const datepickRTVal = (props.allowRange ? "1" : "0") + (props.allowTimes ? "1" : "0");
    const handleRTval = (rt:string) => {
        props.onChange({allowRange:rt[0] === "1", allowTimes:rt[1] === "1"});
    };

    return  <div className="datePickerConfig">
        <RadioGroup label="Type" onChange={e => handleRTval(e.currentTarget.value)} selectedValue={datepickRTVal} >
            <Radio label="[2025-01-01]              - Single Date" value="00" />
            <Radio label="[2025-01-01T13:00]        - Single DateTime " value="01" />
            <Radio label="[2025-01-01] [2025-01-01] - Date Range" value="10" />
            <Radio label="[2025-01-01T13:00] [2025-01-02T14:00] - DateTime Range" value="11" />
        </RadioGroup>
    </div>;

}

/******************   The separate types of FormWidgets are below here ***************************/

export interface IOptionRow {
    val:string,
    niceName?:string,
    label?:string,
}

type ASelectCallback = storedConfig & {  
    options:IOptionRow[], 
    onArgSelected:(v:string[])=>void, 
    args?:string[], 
    selectedArgs:IOptionRow[], 
    className?:string, 
}

const ARadio = (props:ASelectCallback) => {
    const { onArgSelected, options, selectedArgs } = props;
    return (<RadioGroup onChange={(s) => onArgSelected([s.currentTarget.value])} 
        selectedValue={selectedArgs.length > 0 ? selectedArgs[0].val : undefined} >
        {options.map(oRow => {
            return <Radio label={oRow.niceName ?? oRow.val} value={oRow.val} key={oRow.val} />;
        })}
    </RadioGroup>);
}
    
const ACheckbox = (props:ASelectCallback) => {
    const { onArgSelected, options, selectedArgs } = props;
    return (<div className="checkboxForm">
        {options.map(oRow => {
            return <Checkbox
                key={oRow.val}
                checked={selectedArgs.map(e=>e.val).indexOf(oRow.val) !== -1} 
                onChange={() => toggle(selectedArgs, oRow, onArgSelected)}>{oRow.niceName ?? oRow.val}</Checkbox>;
        })}
    </div>);
}

const ASlider = (props:ASelectCallback) => {
    let stepSize = props.sliderMax !== undefined ? (props.sliderMin !== undefined ? (props.sliderMax - props.sliderMin)/20 : props.sliderMax/20) : 0;
    if(stepSize > 2) {
        stepSize = Math.floor(stepSize);
    }
    let sz = stepSize === 0 ? undefined : stepSize;
    let lblSize = sz === undefined ? undefined : sz * 5;
    console.log("stepSize=" + sz);
    const value = (props.args && props.args.length>0) ? parseFloat(props.args[0]) : 0;
    const [val,setValue] = useState(value);
    return (<div style={{width:"70%"}}>
            <Slider onRelease={n => props.onArgSelected([""+n])} onChange={setValue} min={props.sliderMin} max={props.sliderMax} value={val} 
                stepSize={sz} labelStepSize={lblSize} />
        </div>);
}
    
const ASubmit = (props:{label?:string} &ASelectCallback) => {
    const [val,setValue] = useState(0);
    return (<div style={{width:"90%"}}><Button onClick={e => { props.onArgSelected([""+val]); setValue(val+1); }} value={"Submit"} >{props.label ?? "Submit"}</Button></div>);
}
    

function toOptionRows(optionsList:string[]):Array<IOptionRow> {
    return optionsList.map(s => {
        let a = s.split("|");
        return {val:a[0], niceName:a.length>1 ? a[1] : undefined, label:a.length>2 ? a[2] : undefined};
    });
}
    
function toOptionRowsFromRs(srs:SmartRs):Array<IOptionRow> {
    let ks = Object.keys(srs.rsdata.tbl.types);
    if(ks.length > 0) {
        return srs.rsdata.tbl.data.map(r => {return { val:""+r[ks[0]], niceName:ks[1] && ""+r[ks[1]], label:ks[2] && ""+r[ks[2]] }});
    }
    return [];
}


const filterOptionRow: ItemPredicate<IOptionRow> = (query, optionRow, _index, exactMatch) => {
    const qr = query.toLowerCase();
    if (exactMatch) {
		return optionRow.val === qr;
	} else {
        const v = optionRow.val.toLowerCase() + '.' + optionRow.niceName?.toLowerCase() ?? ''
        return v.indexOf(qr) >= 0;
	}
}

export const ASelectSingle = (props:{allowUserCreatedEntries?:boolean} & ASelectCallback) => {
    const { onArgSelected, options } = props;
    const OptionRowSelect = Select2.ofType<IOptionRow>();
    // const OptionRowSuggest = Suggest.ofType<IOptionRow>();
    const sArgs = props.selectedArgs;
    const renderOptionRow: ItemRenderer<IOptionRow> = ( optionRow, { handleClick, modifiers, query }) => {
        if (!modifiers.matchesPredicate) { 
            return null; 
        }
        const text = optionRow.niceName || optionRow.val;
        return ( <MenuItem icon={sArgs.map(e=>e.val).indexOf(optionRow.val) === -1 ? "blank" : "tick"} 
            active={modifiers.active} disabled={modifiers.disabled} label={optionRow.label} key={optionRow.val} text={text} onClick={handleClick}/>);
    }
    const commonProps = { items:options, itemRenderer:renderOptionRow,  onItemSelect:(e:IOptionRow)=>onArgSelected([e.val]),
        itemPredicate:filterOptionRow, popoverProps:{popoverClassName:"selectPop"},  };
    const txt = sArgs.length > 0 ? (sArgs[0]?.niceName ?? sArgs[0].val) : "Choose:";
    

    // return (props.allowUserCreatedEntries ?
    //     <OptionRowSuggest {...commonProps}  inputValueRenderer={(oRow)=>oRow.niceName ?? oRow.val}
    //         createNewItemFromQuery={props.allowUserCreatedEntries ? (qry)=>toOptionRows([qry])[0] : undefined} 
    //         // createNewItemRenderer={props.allowUserCreatedEntries ? renderCreateOption : undefined} 
    //         closeOnSelect>
    //         <Button text={txt} rightIcon="caret-down" />
    //         </OptionRowSuggest>
        return (<OptionRowSelect {...commonProps} filterable={options.length>10} className={props.className} >
        <Button small text={txt} rightIcon="caret-down" />
        </OptionRowSelect>);
}

function toggle(sArgs:IOptionRow[], row:IOptionRow, onArgSelected:(v:string[])=>void) {
    if(sArgs.indexOf(row) === -1) {
        onArgSelected([...sArgs.map(e=>e.val),row.val]);
    } else {
        onArgSelected(sArgs.filter(e => e.val !== row.val).map(o => o.val));
    }
}

const ASelectMulti = (props:ASelectCallback) => {
    const { onArgSelected, options } = props;
    const OptionRowMultiSelect = MultiSelect2.ofType<IOptionRow>();
    const sArgs = props.selectedArgs;
    const handleTagRemove = (e:React.ReactNode, idx:number) => {
        if(e) {
            onArgSelected(sArgs.filter((oRow,i) => i !== idx).map(r => r.val));
        }
    }
    
    const renderOptionRow: ItemRenderer<IOptionRow> = ( optionRow, { handleClick, modifiers, query }) => {
        if (!modifiers.matchesPredicate) { return null; }
        const text = optionRow.niceName || optionRow.val;
        return ( <MenuItem icon={sArgs.map(e=>e.val).indexOf(optionRow.val) === -1 ? "blank" : "tick"} 
            active={modifiers.active} disabled={modifiers.disabled} label={optionRow.label} key={optionRow.val} text={text} onClick={handleClick}/>);
    }
    
    return (<OptionRowMultiSelect items={options}  itemRenderer={renderOptionRow} 
            tagRenderer={(oRow) => oRow.niceName ?? oRow.val}
            onItemSelect={(oRow) => toggle(sArgs, oRow, onArgSelected)} 
            itemPredicate={filterOptionRow} popoverProps={{popoverClassName:"selectPop"}} 
            tagInputProps={{
                onRemove: handleTagRemove,
                rightElement: sArgs.length > 0 ? <Button icon="cross" minimal={true} onClick={()=>onArgSelected([])} /> : undefined,
            }}
            selectedItems={sArgs} />);
}
    
const ATextInput = (props:ASelectCallback) => {
    const [text] = useState(props.args ? props.args[0] : "");
    return <UncontrolledInput label="" value={text} name="name" onComplete={(s) => props.onArgSelected([s])} />;
}

const ATextAreaInput = (props:ASelectCallback) => {
    const [text] = useState(props.args ? props.args[0] : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const reportComplete = useCallback(debounce((val:string) => props.onArgSelected([val]), 2000), [props.onArgSelected]);
    return <TextArea defaultValue={text} onChange={e => reportComplete(e.target.value)} onBlur={e => props.onArgSelected([e.target.value])}
                name="name" large={true}  fill rows={5} />;
}


const ADateInput = (props:ASelectCallback) => {
    const allowTimes = props.datepickerAllowTimes;
    const format = allowTimes ? "YYYY-MM-DDTHH:mm:ss" : "YYYY-MM-DD";
    const formatDate =  (date: Date, locale: string | undefined = undefined) =>  moment(date).format(format);
    const parseDate  = (str: string, locale: string | undefined = undefined) => moment(str, format).toDate();
    const allowRange = props.datepickerAllowRange;

    const now = new Date();
    let defaultValue = allowTimes ? now.toISOString() : toISO(now);
    if(props.args && props.args.length>0) {
        defaultValue = props.args[0];
    } else if(!allowRange) {
        props.onArgSelected([defaultValue]);
    }
    let defaultRange:DateRange = allowTimes ? [new Date(now.valueOf() - (5*60*1000)),now] : [now,now]; 
    if(props.args && props.args.length>1) {
        defaultRange =  [parseDate(props.args[0]), parseDate(props.args[1])];
    } else if(allowRange) {
        props.onArgSelected([formatDate(defaultRange[0]!),formatDate(defaultRange[1]!)]);
    }

    
    
    if(allowRange) {
        const handleChange = (dateRange:DateRange) => {
             if(dateRange != null && dateRange[0] != null && dateRange[1] != null) { 
                const f = (d:Date) => moment(d).format(format);
                props.onArgSelected([f(dateRange[0]),f(dateRange[1])]);
            } 
        }
        return <DateRangeInput2 allowSingleDayRange shortcuts={false} singleMonthOnly formatDate={formatDate} parseDate={parseDate}  highlightCurrentDay  
                onChange={handleChange} defaultValue={defaultRange}  className={allowTimes ? "datePicker" : "dateTimePicker" }
                closeOnSelection={!allowTimes} timePickerProps={allowTimes ? { showArrowButtons:true } : undefined} />
    } else {
        const handleChange = (date:string | null) => {
            if(date !== null) {  // 2022-09-08T01:00+01:00
                props.onArgSelected([date.indexOf("+") !== -1 ? date.substring(0,date.indexOf("+")) : date]); 
            } 
       }
        return <DateInput2  fill={false} canClearSelection={false} defaultValue={defaultValue} formatDate={formatDate} parseDate={parseDate} showTimezoneSelect={false} 
            closeOnSelection={!allowTimes} shortcuts={!allowTimes}  timePickerProps={allowTimes ? { showArrowButtons:true } : undefined}
            rightElement={<Icon  icon="calendar" />}className={allowTimes ? "dateRangePicker" : "dateTimeRangePicker" }
            timePrecision={allowTimes ? "minute" : undefined} onChange={handleChange}/>; 
    }
        
}

function toISO(date:Date):string {
    return date.getFullYear()+'-' + (date.getMonth()<9 ? "0" : "") + (date.getMonth()+1) + '-'+date.getDate();
}

