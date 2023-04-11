import { DataTypeMap, DataTypes,SmartRs } from "../engine/chartResultSet";
import { isEqual,debounce } from 'lodash-es';
import React, { useCallback, useEffect, useRef, useState } from 'react'
import 'slickgrid/lib/jquery-1.8.3.js'
import 'slickgrid/lib/jquery-ui-1.9.2.js'
import 'slickgrid/lib/jquery.event.drag-2.3.0.js'
import 'slickgrid'
import 'slickgrid/slick.formatters.js'
import 'slickgrid/slick.grid.js'
import 'slickgrid/slick.dataview.js'
import 'slickgrid/controls/slick.pager.js'
import 'slickgrid/plugins/slick.contextmenu.js'
import 'slickgrid/plugins/slick.resizer.js'
import 'slickgrid/plugins/slick.cellrangedecorator.js'
import 'slickgrid/plugins/slick.cellrangeselector.js'
import 'slickgrid/plugins/slick.cellcopymanager.js'
import 'slickgrid/plugins/slick.cellselectionmodel.js'
import 'slickgrid/plugins/slick.cellexternalcopymanager.js'
import 'slickgrid/controls/slick.gridmenu.js'
import 'slickgrid/controls/slick.columnpicker.js'
import draghandlepng from 'slickgrid/images/drag-handle.png'
import deletepng from 'slickgrid/images/delete.png'
import infopng from 'slickgrid/images/info.gif'


import _uniqueId from 'lodash-es/uniqueId';
import { ChartWrapper, ChartWrapper90 } from "../styledComponents";
import AGridContextMenu from "./AGridContextMenu";



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
    hideForceFitButton: false,
    hideSyncResizeButton: true,
    iconImage: draghandlepng, // this is the Grid Menu icon (hamburger icon)
    //iconCssClass: "fa fa-bars",    // you can provide iconImage OR iconCssClass
    // menuWidth: 18,                 // width that will be use to resize the column header container (18 by default)
    resizeOnShowHeaderRow: true,
    customItems: [
      { iconImage: deletepng, title: "Clear Filters", disabled: false, command: "clear-filter", cssClass: 'bold', textCssClass: 'red'  },
      { iconImage: deletepng, title: "Clear Sorting", disabled: false, command: "clear-sorting", textCssClass: 'red', action:clearSortAction  },
      { iconImage: infopng, title: "Toggle Filter Row", disabled: false, command: "toggle-filter",
        itemUsabilityOverride: function (args:any) {
          // for example disable the toggle of the filter bar when there's filters provided
        //   return isObjectEmpty(columnFilters);
        return true;
        },
      },
      { divider: true },
      { iconCssClass: "icon-help", title: "Help", command: "help", textCssClass: "blue",
        // you could dynamically remove a command from the list (only checks before opening the menu)
        // for example don't show the "Help" button if we have less than 5 columns left
        itemVisibilityOverride: function (args:any) {
          return args.visibleColumns.length > 4;
        },
        action: function(e:any, args:any) {
          // you can use the "action" callback and/or subscribe to the "onCallback" event, they both have the same arguments
          console.log('execute an action on Help', args);
        }
      }
    ]};
};
  
function comparer(a:any, b:any, sortcol:string) {
    if(typeof a == "number" && typeof a == "number") {
        return a>=b;
    }
    var collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: "base",
    });
    return collator.compare(a[sortcol], b[sortcol]);
  }


function createAddlHeaderRow(grid:any, columns:Array<{columnGroup:string, width:number}>) {
    let html = "<div class='slick-header ui-state-default slick-header-left' style='width: calc(100% - 18px)'>	<div class='slick-header-columns slick-header-columns-left ui-sortable' style='left: -1000px; width: 1796px;' unselectable='on'>	";
    var widthDiff = grid.getHeaderColumnWidthDiff();
    for (var i = 0; i < columns.length;) {
        let m = columns[i];
        let c = 1;
        let widthTotal = m.width - widthDiff;
        while(i+c < columns.length && m.columnGroup === columns[i+c].columnGroup) {
            widthTotal += columns[i+c].width;
            c++;
        }
        html += "<div class='ui-state-default slick-header-column' style='width: " + widthTotal + "px;'><span class='slick-column-name'>" + (m.columnGroup || '') + "</span></div>";
        i+=c;
    }
    html += "</div></div>";
    $(grid.getPreHeaderPanel()).html(html);
}

