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
  clampGlutenFreeFontSize:value=>Number.isFinite(Number(value))?Math.min(20,Math.max(6,Math.round(Number(value)*2)/2)):7,
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
  outlineEnabled:false,glutenFree:true,glutenFreePlacement:"inline",glutenFreeFontSize:7,
  hideIcon:false,hideAbv:true,hideIbu:true,hideHopBar:true,
  hideBitternessLabel:true,hideHopMarker:true,
  ...overrides
});
const row=beer=>vm.runInContext("renderTapRow("+JSON.stringify(beer)+")",context);

test("older saved beers keep inline gluten-free label and default font size",()=>{
  const old=normalizer({name:"Test IPA",glutenFree:true,icon:"beer"});
  assert.equal(old.glutenFreePlacement,"inline");
  assert.equal(old.glutenFreeFontSize,7);
  assert.equal(normalizer({name:"Test IPA",glutenFree:true,glutenFreePlacement:"vertical",icon:"beer"}).glutenFreePlacement,"vertical");
  assert.equal(normalizer({name:"Test IPA",glutenFree:true,glutenFreePlacement:"unsupported",icon:"beer"}).glutenFreePlacement,"inline");
  assert.match(app,/if\(key==="glutenFreePlacement"\)value=value==="vertical"\?"vertical":"inline"/);
  const markup=row(item());
  assert.match(markup,/<h2 class="item-name"[^>]*>Test IPA<span class="badge badge-gluten">GLUTEN FREE<\/span><\/h2>/);
  assert.doesNotMatch(markup,/gluten-side-label|tap-row-gluten-side/);
});

test("vertical label appears before the visible icon, not beside the name",()=>{
  const markup=row(item({glutenFreePlacement:"vertical"}));
  assert.match(markup,/class="tap-row tap-row-gluten-side tap-row-no-stats"/);
  assert.match(markup,/<span class="gluten-side-label">GLUTEN FREE<\/span>\s*<div class="icon-wrap"><svg class="test-icon"><\/svg>/);
  assert.match(markup,/<h2 class="item-name"[^>]*>Test IPA<\/h2>/);
  assert.equal((markup.match(/GLUTEN FREE/g)||[]).length,1);
  assert.match(css,/\.gluten-side-label\{[^}]*writing-mode:vertical-rl;transform:rotate\(180deg\)/);
  assert.match(css,/\.tap-row-gluten-side\{[^}]*grid-template-columns:var\(--gluten-column/);
  assert.match(css,/\.tap-row-gluten-side\.tap-row-no-stats\{[^}]*grid-template-columns:var\(--gluten-column/);
  assert.match(css,/--gluten-column:max\(calc\(7mm \* var\(--layout-scale,1\) \* var\(--density-icon,1\)\)/);
});

test("hidden icon keeps vertical gluten-free in its own gutter beside vertical NEW",()=>{
  const markup=row(item({glutenFreePlacement:"vertical",hideIcon:true,isNew:true,newBadgeStyle:"pill"}));
  assert.match(markup,/class="tap-row tap-row-no-icon tap-row-gluten-side tap-row-has-new tap-row-no-stats"/);
  assert.match(markup,/<span class="gluten-side-label">GLUTEN FREE<\/span>\s*<div class="icon-wrap icon-wrap-hidden"><div class="new-badge-overlay"/);
  assert.match(markup,/<h2 class="item-name"[^>]*>Test IPA<\/h2>/);
  assert.equal((markup.match(/GLUTEN FREE/g)||[]).length,1);
  assert.match(css,/\.tap-row-gluten-side\.tap-row-no-icon\.tap-row-has-new\.tap-row-no-stats\{/);
});

test("hidden icon without NEW releases icon track and retains vertical gluten gutter",()=>{
  const markup=row(item({glutenFreePlacement:"vertical",hideIcon:true,isNew:false}));
  assert.match(markup,/class="tap-row tap-row-no-icon tap-row-gluten-side tap-row-no-stats"/);
  assert.match(markup,/<span class="gluten-side-label">GLUTEN FREE<\/span>/);
  assert.match(css,/\.tap-row-gluten-side\.tap-row-no-icon\.tap-row-no-stats:not\(\.tap-row-has-new\)\{/);
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
  assert.doesNotMatch(vertical,/<span class="badge badge-gluten">SIN GLUTEN<\/span>/);
  const inline=row(item({glutenFreePlacement:"inline"}));
  assert.match(inline,/<span class="badge badge-gluten">SIN GLUTEN<\/span>/);
  context.state.settings.language="en";
});

test("font size is clamped and used in both placements",()=>{
  assert.equal(normalizer({name:"Cider",icon:"beer",glutenFree:true,glutenFreeFontSize:100}).glutenFreeFontSize,20);
  assert.equal(normalizer({name:"Cider",icon:"beer",glutenFree:true,glutenFreeFontSize:3}).glutenFreeFontSize,6);
  for(const placement of ["inline","vertical"]){
    const markup=row(item({glutenFreePlacement:placement,glutenFreeFontSize:14.5}));
    assert.match(markup,/--gluten-label-font-size:14\.5pt/);
  }
  assert.match(css,/\.badge-gluten\{font-size:calc\(var\(--gluten-label-font-size,7pt\)/);
  assert.match(css,/\.gluten-side-label\{[\s\S]*?font-size:calc\(var\(--gluten-label-font-size,7pt\)/);
});

test("beer editor offers placement and font controls with accurate hidden-icon help",()=>{
  assert.match(render,/class="gluten-free-placement" onchange="setItem\(\$\{i\},'glutenFreePlacement',this\.value\)"/);
  assert.match(render,/value="inline"[^>]*>Beside beer name \(default\)<\/option>/);
  assert.match(render,/value="vertical"[^>]*>Vertical, left of icon<\/option>/);
  assert.match(render,/class="gluten-free-font-slider"/);
  assert.match(render,/setItem\(\$\{i\},'glutenFreeFontSize',Number\(this\.value\)\)/);
  assert.match(render,/Vertical placement stays left of the icon or vertical NEW tag even when the icon is hidden/);
});
