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
 
/* eslint-disable import/first */
import React, { useEffect, useMemo, useContext } from 'react';
import './App.scss';
import $ from 'jquery';
// @ts-ignore
window.jQuery = $; window.$ = $; global.jQuery = $

import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import ConnectionsPage from './components/ConnectionsPage';
import DashboardPage from './components/DashboardPage';
import { MyNavBar, selOption } from './components/CommonComponents';
import HelpPage from './components/HelpPage';
import DashPage, { DashHistoryPage, DashboardPageRaw } from './components/DashPage';
import TestPage from './components/TestPage';
import SqlEditorPage from './components/SqlEditorPage';
import { ThemeContext, ThemeType } from './context';
import { Button,useHotkeys } from '@blueprintjs/core';
import { useNavigate } from 'react-router-dom';
import useLocalStorage from './components/hooks';
import Analytics from 'analytics';
import { SERVER } from './engine/queryEngine';
import axios from 'axios';
import { LoginPage, LoginResponse } from './auth';
import UserPage from './components/UserPage';
import { notyf } from './context';
import { get } from 'lodash-es';
import SettingsPage from './components/SettingsPage';

const myPlugin = {
  name: 'c', //@ts-ignore
  page: ({ payload }) => {
    const { meta, properties, anonymousId, userId } = payload;
    try {
      axios && axios.post(SERVER + "/analytics/page", { date: meta.ts, url: properties.url, path: properties.path, search: properties.search, anonymousId: anonymousId, userId: userId, });
    } catch {
      // ignore
    }
  },//@ts-ignore
  track: ({ payload }) => {
    const { meta, properties, anonymousId, userId, event } = payload;
    axios.post(SERVER + "/analytics/event", { date: meta.ts, event:event, anonymousId: anonymousId, userId: userId, ...properties });
  },
}
const myPlugins = [myPlugin];

// if(window.location.href.indexOf("timestored.com") !== -1) {
//   // Initialize with your site ID and Matomo URL
//   const MURL = "https://www.timestored.com/mat/matomo.php";
//   const eventDets = { 'idsite':1, rec:1, 'apiv':1, };
//   const paramsSerializer = {
//     encode: (params:any) => {
//       // Sample implementation of query string building
//       let result = '';
//       Object.keys(params).forEach(key => {
//           result += `${key}=${encodeURIComponent(params[key])}&`;
//       });
//       return result.substring(0, result.length - 1);
//     }
//   }

//   const matomoPlugin = {
//     name: 'matomoPlugin', //@ts-ignore
//     page: ({ payload }) => {
//       const { meta } = payload;
//       const offerId = window.localStorage.getItem('offerId');
//       const uid = offerId !== null ? offerId : (payload.userId || payload.anonymousId);
//       try {
//         const eevent = { 
//           ...eventDets,
//           'uid': uid,
//           'url':window.location.href,
//           'action_name':document.title,
//           'cdt': meta.ts
//         };
//         axios && axios.get(MURL, {params:eevent, paramsSerializer:paramsSerializer});
//       } catch {}
//     },//@ts-ignore
//     track: ({ payload }) => {
//       const { meta, properties, event } = payload;
//       const offerId = window.localStorage.getItem('offerId');
//       const uid = offerId !== null ? offerId : (payload.userId || payload.anonymousId);
//       const eevent = { // e_c/a/n/v = category, action, name, value
//         ...eventDets,
//         'uid': uid,
//         'url': window.location.href,
//         'cdt': meta.ts,
//         'e_c': event,
//         'e_a': event,
//         'e_n': properties.dashName,
//         'e_v': properties.dashId
//       };
//       axios && axios.get(MURL, {params:eevent, paramsSerializer:paramsSerializer});
//     },
//   };
//   myPlugins = [myPlugin, matomoPlugin];
// }

// The URL below broke analytics from loading which stopped the entire APP loading!!
// To prevent that we set analytics to dummy and then protectively load it.
// http://localhost:3000/dash/7/ExeQution%20Summary?a=1&%%20Exe
let analytics:any = { track:()=>{}, page:()=>{}};
try {
  analytics = Analytics({ app: 'Pulse', debug:true, plugins: myPlugins });
} catch {
  console.error("analytics failed to load");
}
export { analytics };

export const ANAME = "Pulse"
export const aNAME = "pulse"

export function Logo(props:{light?:boolean}) {  return <div className="logoImg" ></div>;  }

export function isBorderless() { return new URLSearchParams(window.location.search).get("sd_noborder") === "1" }


