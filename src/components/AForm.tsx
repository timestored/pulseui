import { Button, ButtonGroup, Checkbox,   HTMLSelect,  HTMLTable, Icon, IconName, MaybeElement, MenuItem, NumericInput, Radio, RadioGroup, Slider, TextArea } from '@blueprintjs/core';
import { DateInput, IDateFormatProps } from '@blueprintjs/datetime';
import moment from 'moment';
import React, { useState } from 'react';
import { Component } from 'react';
import { MyInput, MyModal, WidgetProperties, MyUncontrolledInput, ErrorBoundary, MyHelpLink } from './CommonComponents';
import { GrCheckboxSelected, GrRadialSelected,  GrSelection, GrSort } from 'react-icons/gr';
import { ChartWrapper } from '../styledComponents';
import { Queryable, UpdatingQueryable, UpdatingQueryableListener } from '../engine/queryEngine';
import { AiOutlineConsoleSql } from "react-icons/ai";
import { ItemPredicate, ItemRenderer, MultiSelect, Select } from '@blueprintjs/select';
import { BiSlider } from "react-icons/bi";
import { SmartRs } from '../engine/chartResultSet';
import { EmptySmartRs } from './../engine/chartResultSet';
import { cloneDeep } from "lodash-es";
import { Enumify } from 'enumify';


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
    static aftext = new GooType("Text Box", "Enter Text:", "new-text-box");
    static slider = new GooType("Slider", "Select:", <BiSlider />);
    static anumber = new GooType("Numeric Box", "Select:", "numerical");
    static _ = GooType.closeEnum();
    
    constructor(readonly nicename:string, readonly label:string, readonly icon:IconName | MaybeElement) {
      super();
    }
  }

