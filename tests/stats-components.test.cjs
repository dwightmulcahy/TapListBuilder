const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const app = read("js/app.js");
const render = read("js/render.js");
const ibu = read("js/ibu.js");
const css = read("css/menu.css");
const ctx = vm.createContext({ICONS:{beer:true},inferIcon:()=>"beer"});
vm.runInContext(app.slice(0,app.indexOf("function updateGlobalDescriptionControl()")) + "\n" + ibu + "\n" + render, ctx);
vm.runInContext('state={settings:{language:"en"}}',ctx);
const normalize = item => vm.runInContext("normalizeItem(" + JSON.stringify(item) + ")",ctx);
const row = item => vm.runInContext("renderTapRow(" + JSON.stringify(item) + ")",ctx);
const base = {name:"IPA",icon:"beer",hideIcon:true,style:"Hazy IPA",abv:"6.5",ibu:"60",sg:"1.060",description:"A juicy IPA"};

test("old menus keep existing stats, labels, divider, and hop bar", () => {
  const item=normalize(base);
  assert.equal(item.hideStats,false);
  assert.equal(item.hideStyle,false);
  assert.equal(item.hideAbvLabel,false);
  assert.equal(item.hideIbuLabel,false);
  assert.equal(item.hideStatsDivider,false);
  assert.equal(item.hideHopMarker,false);
  assert.equal(item.hideBitternessLabel,false);
  assert.equal(item.statsWidth,41);
  assert.equal(item.styleFontSize,11.5);
  assert.equal(item.abvValueFontSize,18.5);
  assert.equal(item.ibuValueFontSize,18.5);
  assert.equal(item.hopBarHeight,3.2);
  const html=row(item);
  assert.match(html,/class="item-title-line"><h2[^>]*>IPA<\/h2><span class="item-style">Hazy IPA<\/span><\/div>/);
  assert.doesNotMatch(html,/<div class="stats">[^<]*<span class="item-style">/);
  assert.match(html,/class="stat-label stat-label-abv">ABV/);
  assert.match(html,/class="stat-label stat-label-ibu">IBU/);
  assert.match(html,/class="bitterness-track"/);
  assert.match(html,/class="bitterness-marker"/);
  assert.match(html,/class="bitterness-labels"/);
});

