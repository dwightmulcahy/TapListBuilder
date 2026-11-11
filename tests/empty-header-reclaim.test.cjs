const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const render=fs.readFileSync(path.join(root,"js/render.js"),"utf8");
const pdf=fs.readFileSync(path.join(root,"js/pdf.js"),"utf8");
const css=fs.readFileSync(path.join(root,"css/menu.css"),"utf8");
const defaultSlots=()=>[
  {type:"none",text:"",image:"",rotation:0},
  {type:"none",text:"",image:"",rotation:0},
  {type:"none",text:"",image:"",rotation:0}
];
const createHarness=(pageSize="letter")=>{
  const vars={};
  const classes={};
  const elements={};
  const style={setProperty:(key,value)=>{vars[key]=value}};
  const page={style,classList:{toggle:(name,value)=>{classes[name]=value}}};
  const document={
    documentElement:{style:{setProperty:()=>{}}},
    getElementById(id){
      if(id==="page")return page;
      return elements[id]??(elements[id]={textContent:"",innerHTML:""});
    },
    querySelector:()=>null
  };
  const ctx=vm.createContext({document,console,currentShellScale:1,clampNumber:(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback});
  vm.runInContext(render+"\n"+pdf,ctx);
  ctx.state={
    settings:{
      pageSize,showHeader:true,showFooter:false,
      headerSlots:defaultSlots(),
      sizesByPageSize:{
        letter:{iconScale:1,statsScale:1,headerSlotScales:[1,1,1],watermarkScale:1,watermarkOpacity:0.5},
        "4x6":{iconScale:1,statsScale:1,headerSlotScales:[1,1,1],watermarkScale:1,watermarkOpacity:0.5}
      }
    }
  };
  return {ctx,vars,classes,elements,apply:()=>vm.runInContext("applySettings()",ctx)};
};

test("header detection ignores empty and whitespace-only text but includes default or uploaded logos",()=>{
  const {ctx}=createHarness();
  const has=slots=>vm.runInContext("headerHasContent("+JSON.stringify(slots)+")",ctx);
  assert.equal(has(defaultSlots()),false);
  assert.equal(has([{type:"text",text:" \n  "}]),false);
  assert.equal(has([{type:"none",text:"orphaned"}]),false);
  assert.equal(has([{type:"text",text:" Taproom "}]),true);
  assert.equal(has([{type:"logo",image:""}]),true);
  assert.equal(has([{type:"logo",image:"data:image/png;base64,abc"}]),true);
  assert.equal(vm.runInContext("headerSlotContent({type:'text',text:' \\n ' ,rotation:0},1)",ctx),"");
});

for(const pageSize of ["letter","4x6"]){
  test(pageSize+": empty header releases entire grid row without changing the user's showHeader preference",()=>{
    const h=createHarness(pageSize);
    h.apply();
    assert.equal(h.classes["hide-header"],true);
    assert.equal(h.vars["--header-height"],"0px");
    assert.equal(h.ctx.state.settings.showHeader,true);
    h.ctx.state.settings.headerSlots[1]={type:"text",text:"Beer on Tap",rotation:0};
    h.apply();
    assert.equal(h.classes["hide-header"],false);
    assert.notEqual(h.vars["--header-height"],"0px");
    h.ctx.state.settings.headerSlots[1]={type:"text",text:"   ",rotation:0};
    h.apply();
    assert.equal(h.classes["hide-header"],true);
    assert.equal(h.vars["--header-height"],"0px");
  });
}

test("explicit hide-header still hides populated header; footer remains independent",()=>{
  const h=createHarness();
  h.ctx.state.settings.headerSlots[0]={type:"logo",image:"",rotation:0};
  h.ctx.state.settings.showHeader=false;
  h.ctx.state.settings.showFooter=true;
  h.apply();
  assert.equal(h.classes["hide-header"],true);
  assert.equal(h.classes["hide-footer"],false);
  assert.equal(h.vars["--header-height"],"0px");
  assert.notEqual(h.vars["--footer-height"],"0px");
  assert.match(css,/\.page\.hide-header \.header,\.page\.hide-footer \.footer\{display:none\}/);
});
