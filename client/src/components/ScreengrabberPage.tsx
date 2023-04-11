import { Button, ProgressBar, Slider } from "@blueprintjs/core";
import { useEffect, useState } from "react";
import { ANAME } from "../App";
import { SERVER } from "../engine/queryEngine";


export default function ScreengrabberPage() {
  // const themeContext = useContext(ThemeContext);
    useEffect(() => { document.title = "Screen Grabber - " + ANAME }, []);
    return <div>
      <h1>Screen Grabber</h1>
          <ScreenSelector />  
    </div>
}

type grabState = "unsent" | "sent" | "returned";
function ScreenSelector() {

  const [url, setURL] = useState("");
  const [width, setWidth] = useState(1680);
  const [height, setHeight] = useState(1050);
  const [delay, setDelay] = useState(5);
  const [imgState, setImgState] = useState<{gs:grabState, src:string | undefined}>({gs:"unsent",src:undefined});

  function generateURL():string {
    return "/api/gimg/dash?url=" + encodeURIComponent(url) + "&height=" + height + "&width=" + width + "&delay=" + delay + "000";
  }
  

  return <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => { e.preventDefault();  setImgState({gs:"sent", src:generateURL()}) }}>
    <fieldset style={{width:"80%", textAlign:"center", margin:"auto"}}><div>
            
            <label>URL: <input type="url" value={url} onChange={(e) => setURL(e.target.value)} width="60" style={{width:"50em"}} minLength={3} placeholder="http://google.com"/></label>
            <br />
            <label>Resolution:</label>
            <Button small onClick={() => { setWidth(3840); setHeight(2160); }}>4K</Button>
            <Button small onClick={() => { setWidth(1920); setHeight(1080); }}>1080</Button>
            <Button small onClick={() => { setWidth(720); setHeight(480); }}>720</Button>
            <Button small onClick={() => { setWidth(640); setHeight(480); }}>480</Button>
            <Button small onClick={() => { setWidth(1748); setHeight(2480); }}>A4</Button>
            <label>Width: <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))} width="4" style={{width:"5em"}} />        </label>
            <label>Height: <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))}  width="4" style={{width:"5em"}} />        </label>
            <br />
              <div style={{width:"300px", margin:"auto"}}>
                <label>Seconds Delay Before Screengrab:<Slider value={delay} min={0} max={60}  onChange={(n) => n >= 1 ? setDelay(n) : setDelay(1)} stepSize={1} labelStepSize={10} /></label>
              </div>
            <label><a href={generateURL()}>Live Link</a></label>
            <Button intent="primary" type="submit" disabled={url.length<3 || imgState.gs==="sent"} >Grab Now</Button>
      {imgState.gs==="sent" && <ProgressBar intent="primary"/>}
      </div></fieldset>
      {imgState.gs!=="unsent" && <div style={{margin:"10px 10%", border:"1px solid grey"}}>
            <input type="text" value={window.location.host + imgState.src}  width="60" style={{width:"50em"}} />
            <br />
            <span style={{display:"inline-block"}}>
              <img src={SERVER + '../' + imgState.src} alt="Screenshot of URL" onLoad={() => setImgState({gs:"returned", src:imgState.src})} style={{border:"1px solid grey", margin:"3px", maxWidth:"80%"}} />
            </span>
          </div>}
    </form>
}