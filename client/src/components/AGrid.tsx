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
 
import { DataTypeMap, SmartRs } from "../engine/chartResultSet";
import { isEqual,debounce, set, get, cloneDeep, merge, omit } from 'lodash-es';
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { renderToString } from 'react-dom/server'
import 'slickgrid/lib/jquery-1.8.3.js'
import 'slickgrid/lib/jquery-ui-1.9.2.js'
import 'slickgrid/lib/jquery.event.drag-2.3.0.js'
import 'slickgrid'
import 'slickgrid/slick.formatters.js'
import 'slickgrid/slick.grid.js'
import 'slickgrid/slick.dataview.js'
import 'slickgrid/controls/slick.pager.js'
import 'slickgrid/plugins/slick.contextmenu.js'
//import 'slickgrid/plugins/slick.resizer.js'
import 'slickgrid/plugins/slick.cellrangedecorator.js'
import 'slickgrid/plugins/slick.cellrangeselector.js'
import 'slickgrid/plugins/slick.cellcopymanager.js'
import 'slickgrid/plugins/slick.cellselectionmodel.js'
import 'slickgrid/plugins/slick.cellexternalcopymanager.js'
import 'slickgrid/controls/slick.gridmenu.js'
import 'slickgrid/plugins/slick.autotooltips.js'
// import 'slickgrid/controls/slick.columnpicker.js'
import draghandlepng from 'slickgrid/images/drag-handle.png'
import deletepng from 'slickgrid/images/delete.png'
import 'jquery-sparkline/jquery.sparkline.min.js';

import _uniqueId from 'lodash-es/uniqueId';
import { ChartWrapper, ChartWrapper90 } from "../styledComponents";
import AGridContextMenu from "./AGridContextMenu";
import { Icon } from "@blueprintjs/core";
import { ActionRunner, ColConfig, ColFormat, ColumnConfig, getEmptySubConfig, SubConfig } from "./ChartFactory";
import { SetArgsType } from "../engine/queryEngine";
import { ThemeContext } from "../context";
import { DeepPartial } from "utility-types";
import { createAddlHeaderRow, doSparkLines, FilterMenu, FilterType, getFilterResult, getSlickFormatter } from "./AGridHelper";

// Notice even though we currently only support bold/normal, we store them as same names as TextStyleFrow AND CSS. 
// This is in case we want to support more options in future. e.g. bolder/lighter.
export type GridclmConfig = { 
    fontStyle:"normal"|"italic", 
    fontWeight:"normal"|"bold", 
    color:string,
    backgroundColor:string,
    textAlign:ColAlignOptions|"",
    // For now only exposing on/off. commented config to plan how we would allow configuration in future.
    cfDataBar:boolean,
    //cfDataBarConfig:{ showBarOnly, min, max, color, fill:"grad"|"solid", border: color: negative:}
    cfColorScale:boolean,
    //cfColorScaleConfig:{typ:2|3 colors, minTyp, minVal, mid, max }
    cfIconSet:boolean,
    //cfIconSetConfig:{iconStyle, min, mid}
}

export const defaultGridclmConfig:GridclmConfig = { fontStyle:"normal", fontWeight:"normal",  color:"", backgroundColor:"", 
    textAlign:"", cfDataBar:false, cfColorScale:false, cfIconSet:false }

//const a = <span style={{fontFamily:"serif"}} />

export type GridConfig = {
    showPulsePivot: boolean,
    showFilters: boolean,
    showPreheaderPanel: boolean,
    showContextMenu: boolean,
    pager:string,
    frozenRow: number,
    autosizeColumns:boolean,
    gridclmConfig:{ [k:string]:GridclmConfig},
};

// const columnPicker =  {
//     fadeSpeed: 100,
//     columnTitle: "Columns",
//     hideForceFitButton: false,
//     hideSyncResizeButton: true,
//     forceFitTitle: "Force fit columns",
//   };

