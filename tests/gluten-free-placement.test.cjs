const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const app=fs.readFileSync(path.join(root,"js/app.js"),"utf8");
const render=fs.readFileSync(path.join(root,"js/render.js"),"utf8");
const css=fs.readFileSync(path.join(root,"css/menu.css"),"utf8");
const stateCode=app.slice(0,app.indexOf("function updateGlobalDescriptionControl()"));
const normalizer=vm.runInNewContext(
  'const ICONS={beer:"icon"};function inferIcon(){return "beer";}\n'+stateCode+"\nnormalizeItem"
);
const context=vm.createContext({
  state:{settings:{language:"en"}},
  clampBeerNameFontSize:value=>value||18,
  clampDescriptionFontSize:value=>value||12,
  clampNumber:(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback,
  bitternessMeter:()=>"",
  renderedIcon:()=>'<svg class="test-icon"></svg>',
  STATS_SIZE_LIMITS:{statsWidth:[24,65,41]},
  clampStatsSize:(_,value)=>value??41
});
vm.runInContext(render,context);
const item=(overrides={})=>({
  type:"beer",name:"Test IPA",style:"IPA",color:"#123456",
  description:"Test description",nameFontSize:18,descriptionFontSize:12,
  outlineEnabled:false,glutenFree:true,glutenFreePlacement:"inline",
  hideIcon:false,hideAbv:true,hideIbu:true,hideHopBar:true,
  hideBitternessLabel:true,hideHopMarker:true,
  ...overrides
});
const row=beer=>vm.runInContext("renderTapRow("+JSON.stringify(beer)+")",context);

test("older saved beers keep the existing inline gluten-free label",()=>{
  assert.equal(normalizer({name:"Test IPA",glutenFree:true,icon:"beer"}).glutenFreePlacement,"inline");
  assert.equal(normalizer({name:"Test IPA",glutenFree:true,glutenFreePlacement:"vertical",icon:"beer"}).glutenFreePlacement,"vertical");
  assert.equal(normalizer({name:"Test IPA",glutenFree:true,glutenFreePlacement:"unsupported",icon:"beer"}).glutenFreePlacement,"inline");
  assert.match(app,/if\(key==="glutenFreePlacement"\)value=value==="vertical"\?"vertical":"inline"/);
  const markup=row(item());
  assert.match(markup,/<h2 class="item-name"[^>]*>Test IPA<span class="badge">GLUTEN FREE<\/span><\/h2>/);
  assert.doesNotMatch(markup,/gluten-side-label|tap-row-gluten-side/);
});

test("vertical option puts gluten-free text before the visible icon, not beside the name",()=>{
  const markup=row(item({glutenFreePlacement:"vertical"}));
  assert.match(markup,/class="tap-row tap-row-gluten-side tap-row-no-stats"/);
  assert.match(markup,/<span class="gluten-side-label">GLUTEN FREE<\/span>\s*<div class="icon-wrap"><svg class="test-icon"><\/svg>/);
  assert.match(markup,/<h2 class="item-name"[^>]*>Test IPA<\/h2>/);
  assert.equal((markup.match(/GLUTEN FREE/g)||[]).length,1);
  assert.match(css,/\.gluten-side-label\{[^}]*writing-mode:vertical-rl;transform:rotate\(180deg\)/);
  assert.match(css,/\.tap-row-gluten-side\{[^}]*grid-template-columns:var\(--gluten-column/);
  assert.match(css,/\.tap-row-gluten-side\.tap-row-no-stats\{[^}]*grid-template-columns:var\(--gluten-column/);
  assert.match(css,/--gluten-column,calc\(7mm \* var\(--layout-scale,1\) \* var\(--density-icon,1\)\)/);
});

test("icon hidden falls back to inline label without colliding with vertical NEW badge",()=>{
  const markup=row(item({glutenFreePlacement:"vertical",hideIcon:true,isNew:true,newBadgeStyle:"pill"}));
  assert.match(markup,/class="tap-row tap-row-no-icon tap-row-has-new tap-row-no-stats"/);
  assert.doesNotMatch(markup,/tap-row-gluten-side|gluten-side-label/);
  assert.match(markup,/<h2 class="item-name"[^>]*>Test IPA<span class="badge">GLUTEN FREE<\/span><\/h2>/);
  assert.match(markup,/class="icon-wrap icon-wrap-hidden"><div class="new-badge-overlay"/);
});

test("vertical gluten-free and NEW overlay coexist on a visible icon",()=>{
  const markup=row(item({glutenFreePlacement:"vertical",isNew:true,newBadgeStyle:"starburst"}));
  assert.match(markup,/class="tap-row tap-row-gluten-side tap-row-has-new tap-row-no-stats"/);
  assert.match(markup,/<span class="gluten-side-label">GLUTEN FREE<\/span>\s*<div class="icon-wrap"><svg class="test-icon"><\/svg><div class="new-badge-overlay"/);
  assert.match(markup,/badge-new-starburst/);
});

test("no gluten-free designation never creates an empty column",()=>{
  const markup=row(item({glutenFree:false,glutenFreePlacement:"vertical"}));
  assert.doesNotMatch(markup,/gluten-side-label|tap-row-gluten-side|GLUTEN FREE/);
});

test("Spanish menu translates both vertical and inline gluten-free labels",()=>{
  context.state.settings.language="es";
  const vertical=row(item({glutenFreePlacement:"vertical"}));
  assert.match(vertical,/<span class="gluten-side-label">SIN GLUTEN<\/span>/);
  assert.doesNotMatch(vertical,/<span class="badge">SIN GLUTEN<\/span>/);
  const inline=row(item({glutenFreePlacement:"inline"}));
  assert.match(inline,/<span class="badge">SIN GLUTEN<\/span>/);
  context.state.settings.language="en";
});

test("beer editor offers both placements and explains hidden-icon behavior",()=>{
  assert.match(render,/class="gluten-free-placement" onchange="setItem\(\$\{i\},'glutenFreePlacement',this\.value\)"/);
  assert.match(render,/value="inline"[^>]*>Beside beer name \(default\)<\/option>/);
  assert.match(render,/value="vertical"[^>]*>Vertical, left of icon<\/option>/);
  assert.match(render,/When the icon is hidden, the gluten-free label stays beside the beer name/);
});
