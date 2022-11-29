import React from "react";
import desktopModel from './components/Workspace';
import { INotyfOptions, Notyf } from 'notyf';
import 'notyf/notyf.min.css'; // for React, Vue and Svelte
import { LoginResponse } from "./auth";

export const desktop = new desktopModel("foo");
export const WorkspaceContext = React.createContext({ desktop: desktop, selectedNode: "" });
export const notyf = new Notyf({types:[{type:"info", className:"infoNotyfy", background:"transparent", icon:{}}]});
export const isDEV = true;


export type ThemeType = "light" | "dark";
export type IThemeType = { theme: ThemeType, login:LoginResponse | undefined }
export const ThemeContext = React.createContext<IThemeType>({ theme: 'light',login:undefined});
ThemeContext.displayName = 'ThemeContext';
export function isAdmin(context:IThemeType) { return context?.login?.roles?.includes("ADMIN") ? true : false; };

export function topNotyf(msg:string, opts?: Partial<INotyfOptions>) {
    notyf.success({type:"info",position:{y:"top",x:"center"},message:msg})
}