type guiType = "drop"|"multi"|"radio"|"checkbox"|"slider"|"datepicker"|"aftext";
type FormWidet = {
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
    sliderMin:number,
    sliderMax:number,
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
        });
        this.props.setConfigSaver(() => {
            let r = cloneDeep(this.state);
            let queryables = r.formWidgets.map(fw => fw.uQueryable?.queryable);
            r.formWidgets.forEach(fw => fw.uQueryable = undefined);
            return {...r,...{queryables:queryables}};
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
        const key = (ftype === "datepicker" ? "myDate" : (ftype === "slider" ? "myNumber" : "key")) + maxId;
        const optionsList = ["nyc|New York|United States","ldn|London|United Kingdom","washington|Washington, D.C.|United States","beijing|Beijing|China","delhi|New Delhi|India"];
        return {id:maxId, 
            guiType:ftype, key, label:typeConfig.label, optionsList, 
            uQueryable, useHardcoded:true, srs:EmptySmartRs, exception:undefined,
            allowUserCreatedEntries:false, sliderMin:0, sliderMax:100};
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
            case "datepicker": return ADateInput;
            case "aftext": return ATextInput;
            default: return ADateInput;
        }
    }
    
    factory(formWidget:FormWidet) {
        let argLookup = this.props.queryEngine.argMap[formWidget.key];
        let options = Array<IOptionRow>();
        if(formWidget.useHardcoded) {
            options = formWidget.optionsList ? toOptionRows(formWidget.optionsList) : [];
        } else {
            options = toOptionRowsFromRs(formWidget.srs);
        }
        // If the widget only allows one choice, choose any option to allow displaying something
        let oneChoiceWidget = formWidget.guiType === "radio" || formWidget.guiType === "drop";
        if(oneChoiceWidget && argLookup === undefined && options.length>0) {
            this.props.queryEngine.setArg(formWidget.key, [options[0].val]);
        }

        let props = { 
            onArgSelected:(e:string[])=>{
                this.props.queryEngine.setArg(formWidget.key, e);
            },
            options,
            selectedArgs:argLookup ? options.filter(oRow => argLookup.indexOf(oRow.val) !== -1) : [],
            allowUserCreatedEntries:formWidget.allowUserCreatedEntries,
        };
        // Hacky way of converting sliderOptions to IOptionRow format
        if(formWidget.guiType === "slider") {
            const max = formWidget.sliderMax > formWidget.sliderMin ? formWidget.sliderMax : formWidget.sliderMin + 1;
            props.options = [{val:""+formWidget.sliderMin},{val:""+max}];
        }
        return <div><label>{formWidget.label}</label>{React.createElement(this.gett(formWidget), props)}</div>;
    }

    // FormTypeSelect = (props:{jdbcTypeSelected?:string, onChange:(e:React.FormEvent<HTMLSelectElement>)=>void}) => {
    FormTypeSelect = (props:{selected:guiType, onChange:(e:guiType)=>void}) => {
        return <div>
        <span style={{padding:2}}><Icon icon={(GooType.enumValueOf(props.selected) as GooType).icon} /></span>
        <HTMLSelect onChangeCapture={(e)=>{props.onChange(e.currentTarget.value as guiType)}} >
            {GooType.enumValues.map(e => <option value={e.enumKey} selected={e.enumKey === props.selected}>{(GooType.enumValueOf(e.enumKey) as GooType).nicename}</option>)}
        </HTMLSelect></div>;
    }

    render() {  
        const {selectedIndex,formWidgets,layout } = this.state;
        const selectedFW = selectedIndex === undefined ? undefined : formWidgets[selectedIndex];

        return (<ChartWrapper><div className="aform">
            {formWidgets.length > 0 ?
                formWidgets.map((fw,idx) => 
                    <div key={idx} style={{display:layout === "Horizontal" ? "inline-block" : "block"}}>
                        <span onClick={() => this.setState({selectedIndex:idx})}>
                            <ErrorBoundary>{this.factory(fw)}</ErrorBoundary>
                        </span>
                    </div>)
                : <div style={{margin:10}}>
                    <p>Forms allow user interaction. Forms provide users options either from hardcoded lists or from SQL queries.
                        When a user selects an option, the configured "key" is set and can be used in queries.
                    </p>
                    <p>You must: <ol><li>Add a component to a form</li><li>Select and modify that component in the editor</li></ol></p>
                    <Button intent="success" icon={getConfig("datepicker").icon} onClick={() => this.addFW("datepicker")}>Click here to add a Date Picker</Button>

                  </div>}

        {this.props.selected && <MyModal title="AformEditor" handleClose={this.props.clearSelected}>
            <fieldset key="FormComponents" style={{width:"45%",maxWidth:"45%",  float:"left"}}>
            <legend>Form Components:</legend>
            <HTMLTable bordered condensed>
                <thead>
                <tr><th>Label</th><th>Type</th><th>key</th> 
                <td><Button icon="arrow-up" minimal disabled/></td>
                <td><Button icon="arrow-down" minimal disabled/></td>
                <td><Button icon="delete" minimal disabled/></td></tr>
                </thead>
                <tbody>
                {this.state.formWidgets.map((fw, i) => 
                    <tr onClick={() => { this.setState({selectedIndex:i})}}>
                    <td><MyInput label="" value={fw.label} name="myLabel" onChange={(e) => this.modify(i, {label:e.currentTarget.value})}/></td>
                    <td>
                        <this.FormTypeSelect selected={fw.guiType} onChange={(gt)=>this.modify(i, {guiType:gt})} />
                    </td>
                    <td><MyUncontrolledInput label="" value={fw.key} name="myKey" onComplete={(s) => this.modify(i, {key:s})}/></td>
                    <td><Button icon="arrow-up" minimal disabled={!this.canMove(-1, i)} onClick={() => this.move(-1, i)} intent="success"/></td>
                    <td><Button icon="arrow-down" minimal disabled={!this.canMove(1, i)} onClick={() => this.move(1, i)} intent="success"/></td>
                    <td><Button icon="delete" intent="danger" minimal onClick={() => this.delete(i)}/></td>
                </tr>)}
                <tr><td colSpan={6}>
                <Button icon="add" onClick={() => this.addFW("drop")} intent="success" minimal/><label>Add Component: </label>
                    <ButtonGroup minimal>
                        {(["drop", "multi", "radio", "checkbox", "datepicker", "aftext", "slider", "anumber"] as Array<guiType>)
                            .map(e => <Button icon={getConfig(e).icon} onClick={() => this.addFW(e)} />)}
                    </ButtonGroup>
                </td></tr>
                </tbody>
            </HTMLTable>
            </fieldset>
            {/* The onComplete callback has to specify the index, incase the selection changes */}
            {selectedFW && selectedIndex !== undefined && selectedFW.guiType !== "datepicker" &&
            <AFormComponentEditor selectedFW={selectedFW} modify={(formWidgetUpdate) => { this.modify(selectedIndex, formWidgetUpdate)}} />}
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
    const {selectedFW, modify } = props;
    const isNumeric = selectedFW && (selectedFW.guiType === "slider");
    const isRecordBased = selectedFW && !(selectedFW.guiType === "slider" || selectedFW.guiType === "datepicker");

    return <fieldset style={{width:"45%", float:"left"}} key="ComponentEditor">
    <legend>Component Editor</legend>
    <div>
        {isRecordBased && <span><label>Type: </label><Button icon={selectedFW.useHardcoded ? "numbered-list" : <AiOutlineConsoleSql />} intent="primary" onClick={() => modify({useHardcoded:!selectedFW.useHardcoded})}>
                    {selectedFW.useHardcoded ? "List" : "SQL"}
                    </Button>| </span>}
                    <MyHelpLink href="/help/forms" htmlTxt={selectedFW.useHardcoded ? hardcodedTooltip : "SQLbab"} />
        {(selectedFW.guiType === "drop") &&
            <Checkbox checked={selectedFW.allowUserCreatedEntries} inline
                onChange={()=>modify({allowUserCreatedEntries:!selectedFW.allowUserCreatedEntries})}>
                <span>Allow user to create new entries</span></Checkbox>}
        {isRecordBased && 
            (selectedFW.useHardcoded ? 
            <div><span>value|nice name|description</span>
            <TextArea growVertically={true} large={true}  fill
                onChange={(e) => modify({optionsList:e.currentTarget.value.split("\n")})} 
                value={selectedFW.optionsList?.join("\n")} /></div>
            : <div className="smallQueryableEditor">{selectedFW.uQueryable?.getEditor(null)}</div>)}
        {isNumeric && <div>
            <label>Min:</label>
            <NumericInput selectAllOnFocus allowNumericCharactersOnly onValueChange={(n,s) => { modify({sliderMin:n}) }} value={selectedFW.sliderMin} />
            <label>Max:</label>
            <NumericInput selectAllOnFocus allowNumericCharactersOnly onValueChange={(n,s) => { modify({sliderMax:n}) }} value={selectedFW.sliderMax} />
        </div>}
    </div>
    </fieldset>;
}


/******************   The separate types of FormWidgets are below here ***************************/

export interface IOptionRow {
    val:string,
    niceName?:string,
    label?:string,
}

export type ASelectCallback = {  options:IOptionRow[], onArgSelected:(v:string[])=>void, selectedArgs:IOptionRow[] }

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
    console.log("checkBoxOptions");
    console.log(options);
    return (<div className="checkboxForm">
        {options.map(oRow => {
            return <Checkbox
                key={oRow.val}
                checked={selectedArgs.map(e=>e.val).indexOf(oRow.val) !== -1} 
                onChange={() => toggle(selectedArgs, oRow, onArgSelected)}>{oRow.niceName ?? oRow.val}</Checkbox>;
        })}
    </div>);
}

function getMinMaxVal(props:ASelectCallback):{min:number| undefined, max:number | undefined, value:number | undefined, labelStepSize:number | undefined} {
    const {options, selectedArgs} = props;
    const value = selectedArgs?.length > 0 ? parseFloat(selectedArgs[0].val) : undefined;
    let min = undefined;
    let max = undefined;
    let labelStepSize = undefined;
    if(options.length === 1) {
        min = 0;
        max = parseFloat(options[0].val);
        labelStepSize = max/20;
    } else if(options.length >= 2) {
        min = parseFloat(options[0].val);
        max = parseFloat(options[1].val);
        labelStepSize = (max-min)/20;
    }
    return {min,max,value,labelStepSize};
}

const ASlider = (props:ASelectCallback) => {
    const { min, max, value, labelStepSize } = getMinMaxVal(props);
    const [val,setValue] = useState(value);
    return (<div style={{width:"90%"}}><Slider onRelease={n => props.onArgSelected([""+n])} onChange={setValue} {...{min,max,value:val,labelStepSize}} /></div>);
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


const filterOptionRow: ItemPredicate<IOptionRow> = (query, optionRow) => {
    return (`${optionRow.val}. ${optionRow.niceName}`.indexOf(query.toLowerCase()) >= 0);
}

export const ASelectSingle = (props:{allowUserCreatedEntries?:boolean} & ASelectCallback) => {
    const { onArgSelected, options } = props;
    const OptionRowSelect = Select.ofType<IOptionRow>();
    // const OptionRowSuggest = Suggest.ofType<IOptionRow>();
    const sArgs = props.selectedArgs;
    const renderOptionRow: ItemRenderer<IOptionRow> = ( optionRow, { handleClick, modifiers, query }) => {
        if (!modifiers.matchesPredicate) { return null; }
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
        return (<OptionRowSelect {...commonProps} filterable={options.length>10}  >
        <Button text={txt} rightIcon="caret-down" />
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
    const OptionRowMultiSelect = MultiSelect.ofType<IOptionRow>();
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
    const [text,setText] = useState(props.selectedArgs ? props.selectedArgs[0].val : "");
    return <MyInput label="" value={text} name="name" onChange={(e) => setText(e.currentTarget.value)} />;
}

const ADateInput = (props:ASelectCallback) => {
    function getMomentFormatter(format: string): IDateFormatProps {
        return {
            formatDate: (date, locale) => moment(date).format(format),
            parseDate: (str, locale) => moment(str, format).toDate(),
            placeholder: format
        }
    };
    return (<DateInput fill={false} { ...getMomentFormatter("YYYY-MM-DD") } 
        onChange={(date) => { if(date !== null) { props.onArgSelected([toISO(date)]); } }}/>); 
}

function toISO(date:Date):string {
    return date.getFullYear()+'-' + (date.getMonth()<9 ? "0" : "") + (date.getMonth()+1) + '-'+date.getDate();
}

