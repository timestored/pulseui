import { Button, Card, Classes, Elevation, FormGroup, H3, Icon, InputGroup, Intent, Menu, MenuItem, NonIdealState, Overlay } from "@blueprintjs/core";
import { Alignment, Navbar, NavbarGroup, NavbarHeading } from '@blueprintjs/core';
import React, { Component, FunctionComponent, ReactNode, SyntheticEvent, useCallback, useContext, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import _uniqueId from 'lodash-es/uniqueId';
import { debounce } from "lodash-es";
import { Link } from "react-router-dom";
import QueryEngine from "../engine/queryEngine";
import { ServerConfig } from "./ConnectionsPage";
import ReactTooltip from "react-tooltip";
import { isAdmin, ThemeContext } from './../context';
import { Popover2 } from "@blueprintjs/popover2";
import { Logo } from "../App";
import { FallbackProps } from "../ErrorBoundary";



export type selOption = "connections" | "dashboard" | "help" | "sqleditor" | undefined;
export const MyNavBar: FunctionComponent<{ rightChildren?: React.ReactNode, children?: React.ReactNode, selected?: selOption }> =
  ({ rightChildren = undefined, children = undefined, selected = undefined }) => {

    const context = useContext(ThemeContext);
    const isSel = (selOpt: selOption): Intent => { return selected === selOpt ? "success" : "none" };

    return (
      <div id="myNavBar">
      <Navbar className={"topNavBar" + (context.theme === "dark" ? " " : " ")} >
        <NavbarGroup align={Alignment.LEFT} className="leftNavbarGroup">
          <Link to="/dash"><NavbarHeading><Logo /></NavbarHeading></Link>
          <Link to="/dash"><Button icon="dashboard" text="Dashboards" minimal={true} intent={isSel("dashboard")} title="Dashboards" /></Link>
          <Link to="/sqleditor"><Button icon="database" minimal={true} text="SQL Editor" intent={isSel("sqleditor")} title="SQL Editor" /></Link>
          {isAdmin(context) && <Link to="/connections"><Button icon="globe-network" minimal={true} text="Connections" intent={isSel("connections")} title="Connections" /></Link>}
          
          {children}
        </NavbarGroup>
        <NavbarGroup align={Alignment.RIGHT} className="rightNavBar">
          {rightChildren}
          <UserButton isAdmin={isAdmin(context)} username={context.login?.username} />
          {/* <Button icon="notifications" minimal title="You have no new notifications" /> */}
          {/* eslint-disable-next-line react/jsx-no-target-blank */}
          <a href="http://timestored.com/pulse/help/?utm_source=pulse&utm_medium=app&utm_campaign=pulse" target="_blank"><Button icon="help" intent={isSel("help")} minimal /></a>
        </NavbarGroup>
      </Navbar>
      </div>);
  }

  

function UserButton(props:{username:string | undefined, isAdmin:boolean}) {
  const [menuShown, setMenuShown] = useState(false);
  
  if(props.username) {
      return <Popover2 isOpen={menuShown} placement="bottom" onInteraction={(state)=>setMenuShown(state)}  
          content={
          <Menu>
            <Link to="/rlogout"><MenuItem icon="log-out"  text="Log out" /> </Link>
            {props.isAdmin && <Link to="/user"><MenuItem icon="user"  text="Users" /></Link>}
          </Menu>}>
          <Button icon="user" minimal onClick={()=>setMenuShown(true)}>{props.username}</Button>
        </Popover2>;
  }
  return <Link to="/rlogin"><Button icon="log-in" minimal>Login</Button></Link>;
}


  export function MyOverlay(props: { isOpen: boolean, handleClose: () => void, title: string, children?: React.ReactNode }) {
    return  <Overlay isOpen={props.isOpen} className={Classes.OVERLAY_SCROLL_CONTAINER} onClose={props.handleClose}>
        <Card elevation={Elevation.FOUR} style={{width:"600px",left:"calc(50vw - 300px)", top:"100px"}} >
            <H3>{props.title}</H3>
             {props.children}
         </Card>
         </Overlay>
  }



class Modal extends Component<{ children: React.ReactNode }> {
  el: Element;
  modalRoot: Element | null;
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.modalRoot = document.getElementById('editor2');
    this.el = document.createElement('div');
  }

  componentDidMount() {
    this.modalRoot?.appendChild(this.el);
  }

  componentWillUnmount() {
    this.modalRoot?.removeChild(this.el);
  }

  render() {
    return ReactDOM.createPortal(
      this.props.children,
      this.modalRoot!,
    );
  }
}


export function addParameter(url:string, parameterName:string, parameterValue:string, atStart:boolean = false):string {
  let replaceDuplicates = true;
let urlhash = '';
let cl = url.length;
  if(url.indexOf('#') > 0) {
      cl = url.indexOf('#');
      urlhash = url.substring(url.indexOf('#'),url.length);
  }
  let sourceUrl = url.substring(0,cl);

  var urlParts = sourceUrl.split("?");
  var newQueryString = "";

  if (urlParts.length > 1) {
      var parameters = urlParts[1].split("&");
      for (var i=0; (i < parameters.length); i++) {
          var parameterParts = parameters[i].split("=");
          if (!(replaceDuplicates && parameterParts[0] === parameterName)) {
      newQueryString = newQueryString === "" ? "?" : newQueryString+"&";
              newQueryString += parameterParts[0] + "=" + (parameterParts[1]?parameterParts[1]:'');
          }
      }
  }
  if (newQueryString === "")
      newQueryString = "?";

  if(atStart){
      newQueryString = '?'+ parameterName + "=" + parameterValue + (newQueryString.length>1?'&'+newQueryString.substring(1):'');
  } else {
      if (newQueryString !== "" && newQueryString !== '?')
          newQueryString += "&";
      newQueryString += parameterName + "=" + (parameterValue?encodeURIComponent(parameterValue):'');
  }
  return urlParts[0] + newQueryString + urlhash;
};


