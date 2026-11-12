const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const css=fs.readFileSync(path.join(root,"css/menu.css"),"utf8");
const pdf=fs.readFileSync(path.join(root,"js/pdf.js"),"utf8");
const render=fs.readFileSync(path.join(root,"js/render.js"),"utf8");

function fitHarness({pageSize="letter",scale=1,sideHeights=[120,100],center=null,showHeader=true,yOffsets=[0,0,0]}={}){
  let headerHeight=220;
  let centerShift=0;
  const values={};
  const headerVars={};
  const page={style:{setProperty(key,value){
    values[key]=value;
    if(key==="--header-height")headerHeight=parseFloat(value);
  }}};
  const header={
    style:{setProperty(key,value){
      headerVars[key]=value;
      if(key==="--header-center-shift")centerShift=parseFloat(value);
    }},
    getBoundingClientRect:()=>({top:0,height:headerHeight*scale})
  };
  const slots=[0,1,2].map(()=>({style:{top:"0px"},firstElementChild:null}));
  for(const [index,height] of [[0,sideHeights[0]],[2,sideHeights[1]]]){
    if(height===null)continue;
    slots[index].firstElementChild={
      getBoundingClientRect:()=>({
        top:parseFloat(slots[index].style.top)*scale,
        height:height*scale,
        bottom:(parseFloat(slots[index].style.top)+height)*scale
      })
    };
  }
  if(center!==null){
    slots[1].firstElementChild={
      getBoundingClientRect:()=>{
        const top=(center.visualTop+centerShift)*scale;
        return {top,bottom:top+center.height*scale,height:center.height*scale};
      }
    };
  }
  const ctx=vm.createContext({
    currentShellScale:scale,
    state:{settings:{
      showHeader,pageSize,
      headerSlots:slots.map(slot=>({type:slot.firstElementChild?"logo":"none"})),
      sizesByPageSize:{[pageSize]:{pageDensity:0,headerSlotYOffsets:yOffsets}}
    }},
    headerHasContent:slots=>slots.some(slot=>slot.type==="logo"),
    clampNumber:(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback,
    document:{
      getElementById:id=>{
        if(id==="page")return page;
        const match=/^headerSlot([012])$/.exec(id);
        return match?slots[Number(match[1])]:null;
      },
      querySelector:selector=>selector===".header"?header:null
    }
  });
  vm.runInContext(pdf,ctx);
  return {
    run:()=>vm.runInContext("fitHeader()",ctx),
    values,headerVars,
    geometry:()=>({height:headerHeight,centerShift,centerTop:center?center.visualTop+centerShift:null,
      centerBottom:center?center.visualTop+centerShift+center.height:null,
      sideTops:[parseFloat(slots[0].style.top),parseFloat(slots[2].style.top)]})
  };
}

test("side images occupy two full half-width columns, center overlays them near top",()=>{
  assert.match(css,/\.header\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s);
  assert.match(css,/\.header-slot:first-child\{[^}]*grid-column:1/);
  assert.match(css,/\.header-slot:first-child\{[^}]*position:absolute;left:/);
  assert.match(css,/\.header-slot:last-child\{[^}]*position:absolute;right:/);
  assert.match(css,/\.header-slot:last-child\{[^}]*grid-column:2/);
  assert.match(css,/\.header-slot:nth-child\(2\)\{[^}]*position:absolute;left:50%;top:calc\(1\.5mm/s);
  assert.match(css,/\.header-slot:nth-child\(2\)\{[^}]*z-index:2/s);
  assert.match(css,/\.header-slot:first-child\{[^}]*z-index:1/);
  assert.match(css,/\.header-slot:last-child\{[^}]*z-index:1/);
  assert.match(css,/\.header-slot img\{[^}]*max-height:/s);
});

test("center logo scaled smaller than its intrinsic box moves UP to visible top margin",()=>{
  const h=fitHarness({sideHeights:[120,100],center:{visualTop:33,height:90}});
  h.run();
  const g=h.geometry();
  assert.equal(g.centerTop,5);
  assert.equal(g.centerShift,-28);
  assert.equal(g.height,136); // side height + symmetric clearance
  assert.ok(g.centerBottom+12<=g.height);
});

test("large or rotated center logo moves DOWN just enough to avoid clipping",()=>{
  const h=fitHarness({sideHeights:[150,130],center:{visualTop:-42,height:250}});
  h.run();
  const g=h.geometry();
  assert.equal(g.centerShift,47);
  assert.equal(g.centerTop,5);
  assert.equal(g.height,267);
  assert.ok(g.centerBottom+12<=g.height);
});

test("left/right images alone use the tallest side, no center offset",()=>{
  const h=fitHarness({sideHeights:[135,160]});
  h.run();
  assert.equal(h.geometry().height,176);
  assert.equal(h.headerVars["--header-center-shift"],"0px");
});

test("4x6 card keeps a scaled top clearance for the center logo",()=>{
  const h=fitHarness({pageSize:"4x6",sideHeights:[60,50],center:{visualTop:17,height:85}});
  h.run();
  assert.equal(h.geometry().centerTop,3);
  assert.equal(h.geometry().height,100);
});

test("shell zoom does not distort the computed header height or center shift",()=>{
  const h=fitHarness({scale:.6,sideHeights:[150,130],center:{visualTop:-42,height:250}});
  h.run();
  assert.equal(h.geometry().centerTop,5);
  assert.equal(h.geometry().height,267);
});

test("explicitly hidden header never changes height",()=>{
  const h=fitHarness({showHeader:false,center:{visualTop:10,height:90}});
  h.run();
  assert.equal(h.values["--header-height"],undefined);
});

test("header image loading refits layout, and header editor explains overlay",()=>{
  assert.match(render,/img&&!img\.complete/);
  assert.match(render,/addEventListener\("load"/);
  assert.match(render,/fitHeader\(\)/);
  assert.match(render,/center image stays near the top margin and can overlap both side images/);
});

test("left and right vertical offsets are independent and do not move the center",()=>{
  const neutral=fitHarness({sideHeights:[50,50],center:{visualTop:30,height:140}});
  neutral.run();
  const baseline=neutral.geometry();
  const shifted=fitHarness({sideHeights:[50,50],center:{visualTop:30,height:140},yOffsets:[-10,0,10]});
  shifted.run();
  const actual=shifted.geometry();
  assert.equal(actual.centerTop,baseline.centerTop);
  assert.ok(actual.sideTops[0]<baseline.sideTops[0]);
  assert.ok(actual.sideTops[1]>baseline.sideTops[1]);
  assert.ok(actual.height>=baseline.height);
});
test("large negative offset clamps side content inside header",()=>{
  const h=fitHarness({sideHeights:[120,100],yOffsets:[-20,0,0]});
  h.run();
  assert.ok(h.geometry().sideTops[0]>=2);
});

test("a large downward side offset expands header without moving the other side",()=>{
  const baseline=fitHarness({sideHeights:[120,80]});
  baseline.run();
  const moved=fitHarness({sideHeights:[120,80],yOffsets:[20,0,0]});
  moved.run();
  assert.ok(moved.geometry().height>baseline.geometry().height);
  assert.equal(moved.geometry().sideTops[1],baseline.geometry().sideTops[1]);
});