function getGridMenu(clearSortAction:()=>void) {
    return {
    useClickToRepositionMenu: false, // defaults to true (false would use the icon offset to reposition the grid menu)
    menuUsabilityOverride: function (args:any) { return true; },
    // columnTitle: "Columns",
    hideForceFitButton: true,
    hideSyncResizeButton: true,
    iconImage: draghandlepng, // this is the Grid Menu icon (hamburger icon)
    //iconCssClass: "fa fa-bars",    // you can provide iconImage OR iconCssClass
    // menuWidth: 18,                 // width that will be use to resize the column header container (18 by default)
    resizeOnShowHeaderRow: true,
    cssClass:"Appdark",
    customItems: [
      { iconImage: deletepng, title: "Clear Filters", disabled: false, command: "clear-filter", cssClass: 'bold', textCssClass: 'red'  },
      { iconImage: deletepng, title: "Clear Sorting", disabled: false, command: "clear-sorting", textCssClass: 'red', action:clearSortAction  },
    //   { iconImage: infopng, title: "Toggle Filter Row", disabled: false, command: "toggle-filter",
    //     itemUsabilityOverride: function (args:any) {
    //       // for example disable the toggle of the filter bar when there's filters provided
    //     //   return isObjectEmpty(columnFilters);
    //     return true;
    //     },
    //   },
    //   { divider: true },
    //   { iconCssClass: "icon-help", title: "Help", command: "help", textCssClass: "blue",
    //     action: function(e:any, args:any) {
    //       // you can use the "action" callback and/or subscribe to the "onCallback" event, they both have the same arguments
    //       console.log('execute an action on Help', args);
    //     }
    //   }
    ]};
}
  
function comparer(a:any, b:any, sortcol:string) {
    const va = a[sortcol];
    const vb = b[sortcol];
    if(typeof va == "number" && typeof vb == "number") {
        return va - vb;
    } else if(va instanceof Date && vb instanceof Date) {
        return va.getTime() - vb.getTime();
    }
    const collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: "base",
    });
    return collator.compare(va, vb);
  }



export const defaultGridConfig:GridConfig = {
    showPulsePivot:false, showPreheaderPanel: false, showFilters: false, frozenRow: 0, showContextMenu: true, pager: "100", autosizeColumns: true, gridclmConfig: {} };

export type ColAlignOptions = "left"|"center"|"right";

