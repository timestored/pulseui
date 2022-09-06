/* eslint-disable import/first */
import React, { useEffect, useMemo, useContext } from 'react';
import './App.scss';
import $ from 'jquery';
// @ts-ignore
window.jQuery = $; window.$ = $; global.jQuery = $

import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import ConnectionsPage from './components/ConnectionsPage';
import DashboardPage from './components/DashboardPage';
import { MyNavBar, selOption } from './components/CommonComponents';
import HelpPage, { DemoChartForHomepage } from './components/HelpPage';
import DashPage, { DashHistoryPage } from './components/DashPage';
import TestPage from './components/TestPage';
import SqlEditorPage from './components/SqlEditorPage';
import { ThemeContext, ThemeType } from './context';
import { Button,Icon,useHotkeys } from '@blueprintjs/core';
import ScreengrabberPage from './components/ScreengrabberPage';
import { useNavigate } from 'react-router-dom';
import useLocalStorage from './components/hooks';
import Analytics from 'analytics';
import { SERVER } from './engine/queryEngine';
import axios from 'axios';
import { LoginPage, LoginResponse } from './auth';
import UserPage from './components/UserPage';
import DashReportPage from './components/DashReportPage';


const myPlugin = {
  name: 'c', //@ts-ignore
  page: ({ payload }) => {
    const { meta, properties, anonymousId, userId } = payload;
    try {
      axios && axios.post(SERVER + "/analytics/page", { date: meta.ts, url: properties.url, path: properties.path, search: properties.search, anonymousId: anonymousId, userId: userId, });
    } catch {}
  },//@ts-ignore
  track: ({ payload }) => {
    const { meta, properties, anonymousId, userId, event } = payload;
    axios.post(SERVER + "/analytics/event", { date: meta.ts, event:event, anonymousId: anonymousId, userId: userId, ...properties });
  },
}
export const analytics = Analytics({ app: 'Pulse', debug:true, plugins: [myPlugin] })

export const ANAME = "Pulse"
export const aNAME = "pulse"

export function Logo(props:{light?:boolean}) { 
  const context = useContext(ThemeContext);
  let showLight = context.theme === "dark";
  if(props.light !== undefined) {
    showLight = props.light;
  }
  return <img src={(showLight ? "/img/logo-white.png" : "/img/logo.png")} width="134" height="37" alt={ANAME} />; 
}

export function isBorderless() { return window.location.search.toLowerCase().indexOf("noborder") >= 0 };