// THis is the target: https://ghiscoding.github.io/Angular-Slickgrid/#/trading
// These were the starting point:
//    http://6pac.github.io/SlickGrid/examples/example-grid-menu.html   - Used as start point
//    https://github.com/6pac/SlickGrid/blob/master/examples/example15-auto-resize.html  - paused this work as didn't work with react.
export default function AGrid(props:{ srs: SmartRs | null, subConfig:any, onConfigChange?:(s:any)=>void }) {

    // id will be set once when the component initially renders, but never again
    // (unless you assigned and called the second argument of the tuple)
    const [id] = useState(_uniqueId('prefix-'));
    const [pagerid] = useState(_uniqueId('prefix-'));
    const [sort, setSort] = useState({field:"", asc:false});
    const [columnFilters, setColumnFilters] = useState<{[k:string]:string}>({});
    const [columnFormatters, setColumnFormatters] = useState<{[k:string]:string}>(props.subConfig ?? {});
    const [showContextMenu, setShowContextMenu] = useState({visible:false, x:0, y:0, colName:""});
    
    const gridRef = useRef(null);
    const dataViewRef = useRef(null);
    const allColNames = useRef<string[]>([]);
    const types = useRef<DataTypeMap>({});
    const columnFormattersRef = useRef<{[k:string]:string}>({});
    
    const srs = props.srs;
    
    const updateGrid = (forceRefresh:boolean = false) => {
      if(gridRef.current  && dataViewRef.current) {
  
        if(srs && srs.rsdata.tbl.data.length>0) {
          const newColNames = Object.keys(srs.rsdata.tbl.data[0]).filter(e => e !== "id");
          const newTypes = srs.rsdata.tbl.types;
          const notEqual = !isEqual(allColNames.current,newColNames) || !isEqual(types.current, newTypes) || !isEqual(columnFormattersRef.current, columnFormatters);
          if(notEqual || forceRefresh) {
            console.log("updating columns");// @ts-ignore
            const columns = generateColDefs(newColNames, newTypes, srs.count(), columnFormatters); // @ts-ignore
            dataViewRef.current.setItems([]);// @ts-ignore Have to remove items else when you set columns it will attempt to render old data with new formatters
            gridRef.current.setColumns(columns); // @ts-ignore
            createAddlHeaderRow(gridRef.current, columns);  
            allColNames.current = [...newColNames];
            types.current = newTypes;
            columnFormattersRef.current = columnFormatters;
          }
          const n = props.srs ? props.srs.count() : 0;
        //   console.log("updating data");
          const dv = dataViewRef.current; // @ts-ignore
          dv.beginUpdate(); // @ts-ignore
          dv.setItems(srs.rsdata.tbl.data.map((e,i) => {e['id'] = n - i; return e})); // @ts-ignore
          gridRef.current.autosizeColumns(); // @ts-ignore
          // @ts-ignore
          function filter(item:any) {
            for (var columnId in columnFilters) {
              if (gridRef.current && columnId !== undefined && columnFilters[columnId] !== "") { // @ts-ignore
                var c = gridRef.current.getColumns()[gridRef.current.getColumnIndex(columnId)];
                let val = item[c.field];
                if (typeof val === 'string' || val instanceof String) {
                    return (val.toLowerCase().includes(columnFilters[columnId].toLowerCase()));
                } else {
                    return false;
                }
              }
            }
            return true;
          } // @ts-ignore
          dv.setFilter(filter);
          if(sort.field.length > 0) { // @ts-ignore
            dv.sort((a:any,b:any) => comparer(a,b,sort.field), sort.asc);
          } // @ts-ignore
          dv.endUpdate(); // @ts-ignore
          gridRef.current.invalidate();
        }
      }
    }

    useEffect(() => {
        document.addEventListener("click", handleClick);
        return () => { document.removeEventListener("click", handleClick); };
    });
    const handleClick = useCallback(() => (showContextMenu.visible ? setShowContextMenu({visible:false, x:0, y:0, colName:""}) : null), [showContextMenu]);
    function setColumnFormat(colName:string, colFormat:string) {
        let cf = {...columnFormatters,[colName]:colFormat};
        if(colFormat.length === 0) {
            delete cf[colName];
        }
        setColumnFormatters(cf);
        props.onConfigChange && props.onConfigChange(cf);
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
              headerRowHeight: 30,
              createPreHeaderPanel: true, // preheader panel is for grouped column headers
              showPreHeaderPanel: true,
              preHeaderPanelHeight: 25,
              enableAutoSizeColumns: true,  
              gridMenu:getGridMenu(() => { setSort({field:"", asc:true}) }),
              explicitInitialization: true,  // don't initialize until we call .init(). Probably needed for burger menu.
              forceFitColumns: true,
            //   columnPicker, - Have to disable this as it would need us to know the columns in advance currently.
            };
  
            // @ts-ignore
            const dataView = new Slick.Data.DataView();
            dataViewRef.current = dataView; // @ts-ignore
            const columns: { columnGroup: string; width: number; }[] = [];  // @ts-ignore
            let grid = gridRef.current = new Slick.Grid('#'+id, dataView, columns, options);   // @ts-ignore
            grid.setSelectionModel(new Slick.CellSelectionModel());
            allColNames.current = []; // resetting these to force column redefine
            types.current = {};  // @ts-ignore
            new Slick.Controls.Pager(dataView, grid, $("#" + pagerid)); // @ts-ignore
            // let columnpicker = new Slick.Controls.ColumnPicker(columns, grid, options);  // @ts-ignore
            const gridMenuControl = new Slick.Controls.GridMenu(columns, grid, options); // @ts-ignore
            grid.registerPlugin(new Slick.CellExternalCopyManager({ readOnlyMode : true, includeHeaderWhenCopying : true, }));
            dataView.setPagingOptions({pageSize: 100})

            $(grid.getHeaderRow()).on("change keyup", ":input", function (e) {
                var columnId = $(this).data("columnId") as string;
                if (columnId != null) {
                  setColumnFilters({...columnFilters, [columnId]: $.trim($(this).val() as string)});
                }
              });
              grid.onHeaderRowCellRendered.subscribe(function(e:any, args:any) {
                  $(args.node).empty();
                  $("<input type='text'>").data("columnId", args.column.id).val(columnFilters[args.column.id]).appendTo(args.node);
              });
            
            gridMenuControl.onCommand.subscribe(function(e:any, args:{command:string}) {
                // e.preventDefault(); // you could do if you wish to keep the menu open
        
                if(args.command === "toggle-filter") {
                    grid.setHeaderRowVisibility(!grid.getOptions().showHeaderRow);
                } else if(args.command === "clear-filter") {
                    $('.slick-headerrow-column').children().val('');
                    setColumnFilters({});
                    dataView.refresh();
                } else if(args.command === "clear-sorting") {
                    grid.setSortColumns([]);
                    dataView.refresh();
                }
            });
            
            grid.onContextMenu.subscribe(function (e:any, args:any) {
              e.preventDefault();
              let col = grid.getCellFromEvent(e).cell;
              setShowContextMenu({visible:true, x:e.pageX, y:e.pageY, colName:allColNames.current[col]});
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
            let myListener = debounce(function () {  updateGrid(true);               }, 100); 
            window.addEventListener('resize', myListener);
            
            grid.init();        
            grid.onColumnsResized.subscribe(function () {
                // We should resize the grouped headers
            });
            updateGrid();
  
            return () => { 
                if(grid) {  grid.destroy();  } 
                if(myListener) {  window.removeEventListener('resize', myListener); }
            }
      // eslint-disable-next-line react-hooks/exhaustive-deps
      },[id,pagerid]);
      
      updateGrid();

    return <ChartWrapper className="grcontainer">
        <ChartWrapper90 id={id} style={{ width:"100%" }}></ChartWrapper90>
        <div id={pagerid} style={{height:"20px", width:"99%"}}></div>
        {showContextMenu.visible && <AGridContextMenu srs={srs} x={showContextMenu.x} y={showContextMenu.y} 
            colName={showContextMenu.colName} selectionMade={handleClick} setColumnFormat={setColumnFormat} />}
    </ChartWrapper>;
  }