// These were the starting point:
//    http://6pac.github.io/SlickGrid/examples/example-grid-menu.html   - Used as start point
//    https://github.com/6pac/SlickGrid/blob/master/examples/example15-auto-resize.html  - paused this work as didn't work with react.
export default function AGrid(props:{ srs: SmartRs | null, subConfig:SubConfig, setArgTyped:SetArgsType, onConfigChange?:(s:SubConfig)=>void, actionRunner:ActionRunner, className?:string, 'data-testid'?:string }) {

    // id will be set once when the component initially renders, but never again
    // (unless you assigned and called the second argument of the tuple)
    const [id] = useState(_uniqueId('prefix-'));
    const [pagerid] = useState(_uniqueId('prefix-'));
    const [sort, setSort] = useState({field:"", asc:false});
    const [columnFilters, setColumnFilters] = useState<{[k:string]:string}>({});
    const [columnFiltersTypes, setColumnFilterTypes] = useState<{[k:string]:FilterType}>({});
    const [showContextMenu, setShowContextMenu] = useState({visible:false, x:0, y:0, colName:"", rowItem:{}});
    const [showFilterMenu, setShowFilterMenu] = useState({visible:false, x:0, y:0, colName:""});
    const context = useContext(ThemeContext);
    
    const gridRef = useRef(null);
    const dataViewRef = useRef(null);
    const allColNames = useRef<string[]>([]);
    const types = useRef<DataTypeMap>({});
    const subConfigRef = useRef<SubConfig>(getEmptySubConfig());
    
    const srs = props.srs;
    const gc:GridConfig = merge(cloneDeep(defaultGridConfig),props.subConfig.gridConfig ?? {});
    
    const updateGrid = (forceRefresh = false) => {
      if(gridRef.current  && dataViewRef.current) {
  
        if(srs) {
          const newTypes = srs.rsdata.tbl.types;
          const newColNames = Object.keys(newTypes).filter(e => e !== "id");
          const scChanged = !isEqual(omit(subConfigRef.current,['actionHandlers']), omit(props.subConfig,['actionHandlers']));
          const notEqual = !isEqual(allColNames.current,newColNames) || !isEqual(types.current, newTypes) || scChanged;

          // No need to update appearance if actionHandlers only change but we must update ref to make sure clickListener calls actions OK
          if(!scChanged && !isEqual(subConfigRef.current.actionHandlers, props.subConfig.actionHandlers)) {
            subConfigRef.current = cloneDeep(props.subConfig);
          }
          
          if(notEqual || forceRefresh) { // need to check if config changed, as right click context menu can alter subCOnfig
            console.log("updating columns");
            const columns = generateColDefs(newColNames, newTypes, gc.showPreheaderPanel === true, props.subConfig.colConfig, gc); // @ts-ignore
            dataViewRef.current.setItems([]);// @ts-ignore Have to remove items else when you set columns it will attempt to render old data with new formatters
            gridRef.current.setColumns(columns); 
            
            if(gc.showPreheaderPanel) {
                createAddlHeaderRow(gridRef.current, columns);  
            }

            allColNames.current = [...newColNames];
            types.current = newTypes;
            subConfigRef.current = cloneDeep(props.subConfig);
          }
          const n = props.srs ? props.srs.count() : 0;
        //   console.log("updating data");
          const dv = dataViewRef.current; // @ts-ignore
          dv.beginUpdate(); // @ts-ignore
          dv.setItems(srs.rsdata.tbl.data.map((e,i) => {e['id'] = n - i; return e})); // @ts-ignore
          if(gc.autosizeColumns) { // @ts-ignore
            gridRef.current.autosizeColumns();
          }
          // @ts-ignore
          function filter(item:any) {
            try {
                for (const columnId in columnFilters) {
                    const filter = columnFilters[columnId].toLowerCase();
                    const ft = columnFiltersTypes[columnId] || "Contains";
                    if (gridRef.current && columnId !== undefined && filter !== "") { // @ts-ignore
                        const c = gridRef.current.getColumns()[gridRef.current.getColumnIndex(columnId)];
                        const val = item[c.field];
                        const fval = c.formatter(-1,-1,val, c, item); // special -1 to signal return formatted text but not html
                        if(!getFilterResult(ft, filter, fval) && !getFilterResult(ft, filter, val)) {
                            return false;
                        }
                    }
                }
            } catch { return true }
            return true;
          } // @ts-ignore
          dv.setFilter(filter);
          if(sort.field.length > 0) { // @ts-ignore
            dv.sort((a:any,b:any) => comparer(a,b,sort.field), sort.asc);
          } // @ts-ignore
          dv.endUpdate(); // @ts-ignore
          gridRef.current.invalidate();
          doSparkLines(context.theme);
        }
      }
    }

    useEffect(() => {
        document.addEventListener("click", hideContextMenus);
        return () => { document.removeEventListener("click", hideContextMenus); };
    });
    const hideContextMenus = useCallback(() => {
        if(showContextMenu.visible) { setShowContextMenu({visible:false, x:0, y:0, colName:"", rowItem:{}})  }
        if(showFilterMenu.visible) { setShowFilterMenu({visible:false, x:0, y:0, colName:""})  }
    },[showContextMenu,showFilterMenu]);

    function setColumnAlign(colName:string, colAlign:ColAlignOptions) {
        const newGridConfig = set(props.subConfig.gridConfig,"gridclmConfig."+colName+".textAlign", colAlign);
        props.onConfigChange && props.onConfigChange({...props.subConfig, gridConfig:newGridConfig});
    }
    function setColumnFormat(colName:string, colFormat:ColFormat) {
        const newColConfig = set(props.subConfig.colConfig,colName+".colFormat",colFormat);
        props.onConfigChange && props.onConfigChange({...props.subConfig, colConfig:newColConfig});
    }
    function setColumnWidth(colName:string, width:number | undefined) {
        const newColConfig = set(props.subConfig.colConfig,colName+".colWidth",width);
        props.onConfigChange && props.onConfigChange({...props.subConfig, colConfig:newColConfig});
    }

    // Listen to parent container size changes and if it happens resize grid
    useEffect(() => {
        const resizeObserver = new ResizeObserver(() => { //@ts-ignore
                console.log("resizeCanvas");// @ts-ignore
                gridRef.current && gridRef.current.resizeCanvas();
        });
        const e = document.getElementById(id)?.parentElement;
        if(e) { resizeObserver.observe(e); }
        return () => { e && resizeObserver.unobserve(e); }
    },[id]);

    useEffect(() => {
            const options = { // https://github.com/6pac/SlickGrid/wiki/Grid-Options
              enableCellNavigation: true,
              enableColumnReorder: true,
              enableAddRow: false,
              editable: false,  
              showHeaderRow: true, // This must initially be true or header doesn't get drawc correctly. 
              headerRowHeight: gc.showFilters ? 30 : 0,
            //   rowHeight:24,
              createPreHeaderPanel: gc.showPreheaderPanel, // preheader panel is for grouped column headers
              showPreHeaderPanel: gc.showPreheaderPanel,
              frozenRow:gc.frozenRow ?? -1,
              preHeaderPanelHeight: gc.showPreheaderPanel ? 25 : undefined,
              enableAutoSizeColumns: gc.autosizeColumns,  
              gridMenu:getGridMenu(() => { setSort({field:"", asc:true}) }),
              explicitInitialization: true,  // don't initialize until we call .init(). Probably needed for burger menu.
              forceFitColumns: gc.autosizeColumns,
            //   columnPicker, - Have to disable this as it would need us to know the columns in advance currently.
            };
  
            // @ts-ignore
            const dataView = new Slick.Data.DataView();
            dataViewRef.current = dataView; // @ts-ignore
            const columns: { columnGroup: string; width: number; }[] = [];  // @ts-ignore
            const grid = gridRef.current = new Slick.Grid('#'+id, dataView, columns, options);   // @ts-ignore
            grid.setSelectionModel(new Slick.CellSelectionModel());
            allColNames.current = []; // resetting these to force column redefine
            types.current = {};  // @ts-ignore
            // let columnpicker = new Slick.Controls.ColumnPicker(columns, grid, options);  // @ts-ignore
            const gridMenuControl = new Slick.Controls.GridMenu(columns, grid, options); // @ts-ignore
            grid.registerPlugin(new Slick.CellExternalCopyManager({ readOnlyMode : true, includeHeaderWhenCopying : true,
                dataItemColumnValueExtractor:(item:any, colDef:any) => {
                    return colDef.formatter(-1,-1, item[colDef.field], colDef, item); // special -1 to signal return formatted text but not html
                } }));
            const showPager = gc.pager !== undefined && gc?.pager !== "-2";
            if(showPager) { // @ts-ignore
                new Slick.Controls.Pager(dataView, grid, $("#" + pagerid));
                dataView.setPagingOptions({pageSize:gc.pager ? +gc.pager : 0});
            }

            if(gc.showFilters) {
                $(grid.getHeaderRow()).on("click", ":input", function (e) { e.stopPropagation(); }); // Clicking filter should NOT show editor
                $(grid.getHeaderRow()).on("change keyup", ":input", () => {
                    // Done using jQuery/DOM as the state didn't seem to hold all keys
                    const m:{[k:string]:string} = {};
                    $(grid.getHeaderRow()).find(".filterInput").get().forEach(e => {
                        const s = (e as HTMLInputElement).value.trim();
                        if(s.length>0) { m[$(e).data("columnId")] = s }
                    });
                    setColumnFilters(m);
                });
                
                $(grid.getHeaderRow()).on("click", ":button", function (e) {
                    const columnId = $(this).data("columnId") as string;
                    setShowFilterMenu({visible:!showFilterMenu.visible, x:e.pageX, y:e.pageY, colName:columnId});
                    });
                grid.onHeaderRowCellRendered.subscribe(function(e:any, args:any) {
                        $(args.node).empty();
                        const b = renderToString(<button className="filterButton"><Icon icon="filter" size={12} color="#888" /></button>);
                        $(b+"<input type='text' class='filterInput'>").data("columnId", args.column.id).val(columnFilters[args.column.id]).appendTo(args.node);
                });
            }
            
            gridMenuControl.onCommand.subscribe(function(e:any, args:{command:string}) {
                // e.preventDefault(); // you could do if you wish to keep the menu open
        
                if(args.command === "toggle-filter") {
                    grid.setHeaderRowVisibility(!grid.getOptions().showHeaderRow);
                } else if(args.command === "clear-filter") {
                    $('.slick-headerrow-column').children().val('');
                    setColumnFilters({});
                    setColumnFilterTypes({});
                    dataView.refresh();
                } else if(args.command === "clear-sorting") {
                    grid.setSortColumns([]);
                    dataView.refresh();
                }
            });
            
            grid.onContextMenu.subscribe(function (e:any, args:any) {
              e.preventDefault();
              const cell = grid.getCellFromEvent(e);
              const itm = grid.getDataItem(cell.row); // reference to specyfic row
              const colDef = grid.getColumns()[cell.cell];
              if(gc.showContextMenu) { // Must be original name here as that's what is used to add formatters/align settings
                setShowContextMenu({visible:true, x:e.pageX, y:e.pageY, colName:colDef.originalName, rowItem:itm});
              }
            }); 
            
            // can't use this onClick as FlexLayout blocks the first ever click on a panel
            // grid.onClick.subscribe(function (e:any, args:{row:number, cell:number}) {
            
            $('#'+id).on("mousedown", function (e) {
                const args = grid.getCellFromEvent(e);
                if(args && typeof args.cell == "number" && typeof args.row == "number") {
                    grid.setActiveCell(args.row, args.cell);
                    const itm = grid.getDataItem(args.row)
                    const colDef = grid.getColumns()[args.cell];
                    if(typeof itm === "object") {
                        props.setArgTyped({ series:colDef.name, ...selectArgs(itm)}); 
                        const ahsToRun = subConfigRef.current.actionHandlers.filter(a => a.trigger === "Click" && (a.name === "" || a.name === colDef.name));
                        props.actionRunner(ahsToRun, itm);
                    }
                }
            });       
            
            grid.onScroll.subscribe(function (e:any, args:{scrollLeft:number, scrollTop:number}) {
                doSparkLines(context.theme); // without this, scrolling causes sparkLines NOT to display until new data arrives.
            });

            // wire up model events to drive the grid
            dataView.onRowCountChanged.subscribe(function () {
                grid.updateRowCount();
                grid.render();
            });
        
            dataView.onRowsChanged.subscribe(function (e:any, args:{rows:number}) {
                grid.invalidateRows(args.rows);
                grid.render();
            });

            grid.onSort.subscribe(function (e:any, args:any) {
                setSort({field:args.sortCol.field, asc:args.sortAsc});
            });

             // @ts-ignore - https://github.com/6pac/SlickGrid/blob/master/examples/example-spreadsheet.html 
            const _selector = new Slick.CellRangeSelector();
            // _selector.onCellRangeSelected.subscribe(_self.handleCellRangeSelected);
            grid.registerPlugin(_selector);

            // @ts-ignore   - Currently broken and partially replaced with styled component. It kept resiing too large and making scrollbars show up.                 
            // let resizer = new Slick.Plugins.Resizer({ container: '.grcontainer', // DOM element selector, can be an ID or a class name
            //     rightPadding: 0,  bottomPadding: 0, topPadding:0, leftPadding:0 //,  minHeight: 40,  minWidth: 40, maxHeight: 3000,  maxWidth: 3000
            // });
            // grid.registerPlugin(resizer);
            grid.registerPlugin(new Slick.AutoTooltips({ enableForHeaderCells: true }));
            const myListener = debounce(function () {  updateGrid(true);               }, 100); 
            window.addEventListener('resize', myListener);
            
            grid.init();        
            grid.onColumnsResized.subscribe(function (scope:any, e:{triggeredByColumn: string, slickGrid:any}) {
                const colDef = grid.getColumns()[grid.getColumnIndex(e.triggeredByColumn)];
                setColumnWidth(colDef.originalName, colDef.width);
            });
            updateGrid();
  
            return () => { 
                if(grid) {  grid.destroy();  } 
                if(myListener) {  window.removeEventListener('resize', myListener); }
            }
      // eslint-disable-next-line react-hooks/exhaustive-deps
      },[id,pagerid]);
      
      updateGrid();
      const showPager = gc.pager !== undefined && gc?.pager !== "-2";

    return <ChartWrapper className={`grcontainer ${props.className || ''}`} data-testid={props['data-testid']}>
        {showPager ?  
             <><ChartWrapper90 id={id} style={{ width:"100%" }}></ChartWrapper90><div id={pagerid} style={{height:"20px", width:"99%"}}></div></>
            :<ChartWrapper id={id} style={{ width:"100%" }}></ChartWrapper>}
        
        {showContextMenu.visible && <AGridContextMenu srs={srs} x={showContextMenu.x} y={showContextMenu.y} 
            colName={showContextMenu.colName} 
                actionHandlers={props.subConfig.actionHandlers.filter(a => a.trigger==="Menu")} 
                selectionMade={(ah) => { hideContextMenus(); if(ah){ props.actionRunner([ah],showContextMenu.rowItem);}}} 
                selected={props.subConfig.colConfig[showContextMenu.colName]?.colFormat ?? ""} 
                setColumnFormat={setColumnFormat} 
                setColumnAlign={(colAlign) => { setColumnAlign(showContextMenu.colName,colAlign)}} />}

        {showFilterMenu.visible && <FilterMenu x={showFilterMenu.x} y={showFilterMenu.y}  
            selectionMade={(ft) => { hideContextMenus(); setColumnFilterTypes({...columnFiltersTypes, [showFilterMenu.colName]:ft }) }}
            selected={columnFiltersTypes[showFilterMenu.colName]} />}
    </ChartWrapper>;
  }


