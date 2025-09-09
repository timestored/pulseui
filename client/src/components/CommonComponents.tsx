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
 
import { Button, Card, Classes, Elevation, FormGroup, H3, Icon, InputGroup, Intent, Menu, MenuItem, NonIdealState, Overlay } from "@blueprintjs/core";
import { Alignment, Navbar, NavbarGroup, NavbarHeading } from '@blueprintjs/core';
import React, { Component, FunctionComponent, ReactNode, SyntheticEvent, useCallback, useContext, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import _uniqueId from 'lodash-es/uniqueId';
import { debounce, get } from "lodash-es";
import { Link } from "react-router-dom";
import QueryEngine from "../engine/queryEngine";
import { ServerConfig } from "./ConnectionsPage";
import ReactTooltip from "react-tooltip";
import { isAdmin, ThemeContext } from './../context';
import { Popover2 } from "@blueprintjs/popover2";
import { Logo } from "../App";
import { FallbackProps } from "../ErrorBoundary";
import { TimezoneSelect } from "@blueprintjs/datetime2";
import useLocalStorage from "./hooks";



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
          <Link to="/dash"><Button icon="dashboard" text="Dashboards" minimal={true} intent={isSel("dashboard")} title="Dashboards" className="nav-dashboards-button" data-testid="nav-dashboards" /></Link>
          <Link to="/sqleditor"><Button icon="database" minimal={true} text="SQL" intent={isSel("sqleditor")} title="SQL Editor" className="nav-sql-editor-button" data-testid="nav-sql-editor" /></Link>
          {isAdmin(context) && <Link to="/connections"><Button icon="globe-network" minimal={true} text="Connections" intent={isSel("connections")} title="Connections" className="nav-connections-button" data-testid="nav-connections" /></Link>}
          
          {children}
        </NavbarGroup>
        <NavbarGroup align={Alignment.RIGHT} className="rightNavBar">
          {rightChildren}
          <UserButton isAdmin={isAdmin(context)} username={context.login?.username} />
          {/* <Button icon="notifications" minimal title="You have no new notifications" /> */}
          {/* eslint-disable-next-line react/jsx-no-target-blank */}
          <HelpButton isAdmin={isAdmin(context)} />
        </NavbarGroup>
      </Navbar>
      </div>);
  }

  

function HelpButton(props:{isAdmin:boolean}) {
  const [menuShown, setMenuShown] = useState(false);
  const version = get(window,"pulseconfig.version","unknown") as unknown as string;

    return <Popover2 isOpen={menuShown} placement="bottom-end" onInteraction={(state)=>setMenuShown(state)}  interactionKind="hover" hoverOpenDelay={0}
        content={
        <Menu>
          {/* eslint-disable-next-line react/jsx-no-target-blank */}
          <a href="https://www.timestored.com/pulse/help/?utm_source=pulse&utm_medium=app&utm_campaign=pulse" target="_blank"><MenuItem icon="share"  text="Help" /></a>  {/* eslint-disable-next-line react/jsx-no-target-blank */}
          <a href="https://www.timestored.com/contact/?subject=PulseHelp&details=Hi&utm_source=pulse&utm_medium=app&utm_campaign=pulse" target="_blank"><MenuItem icon="third-party"  text="Support" /></a> {/* eslint-disable-next-line react/jsx-no-target-blank */}
          <a href="mailto:pulse-support@timestored.com" target="_blank"><MenuItem icon="envelope"  text="Email" /></a>  {/* eslint-disable-next-line react/jsx-no-target-blank */}
          <a href="https://www.timestored.com/pulse/help/release-changes?utm_source=pulse&utm_medium=app&utm_campaign=pulse" target="_blank"><MenuItem text={"Version "+version} /></a>
        </Menu>}>
        <Button icon="help" minimal className="nav-help-button" data-testid="nav-help" />
      </Popover2>;
}



