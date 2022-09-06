import React, { useState } from 'react';
import { WidgetProperties } from './CommonComponents';
import  { QueryEngineAdapter } from './../engine/queryEngine';
import { HTMLTable } from '@blueprintjs/core';
import { useEffect } from 'react';

const  AVariables = (props:WidgetProperties<null>, state:{argMap:{[argKey:string]:string[]}}) => {

    const [argMap, setArgMap] = useState(props.queryEngine.argMap);
    useEffect(() => {
        props.queryEngine.addListener(new class extends QueryEngineAdapter {
            argChange(key: string, newValue: any): void {
                setArgMap(props.queryEngine.argMap);
            }
        }());
    },[props.queryEngine]);

    return (<div><HTMLTable bordered interactive condensed>
            <thead><tr><th>Key</th><th>Value(s)</th></tr></thead>
            <tbody>{argMap &&  Object.keys(argMap).map(s => <tr key={s}><th>{s}</th><td>{argMap[s].join(",")}</td></tr>)}</tbody>
        </HTMLTable></div>);
}
export default AVariables;