test("each stats component can be hidden without hiding its neighbor", () => {
  const item=normalize({...base,hideStyle:true,hideAbvLabel:true,hideIbuLabel:true,hideStatsDivider:true,hideHopMarker:true,hideBitternessLabel:true});
  const html=row(item);
  assert.doesNotMatch(html,/class="item-style"/);
  assert.match(html,/class="value value-abv">6.5%/);
  assert.match(html,/class="value value-ibu">60/);
  assert.doesNotMatch(html,/class="stat-label/);
  assert.match(html,/stats-row-no-divider/);
  assert.match(html,/class="bitterness-track"/);
  assert.doesNotMatch(html,/class="bitterness-marker"/);
  assert.doesNotMatch(html,/class="bitterness-labels"/);
});

test("hop bar and bitterness description can each display independently", () => {
  const labelOnly=row(normalize({...base,hideHopBar:true,hideBitternessLabel:false}));
  assert.doesNotMatch(labelOnly,/class="bitterness-track"/);
  assert.match(labelOnly,/class="bitterness-labels"/);
  const barOnly=row(normalize({...base,hideHopBar:false,hideBitternessLabel:true}));
  assert.match(barOnly,/class="bitterness-track"/);
  assert.doesNotMatch(barOnly,/class="bitterness-labels"/);
  const legacy=row(normalize({...base,hideIbu:true}));
  assert.doesNotMatch(legacy,/class="bitterness-meter"/);
});

test("hidden or empty stats sections release the entire right column", () => {
  for (const extra of [
    {hideStats:true},
    {hideStyle:true,hideAbv:true,hideIbu:true,hideHopBar:true,hideBitternessLabel:true}
  ]) {
    const html=row(normalize({...base,...extra}));
    assert.match(html,/class="tap-row tap-row-no-icon tap-row-no-stats"/);
    assert.match(html,/<div class="stats"><\/div>/);
  }
  assert.match(css,/\.tap-row-no-stats\{--stats-column:0px\}/);
  assert.match(css,/\.tap-row-no-stats \.stats\{display:none\}/);
});

test("each numeric control is clamped and emitted as a typed CSS variable", () => {
  const item=normalize({...base,statsWidth:100,statsGap:-5,abvValueFontSize:100,ibuValueFontSize:9,hopBarHeight:0,hopMarkerSize:100,bitternessLabelFontSize:20});
  assert.equal(item.statsWidth,65);
  assert.equal(item.statsGap,0);
  assert.equal(item.abvValueFontSize,36);
  assert.equal(item.ibuValueFontSize,9);
  assert.equal(item.hopBarHeight,1);
  assert.equal(item.hopMarkerSize,10);
  const html=row(item);
  assert.match(html,/--stats-width:65mm/);
  assert.match(html,/--stats-gap:0mm/);
  assert.match(html,/--abv-value-font-size:36pt/);
  assert.match(html,/--ibu-value-font-size:9pt/);
  assert.match(html,/--hop-bar-height:1mm/);
  assert.match(html,/--hop-marker-size:10mm/);
  assert.match(html,/--bitterness-label-font-size:20pt/);
  assert.match(css,/var\(--stats-width,41mm\) \* var\(--layout-scale,1\) \* var\(--stats-scale,1\)/);
});

test("stats editor exposes all independent visibility and size controls", () => {
  const html=vm.runInContext("statsDisplayEditor(" + JSON.stringify(normalize(base)) + ",0)",ctx);
  for (const key of ["hideStats","hideAbvLabel","hideIbuLabel","hideStatsDivider","hideHopMarker","hideBitternessLabel"]) {
    assert.match(html,new RegExp("setItem\\(0,'"+key+"',this\\.checked\\)"));
  }
  for (const key of ["statsWidth","statsGap","abvValueFontSize","ibuValueFontSize","abvLabelFontSize","ibuLabelFontSize","hopBarHeight","hopMarkerSize","bitternessLabelFontSize"]) {
    assert.match(html,new RegExp("statsSize-0-"+key));
  }
  assert.match(html,/applyStatsToAllBeers\(0\)/);
});

test("apply-to-all copies only stats display settings, preserving beer values", () => {
  const fn=app.match(/function applyStatsToAllBeers\(index\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(fn);
  ctx.pushItemsUndoSnapshot=()=>{};
  ctx.autosave=()=>{};
  ctx.renderEditor=()=>{};
  ctx.renderPreview=()=>{};
  vm.runInContext(fn,ctx);
  const source=normalize({...base,statsWidth:52,hideAbv:true,hideBitternessLabel:true,styleFontSize:19,hideStyle:true});
  const other=normalize({...base,name:"Stout",abv:"9.2",ibu:"20",statsWidth:41,styleFontSize:12,hideStyle:false});
  const divider=normalize({type:"divider",text:"Seasonals"});
  ctx.stateForTest={settings:{language:"en"},items:[source,divider,other]};
  vm.runInContext("state=stateForTest",ctx);
  vm.runInContext("applyStatsToAllBeers(0)",ctx);
  assert.equal(other.statsWidth,52);
  assert.equal(other.hideAbv,true);
  assert.equal(other.hideBitternessLabel,true);
  assert.equal(other.abv,"9.2");
  assert.equal(other.ibu,"20");
  assert.equal(other.styleFontSize,12);
  assert.equal(other.hideStyle,false);
  assert.equal(divider.type,"divider");
});


test("beer style stays next to the name even when the stats column is hidden", () => {
  const html=row(normalize({...base,hideStats:true,styleFontSize:17.5}));
  assert.match(html,/class="tap-row tap-row-no-icon tap-row-no-stats"/);
  assert.match(html,/class="item-title-line"><h2[^>]*>IPA<\/h2><span class="item-style">Hazy IPA<\/span>/);
  assert.match(html,/--style-font-size:17.5pt/);
  assert.match(html,/<div class="stats"><\/div>/);
  assert.match(css,/\.item-title-line\{display:flex;flex-wrap:wrap;align-items:baseline/);
  assert.match(css,/\.item-style\{[^}]*var\(--style-font-size,11\.5pt\)/);
  assert.doesNotMatch(css,/\.style-label\{/);
});

test("style visibility and font size remain independent of ABV and IBU", () => {
  const hidden=row(normalize({...base,hideStyle:true}));
  assert.doesNotMatch(hidden,/class="item-style"/);
  assert.match(hidden,/class="stat-label stat-label-abv">ABV/);
  assert.match(hidden,/class="stat-label stat-label-ibu">IBU/);
  const blank=row(normalize({...base,style:""}));
  assert.doesNotMatch(blank,/class="item-style"/);
  const oversized=normalize({...base,styleFontSize:100});
  assert.equal(oversized.styleFontSize,24);
  assert.match(row(oversized),/--style-font-size:24pt/);
});

test("beer style controls are next to the beer name settings, not inside ABV/IBU", () => {
  assert.match(render,/class="beer-style-font-slider"[^>]*min="6" max="24" step="0\.5"/);
  assert.match(render,/id="styleFontSizeValue-\$\{i\}"/);
  assert.match(render,/Show beer style next to name/);
  assert.match(render,/applyStyleAppearanceToAllBeers\(\$\{i\}\)/);
  const statsHtml=vm.runInContext("statsDisplayEditor(" + JSON.stringify(normalize(base)) + ",0)",ctx);
  assert.doesNotMatch(statsHtml,/statsSize-0-styleFontSize/);
  assert.doesNotMatch(statsHtml,/hideStyle/);
});

test("apply style appearance to all beers does not change names, style text or stats", () => {
  const fn=app.match(/function applyStyleAppearanceToAllBeers\(index\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(fn);
  ctx.pushItemsUndoSnapshot=()=>{};
  ctx.autosave=()=>{};
  ctx.renderEditor=()=>{};
  ctx.renderPreview=()=>{};
  vm.runInContext(fn,ctx);
  const source=normalize({...base,hideStyle:true,styleFontSize:17.5});
  const other=normalize({...base,name:"Stout",style:"Imperial Stout",abv:"9.2",ibu:"80",hideStyle:false,styleFontSize:10});
  const divider=normalize({type:"divider",text:"Seasonals"});
  ctx.styleTestItems={items:[source,divider,other]};
  vm.runInContext("state=styleTestItems;applyStyleAppearanceToAllBeers(0)",ctx);
  assert.equal(other.hideStyle,true);
  assert.equal(other.styleFontSize,17.5);
  assert.equal(other.style,"Imperial Stout");
  assert.equal(other.name,"Stout");
  assert.equal(other.abv,"9.2");
  assert.equal(other.ibu,"80");
  assert.equal(divider.type,"divider");
});