axios.interceptors.request.use(
  config => { //if (allowedOrigins.includes(origin)) { 
    const tok = localStorage.getItem("token");
    if(tok != null) { 
      if(!config.headers) { config.headers = {}; }
      config.headers.authorization = `Bearer ${tok}`;
    }
    return config;
  }, 
  error => {   return Promise.reject(error);   },
  { synchronous: true }
);
axios.interceptors.response.use(function (response) {
  // Any status code that lie within the range of 2xx cause this function to trigger
  return response;
}, function (error) {
  // Assumes any error is a login problem and redirects. Unless already attempting login.
  if(error.response && error.response.status === 401 && !error.request.responseURL.endsWith("/login")) {
    localStorage.removeItem("token");
    window.location.href = "/rlogout";
  } else {
    notyf.error(error);
  }
  return Promise.reject(error);
});

export function getSubdomain() {
  const ru = get(window,"pulseconfig.rootURL",undefined) as unknown as string;
  if(ru !== undefined && typeof ru === "string") {
    const p = ru.indexOf("/");
    if(p > 0) {
      const afterHttp = ru.length > p && ru.charAt(p+1) === '/' ? ru.substring(p+2) : ru.substring(p+1);
      const q = afterHttp.indexOf("/");
      if(q > 0) {
        const pth = afterHttp.substring(q);
        return pth.endsWith("/") ? pth.substring(0,pth.length-1) : pth;
      }
    }
  }
  return undefined;
}

export default function App() {

  const [theme, setTheme] = useLocalStorage("theme", "dark" as ThemeType);
  const [login, setLogin] = useLocalStorage<LoginResponse | undefined>("user", undefined);
  const toggleTheme = () => { setTheme(theme === "dark" ? "light" : "dark"); };
  const context = useMemo(() => {return { theme: theme, login:login }}, [theme,login]);

  
  function loginCallBack(lr:LoginResponse) {
    localStorage.setItem("token",lr.access_token);
    setLogin(lr);
    try { analytics.identify(lr.username); } catch { console.error("analytics error getting user"); }
  }

  function logoutCallBack() {
    setLogin(undefined); 
    // try { analytics.reset(); } catch { console.error("analytics error resetting"); }
  }

  const rightOptions = <div>
    <Button icon={theme === "dark" ? "lightbulb" : "moon"} onClick={toggleTheme} minimal></Button>
  </div>;
  document.body.className = theme === "dark" ? 'bodydark' : 'bodylight';
  
  const wrap = (children: React.ReactNode, selected: selOption = undefined, classOverride:string | undefined = undefined) => {
    return (<div id="appPage"><MyNavBar selected={selected} rightChildren={rightOptions} />
          <div className={classOverride !== undefined ? classOverride : "page"}>{children} </div>
        </div>)
  }

  return (
    <ThemeContext.Provider value={context}>
      <ThemeContext.Consumer>
      
        {themeContext =>
            
          <BrowserRouter basename={getSubdomain()}>
            <AppPageContainer>
            <ScrollToTop>
            <Routes>
              <Route path="/rlogin" element={wrap(<LoginPage logincallBack={loginCallBack} />,undefined, "page loginPage")} />
              <Route path="/rlogout" element={wrap(<LogoutPage logoutCallBack={logoutCallBack} />)} />
              {/* Allows individual charts to pop out */}
              <Route path="/dash/popout.html" element={<div />} />
              <Route path="/dash/:ignore/popout.html" element={<div />} />
              <Route path="/dash/history/:dashId/*" element={wrap(<RequireAuth><DashHistoryPage /></RequireAuth>, "dashboard", "page historypage")} />
              
              {/* Horrible copy-paste hack until optional parameters are supported https://github.com/remix-run/react-router/issues/9546 */}
              <Route path="/dash/raw/:dashId" element={wrap(<RequireAuth><DashboardPageRaw rightOptions={rightOptions} /></RequireAuth>, "dashboard")} />
              <Route path="/dash/raw/:dashId/:ignore/:versionId" element={wrap(<RequireAuth><DashboardPageRaw rightOptions={rightOptions} /></RequireAuth>, "dashboard")} />
              
              <Route path="/dash/:dashId/:ignore/:versionId" element={<RequireAuth><DashboardPage rightOptions={rightOptions} /></RequireAuth>} />
              <Route path="/dash/:dashId/*" element={<RequireAuth><DashboardPage rightOptions={rightOptions} /></RequireAuth>} />
              <Route path="/connections" element={wrap(<RequireAuth><ConnectionsPage /></RequireAuth>, "connections", "page connectionpage")} />
              <Route path="/dash" element={<RequireAuth>{wrap(<DashPage />, "dashboard", "page dashpage")}</RequireAuth>} />
              <Route path="/test" element={wrap(<TestPage />)} />
              <Route path="/help/*" element={wrap(<HelpPage />)} />
              <Route path="/sqleditor" element={wrap(<RequireAuth><SqlEditorPage /></RequireAuth>, "sqleditor", "sqleditorpage")} />
              <Route path="/user" element={<RequireAuth>{wrap(<UserPage />)}</RequireAuth>} />
              <Route path="/settings" element={<RequireAuth>{wrap(<SettingsPage />)}</RequireAuth>} />
              <Route path="/" element={wrap(<PageHome />, undefined, "homepage")} />
          </Routes>
          </ScrollToTop>
          </AppPageContainer>
        </BrowserRouter>}
      
      </ThemeContext.Consumer>
    </ThemeContext.Provider>
  );
}


