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
 
import { DataTypes } from "../engine/chartResultSet";

import _uniqueId from 'lodash-es/uniqueId';
import SFormatters from "./SFormatters";
import { GridclmConfig } from "../components/AGrid";

export type FilterType = "Equals"
export function FilterMenu(props:{x:number, y:number, selected:FilterType|undefined, selectionMade: (filterType:FilterType) => void; }) {
    return <></>;
}

export function FooterMenu(props: {
    x: number;
    y: number;
    colName: string;
    dataType: string;
    currentAggregation?: string;
    selectionMade: (aggregationType: string) => void;
}) {
    const aggregationOptions = [
        { value: "none", label: "None", description: "No aggregation" },
        { value: "count", label: "Count", description: "Count of non-empty values" },
        { value: "unique", label: "Unique Count", description: "Count of unique values" },
        ...(props.dataType === "number" ? [
            { value: "sum", label: "Sum", description: "Sum of all values" },
            { value: "avg", label: "Average", description: "Average of all values" },
            { value: "min", label: "Min", description: "Minimum value" },
            { value: "max", label: "Max", description: "Maximum value" }
        ] : [
            { value: "min", label: "Min", description: "Minimum value" },
            { value: "max", label: "Max", description: "Maximum value" }
        ])
    ];

    return (
        <div className="footer-menu" style={{ 
            position: 'absolute', 
            top: props.y, 
            left: props.x, 
            backgroundColor: 'white', 
            border: '1px solid #ccc',
            boxShadow: '2px 2px 8px rgba(0,0,0,0.15)',
            borderRadius: '4px',
            padding: '8px 0',
            minWidth: '180px',
            zIndex: 1000
        }}>
            <div style={{ padding: '8px 12px', fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
                {props.colName} Aggregation
            </div>
            {aggregationOptions.map(option => (
                <div
                    key={option.value}
                    className="footer-menu-item"
                    style={{
                        padding: '6px 12px',
                        cursor: 'pointer',
                        backgroundColor: props.currentAggregation === option.value ? '#e3f2fd' : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = props.currentAggregation === option.value ? '#e3f2fd' : 'transparent';
                    }}
                    onClick={() => props.selectionMade(option.value)}
                >
                    <div style={{ fontWeight: '500' }}>{option.label}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>{option.description}</div>
                </div>
            ))}
        </div>
    );
}


export function getFilterResult(ft: string, filter: string, val: any) {
  return true;
}


export function getSlickFormatter(colNameUsed:string, dataType:DataTypes, gc:GridclmConfig) {
    // Pipeline with separate responsibilities to allow sensible nesting/cascading. 
    // formatter(CONTENT) -> TEXT -> render(TEXT) -> HTML -> cellRender(HTML) -> SPAN
    // [cssClass:(aligned|bold,  [ span?(class|bg/fg=, [render(tag/sparkline, [formatter(code|number|percent, CONTENT):txt] ):html] :span] ]

    // Useful to separate formatting of text and rendering. As other grids support that concept.
    // If we have both, we pipeline them ourselves.
    const formatter = SFormatters.getFormatter(colNameUsed, dataType);
    const renderer = SFormatters.getRenderer(colNameUsed);
    const slickFormatter = (row:number, cell:number, value:any, columnDef:any, dataContext:any) => {
        let v = formatter(row, cell, value, columnDef, dataContext);
        v = renderer ? renderer(row, cell, v, columnDef, dataContext) : v;
        return v;
      };
      return slickFormatter;
}

 export function doSparkLines(theme:"light"|"dark") {}



export function createAddlHeaderRow(grid:any, columns:Array<{columnGroup:string, width:number}>) {}

export function calculateFooterValue(columnId: string, dataType: DataTypes, data: any[], aggregationType?: string): string {
  if (data.length === 0) return "";
  
  const values = data.map(row => row[columnId]).filter(val => val !== null && val !== undefined);
  
  if (values.length === 0) return "";
  
  // If no aggregation type specified, use smart defaults
  if (!aggregationType || aggregationType === "auto") {
    if (dataType === "number") {
      if (columnId.toLowerCase().includes("price") || 
          columnId.toLowerCase().includes("rate") || 
          columnId.toLowerCase().includes("ratio") ||
          columnId.toLowerCase().includes("avg") ||
          columnId.toLowerCase().includes("mean")) {
        aggregationType = "avg";
      } else {
        aggregationType = "sum";
      }
    } else {
      aggregationType = "count";
    }
  }
  
  switch (aggregationType) {
    case "sum": {
      if (dataType === "number") {
        const sum = values.reduce((sum, val) => sum + Number(val), 0);
        return `Sum: ${sum.toLocaleString()}`;
      }
      return "";
    }
    
    case "avg": {
      if (dataType === "number") {
        const avg = values.reduce((sum, val) => sum + Number(val), 0) / values.length;
        return `Avg: ${avg.toFixed(2)}`;
      }
      return "";
    }
    
    case "count":
      return `Count: ${values.length}`;
    
    case "unique": {
      const uniqueValues = new Set(values).size;
      return `Unique: ${uniqueValues}`;
    }
    
    case "min": {
      if (dataType === "number") {
        const min = Math.min(...values.map(v => Number(v)));
        return `Min: ${min.toLocaleString()}`;
      } else if (dataType === "date" || dataType === "datetime") {
        const min = new Date(Math.min(...values.map(v => new Date(v).getTime())));
        return `Min: ${min.toLocaleDateString()}`;
      } else {
        const min = values.sort()[0];
        return `Min: ${min}`;
      }
    }
    
    case "max": {
      if (dataType === "number") {
        const max = Math.max(...values.map(v => Number(v)));
        return `Max: ${max.toLocaleString()}`;
      } else if (dataType === "date" || dataType === "datetime") {
        const max = new Date(Math.max(...values.map(v => new Date(v).getTime())));
        return `Max: ${max.toLocaleDateString()}`;
      } else {
        const max = values.sort().reverse()[0];
        return `Max: ${max}`;
      }
    }
    
    case "none":
      return "";
    
    default:
      return `Count: ${values.length}`;
  }
}

export function updateFooterRow(grid: any, columns: any[], data: any[], types: any, footerConfig?: any) {
  if (!grid || !grid.getFooterRowColumn) return;
  
  columns.forEach(column => {
    const columnElement = grid.getFooterRowColumn(column.id);
    if (columnElement) {
      const aggregationType = footerConfig && footerConfig[column.id] ? footerConfig[column.id] : "auto";
      const footerValue = calculateFooterValue(column.id, types[column.id], data, aggregationType);
      columnElement.textContent = footerValue;
      
      // Add clickable styling and data attributes
      if (!columnElement.classList.contains('footer-clickable')) {
        columnElement.classList.add('footer-clickable');
        columnElement.title = "Click to change aggregation type";
        columnElement.setAttribute('data-column-id', column.id);
      }
    }
  });
}