export default function App() {

  const [theme, setTheme] = useLocalStorage("theme", "light" as ThemeType);
  const [login, setLogin] = useLocalStorage<LoginResponse | undefined>("user", undefined);
  const toggleTheme = () => { setTheme(theme === "dark" ? "light" : "dark"); };
  const context = useMemo(() => {return { theme: theme, login:login }}, [theme,login]);

  useEffect(() => {
    if(login) {
      const myInterceptor = axios.interceptors.request.use(
        config => { //if (allowedOrigins.includes(origin)) { 
          if(login) { 
            if(!config.headers) { config.headers = {}; }
            config.headers.authorization = `Bearer ${login.access_token}`;
          }
          return config;
        }, 
        error => { return Promise.reject(error); }
      );
      return () => { axios.interceptors.request.eject(myInterceptor); }
    }
  },[login]);
  
  function loginCallBack(lr:LoginResponse) {
    setLogin(lr); 
    try { analytics.identify(lr.username); } catch { console.error("analytics error getting user"); }
  }

  function logoutCallBack() {
    setLogin(undefined); 
    try { analytics.reset(); } catch { console.error("analytics error resetting"); }
  }

  const rightOptions = <div>
    <Button icon={theme === "dark" ? "lightbulb" : "moon"} onClick={toggleTheme} minimal></Button>
  </div>;
  document.body.style.background = theme === "dark" ? '#293742' : '';
  
  const wrap = (children: React.ReactNode, selected: selOption = undefined, classOverride:string | undefined = undefined, largeFooter:boolean = false) => {
    return (<div id="appPage"><MyNavBar selected={selected} rightChildren={rightOptions} />
          <div className={classOverride !== undefined ? classOverride : "page"}>{children} </div>
        <Footer largeFooter={largeFooter} />
        </div>)
  }

  return (
    <ThemeContext.Provider value={context}>
      <ThemeContext.Consumer>
      
        {themeContext =>
            
          <BrowserRouter>
            <AppPageContainer>
            <Routes>
              <Route path="/login" element={wrap(<LoginPage logincallBack={loginCallBack} />,undefined, "page loginPage")} />
              <Route path="/logout" element={wrap(<LogoutPage logoutCallBack={logoutCallBack} />)} />
              {/* Allows individual charts to pop out */}
              <Route path="/dash/popout.html" element={<div />} />
              <Route path="/dash/:ignore/popout.html" element={<div />} />
              <Route path="/dash/history/:dashId/*" element={wrap(<RequireAuth><DashHistoryPage /></RequireAuth>, "dashboard", "page historypage")} />
              <Route path="/dash/reports/:dashId/*" element={wrap(<RequireAuth><DashReportPage /></RequireAuth>, "dashboard", "page reportpage")} />
              <Route path="/dash/:dashId/:ignore/:versionId" element={<RequireAuth><DashboardPage rightOptions={rightOptions} /></RequireAuth>} />
              <Route path="/dash/:dashId/*" element={<RequireAuth><DashboardPage rightOptions={rightOptions} /></RequireAuth>} />
              <Route path="/connections" element={wrap(<RequireAuth><ConnectionsPage /></RequireAuth>, "connections", "page connectionpage")} />
              <Route path="/dash" element={<RequireAuth>{wrap(<DashPage />, "dashboard", "page dashpage")}</RequireAuth>} />
              <Route path="/test" element={wrap(<TestPage />)} />
              <Route path="/screengrab" element={wrap(<ScreengrabberPage />)} />
              <Route path="/help/*" element={wrap(<HelpPage />)} />
              <Route path="/sqleditor" element={wrap(<RequireAuth><SqlEditorPage /></RequireAuth>, "sqleditor", "sqleditorpage")} />
              <Route path="/user" element={<RequireAuth>{wrap(<UserPage />)}</RequireAuth>} />
              <Route path="/" element={wrap(<PageHome />, undefined, "homepage", true)} />
          </Routes>
          </AppPageContainer>
        </BrowserRouter>}
      
      </ThemeContext.Consumer>
    </ThemeContext.Provider>
  );
}


function LogoutPage(props:{logoutCallBack:() => void}) {
  let navigate = useNavigate();
  useEffect(() => {props.logoutCallBack(); navigate("/login", { replace: true }); })
  return <><h1>Logged Out</h1></>;
}

function RequireAuth({ children }: { children: JSX.Element }) {
  let context = React.useContext(ThemeContext);
  let location = useLocation();

  if (!context || !context.login) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function AppPageContainer(props:{children:React.ReactNode}) {
  const themeContext = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => { analytics.page(); }, [location]); // Log the page on every page change

  const hotkeys = useMemo(() => [
    { combo: "ctrl+D", global:true, label: "Go to Dashboards", onKeyDown: () => navigate("/dash"), allowInInput:true, preventDefault:true },
    { combo: "ctrl+Q", global:true, label: "Go to SQL Editor", onKeyDown: () => navigate("/sqleditor"), allowInInput:true, preventDefault:true },
    { combo: "ctrl+G", group: "Input", global:true, label: "Focus text input", onKeyDown: () => console.info("FFFFFFFFFF"), allowInInput:true},
    ], [navigate]);
  const { handleKeyDown, handleKeyUp } = useHotkeys(hotkeys);
  return <div className={"App" + (themeContext.theme === "dark" ? " bp4-dark Appdark" : "")} onKeyDown={handleKeyDown} onKeyUp={handleKeyUp}>{props.children}</div>;
}

export let isDEBUG = () => { return window.location.search.toLowerCase().indexOf("debugg") >= 0 };

