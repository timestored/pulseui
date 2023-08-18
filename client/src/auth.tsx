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
 
import { Button, Card, Elevation, H3, Label } from "@blueprintjs/core";
import axios from "axios";
import { get } from "lodash-es";
import React, { useContext } from "react";
import { useLocation, useNavigate } from "react-router";
import { Logo } from "./App";
import { notyf, ThemeContext } from "./context";
import { SERVER } from "./engine/queryEngine";

   
export async function signin(username: string, password:string, callback: (lr:undefined | LoginResponse) => void) {
  // Everything in micronaut moved under /api/ to prevent collisions. But /login/logout was too hard to move.
  // hence rlogin/rlogout is the react page. And the ../ to make it work.
  await axios.post<LoginResponse>(SERVER + "/../login",{username, password}) 
  .then((d) => { // @ts-ignore
    callback(d.data);
  }).catch((e) =>{
    notyf.error("Could not login." + e)
    console.error("Could not login." + e)
  })
  callback(undefined);
}


export function LoginPage(props:{logincallBack:(lr:LoginResponse) => void}) {
    const navigate = useNavigate();
    const location = useLocation();
    const themeContext = useContext(ThemeContext);

    // @ts-ignore
    const from = location.state?.from?.pathname || "/dash"; // @ts-ignore
    const search = location.state?.from?.search || ""; 
      
	// Allows login via args in URL to that screenshotting can work.
    const sp = new URLSearchParams(search);
    if(sp.get("sd_offerId") !== null) {
      window.localStorage.setItem('offerId', sp.get("sd_offerId")!);
    }
    if(sp.get("sd_u") !== null && sp.get("sd_p") !== null) {
        const u = sp.get("sd_u")!;
        const p = sp.get("sd_p")!;
        signin(u, p, lr => { 
          lr !== undefined && props.logincallBack(lr); 
          let hr = window.location.href;
          if(hr.indexOf("?") !== -1) {
            hr = hr.substring(0,hr.indexOf("?"));
          }
          sp.delete("sd_u");
          sp.delete("sd_p");
          navigate(from + "?" + sp.toString(), { replace: true });
        });
    } else {
        if(get(window,"pulseconfig.isAuthProxy",false)) {
          // post to autologin
          signin("fakeusername-usingproxy", "fakepass-usingproxy", lr => { 
            lr !== undefined && props.logincallBack(lr); 
            navigate(from, { replace: true });
          });
        }
        
        if(get(window,"pulseconfig.isDemo",true)) {
          // Autologin for demo purposes
          signin("admin", "pass", lr => { 
            lr !== undefined && props.logincallBack(lr); 
            navigate(from, { replace: true });
          });
        }
    }
  
    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
      event.preventDefault();
  
      const formData = new FormData(event.currentTarget);
      const username = formData.get("username") as string;
      const password = formData.get("password") as string;
  
      signin(username, password, (lr) => {
        // Send them back to the page they tried to visit when they were
        // redirected to the login page. Use { replace: true } so we don't create
        // another entry in the history stack for the login page.  This means that
        // when they get to the protected page and click the back button, they
        // won't end up back on the login page, which is also really nice for the
        // user experience.
        if(lr) { 
          props.logincallBack(lr); 
          navigate(from, { replace: true });
        }
      });
    }
  
    if(themeContext.login) {
      navigate(from, { replace: true });
    }

    return (
      <div className="loginForm">
      <Card elevation={Elevation.FOUR}>
        <form onSubmit={handleSubmit}>
          <Logo />
          <H3>Login</H3>
            <Label>Username: <input name="username" type="text" placeholder="Username or Email" autoFocus autoComplete="username"/> </Label>
            <Label>Password: <input name="password" type="password" autoComplete="current-password" /></Label>
            <Button type="submit" intent="success">Login</Button>
        </form>
      </Card>
      </div>
    );
  }
  

export type LoginResponse = {
  username: string,
  roles: string[],
  access_token: string,
  token_type: string,
  expires_in:number
}