/**
 * Given an object representing a row within the table, filter it to only those key/values that we want to set as variables.
 * Add specially named .ts/.series/.val entries to allow easier coordination between tables and charts.
 * e.g. Could show line for current TS on chart and highlight current TS row on table to show events near the same time.
 */
function selectArgs(argMapWithTypes: { [argKey: string]: any }):{[argKey: string]: any} {
    const r:{[argKey: string]: any} = {};
    let s:string | null = null;
    let n:number | null = null;
    let d:Date | null = null;
    Object.entries(argMapWithTypes).forEach(([argKey, argVals], idx) => {
        if(idx < 3) {
            if(typeof argVals === 'string') {
                if(argVals.length <= 36 && !argVals.includes("/>")) {
                    r[argKey] = argVals;
                }
            } else {
                r[argKey] = argVals;
            }
        }
        if(typeof argVals === 'string' && s === null) {
            if(argVals.length < 20 && !argVals.includes("/>")) {
                s = argVals;
                r['name'] = argVals;
            }
        } else if(typeof argVals === 'number' && n === null) {
            n = argVals;
            r['val'] = argVals;
        } else if(argVals instanceof Date && d === null) {
            d = argVals;
            r['ts'] = argVals;
        }
    });
    return r;
}


export function containsGridSDcol(colName:string) {
    const c = colName.toLowerCase();
    const p = c.indexOf("_sd_");
    if (p > 0) {
        return ['_sd_bg', '_sd_fg', '_sd_class', '_sd_code'].indexOf(c.substring(p)) !== -1;
    }
    return false;
}