function PageHome() {
  useEffect(() => { document.title = ANAME }, []);
  const context = useContext(ThemeContext);

  return (
    <div id="pageMain">
    <div id="darkContainer">
      <section className="home-top">
        <div className="container">  
          <div className="row">
              <div className="col-md-12"></div>
          </div>
        </div>
      </section>
            
      <section className="home-intro">
        <div className="container">
          
          <div className="row">
            <div className="col-md-4 align-self-center">
                <div>
                  <h1>Real-time visual analysis, email reporting and alerting</h1>
                    <p>Allows people that know SQL to create and share real-time interactive dashboards with their team.
                    </p>
                  <div><Button icon="video" onClick={()=>{return false;}} intent="success">Video Tour</Button></div>
                  <div><Link to="/help/chart/timeseries"><Button icon="help" intent="primary">View Documentation</Button></Link></div>
                </div>
              </div>

              <div className="col-md-8">
                <img src={"/img/pulse-screenshot" + (context.theme === "dark" ? "" : "-dark") + ".png"} alt="Pulse Screenshot" width="695" height="383" />
              </div>

          </div>

          </div>
      </section>

      <section className="home-examples">
        <div className="container">  
          <div className="row">
              <div className="col-md-12">
                <h1>Use data to drive actions within a second</h1>
              </div>
          </div>
        </div>
        <div className="container">
          <div className="row">
            <div className="col-md-6">
                <h2 id="qsyntax">Bloomberg like Price Grids</h2>
                <p>Multiple time-series updating within milli-seconds</p>
                <img src="/img/price-grid.png" alt="Data Grid" width="353" height="217" />
            </div>
            <div className="col-md-6">
                <h2>Trade Blotters</h2>
                <p>Within a few clicks, you can create beautiful customized dashboards.</p>
                <img src="/img/blotter2-small.png" alt="Trade Blotter" width="353" height="217" />
            </div>
            

          </div>
        </div>
      </section>
    </div>

      <section className="home-demo">
        <div className="container">  
          <div className="row">
              <div className="col-md-9">
                  <DemoChartForHomepage />
              </div>
              <div className="col-md-3">
                  <h1>Real-Time Charting</h1>
                  <h2>
                    1000s of ticks rendered continuously with smooth transitions.
                  </h2>
              </div>
          </div>
        </div>
      </section>


      <section className="home-bottom">
        <div className="container">
        <div className="row">
          
            <div className="col-md-4">
              <Icon icon="data-connection" size={48}/>
              <h2>Works with your data sources</h2>
              <ul>
                <li>kdb</li><li>postgresql</li><li>mysql</li><li>oracle</li>
              </ul>
            </div>
            
            <div className="col-md-4">
              <Icon icon="rocket-slant" size={48}/>
              <h2>Optimized for streaming</h2>
              <p>Has the ability to subscribe to data sources. Rather than polling, data sources send data changes in real-time to the dashboard.</p>
            </div>
            
            <div className="col-md-4">
              <Icon icon="envelope" size={48}/>
              <h2>First class email support</h2>
              <p>All real-time dashboards can be exactly emailed as an image or attachments 
                <br/>on schedules or triggered by events.</p>
            </div>
            
          </div>
        </div>
      </section>

    </div>);
}


function Footer(props:{largeFooter:boolean}) {

  const large = <div className="row">
      <div className="col-md-4">
          <div className="widget-footer">
              <h5>Products</h5>
              <ul className="list-items">
                  <li className="list-item"><a href="/qstudio">qStudio</a></li>
                  <li className="list-item"><a href="http://www.sqldashboards.com">sqlDashboards</a></li>
              </ul>
          </div>
      </div>
      <div className="col-md-4">
          <div className="widget-footer">
              <h5>Learn</h5>
              <ul className="list-items">
                  <li className="list-item"><a href="/kdb-training">kdb+ Training</a></li>
                  <li className="list-item"><a href="/kdb-guides">kdb+ Tutorials</a></li>
                  <li className="list-item"><a href="/kdb-training/online">Online Course Login</a></li>
                  <li className="list-item"><a href="/time-series-data">Time Series Data</a></li>
              </ul>
          </div>
      </div>
      <div className="col-md-4">
          <div className="widget-footer">
              <h5>Company</h5>
              <ul className="list-items">
                  <li className="list-item"><a href="/about">About TimeStored</a></li>
                  <li className="list-item"><a href="/b">Blog & News</a></li>
              </ul>
          </div>
      </div>
  </div>;
  const lg = props.largeFooter;
  return   <footer id="site-footer" className="site-footer footer-v3 site-f7" style={{position:lg ? "inherit" : "fixed", marginTop:lg ? "50px" : "0"}}>
      <div className="container-fluid px-xl-0">
          {props.largeFooter ? large : null}
          <div className="row" style={{borderTop:"1px solid #BBB", margin:"1px auto", padding:"1px 0" }}>
              <div className="col-sm-6">{/* <div className="flogo-i6"><a href="/"><Logo /></a></div> */}</div>
              <div className="col-md-6">
                  <p className="copyright-text i7">Copyright © 2022 <strong>{ANAME}</strong>. All Rights Reserved.</p>
              </div>
          </div>
      </div>
    </footer>;
}