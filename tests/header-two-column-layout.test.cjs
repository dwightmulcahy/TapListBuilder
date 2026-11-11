const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const css=fs.readFileSync(path.join(root,"css/menu.css"),"utf8");
const pdf=fs.readFileSync(path.join(root,"js/pdf.js"),"utf8");
const render=fs.readFileSync(path.join(root,"js/render.js"),"utf8");

function fitHarness({pageSize="letter",scale=1,sideHeights=[120,100],center=null,showHeader=true}={}){
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
  const side=i=>sideHeights[i]===null?null:{
    getBoundingClientRect:()=>({
      top:(headerHeight-sideHeights[i])*scale/2,
      height:sideHeights[i]*scale,
      bottom:(headerHeight+sideHeights[i])*scale/2
    })
  };
  const centerEl=center===null?null:{
    getBoundingClientRect:()=>{
      const top=(center.visualTop+centerShift)*scale;
      return {top,bottom:top+center.height*scale,height:center.height*scale};
    }
  };
  const slots=[side(0),centerEl,side(1)];
  const ctx=vm.createContext({
    currentShellScale:scale,
    state:{settings:{
      showHeader,pageSize,
      headerSlots:slots.map(slot=>({type:slot?"logo":"none"})),
      sizesByPageSize:{[pageSize]:{pageDensity:0}}
    }},
    headerHasContent:slots=>slots.some(slot=>slot.type==="logo"),
    clampNumber:(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback,
    document:{
      getElementById:id=>{
        if(id==="page")return page;
        const match=/^headerSlot([012])$/.exec(id);
        return match?{firstElementChild:slots[Number(match[1])]}:null;
      },
      querySelector:selector=>selector===".header"?header:null
    }
  });
  vm.runInContext(pdf,ctx);
  return {
    run:()=>vm.runInContext("fitHeader()",ctx),
    values,headerVars,
    geometry:()=>({height:headerHeight,centerShift,centerTop:center?center.visualTop+centerShift:null,
      centerBottom:center?center.visualTop+centerShift+center.height:null})
  };
}

test("side images occupy two full half-width columns, center overlays them near top",()=>{
  assert.match(css,/\.header\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/s);
  assert.match(css,/\.header-slot:first-child\{[^}]*grid-column:1/);
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
  assert.match(render,/center image sits near the top margin and can overlap both side images/);
});
