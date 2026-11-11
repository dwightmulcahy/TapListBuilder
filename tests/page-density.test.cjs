const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const app=read("js/app.js");
const render=read("js/render.js");
const pdf=read("js/pdf.js");
const css=read("css/menu.css");
const html=read("index.html");
const stateCode=app.slice(0,app.indexOf("function updateGlobalDescriptionControl()"));
const normalizeState=vm.runInNewContext(stateCode+"\nnormalizeState");

test("density defaults to original spacing for older saved menus and is stored per page size",()=>{
  const old=normalizeState({settings:{pageSize:"letter"},items:[]});
  assert.equal(old.settings.sizesByPageSize.letter.pageDensity,0);
  assert.equal(old.settings.sizesByPageSize["4x6"].pageDensity,0);
  const updated=normalizeState({settings:{pageSize:"4x6",sizesByPageSize:{
    letter:{pageDensity:35},"4x6":{pageDensity:90}
  }},items:[]});
  assert.equal(updated.settings.sizesByPageSize.letter.pageDensity,35);
  assert.equal(updated.settings.sizesByPageSize["4x6"].pageDensity,90);
  assert.equal(normalizeState({settings:{sizesByPageSize:{letter:{pageDensity:999},"4x6":{pageDensity:-25}}}}).settings.sizesByPageSize.letter.pageDensity,100);
  assert.equal(normalizeState({settings:{sizesByPageSize:{letter:{pageDensity:999},"4x6":{pageDensity:-25}}}}).settings.sizesByPageSize["4x6"].pageDensity,0);
});