export function generateColDefs(allColNames: string[], types: DataTypeMap, enableGrouping: boolean, colConfig:ColConfig, gridConfig:DeepPartial<GridConfig>) {
    // Columns that affect styling in a different column should NOT be shown
    const colsShown = allColNames.filter(colName => !containsGridSDcol(colName));
    const colDefs = colsShown.map((e, idx) => {
        const columnConfig:ColumnConfig = (colConfig && e in colConfig) ? colConfig[e] : {};
        const colNameUsed = columnConfig.colFormat === undefined ? e : "x_SD_" + colConfig[e].colFormat;

        const p = e.toLowerCase().indexOf("_sd_");
        const name = p === -1 ? e : e.substring(0, p);
        const reName = get(colConfig,e+".name",name);
        const grpP = name.indexOf("_");
        const columnGroup = grpP === -1 ? "" : name.substring(0, grpP);
        //{id: 'duration', name: 'Duration', field: 'duration', resizable: false},
        const gc:GridclmConfig = { ...defaultGridclmConfig, ...(gridConfig && gridConfig.gridclmConfig && gridConfig.gridclmConfig[e])};
        const aligned = (gc.textAlign === "" ? (types[e] === "number" ? "gcright" : "") : ("gc" + gc.textAlign));
        const cd:any = {
            name: reName !== name ? reName : (enableGrouping && columnGroup.length > 0 ? name.substring(grpP+1) : name),
            originalName:e,
            id: e,
            field: e,
            width: columnConfig.colWidth,
            formatter: getSlickFormatter(colNameUsed, types[e], gc),
            sortable:true,
            columnGroup:columnGroup, // https://github.com/6pac/SlickGrid/blob/master/examples/example-column-group.html
            cssClass: e + '_cell ' + aligned + " " + (gc.fontWeight === "bold" ? " gcbold" : ""),
        };
        // if (allColNames.map(c => c.toUpperCase()).indexOf(name.toUpperCase() + "_SD_CLASS") !== -1) {
        //     cd.cellClass = SDFormatters.getCssClass;
        // }
        return cd;
    });
    // Only return columnGroup key if dupes existed
    function hasDuplicates(array:Array<any>) { return (new Set(array)).size !== array.length; }
    if(enableGrouping && hasDuplicates(colDefs.filter(v => v.columnGroup.length > 0).map(v => v.columnGroup))) {
        return colDefs;
    }
    return colDefs.map(({columnGroup, ...item}) => item);
}


