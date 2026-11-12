const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");
const render=fs.readFileSync(path.join(root,"js/render.js"),"utf8");
const css=fs.readFileSync(path.join(root,"css/menu.css"),"utf8");
const ctx=vm.createContext({
  state:{settings:{language:"en"}},
  clampBeerNameFontSize:()=>18,clampDescriptionFontSize:()=>12,
  clampNumber:(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback,
  STATS_SIZE_LIMITS:{statsWidth:[24,65,41]},
  clampStatsSize:(_,value)=>value??41,
  renderedIcon:()=>"<svg></svg>",
  bitternessMeter:(_ibu,_sg,_fg,options)=>options.showTrack?'<div class="bitterness-meter"></div>':""
});
vm.runInContext(render,ctx);
const item=(changes={})=>({
  type:"beer",name:"Cas Cider",style:"Cider",description:"Fruit-forward and refreshing",
  color:"#337733",icon:"beer",glutenFree:false,hideIcon:false,
  abv:"4.5",ibu:"31",hideAbv:false,hideIbu:true,hideHopBar:true,
  hideBitternessLabel:true,hideHopMarker:true,hideStats:false,
  nameFontSize:18,descriptionFontSize:12,outlineEnabled:false,
  ...changes
});
const row=changes=>vm.runInContext("renderTapRow("+JSON.stringify(item(changes))+")",ctx);
test("hiding IBU makes a single ABV stat intrinsically sized",()=>{
  const markup=row();
  assert.match(markup,/class="tap-row tap-row-single-stat"/);
  assert.match(markup,/class="stat stat-abv"/);
  assert.doesNotMatch(markup,/class="stat stat-ibu"/);
  assert.match(css,/\.tap-row-single-stat\{--stats-column:max-content\}/);
  assert.match(css,/minmax\(0,1fr\) var\(--stats-column/);
});
test("two stats retain the configured column width",()=>{
  const markup=row({hideIbu:false});
  assert.doesNotMatch(markup,/tap-row-single-stat/);
  assert.match(markup,/class="stat stat-ibu"/);
});
test("IBU-only and no-meter rows also reclaim width",()=>{
  assert.match(row({hideAbv:true,hideIbu:false}),/tap-row-single-stat/);
});
test("bitterness meter retains its configured width",()=>{
  const markup=row({hideHopBar:false});
  assert.doesNotMatch(markup,/tap-row-single-stat/);
  assert.match(markup,/bitterness-meter/);
});
test("fully hidden stats leave no reserved column",()=>{
  const markup=row({hideStats:true});
  assert.match(markup,/tap-row-no-stats/);
  assert.doesNotMatch(markup,/tap-row-single-stat/);
});
