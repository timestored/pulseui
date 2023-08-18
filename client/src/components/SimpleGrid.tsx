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
import { isEqual,debounce, set, get, cloneDeep } from 'lodash-es';
import React, {  useEffect, useRef, useState } from 'react'
import 'slickgrid/lib/jquery-1.8.3.js'
import 'slickgrid/lib/jquery-ui-1.9.2.js'
import 'slickgrid/lib/jquery.event.drag-2.3.0.js'
import 'slickgrid'
import 'slickgrid/slick.formatters.js'
import 'slickgrid/slick.grid.js'
import 'slickgrid/slick.dataview.js'



import _uniqueId from 'lodash-es/uniqueId';
import { ChartWrapper, ChartWrapper90 } from "../styledComponents";
import { ColConfig,  SubConfig } from "./ChartFactory";
import { containsGridSDcol } from "./AGrid";



export type GridConfig = {
    showFilters?: boolean,
    showPreheaderPanel?: boolean,
    showContextMenu?: boolean,
    pager?:string,
    frozenRow?: number,
    autosizeColumns?:boolean,
};

// THis is the target: https://ghiscoding.github.io/Angular-Slickgrid/#/trading
// These were the starting point:
//    http://6pac.github.io/SlickGrid/examples/example-grid-menu.html   - Used as start point
//    https://github.com/6pac/SlickGrid/blob/master/examples/example15-auto-resize.html  - paused this work as didn't work with react.
export default function SimpleGrid(props:{ srs: SmartRs | null, subConfig:SubConfig, onConfigChange?:(s:SubConfig)=>void }) {

    // id will be set once when the component initially renders, but never again
    // (unless you assigned and called the second argument of the tuple)
    const [id] = useState(_uniqueId('prefix-'));
    const [pagerid] = useState(_uniqueId('prefix-'));
    
    const gridRef = useRef(null);
    const dataViewRef = useRef(null);
    const allColNames = useRef<string[]>([]);
    const types = useRef<DataTypeMap>({});
    const columnFormattersRef = useRef<ColConfig>({});
    
    const srs = props.srs;
    const gc:GridConfig = { showPreheaderPanel:false, showFilters:false, frozenRow:1,  showContextMenu:true, pager:"0", autosizeColumns:false };
    
    const updateGrid = (forceRefresh = false) => {
      if(gridRef.current  && dataViewRef.current) {
  
        if(srs) {
          const newTypes = srs.rsdata.tbl.types;
          const newColNames = Object.keys(newTypes).filter(e => e !== "id");
          const notEqual = !isEqual(allColNames.current,newColNames) || !isEqual(types.current, newTypes) || !isEqual(columnFormattersRef.current, props.subConfig.colConfig);
          if(notEqual || forceRefresh) {
            console.log("updating columns");
            const columns = generateColDefs(newColNames, newTypes, srs.count(), props.subConfig.colConfig); // @ts-ignore
            dataViewRef.current.setItems([]);// @ts-ignore Have to remove items else when you set columns it will attempt to render old data with new formatters
            gridRef.current.setColumns(columns); 
            
            allColNames.current = [...newColNames];
            types.current = newTypes;
            columnFormattersRef.current = cloneDeep(props.subConfig.colConfig);
          }
          const n = props.srs ? props.srs.count() : 0;
        //   console.log("updating data");
          const dv = dataViewRef.current; // @ts-ignore
          dv.beginUpdate(); // @ts-ignore
          dv.setItems(srs.rsdata.tbl.data.map((e,i) => {e['id'] = n - i; return e})); // @ts-ignore
          dv.endUpdate(); // @ts-ignore
          gridRef.current.invalidate();
        }
      }
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
          
              frozenRow:gc.frozenRow ?? -1,
              enableAutoSizeColumns: gc.autosizeColumns,  
              explicitInitialization: true,  // don't initialize until we call .init(). Probably needed for burger menu.
              forceFitColumns: gc.autosizeColumns,
            //   columnPicker, - Have to disable this as it would need us to know the columns in advance currently.
            };
  
            // @ts-ignore
            const dataView = new Slick.Data.DataView();
            dataViewRef.current = dataView; // @ts-ignore
            const columns: { columnGroup: string; width: number; }[] = [];  // @ts-ignore
            const grid = gridRef.current = new Slick.Grid('#'+id, dataView, columns, options);   // @ts-ignore
            allColNames.current = []; // resetting these to force column redefine
            types.current = {};  // @ts-ignore                        
            
            // wire up model events to drive the grid
            dataView.onRowCountChanged.subscribe(function () {
                grid.updateRowCount();
                grid.render();
            });
        
            dataView.onRowsChanged.subscribe(function (e:any, args:{rows:number}) {
                grid.invalidateRows(args.rows);
                grid.render();
            });

            const myListener = debounce(function () {  updateGrid(true);               }, 100); 
            window.addEventListener('resize', myListener);
            
            grid.init();        
            grid.onColumnsResized.subscribe(function (scope:any, e:{triggeredByColumn: string, slickGrid:any}) {
                const w = grid.getColumns()[grid.getColumnIndex(e.triggeredByColumn)].width;
                setColumnWidth(e.triggeredByColumn, w);
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

    return <ChartWrapper className="grcontainer">
        
        {showPager ?  
             <><ChartWrapper90 id={id} style={{ width:"100%" }}></ChartWrapper90><div id={pagerid} style={{height:"20px", width:"99%"}}></div></>
            :<ChartWrapper id={id} style={{ width:"100%" }}></ChartWrapper>}
    </ChartWrapper>;
  }



export function generateColDefs(allColNames: string[], types: DataTypeMap, rowCount: number, colConfig:ColConfig) {
    // Columns that affect styling in a different column should NOT be shown
    const colsShown = allColNames.filter(colName => !containsGridSDcol(colName));
    const colDefs = colsShown.map((e, idx) => {
        // Useful to separate formatting of text and rendering. As other grids support that concept.
        // If we have both, we pipeline them ourselves.
        const colWidth = colConfig && e in colConfig && "colWidth" in colConfig[e] ? colConfig[e].colWidth : undefined;
        const p = e.toLowerCase().indexOf("_sd_");
        const name = p === -1 ? e : e.substring(0, p);
        const reName = get(colConfig,name+".name",name);
        //{id: 'duration', name: 'Duration', field: 'duration', resizable: false},
        const cd:any = {
            name: reName !== name ? reName : name,
            id: e,
            field: e,
            width: colWidth,
            cssClass: types[e] === "number" ? 'rightAligned' : undefined,
        };
        return cd;
    });
    return colDefs;
}

