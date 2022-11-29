import React, { Component } from 'react';
import { WidgetProperties } from './CommonComponents';


type CounterState = {  value:number }

export default class Counter extends Component<CounterState & WidgetProperties<CounterState>,CounterState> {
    static defaultProps = { value:100 };

    constructor(props:any) {
        super(props);
        this.state = { value:this.props.savedState?.value ?? this.props.value };
        this.props.setConfigSaver(() => this.state);
    }

    render() { 
        return <div>
                <h1>Counter: hello world {this.formatCount()}</h1>
                <button onClick={() => this.handleInc(1) } >Inc</button>
                <button onClick={() => this.handleInc(-2)} >Dec</button>
            </div>
    }
    
    handleInc = (n:number):void => {
        this.setState({ value: this.state.value + n })
    }

    formatCount() {
        return this.state.value === 0 ? "zero" : this.state.value;
    }
}