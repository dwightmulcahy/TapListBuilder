// Bitterness Value (BV): perceived malt/bitterness balance, weighing both the starting
// and final gravity (residual sweetness from unfermented sugars affects perceived
// bitterness balance, not just IBU vs. starting gravity alone).
//   GU(x)  = (x - 1) * 1000
//   BV     = 0.8 * IBU / (0.82 * GU(SG) + 0.18 * GU(FG))
// If FG isn't available, falls back to the simpler BU:GU ratio (IBU / GU(SG)), which only
// needs SG. Both are classified against the same BU:GU 7-tier sensory descriptors.
function parseGravityNumber(value){
  const n=Number.parseFloat(String(value??"").replace(",","."));
  return Number.isFinite(n)?n:null;
}
function gravityUnits(value){
  const n=parseGravityNumber(value);
  return n===null?null:(n-1)*1000;
}
function calculateBV(ibu,sg,fg){
  const ibuNumber=Number.parseFloat(String(ibu??"").replace(",","."));
  const sgUnits=gravityUnits(sg);
  const fgUnits=gravityUnits(fg);
  if(!Number.isFinite(ibuNumber)||ibuNumber<0||sgUnits===null||fgUnits===null)return null;
  const denominator=0.82*sgUnits+0.18*fgUnits;
  if(denominator<=0)return null;
  return 0.8*ibuNumber/denominator;
}
function calculateBuGuRatio(ibu,sg){
  const ibuNumber=Number.parseFloat(String(ibu??"").replace(",","."));
  const sgUnits=gravityUnits(sg);
  if(!Number.isFinite(ibuNumber)||ibuNumber<0||sgUnits===null||sgUnits<=0)return null;
  return ibuNumber/sgUnits;
}
// Single entry point: BV when FG is available, otherwise the BU:GU ratio (SG only).
function calculateBitternessValue(ibu,sg,fg){
  if(parseGravityNumber(fg)!==null){
    const bv=calculateBV(ibu,sg,fg);
    if(bv!==null)return bv;
  }
  return calculateBuGuRatio(ibu,sg);
}
function bitternessPosition(ibu,sg,fg){
  const value=calculateBitternessValue(ibu,sg,fg);
  if(value===null)return null;
  return Math.min(100,Math.max(0,(value/1.3)*100));
}
function classifyBV(value){
  const spanish=state.settings.language==="es";
  if(value<0.25)return spanish?"Empalagoso / Postre":"Cloying / Dessert";
  if(value<0.40)return spanish?"Rico / Dulce":"Rich / Sweet";
  if(value<0.50)return spanish?"Suave / Aterciopelado":"Smooth / Mellow";
  if(value<0.70)return spanish?"Perfectamente Equilibrado":"Perfectly Balanced";
  if(value<0.85)return spanish?"Fresco / Refrescante":"Crisp / Refreshing";
  if(value<=1.00)return spanish?"Amargo":"Bitter";
  return spanish?"Intensamente Amargo":"Intensely Bitter";
}
function bitternessClassification(ibu,sg,fg){
  const value=calculateBitternessValue(ibu,sg,fg);
  if(value===null)return null;
  return classifyBV(value);
}
function bitternessMeter(ibu,sg,fg){
  const value=calculateBitternessValue(ibu,sg,fg);
  if(value===null)return "";
  const position=Math.min(100,Math.max(0,(value/1.3)*100));
  const classification=classifyBV(value);
  const usedFg=parseGravityNumber(fg)!==null&&calculateBV(ibu,sg,fg)!==null;
  const label=usedFg?`BV ${value.toFixed(2)}`:`BU:GU ${value.toFixed(2)}`;
  return `<div class="bitterness-meter" title="${label} — ${classification}"><div class="bitterness-track"><span class="bitterness-marker" style="--bitterness-position:${position.toFixed(1)}%"></span></div><div class="bitterness-labels"><span>${classification}</span></div></div>`;
}