type FormatCallback = (row:number, cell:number, value:any, columnDef:any, dataContext:any) => string;


export function generateColDefs(allColNames: string[], types: DataTypeMap, rowCount: number, columnFormatters:{[k:string]:string}) {
    // Columns that affect styling in a different column should NOT be shown
    let colsShown = allColNames.filter(C => {
      let c = C.toLowerCase();
      let p = c.indexOf("_sd_");
      if (p > 0) {
          return ['_sd_bg', '_sd_fg', '_sd_class', '_sd_code'].indexOf(c.substring(p)) === -1;
      }
      return true;
    });
    let colDefs = colsShown.map((e, idx) => {
        // Useful to separate formatting of text and rendering. As other grids support that concept.
        // If we have both, we pipeline them ourselves.
        const colNameUsed = columnFormatters[e] === undefined ? e : "x_SD_" + columnFormatters[e];
        const formatter = SFormatters.getFormatter(colNameUsed, types[e]);
        const renderer = SFormatters.getRenderer(colNameUsed);
        let slickFormatter = (row:number, cell:number, value:any, columnDef:any, dataContext:any) => {
            let codeFormatV = SFormatters.getCode(row, cell, value, columnDef, dataContext);
            let v = codeFormatV ? codeFormatV : formatter(row, cell, value, columnDef, dataContext);
            v = renderer ? renderer(row, cell, v, columnDef, dataContext) : v;
            let s = SFormatters.getCssStyle(row, cell, value, columnDef, dataContext)
            let c = SFormatters.getCssClass(row, cell, value, columnDef, dataContext)
            if(s.length > 0 || c.length > 0) {
                v = "<span class='" + c + "' style='display: inline-block; width:100%; height:100%;" + s + "'>" + v + "</span>";
            }
            return v;
          };

        let p = e.toLowerCase().indexOf("_sd_");
        let name = p === -1 ? e : e.substring(0, p);
        let grpP = name.indexOf("_");
        let columnGroup = grpP === -1 ? "" : name.substring(0, grpP);
        //{id: 'duration', name: 'Duration', field: 'duration', resizable: false},
        let cd:any = {
            name: columnGroup.length > 0 ? name.substring(grpP+1) : name,
            id: e,
            field: e,
            formatter: slickFormatter,
            sortable:true,
            columnGroup:columnGroup, // https://github.com/6pac/SlickGrid/blob/master/examples/example-column-group.html
            cssClass: types[e] === "number" ? 'rightAligned' : undefined,
        };
        // if (allColNames.map(c => c.toUpperCase()).indexOf(name.toUpperCase() + "_SD_CLASS") !== -1) {
        //     cd.cellClass = SDFormatters.getCssClass;
        // }
        // if (types[e] === "number") {
        //     cd.filter = 'agNumberColumnFilter';
        // } 
        return cd;
    });
    // Only return columnGroup key if dupes existed
    function hasDuplicates(array:Array<any>) { return (new Set(array)).size !== array.length; }
    if(hasDuplicates(colDefs.filter(v => v.columnGroup.length > 0).map(v => v.columnGroup))) {
        return colDefs;
    }
    return colDefs.map(({columnGroup, ...item}) => item);
}