MyModal.defaultProps = {
  isOpen: true,
  title: ""
};
export function MyModal(props: { className?:string, isOpen?: boolean, handleClose: () => void, title?: string, children?: React.ReactNode }) {
  // Letting it bubble up, would cause the widget to become selected again.
  const doClose = (event: SyntheticEvent<HTMLElement, Event>) => { props.handleClose(); event.stopPropagation(); }
  return <>
    <Modal>
      <div className={"mydrawer " + (props.className || "") }>
        <h2><Button icon="arrow-right" minimal small onClick={doClose} />&nbsp;{props.title}
          <Button className="drawerClose" intent="danger" icon="cross" minimal onClick={doClose} />
        </h2>
        <div className="drawerFormWrapper">
          <div className="drawerForm">{props.children} </div>
        </div>
      </div>
    </Modal>
  </>
}


export function getDefaultErrorFallback(message:ReactNode | string | undefined = undefined):React.ComponentType<FallbackProps> {
  return ({error, resetErrorBoundary}:FallbackProps) => (
          <NonIdealState icon="error" title="Render Error">
            {message === undefined ? <h1>Sorry.. there was an error</h1> : ((typeof message === "string") ? <h1>{message}</h1> : message)}
            <Button onClick={resetErrorBoundary} icon="reset">Try again</Button>
          </NonIdealState>
      );
}

type sitepage = "/help/forms" | "/help" | "/help/chart";
export function MyHelpLink(props: { htmlTxt: string, href: sitepage }) {
  return <HelpLink htmlTxt={props.htmlTxt} href={props.href} />;
}

export function HelpLink(props: { htmlTxt: string, href: string }) {
  return <a href={props.href} target="_blank" rel="noreferrer" className="MyHelpLink" title="form help link">
    <Icon icon="help" intent="primary" data-class="tooltipp" data-tip={props.htmlTxt} style={{ float: "right" }} />
    <ReactTooltip type="info" html />
  </a>
}



type MyInputTypes = {
  name: string, label: string, value: string | undefined, placeholder?: string,
  onChange?: (e: React.FormEvent<HTMLInputElement>) => void, type?: string
};
/** Displays an input text box , triggers on every change and can be directly mapped to states with the same name. */
export function MyInput(props: MyInputTypes) {
  const [id] = useState(_uniqueId('pfx-'));
  const { name, label, value, placeholder, onChange, type } = props;
  return <FormGroup label={label} labelFor={id} inline>
    <InputGroup id={id} name={name} value={value ? value : ""} placeholder={placeholder}
      onChange={onChange} type={type} />
  </FormGroup>;
}


/** 
 * Displays an input text box , triggers only when complete. i.e. When blurred or enter pressed. 
 * This is very useful to prevent constant updating of fields that would be costly. e.g. Modifying the SQL queries sent
 */
type UncontrolledInputTypes = { name: string, label: string, value: string | undefined, placeholder?: string, onComplete: (txt: string) => void, forcedPrefix?:string };

export function UncontrolledInput(props: UncontrolledInputTypes & {permittedRegex?:RegExp}) {
  const [id] = useState(_uniqueId('pfx-'));
  const { name, label, placeholder, onComplete } = props;
  const [val, setVal] = useState(props.value ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reportComplete = useCallback(debounce(val => onComplete(val), 2000), []);
  const restrictInput = (s:string) => {
    const prefixOK = props.forcedPrefix === undefined || s.startsWith(props.forcedPrefix);
    if(prefixOK && (props.permittedRegex === undefined || props.permittedRegex.test(s))) { 
      setVal(s); 
      reportComplete(s) 
    }
  }
  return <FormGroup label={label} labelFor={id} inline>
    <InputGroup id={id} name={name} placeholder={placeholder}
      onChange={(e) => restrictInput(e.currentTarget.value)}  value={val} onBlur={(e) => onComplete(val)}
      onKeyDown={(e) => { if (e.key === 'Enter') { onComplete(val); } }} />
  </FormGroup>;
}

export function KeyParamInput(props: UncontrolledInputTypes) {
  return <UncontrolledInput { ...props}  permittedRegex={/^[A-Za-z0-9-_]+$/}  />;
}

export interface WidgetProperties<T> {
  setConfigSaver: (callback: () => any) => void,
  selected: boolean,
  clearSelected: () => void,
  savedState: T | undefined,
  queryEngine: QueryEngine,
  serverConfigs: ServerConfig[],
}


export function useInterval1(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback)
  // Remember the latest callback if it changes.
  useEffect(() => { savedCallback.current = callback }, [callback]);

  // Set up the interval.
  useEffect(() => {
    // Don't schedule if no delay is specified.
    if (delay === null) { return }
    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}


type Delay = number | null;
type TimerHandler = (...args: any[]) => void;


/**
 * Provides a declarative useInterval
 * Source: https://github.com/donavon/use-interval
 * @param callback - Function that will be called every `delay` ms.
 * @param delay - Number representing the delay in ms. Set to `null` to "pause" the interval.
 */
export const useInterval = (callback: TimerHandler, delay: Delay) => {
  const savedCallbackRef = useRef<TimerHandler>();

  useEffect(() => {
    savedCallbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handler = (...args: any[]) => savedCallbackRef.current!(...args);

    if (delay !== null) {
      const intervalId = setInterval(handler, delay);
      return () => clearInterval(intervalId);
    }
  }, [delay]);
};

export default useInterval;