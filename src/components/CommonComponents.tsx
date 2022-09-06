import { Button, Card, Classes, Drawer, DrawerSize, Elevation, FormGroup, H3, Icon, InputGroup, Intent, Menu, MenuItem, Overlay } from "@blueprintjs/core";
import { Alignment, Navbar, NavbarDivider, NavbarGroup, NavbarHeading } from '@blueprintjs/core';
import React, { Component, ErrorInfo, FunctionComponent, ReactNode, SyntheticEvent, useCallback, useContext, useEffect, useRef, useState } from "react";
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



export type selOption = "connections" | "dashboard" | "help" | "sqleditor" | undefined;
export const MyNavBar: FunctionComponent<{ rightChildren?: React.ReactNode, children?: React.ReactNode, selected?: selOption }> =
  ({ rightChildren = undefined, children = undefined, selected = undefined }) => {

    const context = useContext(ThemeContext);
    const isSel = (selOpt: selOption): Intent => { return selected === selOpt ? "success" : "none" };

    return (
      <div id="myNavBar">
      <Navbar className={"topNavBar" + (context.theme === "dark" ? " " : " ")} >
        <NavbarGroup align={Alignment.LEFT} className="leftNavbarGroup">
          <Link to="/"><NavbarHeading><Logo light/></NavbarHeading></Link>
          <NavbarDivider />
          <Link to="/dash"><Button icon="dashboard" text="Dashboards" minimal={true} intent={isSel("dashboard")} title="Dashboards" /></Link>
          <Link to="/sqleditor"><Button icon="database" minimal={true} text="SQL Editor" intent={isSel("sqleditor")} title="SQL Editor" /></Link>
          {isAdmin(context) && <Link to="/connections"><Button icon="globe-network" minimal={true} text="Connections" intent={isSel("connections")} title="Connections" /></Link>}
          <NavbarDivider />
          {children}
        </NavbarGroup>
        <NavbarGroup align={Alignment.RIGHT}>
          {rightChildren}
          <UserButton isAdmin={isAdmin(context)} username={context.login?.username} />
          <Button icon="notifications" minimal title="You have no new notifications" />
          <Link to="/help"><Button icon="help" intent={isSel("help")} minimal /></Link>
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
            <Link to="/logout"><MenuItem icon="log-out"  text="Log out" /> </Link>
            {props.isAdmin && <Link to="/user"><MenuItem icon="user"  text="Users" /></Link>}
          </Menu>}>
          <Button icon="user" minimal onClick={()=>setMenuShown(true)}>{props.username}</Button>
        </Popover2>;
  }
  return <Link to="/login"><Button icon="log-in" minimal>Login</Button></Link>;
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

MyModal.defaultProps = {
  isOpen: true,
  title: ""
};
export function MyModal(props: { isOpen?: boolean, handleClose: () => void, title?: string, children?: React.ReactNode }) {
  // Letting it bubble up, would cause the widget to become selected again.
  const doClose = (event: SyntheticEvent<HTMLElement, Event>) => { props.handleClose(); event.stopPropagation(); }
  return <>
    <Modal>
      <div className="mydrawer">
        <h2><Button icon="arrow-left" minimal onClick={doClose} />&nbsp;{props.title}
          <Button className="drawerClose" intent="danger" icon="cross" minimal onClick={doClose} />
        </h2>
        <div className="drawerFormWrapper">
          <div className="drawerForm">{props.children} </div>
        </div>
      </div>
    </Modal>
  </>
}

export function MyDrawer(props: { isOpen: boolean, handleClose: () => void, title: string, children?: React.ReactNode }) {
  // Letting it bubble up, would cause the widget to become selected again.
  const doClose = (event: SyntheticEvent<HTMLElement, Event>) => { props.handleClose(); event.stopPropagation(); }

  return <>
    <Drawer position="bottom" size={DrawerSize.STANDARD} canEscapeKeyClose
      canOutsideClickClose hasBackdrop={false} isOpen={props.isOpen} onClose={doClose}>
      <div className="mydrawer">
        <h2><Button icon="arrow-left" minimal onClick={props.handleClose} />&nbsp;{props.title}
          <Button className="drawerClose" intent="danger" icon="cross" minimal onClick={props.handleClose} />
        </h2>
        <div className="drawerForm">{props.children} </div>
      </div>
    </Drawer>
  </>
}

interface ErState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode | null, message?: ReactNode }, ErState> {
  public state: ErState = { hasError: false };

  public static getDerivedStateFromError(_: Error): ErState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.message ?? <h1>Sorry.. there was an error</h1>;
    }
    return this.props.children;
  }
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
type MyUncontrolledInputTypes = { name: string, label: string, value: string | undefined, placeholder?: string, onComplete: (txt: string) => void };
export function MyUncontrolledInput(props: MyUncontrolledInputTypes) {
  const [id] = useState(_uniqueId('pfx-'));
  const { name, label, placeholder, onComplete } = props;
  const [val, setVal] = useState(props.value ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reportComplete = useCallback(debounce(val => onComplete(val), 2000), []);

  return <FormGroup label={label} labelFor={id} inline>
    <InputGroup id={id} name={name} placeholder={placeholder}
      onChange={(e) => { setVal(e.currentTarget.value); reportComplete(e.currentTarget.value) }} value={val} onBlur={(e) => onComplete(val)}
      onKeyDown={(e) => { if (e.key === 'Enter') { onComplete(val); } }} />
  </FormGroup>;
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