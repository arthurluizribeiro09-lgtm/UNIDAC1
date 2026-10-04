
function drawBars(selector,data,labels){
  const el=document.querySelector(selector);if(!el)return;
  const max=Math.max(...data);
  el.innerHTML=data.map((v,i)=>`<div class="bar-wrap"><div class="bar" style="height:${Math.max(10,v/max*82)}%"></div><span>${labels[i]}</span></div>`).join("");
}
document.addEventListener("DOMContentLoaded",()=>{
  drawBars("#waste-chart",UNIDAC_DATA.waste7,["28","29","30","31","01","02","03"]);
  drawBars("#consumption-chart",UNIDAC_DATA.consumption,["Man","Int","Alm","Tar","Man","Int","Alm"]);
  drawBars("#report-chart",[72,66,61,58,52,49,43],["Abr","Mai","Jun","Jul","Ago","Set","Atual"]);
});