/** Contains the logic for formatting currencies/numbers and styling based on _SD_ columns*/
export class SFormatters {

    public static getRenderer(colName: string):FormatCallback | undefined {
        let c = colName.toLowerCase();
        if (c.endsWith("_sd_tag")) {
            return SFormatters.tagRenderer;
        } else if (c.endsWith("_sd_databar")) {
            return SFormatters.databarRenderer; //Formatters.PercentCompleteBar;
        } else if (c === "status" || c.endsWith("_sd_status")) {
            return SFormatters.statusRenderer;
        } else if (c.endsWith("_sd_html")) {
            return (row:number, cell:number, value:any, columnDef:any, dataContext:any) => value;
        }
        return undefined;
    }

  /**
   * Generate random tag with color based on hash of text content.
   */
   private static tagRenderer(row:number, cell:number, value:any, columnDef:any, dataContext:any) {
      return "<span class='bp4-tag .modifier' style='background-color:" + SFormatters.stringToColour(value) + "'>" + value + "</span>";
   }

   
  /**
   * Generate random tag with color based on hash of text content.
   */
  private static databarRenderer(row:number, cell:number, value:any, columnDef:any, dataContext:any) {
    let color = value > 1.0 ? 'orange' : 'green';
    let n = Math.floor(Math.min(10, value * 10));
    let nf = new Intl.NumberFormat(undefined, { style: 'percent', minimumFractionDigits: 0 });
    let tooltip = nf.format(value);
    let rep = (n: number, color: string, title: string) => { return "<span title='" + title + "' style='color:" + color +"'>" + "█".repeat(n) + "</span>"; }
    return value ? "<span class='databar'>" + rep(n, color, tooltip) + rep(10 - n, '#ffffff00', tooltip) + "</span>" : "";
    };