test("Page dialog slider exposes 0–100 density and editor synchronizes both page sizes",()=>{
  assert.match(html,/id="pageDensity" type="range" min="0" max="100" step="5"/);
  assert.match(html,/setSetting\('pageDensity',Number\(this\.value\)\)/);
  assert.match(render,/set\("pageDensity",clampNumber\(sizes\.pageDensity,0,100,0\)\)/);
  assert.match(render,/set\("pageDensityValue",/);
  assert.match(app,/const SIZE_KEYS=\["pageDensity",/);
  assert.match(app,/value=key==="pageDensity"\?clampNumber\(value,0,100,0\)/);
});

test("density adjusts horizontal gaps and letter margins without changing font sizes",()=>{
  assert.match(pdf,/pageEl\.style\.setProperty\("--density-space",String\(spacingScale\)\)/);
  assert.match(pdf,/pageEl\.style\.setProperty\("--density-icon",String\(iconSpaceScale\)\)/);
  assert.match(pdf,/--page-pad-left",\x60calc\(10mm \* \$\{layoutScale\} \* \$\{marginScale\}\)\x60/);
  assert.match(pdf,/pageEl\.style\.setProperty\("--icon-scale",String\(clampNumber\(sizes\.iconScale,.50,1\.80,1\)\*iconSpaceScale\)\)/);
  assert.match(css,/gap:calc\(1\.8mm \* var\(--layout-scale,1\) \* var\(--density-space,1\)\)/);
  assert.match(css,/\.desc\{[\s\S]*?margin:calc\(\.8mm \* var\(--fit\) \* var\(--layout-scale,1\) \* var\(--density-space,1\)\)/);
  assert.match(css,/\.stat\{[^}]*var\(--density-space,1\)/);
  assert.match(pdf,/pageEl\.style\.setProperty\("--page-pad-left","0\.24in"\)/);
  assert.match(pdf,/pageEl\.style\.setProperty\("--corner-cut","0\.42in"\)/);
  assert.doesNotMatch(pdf,/pageDensity.*font-size/);
});

const makeRow=(height,marginTop=0,marginBottom=0,beer=true)=>{
  const vars={};
  return {
    offsetHeight:height,
    marginTop,marginBottom,
    classList:{contains:name=>name==="tap-row"&&beer},
    style:{setProperty:(k,v)=>{vars[k]=v},removeProperty:k=>{delete vars[k]}},
    vars
  };
};
const harness=(density,pageSize="letter")=>{
  const rows=[makeRow(30),makeRow(40),makeRow(10,5,5,false),makeRow(0,0,0,false)];
  const flags={};
  const list={children:rows,clientHeight:200,classList:{toggle:(name,value)=>{flags[name]=value}}};
  const ctx=vm.createContext({
    state:{settings:{pageSize,sizesByPageSize:{letter:{pageDensity:density},"4x6":{pageDensity:0}}}},
    document:{getElementById:id=>id==="tapList"?list:null},
    clampNumber:(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback,
    getComputedStyle:row=>({marginTop:row.marginTop+"px",marginBottom:row.marginBottom+"px"})
  });
  vm.runInContext(pdf,ctx);
  return {rows,flags,run:()=>vm.runInContext("applyDensityRowSpacing()",ctx),ctx};
};

test("vertical density continuously reduces extra row height while respecting text-row margins",()=>{
  const h=harness(50);
  h.run();
  assert.equal(h.flags["density-layout"],true);
  // 200px page - (30 + 40 + 10 + 5 + 5)px content - 2px safety = 108px spare.
  // At 50% density, split half the spare height between two beer rows: 27px each.
  assert.equal(h.rows[0].vars["--row-target-height"],"57px");
  assert.equal(h.rows[1].vars["--row-target-height"],"67px");
  assert.equal(h.rows[2].vars["--row-target-height"],undefined);
  h.ctx.state.settings.sizesByPageSize.letter.pageDensity=75;
  h.run();
  assert.equal(h.rows[0].vars["--row-target-height"],"43.5px");
  assert.equal(h.rows[1].vars["--row-target-height"],"53.5px");
  h.ctx.state.settings.sizesByPageSize.letter.pageDensity=100;
  h.run();
  assert.equal(h.flags["density-layout"],true);
  assert.equal(h.rows[0].vars["--row-target-height"],undefined);
  h.ctx.state.settings.sizesByPageSize.letter.pageDensity=0;
  h.run();
  assert.equal(h.flags["density-layout"],false);
  assert.equal(h.rows[0].vars["--row-target-height"],undefined);
});

test("no beer rows or overfilled menus do not produce negative or phantom heights",()=>{
  const h=harness(50);
  h.rows.splice(0,2);
  h.run();
  assert.equal(h.flags["density-layout"],true);
  const full=harness(50);
  full.ctx.document.getElementById("tapList").clientHeight=45;
  full.run();
  assert.equal(full.rows[0].vars["--row-target-height"],undefined);
  assert.equal(full.rows[1].vars["--row-target-height"],undefined);
});

test("fit routine remeasures density on every text-fit iteration and printing",()=>{
  assert.match(pdf,/function fitMenu\(\)\{[\s\S]*?pageEl\.style\.setProperty\("--fit",fit\);\s*applyDensityRowSpacing\(\)/);
  assert.match(pdf,/while\(overflows\(\)&&fit>\.76\)\{[\s\S]*?applyDensityRowSpacing\(\)/);
  assert.match(pdf,/function printMenu\(\)\{fitMenu\(\);window\.print\(\)\}/);
  assert.match(css,/\.tap-list\.density-layout \.tap-row\{flex:0 0 auto;min-height:var\(--row-target-height,0px\)\}/);
});


test("hidden icons and stats remove phantom grid columns, but NEW badge slot stays",()=>{
  assert.match(css,/\.tap-row-no-icon:not\(\.tap-row-has-new\) \.icon-wrap-hidden\{display:none\}/);
  assert.match(css,/\.tap-row-no-icon:not\(\.tap-row-has-new\)\{[\s\S]*?grid-template-columns:calc\(\.9mm/);
  assert.match(css,/\.tap-row-no-stats\{[\s\S]*?grid-template-columns:var\(--icon-column/);
  assert.match(css,/\.tap-row-no-icon\.tap-row-no-stats:not\(\.tap-row-has-new\)\{[\s\S]*?grid-template-columns:calc\(\.9mm \* var\(--layout-scale,1\)\) minmax\(0,1fr\)/);
  assert.match(css,/\.tap-row-no-icon\.tap-row-has-new\{--icon-column:calc\(8\.5mm/);
});
