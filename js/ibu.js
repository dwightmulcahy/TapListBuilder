// Bitterness meter: BU:GU (bitterness units : gravity units) ratio, its position on the
// gradient scale, and the descriptor label for that ratio. GU only needs the starting
// gravity (SG); final gravity (FG) is only used for the separate ABV calculation in app.js.
function parseGravityNumber(value){
  const n=Number.parseFloat(String(value??"").replace(",","."));
  return Number.isFinite(n)?n:null;
}
function gravityUnits(sg){
  const n=parseGravityNumber(sg);
  if(n===null||n<=1)return null;
  return (n-1)*1000;
}
function buGuRatio(ibu,sg){
  const gu=gravityUnits(sg);
  const ibuNumber=Number.parseFloat(String(ibu??"").replace(",","."));
  if(gu===null||gu<=0||!Number.isFinite(ibuNumber)||ibuNumber<0)return null;
  return ibuNumber/gu;
}
function bitternessPosition(ibu,sg){
  const ratio=buGuRatio(ibu,sg);
  if(ratio===null)return null;
  return Math.min(100,Math.max(0,(ratio/1.3)*100));
}
function classifyBuGuRatio(ratio){
  const spanish=state.settings.language==="es";
  if(ratio<0.25)return spanish?"Empalagoso / Postre":"Cloying / Dessert";
  if(ratio<0.40)return spanish?"Rico / Dulce":"Rich / Sweet";
  if(ratio<0.50)return spanish?"Suave / Aterciopelado":"Smooth / Mellow";
  if(ratio<0.70)return spanish?"Perfectamente Equilibrado":"Perfectly Balanced";
  if(ratio<0.85)return spanish?"Fresco / Refrescante":"Crisp / Refreshing";
  if(ratio<=1.00)return spanish?"Amargo":"Bitter";
  return spanish?"Intensamente Amargo":"Intensely Bitter";
}
function bitternessClassification(ibu,sg){
  const ratio=buGuRatio(ibu,sg);
  if(ratio===null)return null;
  return classifyBuGuRatio(ratio);
}
function bitternessMeter(ibu,sg){
  const ratio=buGuRatio(ibu,sg);
  if(ratio===null)return "";
  const position=Math.min(100,Math.max(0,(ratio/1.3)*100));
  const classification=classifyBuGuRatio(ratio);
  return `<div class="bitterness-meter" title="${ratio.toFixed(2)} BU:GU — ${classification}"><div class="bitterness-track"><span class="bitterness-marker" style="--bitterness-position:${position.toFixed(1)}%"></span></div><div class="bitterness-labels"><span>${classification}</span></div></div>`;
}