  /**
   * Formats blue->amber/grey->green/red based on starting to success/failure flow of:
   * Jaav threads, jiras and typical equities order flows in FIX. 
   */
   private static statusRenderer(row:number, cell:number, value:any, columnDef:any, dataContext:any) {
        if (!value) {
            return '';
        }
        let v = ("" + value).toLowerCase();
        let cls = "";
        if (['new', 'open', 'created', 'ready'].indexOf(v) >= 0) {
            cls = "bp4-intent-primary";
        } else if (['runnable', 'waiting', 'in progress', 'partial', 'blocked', 'flagged', 'suspended'].indexOf(v) >= 0 || v.indexOf('partial') >= 0) {
            cls = "bp4-intent-warning";
        } else if (['terminated', 'resolved', 'closed', 'done', 'complete', 'filled'].indexOf(v) >= 0) {
            cls = "bp4-intent-success";
        } else if (['removed', 'cancelled', 'rejected'].indexOf(v) >= 0) {
            cls = "bp4-intent-danger";
        }
        return "<span class='bp4-tag .modifier " + cls + "'>" + value + "</span>";
    };

    

    private static curry = function (inrFormat: Intl.NumberFormat):FormatCallback {
        return function (row:number, cell:number, value:any, columnDef:any, dataContext:any) {
            return value === null ? '' : inrFormat.format(value);
        };
    };