function UserButton(props:{username:string | undefined, isAdmin:boolean}) {
  const [menuShown, setMenuShown] = useState(false);
  const [timezone, setTimezone] = useLocalStorage("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone); // THis default and any other occurrences must be the same
  
  if(props.username) {
      return <Popover2 isOpen={menuShown} placement="bottom-end" onInteraction={(state)=>setMenuShown(state)}   interactionKind="hover" hoverOpenDelay={0}
          content={
          <Menu>
            <Link to="/rlogout"><MenuItem icon="log-out"  text="Log out" /> </Link>
            {props.isAdmin && <Link to="/user"><MenuItem icon="user"  text="Users" /></Link>}
            {props.isAdmin && <Link to="/settings"><MenuItem icon="cog"  text="Settings" /></Link>}
            <TimezoneSelect value={timezone} onChange={tz=>setTimezone(tz)} showLocalTimezone />
          </Menu>}>
          <Button icon="user" minimal className="nav-user-button" data-testid="nav-user">{props.username}</Button>
        </Popover2>;
  }
  return <Link to="/rlogin"><Button icon="log-in" minimal className="nav-login-button" data-testid="nav-login">Login</Button></Link>;
}


  export function MyOverlay(props: { isOpen: boolean, handleClose: () => void, title?: string, children?: React.ReactNode, width?:number }) {
    const w = props.width ?? 600;
    return  <Overlay isOpen={props.isOpen} className={Classes.OVERLAY_SCROLL_CONTAINER} onClose={props.handleClose}>
        <Card elevation={Elevation.FOUR} style={{width:w+"px",left:"calc(50vw - " + (w/2) + "px)", top:"100px"}} >
            {props.title && <H3>{props.title}</H3>}
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


export function addParameter(url:string, parameterName:string, parameterValue:string):string {
  let urlhash = '';
  let cl = url.length;
  if(url.indexOf('#') > 0) {
      cl = url.indexOf('#');
      urlhash = url.substring(url.indexOf('#'),url.length);
  }
  const sourceUrl = url.substring(0,cl);

  const urlParts = sourceUrl.split("?");
  let newQueryString = "";

  const pNam = parameterName ? encodeURIComponent(parameterName) : '';
  if (urlParts.length > 1) {
    const parameters = urlParts[1].split("&");
      for (let i=0; (i < parameters.length); i++) {
          const parameterParts = parameters[i].split("=");
          if (!(parameterParts[0] === pNam)) {
              newQueryString = newQueryString === "" ? "?" : newQueryString+"&";
              newQueryString += parameterParts[0] + "=" + (parameterParts[1]?parameterParts[1]:'');
          }
      }
  }
  if (newQueryString === "")
      newQueryString = "?";

  const pVal = (parameterValue ? encodeURIComponent(parameterValue) : '');
  if (newQueryString !== "" && newQueryString !== '?')
      newQueryString += "&";
  newQueryString += pNam + "=" + pVal;
  return urlParts[0] + newQueryString + urlhash;
}


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

type sitepage = "help/forms" | "help" | "help/chart" | "help/dynamic-html";
export function MyHelpLink(props: { htmlTxt: string, href: sitepage }) {
  return <HelpLink htmlTxt={props.htmlTxt} href={"https://www.timestored.com/pulse/" + props.href} />;
}

export function HelpLink(props: { htmlTxt: string, href: string }) {
  return <a href={props.href} target="_blank" rel="noreferrer" className="MyHelpLink" title="form help link">
    <Icon icon="help" intent="primary" data-class="tooltipp" data-tip={props.htmlTxt} style={{ float: "right" }} />
    <ReactTooltip type="info" html />
  </a>
}



type MyInputTypes = {
  name: string, label: string, value: string | undefined, placeholder?: string, disabled?: boolean, size?: number,
  onChange?: (e: React.FormEvent<HTMLInputElement>) => void, type?: string
};
/** Displays an input text box , triggers on every change and can be directly mapped to states with the same name. */
export function MyInput(props: MyInputTypes) {
  const [id] = useState(_uniqueId('pfx-'));
  const { name, label, value, placeholder, onChange, type } = props;
  return <FormGroup label={label} labelFor={id} inline>
    <InputGroup id={id} name={name} value={value ? value : ""} placeholder={placeholder}
      onChange={onChange} type={type} disabled={props.disabled} size={props.size} />
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