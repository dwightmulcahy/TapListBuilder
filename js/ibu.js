// Bitterness Value (BV): perceived malt/bitterness balance, weighing both the starting
// and final gravity (residual sweetness from unfermented sugars affects perceived
// bitterness balance, not just IBU vs. starting gravity alone).
//   GU(x)  = (x - 1) * 1000
//   BV     = 0.8 * IBU / (0.82 * GU(SG) + 0.18 * GU(FG))
// Classification reuses the original BU:GU 7-tier sensory descriptors/thresholds, now fed
// by BV instead of the plain IBU:GU ratio. Requires both SG and FG (not just SG), since FG
// is part of the BV formula itself.
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
function bitternessPosition(ibu,sg,fg){
  const bv=calculateBV(ibu,sg,fg);
  if(bv===null)return null;
  return Math.min(100,Math.max(0,(bv/1.3)*100));
}
function classifyBV(bv){
  const spanish=state.settings.language==="es";
  if(bv<0.25)return spanish?"Empalagoso / Postre":"Cloying / Dessert";
  if(bv<0.40)return spanish?"Rico / Dulce":"Rich / Sweet";
  if(bv<0.50)return spanish?"Suave / Aterciopelado":"Smooth / Mellow";
  if(bv<0.70)return spanish?"Perfectamente Equilibrado":"Perfectly Balanced";
  if(bv<0.85)return spanish?"Fresco / Refrescante":"Crisp / Refreshing";
  if(bv<=1.00)return spanish?"Amargo":"Bitter";
  return spanish?"Intensamente Amargo":"Intensely Bitter";
}
function bitternessClassification(ibu,sg,fg){
  const bv=calculateBV(ibu,sg,fg);
  if(bv===null)return null;
  return classifyBV(bv);
}
function bitternessMeter(ibu,sg,fg){
  const bv=calculateBV(ibu,sg,fg);
  if(bv===null)return "";
  const position=Math.min(100,Math.max(0,(bv/1.3)*100));
  const classification=classifyBV(bv);
  return `<div class="bitterness-meter" title="BV ${bv.toFixed(2)} — ${classification}"><div class="bitterness-track"><span class="bitterness-marker" style="--bitterness-position:${position.toFixed(1)}%"></span></div><div class="bitterness-labels"><span>${classification}</span></div></div>`;
}