    private static currencyFormatter(CCY: string):FormatCallback {
        let nf = new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: CCY,
            minimumFractionDigits: 2
        });
        return SFormatters.curry(nf);
    }

    private static percentFormatter(dp: number):FormatCallback {
        let nf = new Intl.NumberFormat(undefined, {
            style: 'percent',
            minimumFractionDigits: dp
        });
        return SFormatters.curry(nf);
    }

    private static dpFormatter(dp: number):FormatCallback {
        let curryRaw = function (inrFormat: Intl.NumberFormat) {
            return function (row:number, cell:number, value:any, columnDef:any, dataContext:any) {
                return typeof value === "number" ? inrFormat.format(value) : value;
            };
        };
        let nf = new Intl.NumberFormat(undefined, {
            style: 'decimal',
            minimumFractionDigits: dp,
            maximumFractionDigits: dp,
        });
        return curryRaw(nf);
    }

    private static getDp(colName: string, sdName: string) {
        let c = colName.toLowerCase();
        if (c.indexOf(sdName) !== -1) {
            let p = c.indexOf(sdName) + sdName.length;
            let dps = parseInt(colName.substring(p, p + 1));
            return dps;
        }
        return undefined;
    }

    private static stringToColour(str: string) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        var colour = '#';
        for (i = 0; i < 3; i++) {
            var value = (hash >> (i * 8)) & 0xFF;
            colour += ('00' + value.toString(16)).substr(-2);
        }
        return colour + "AA";
    }

    /** Use SD_BG/FG to style */
    static getCssStyle(row:number, cell:number, value:any, columnDef:any, dataContext:any) {
        let colName = columnDef.field;
        let style = "";
        if (dataContext[colName + "_SD_FG"] !== undefined) {
            style += "color:" + dataContext[colName + "_SD_FG"];
        }
        if (dataContext[colName + "_SD_BG"] !== undefined) {
            style += (style.length > 0 ? ";" : "") + "background-color:" + dataContext[colName + "_SD_BG"];
        }
        return style;
    };


    /** Use SD_STYLE to style */
    static getCssClass(row:number, cell:number, value:any, columnDef:any, dataContext:any) {
        let colName = columnDef.field;
        if (dataContext[colName + "_SD_CLASS"] !== undefined) {
            return ("" + dataContext[colName + "_SD_CLASS"]).split(",");
        }
        return "";
    };
    
    /** Use SD_CODE to style */
    static getCode(row:number, cell:number, value:any, columnDef:any, dataContext:any) {
        let colName = columnDef.field;
        let c:string = dataContext[colName + "_SD_CODE"];
        if (c !== undefined && c.length > 0 && typeof value === "number") {
            let s = "";
            if(c.charAt(0) !== "#" && c.charAt(0) !== "0" && c.charAt(0) !== ".") {
                s += c[0];
            }
            let dp = 0;
            let dotp = c.indexOf(".");
            if(dotp !== -1) {
                dp = c.length - (dotp + 1);
                let nf = new Intl.NumberFormat(undefined, { style: 'decimal', minimumFractionDigits: dp, maximumFractionDigits: dp, });
                let nums = nf.format(value);
                let q = nums.indexOf(".");
                s += nums.substring(0, q) + ".";
                let points = nums.substring(q+1);
                for(let i=0; i<points.length; i++) {
                    s += (c.charAt(dotp + i + 1) === "X" ? "<span style='font-size:1.2em; font-weight:bold'>"+points.charAt(i)+"</span>" : points.charAt(i));
                }
            } else {
                let nf = new Intl.NumberFormat(undefined, { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0, });
                s += nf.format(value);
            }
            return s;
        }
        return undefined;
    };

    static formatDate(row:number, cell:number, value:any, columnDef:any, dataContext:any) {
        return value === null ? '' : (value as Date).toLocaleString('sv-SE');
    };

    static formatTime(row:number, cell:number, value:any, columnDef:any, dataContext:any) {
        if (value === null) {
            return '';
        }
        let v = value - (new Date().getTimezoneOffset() * 60 * 1000);
        let millis = v % 1000;
        v = v - millis;
        let hours = Math.floor(v / (60 * 60 * 1000));
        v = v - hours * 60 * 60 * 1000;
        let mins = Math.floor(v / (60 * 1000));
        v = v - mins * 60 * 1000;
        let seconds = Math.floor(v / 1000.0)
        const f = (n: number) => (n < 10 ? "0" : "") + n;
        const m = (n: number) => (n < 10 ? "00" : n < 100 ? "0" : "") + n;
        return f(hours) + ":" + f(mins) + ":" + f(seconds) + (millis !== 0 ? "." + m(millis) : "");
    };

    static getFormatter(colName: string, dtype: DataTypes):FormatCallback {
        let c = colName.toLowerCase();
        let dps = SFormatters.getDp(colName, "_sd_number");
        let pdp = SFormatters.getDp(colName, "_sd_percent");
        if (dps !== undefined) {
            return SFormatters.dpFormatter(dps);
        } else if (pdp !== undefined) {
            return SFormatters.percentFormatter(pdp);
        } else if (c.indexOf("_sd_cur") !== -1) {
            let p = c.indexOf("_sd_cur") + "_sd_cur".length;
            let CCY = colName.substring(p, p + 3);
            return SFormatters.currencyFormatter(CCY);
        } 
        if (dtype === "Date") {
            return SFormatters.formatDate;
        } else if (dtype === "Time") {
            return SFormatters.formatTime;
        }
        return SFormatters.dpFormatter(2);
    }
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
