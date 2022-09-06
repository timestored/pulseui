import { Button, Card, Elevation, H3, Label } from "@blueprintjs/core";
import axios from "axios";
import React, { useContext } from "react";
import { useLocation, useNavigate } from "react-router";
import { Logo } from "./App";
import { notyf, ThemeContext } from "./context";
import { SERVER } from "./engine/queryEngine";

   
export async function signin(username: string, password:string, callback: (lr:undefined | LoginResponse) => void) {
  await axios.post<LoginResponse>(SERVER + "/login",{username, password})
  .then((d) => { // @ts-ignore
    callback(d.data);
  }).catch((e) =>{
    notyf.error("Could not login." + e)
    console.error("Could not login." + e)
  })
  callback(undefined);
};

  
  export function LoginPage(props:{logincallBack:(lr:LoginResponse) => void}) {
    let navigate = useNavigate();
    let location = useLocation();
    const themeContext = useContext(ThemeContext);

    // @ts-ignore
    let from = location.state?.from?.pathname || "/"; // @ts-ignore
    let search = location.state?.from?.search || ""; 
      
	// Allows login via args in URL to that screenshotting can work.
    let sp = new URLSearchParams(search);
    if(sp.get("sd_u") !== null && sp.get("sd_p") !== null) {
        let u = sp.get("sd_u");
        let p = sp.get("sd_p");
        signin(u!, p!, lr => { lr !== undefined && props.logincallBack(lr); });
        console.error("SIGNIN!");
        let hr = window.location.href;
        if(hr.indexOf("?") !== -1) {
          hr = hr.substring(0,hr.indexOf("?"));
        }
        sp.delete("sd_u");
        sp.delete("sd_p");
        // window.location.href = hr + sp.toString();
        console.error("REDIR!");
        navigate(from + sp.toString(), { replace: true });
    }
  
    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
      event.preventDefault();
  
      let formData = new FormData(event.currentTarget);
      let username = formData.get("username") as string;
      let password = formData.get("password") as string;
  
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

