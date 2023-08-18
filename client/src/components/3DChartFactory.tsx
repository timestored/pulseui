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
  
import 'echarts-gl';
import { ThemeType } from '../context';
import { SmartRs } from '../engine/chartResultSet';
import { carefulOverride, ChartHelp, getThmT, getTooltipDefaults, needs, SubConfig } from './ChartFactory';
import ReactECharts from '../echarts-for-react';
import { Component } from 'react';

export default class ESurface extends Component<{ srs: SmartRs, theme:ThemeType, chartType:"3dsurface"|"3dbar", subConfig:SubConfig}> {
    toSurfaceOption(srs: SmartRs, theme: ThemeType): any {
        const ncs = srs.chartRS.numericColumns;
        const isBar = this.props.chartType === "3dbar";

        const data = [];
        for(let i=0; i<srs.count(); i++) {
            data.push([ncs[0].vals[i],ncs[1].vals[i],ncs[2].vals[i]]);
        }
        const min = Math.min(...ncs[2].vals);
        const max = Math.max(...ncs[2].vals);

        const c = theme === "dark" ? "#EEE" : undefined;
        const axisCfg = {
            type: 'value',
            axisLabel:{color:c} ,
            axisTick:{  lineStyle:{ color:c, }},
            axisLine:{  lineStyle:{ color:c, }} 
        };

        const option = {
            tooltip: { ...getTooltipDefaults(theme)},
          visualMap: { show: false, min, max,
            inRange: { color: [ '#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026' ] }
          },
          xAxis3D: { ...axisCfg, name:ncs[0].name },
          yAxis3D: { ...axisCfg, name:ncs[1].name },
          zAxis3D: { ...axisCfg, name:ncs[2].name },
          grid3D: { viewControl: {/* projection: 'orthographic' */ } },
          series: [ { 
            type: isBar ? 'bar3D' : 'surface', 
            wireframe: { /* show: false */ },  
            data }]
        };
        return option; 
    }
    

    render() {
        const { srs, theme, chartType } = this.props;
        const s = needs({srs:this.props.srs, needsNumbers:3});
        if(s !== null) { 
            return <ChartHelp chartType={chartType} reason={s} /> 
        }
        try {
            return <ReactECharts option={carefulOverride(this.toSurfaceOption(srs, theme), this.props.subConfig)} theme={getThmT(theme)} notMerge />;
        } catch {
            return <ChartHelp chartType={chartType} />
        }
    }
}
