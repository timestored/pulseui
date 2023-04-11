
export default function TestPage() {
  const hw = {height:'75px', width:'151px'};
  //@ts-ignore
  $('.sparkbar').sparkline('html', {type: 'bar', ...hw, barWidth:'14px', barColor: 'green'} ); //@ts-ignore
  $('.sparkline').sparkline('html', {type: 'line', ...hw,  lineColor: '#2C92B6', fillColor: '#102040' } ); //@ts-ignore
  $('.sparkdiscrete').sparkline('html', {type: 'discrete', ...hw,  lineColor: '#2C92B6' } ); //@ts-ignore
  $('.sparkbullet').sparkline('html', {type: 'bullet', ...hw, rangeColors: ['#99aabb','#6677bb','#1122bb'] } ); //@ts-ignore
  $('.sparkboxplot').sparkline('html', {type: 'box', ...hw, boxLineColor: '#dddddd', boxFillColor: '#445588', whiskerColor: '#dddddd', outlierLineColor: '#dddddd' } ); 

  // const themeContext = useContext(ThemeContext);
    return <div id="appPage">
      <p>CGrid</p>
      <p>Example1</p>
    <div id="footer">
        <div id="editor2"></div>
        


<div className='lat-outer'>

  <div className="lat-container">
    <div className="lat-box"> <div className="lat-spacer"></div>   <div><span className="sparkline">1,3,4,5,3,5,-3</span></div> </div>
    <div className="lat-box lat-overlay"> <h1>Filled</h1> <h1>100%</h1> </div>
  </div>      



  <div className="lat-container">
    <div className="lat-box"> <div className="lat-spacer"></div>   <div><span className="sparkbar">1,3,4,5,3,5,4,3,2,1,5,6</span></div> </div>
    <div className="lat-box lat-overlay"> <h1>Filled Overflow</h1> <h1>100.123%</h1> </div>
  </div>      
  
  <div className="lat-container">
    <div className="lat-box"> <div className="lat-spacer"></div>   <div><span className="sparkdiscrete">1,3,4,5,3,5,8,10,4</span></div> </div>
    <div className="lat-box lat-overlay"> <h1>Filled</h1> <h1>100%</h1> </div>
  </div>      
  
  
  <div className="lat-container">
    <div className="lat-box"> <div className="lat-spacer"></div>   <div><span className="sparkbullet">1,3,4,5,3,5,8,10,4</span></div> </div>
    <div className="lat-box lat-overlay"> <h1>Filled</h1> <h1>100%</h1> </div>
  </div>      
  
  
  <div className="lat-container">
    <div className="lat-box"> <div className="lat-spacer"></div>   <div><span className="sparkboxplot">1,3,4,5,3,5,8,10,4</span></div> </div>
    <div className="lat-box lat-overlay"> <h1>Filled</h1> <h1>100%</h1> </div>
  </div>      
  
  <div className="lat-container">
    <div className="lat-box"> <div className="lat-spacer"></div>   <div><span className="sparkline">1,3,4,5,3,5,-3,-2,-1,-3,5</span></div> </div>
    <div className="lat-box lat-overlay"> <h1>Filled</h1> <h1>100%</h1> </div>
  </div>      
  
  <div className="lat-container">
    <div className="lat-box"> <div className="lat-spacer"></div>   <div><span className="sparkline">1,3,4,5,3,5</span></div> </div>
    <div className="lat-box lat-overlay"> <h1>Filled</h1> <h1>100%</h1> </div>
  </div>      

</div>




    </div></div>
}