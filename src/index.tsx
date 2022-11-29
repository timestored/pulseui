import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { HotkeysProvider } from "@blueprintjs/core";

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  // Strict mode turned off to allow caplin flexlayout popouts to work for now. 
  // <React.StrictMode> 
  <HotkeysProvider>
    <App />
    </HotkeysProvider>
  // </React.StrictMode>
);


// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