const ScrollToTop = (props:any) => {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return <>{props.children}</>
};


function LogoutPage(props:{logoutCallBack:() => void}) {
  const navigate = useNavigate();
  useEffect(() => {props.logoutCallBack(); navigate("/rlogin", { replace: true }); })
  return <><h1>Logged Out</h1></>;
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const context = useContext(ThemeContext);
  const location = useLocation();

  if (!context || !context.login) {
    // Redirect them to the /rlogin page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/rlogin" state={{ from: location }} replace />;
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

function PageHome() {
  const navigate = useNavigate();
  useEffect(() => {navigate("/dash"); });
  return <div></div>;
}



  // return (
  //   <div id="pageMain">
  //   <div id="darkContainer">
  //     <section className="home-top">
  //       <div className="container splashContainer">  
  //         <div className="row toprow">
  //             <div className="col col-md-12">
  //             <h1><img src="./img/logo-white.png" alt="Pulse" /></h1>
  //             <h2>Real-time visual analysis, email reporting and alerting</h2>
  //                   <p>Create and share real-time interactive dashboards with your team.
  //                   </p>
  //             </div>
  //         </div>
  //       </div>
  //       <div className="buttoncontainer">  
  //         <div className="row buttonrow">
  //           <div className="col">
  //               <Link to="/dash"><Button icon="dashboard" intent="success" large>Dashboards</Button></Link>
  //               {/* eslint-disable-next-line react/jsx-no-target-blank */}
  //               <a href="https://www.timestored.com/pulse/vid" target="_blank"><Button icon="video" intent="success" large>Video Tour</Button></a>
  //               {/* eslint-disable-next-line react/jsx-no-target-blank */}
  //               <a href="http://timestored.com/pulse/help/?utm_source=pulse&utm_medium=app&utm_campaign=pulse" target="_blank"><Button icon="help" intent="primary" large>Documentation</Button></a>
  //           </div>
  //         </div>
  //       </div>
  //     </section>

  //     <section className="home-examples">
  //       <div className="container">  
  //         <div className="row">
  //             <div className="col-md-12">
  //               <h1>Use data to drive actions within a second</h1>
  //             </div>
  //         </div>
  //       </div>
  //       <div className="container">
  //         <div className="row">
  //           <div className="col-md-6">
  //               <h2 id="qsyntax">Bloomberg like Price Grids</h2>
  //               <p>Multiple time-series updating within milli-seconds</p>
  //               <img src="./img/price-grid.png" alt="Data Grid" width="353" height="217" />
  //           </div>
  //           <div className="col-md-6">
  //               <h2>Trade Blotters</h2>
  //               <p>Within a few clicks, you can create beautiful customized dashboards.</p>
  //               <img src="./img/blotter2-small.png" alt="Trade Blotter" width="353" height="217" />
  //           </div>
            

  //         </div>
  //       </div>
  //     </section>
  //   </div>

  //     <section className="hoasdame-demasdo">
  //       <div className="container">  
  //         <div className="row">
  //             <div className="col-md-9">
  //                 <DemoChartForHomepage />
  //             </div>
  //             <div className="col-md-3">
  //                 <h1>Real-Time Charting</h1>
  //                 <h2>
  //                   1000s of ticks rendered continuously with smooth transitions.
  //                 </h2>
  //             </div>
  //         </div>
  //       </div>
  //     </section>


  //     <section className="home-bottom">
  //       <div className="container">
  //       <div className="row">
          
  //           <div className="col-md-4">
  //             <Icon icon="data-connection" size={48}/>
  //             <h2>Works with your data sources</h2>
  //             <p>kdb postgresql mysql oracle</p>
  //           </div>
            
  //           <div className="col-md-4">
  //             <Icon icon="rocket-slant" size={48}/>
  //             <h2>Optimized for streaming</h2>
  //             <p>Has the ability to subscribe to data sources. Rather than polling, data sources send data changes in real-time to the dashboard.</p>
  //           </div>
            
  //           <div className="col-md-4">
  //             <Icon icon="envelope" size={48}/>
  //             <h2>First class email support</h2>
  //             <p>All real-time dashboards can be exactly emailed as an image or attachments 
  //               <br/>on schedules or triggered by events.</p>
  //           </div>
            
  //         </div>
  //       </div>
  //     </section>

  //   </div>);