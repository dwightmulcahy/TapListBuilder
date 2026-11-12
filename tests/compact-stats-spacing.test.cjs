const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const css=fs.readFileSync(path.join(root,"css/menu.css"),"utf8");
const ibu=fs.readFileSync(path.join(root,"js/ibu.js"),"utf8");
const ctx=vm.createContext({state:{settings:{language:"en"}}});
vm.runInContext(ibu,ctx);
const meter=options=>vm.runInContext("bitternessMeter(32,'1.050','1.010',"+JSON.stringify(options)+")",ctx);

test("ABV and IBU pair draws closer together within the configured column",()=>{
  assert.match(css,/\.stats-row\{[^}]*width:calc\(100% - 4mm \* var\(--layout-scale,1\) \* var\(--stats-scale,1\)\);margin-inline:auto/);
  assert.match(css,/\.stats-row-single\{grid-template-columns:1fr;width:100%\}/);
  assert.match(css,/\.stat\{[^}]*padding:0 calc\(\.6mm/);
});
test("ABV/IBU label gaps are smaller without losing the vertical-spacing slider",()=>{
  assert.match(css,/\.stat-label\{[^}]*margin-top:calc\(var\(--stats-gap,1\.2mm\) \* \.5 \*/);
  assert.match(css,/\.bitterness-meter\{margin-top:calc\(\(var\(--stats-gap,1\.2mm\) \+ \.8mm\)/);
});
test("taste descriptor alone gets a smaller top gap with no phantom track clearance",()=>{
  const html=meter({showTrack:false,showLabel:true});
  assert.match(html,/class="bitterness-meter bitterness-meter-label-only"/);
  assert.match(html,/class="bitterness-labels"/);
  assert.doesNotMatch(html,/bitterness-track|bitterness-marker/);
  assert.match(css,/\.bitterness-meter-label-only\{margin-top:calc\(\(\.2mm \+ var\(--stats-gap,1\.2mm\) \* \.35\)/);
  assert.match(css,/\.bitterness-meter-label-only \.bitterness-labels\{margin-top:0\}/);
});
test("a visible hop track retains marker clearance and existing meter class",()=>{
  const html=meter({showTrack:true,showLabel:true,showMarker:true});
  assert.match(html,/class="bitterness-meter"/);
  assert.doesNotMatch(html,/bitterness-meter-label-only/);
  assert.match(html,/class="bitterness-track"/);
  assert.match(html,/class="bitterness-marker"/);
});
test("hidden meter remains hidden",()=>{
  assert.equal(meter({showTrack:false,showLabel:false}),"");
});
