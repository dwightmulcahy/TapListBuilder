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
const normalize=vm.runInNewContext(stateCode+"\nnormalizeItem");
const ctx=vm.createContext({
  state:{items:[{type:"divider",text:"Ciders",fontSize:12,spaceAbove:5}]},
  expandedItemIndices:new Set(),
  clampNumber:(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.min(max,Math.max(min,Number(value))):fallback
});
vm.runInContext(render,ctx);
const row=item=>vm.runInContext("renderTapRow("+JSON.stringify(item)+")",ctx);

test("existing dividers keep zero extra whitespace and new values are clamped",()=>{
  assert.equal(normalize({type:"divider",text:"Ciders"}).spaceAbove,0);
  assert.equal(normalize({type:"divider",spaceAbove:999}).spaceAbove,20);
  assert.equal(normalize({type:"divider",spaceAbove:-5}).spaceAbove,0);
  assert.equal(normalize({type:"divider",spaceAbove:7.5}).spaceAbove,7.5);
});
test("labeled and plain divider rows both expose their own spacing variable",()=>{
  const labeled=row({type:"divider",text:"Ciders",fontSize:14,spaceAbove:7.5});
  const plain=row({type:"divider",text:"",fontSize:14,spaceAbove:2});
  assert.match(labeled,/class="tap-divider-row" style="--divider-space-above:7\.5mm"/);
  assert.match(labeled,/--divider-font-size:14pt/);
  assert.match(plain,/class="tap-divider-row tap-divider-row-plain" style="--divider-space-above:2mm"/);
});
test("editor has a live per-divider 0–20 mm slider",()=>{
  const html=vm.runInContext("dividerEditorCard(state.items[0],0)",ctx);
  assert.match(html,/Whitespace above divider/);
  assert.match(html,/class="divider-space-slider" type="range" min="0" max="20" step="0\.5"/);
  assert.match(html,/setItem\(0,'spaceAbove',Number\(this.value\)\)/);
  assert.match(html,/id="dividerSpaceAboveValue-0"/);
});
test("slider setter clamps before saving and preview update",()=>{
  const setter=app.slice(app.indexOf("function setItem("),app.indexOf("const ITEMS_UNDO_LIMIT"));
  const local=vm.createContext({
    state:{items:[{type:"divider",text:"Ciders",fontSize:12,spaceAbove:0}]},
    STATS_SIZE_LIMITS:{},
    clampNumber:(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback,
    autosave:()=>local.saved++,
    renderPreview:()=>local.rendered++,
    saved:0,rendered:0
  });
  vm.runInContext(setter,local);
  vm.runInContext("setItem(0,'spaceAbove',50);setItem(0,'spaceAbove',-4)",local);
  assert.equal(local.state.items[0].spaceAbove,0);
  assert.equal(local.saved,2);
  assert.equal(local.rendered,2);
});
test("spacing uses real flex margin and removes duplicate line above divider",()=>{
  assert.match(css,/\.tap-row:has\(\+ \.tap-divider-row\)\{border-bottom:0\}/);
  assert.match(css,/\.tap-divider-row\{[^}]*flex:0 0 0;height:0;min-height:0;margin:0;margin-top:calc\(var\(--divider-space-above,0mm\) \* var\(--layout-scale,1\)\);padding:0/);
  assert.match(css,/\.tap-divider-row::before,\.tap-divider-row::after/);
});