// function getSmartTransaction(oldData: any[], rsdata: RsData, confirmedRowCount: number): RowDataTransaction | undefined {
//     // Assuming something like:
//     // oldData:     F E D C B A
//     // newData: H G F E D C B A
//     // Find the likely position of F, the first match, then check for overlap area.
//     let nd = rsdata.tbl.data; // nd = NewData
//     let firstMatch = -1;
//     for (let pos = 0; pos < nd.length; pos++) {
//         if (isEqual(nd[pos], oldData[0])) {
//             firstMatch = pos;
//             break;
//         }
//     }
//     if (firstMatch >= 0) {
//         let p = firstMatch;
//         for (; p - firstMatch < oldData.length && p < nd.length; p++) {
//             if (!isEqual(oldData[p - firstMatch], nd[p])) {
//                 break;
//             }
//         }
//         let add = nd.slice(0, firstMatch);
//         let remove = oldData.slice(p);
//         add = add.concat(nd.slice(p));
//         if ((oldData.length + add.length - remove.length) === confirmedRowCount) {
//             return { add, addIndex: 0, remove };
//         } else {
//             console.debug("Found  firstMatch=" + firstMatch + " p=" + p + " space=" + (p - firstMatch) + " add=" + add.length + " remove=" + remove.length);
//             console.debug("Can't find added/removed, reverting to full refresh.");
//         }
//         return undefined;
//     }
// }
