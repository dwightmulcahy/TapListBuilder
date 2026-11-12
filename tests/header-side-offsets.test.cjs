const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");
const app=fs.readFileSync(path.join(root,"js/app.js"),"utf8");
const render=fs.readFileSync(path.join(root,"js/render.js"),"utf8");
const pdf=fs.readFileSync(path.join(root,"js/pdf.js"),"utf8");
const normalizer=vm.runInNewContext(app.slice(0,app.indexOf("function updateGlobalDescriptionControl()"))+"\nnormalizeState");
test("old JSON loads with zero offsets and each paper size keeps independent values",()=>{
  const old=normalizer({settings:{pageSize:"letter"},items:[]});
  assert.deepEqual(Array.from(old.settings.sizesByPageSize.letter.headerSlotYOffsets),[0,0,0]);
  const saved=normalizer({settings:{pageSize:"4x6",sizesByPageSize:{
    letter:{headerSlotYOffsets:[-12,0,8]},
    "4x6":{headerSlotYOffsets:[4,0,-5]}
  }},items:[]});
  assert.deepEqual(Array.from(saved.settings.sizesByPageSize.letter.headerSlotYOffsets),[-12,0,8]);
  assert.deepEqual(Array.from(saved.settings.sizesByPageSize["4x6"].headerSlotYOffsets),[4,0,-5]);
});
test("saved offsets are bounded to 20mm",()=>{
  const saved=normalizer({settings:{sizesByPageSize:{letter:{headerSlotYOffsets:[-100,0,999]}}},items:[]});
  assert.deepEqual(Array.from(saved.settings.sizesByPageSize.letter.headerSlotYOffsets),[-20,0,20]);
});
test("left, center, and right header slots show independent vertical position sliders",()=>{
  const ctx=vm.createContext({});
  vm.runInContext(render,ctx);
  const left=vm.runInContext('headerSlotEditor({type:"text",text:"Monkey Head",rotation:0},0,1,-6)',ctx);
  const center=vm.runInContext('headerSlotEditor({type:"logo",image:"",rotation:0},1,1,0)',ctx);
  const right=vm.runInContext('headerSlotEditor({type:"text",text:"Brewing Co.",rotation:0},2,1,8)',ctx);
  assert.match(left,/class="header-side-y-slider"/);
  assert.match(left,/value="-6"/);
  assert.match(left,/setHeaderSlotYOffset\(0,Number\(this.value\)\)/);
  assert.match(center,/header-side-y-slider/);
  assert.match(center,/setHeaderSlotYOffset\(1,Number\(this.value\)\)/);
  assert.match(right,/setHeaderSlotYOffset\(2,Number\(this.value\)\)/);
  assert.match(right,/value="8"/);
});
test("changing any slot offset autosaves and rerenders without changing its neighbors",()=>{
  const ctx=vm.createContext({
    state:{settings:{pageSize:"letter",sizesByPageSize:{letter:{headerSlotYOffsets:[0,0,0]}}}},
    clampNumber:(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.min(max,Math.max(min,Number(value))):fallback,
    autosave:()=>{ctx.saved++},
    renderPreview:()=>{ctx.rendered++},
    saved:0,rendered:0
  });
  const source=app.slice(app.indexOf("function setHeaderSlotYOffset("),app.indexOf("function uploadHeaderSlotImage("));
  vm.runInContext(source,ctx);
  vm.runInContext("setHeaderSlotYOffset(0,-7);setHeaderSlotYOffset(2,99);setHeaderSlotYOffset(1,5);setHeaderSlotYOffset(3,2)",ctx);
  assert.deepEqual(Array.from(ctx.state.settings.sizesByPageSize.letter.headerSlotYOffsets),[-7,5,20]);
  assert.equal(ctx.saved,3);
  assert.equal(ctx.rendered,3);
});
test("header fit accounts for the visible edge of rotated/scaled side content",()=>{
  assert.match(pdf,/slot\.style\.top="0px"/);
  assert.match(pdf,/visualTopAtZero=\(rect\.top-headerRect\.top\)\/scale/);
  assert.match(pdf,/desiredTop=Math\.max\(2,\(naturalHeight-height\)\/2\+offsetPx\)/);
  assert.match(pdf,/neededPx=Math\.max\(neededPx,\(content\.getBoundingClientRect\(\)\.bottom-headerRect\.top\)\/scale\+sideClearance\)/);
  assert.match(pdf,/baseCenterBottom=centerBottom\+baseShift-shift/);
});
