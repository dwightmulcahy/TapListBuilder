const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");
const app=fs.readFileSync(path.join(root,"js/app.js"),"utf8");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const css=fs.readFileSync(path.join(root,"css/layout.css"),"utf8");
const source=app.slice(app.indexOf("function enableDraggableDialog("),app.indexOf("function openModal("));
function harness(){
  const handlers={};const winHandlers={};
  const handle={
    addEventListener:(name,cb)=>{handlers[name]=cb},
    setPointerCapture:id=>{handle.captured=id},
    hasPointerCapture:id=>handle.captured===id,
    releasePointerCapture:id=>{if(handle.captured===id)handle.captured=null}
  };
  const dialog={
    open:true,style:{},
    querySelector:()=>handle,
    getBoundingClientRect:()=>({
      left:parseInt(dialog.style.left??"150",10),
      top:parseInt(dialog.style.top??"100",10),
      width:520,height:450
    })
  };
  const window={innerWidth:1000,innerHeight:700,addEventListener:(name,cb)=>{winHandlers[name]=cb}};
  const ctx=vm.createContext({window});
  vm.runInContext(source+"enableDraggableDialog",ctx)(dialog);
  const event=(overrides={})=>({
    button:0,pointerId:4,clientX:200,clientY:150,
    target:{closest:()=>null},preventDefault(){this.prevented=true},
    ...overrides
  });
  return {handlers,winHandlers,dialog,handle,window,event};
}
test("only Page and Header dialogs get drag handles and a light backdrop",()=>{
  for(const id of ["pageModal","headerModal"]){
    assert.match(html,new RegExp('<dialog class="app-modal draggable-modal" id="'+id+'">'));
  }
  assert.match(css,/\.draggable-modal::backdrop\{background:rgba\(20,20,20,\.08\)\}/);
  assert.match(css,/\.draggable-modal \.app-modal-header\{cursor:move;touch-action:none;user-select:none\}/);
  assert.match(app,/\["pageModal","headerModal"\]\.forEach\(id=>enableDraggableDialog/);
});
test("pointer drag moves dialog and clamps it to visible viewport",()=>{
  const h=harness();
  const start=h.event();h.handlers.pointerdown(start);
  assert.equal(start.prevented,true);
  assert.equal(h.handle.captured,4);
  h.handlers.pointermove(h.event({clientX:300,clientY:200}));
  assert.equal(h.dialog.style.left,"250px");
  assert.equal(h.dialog.style.top,"150px");
  h.handlers.pointermove(h.event({clientX:5000,clientY:5000}));
  assert.equal(h.dialog.style.left,"480px");
  assert.equal(h.dialog.style.top,"250px");
  h.handlers.pointerup(h.event());
  assert.equal(h.handle.captured,null);
});
test("close buttons and other controls never start a drag",()=>{
  const h=harness();
  h.handlers.pointerdown(h.event({target:{closest:()=>({tagName:"BUTTON"})}}));
  assert.equal(h.handle.captured,undefined);
  assert.equal(h.dialog.style.left,undefined);
});
test("keyboard arrow keys move the dialog, with Shift for larger steps",()=>{
  const h=harness();
  const event={target:h.handle,key:"ArrowRight",shiftKey:false,preventDefault(){this.prevented=true}};
  h.handlers.keydown(event);
  assert.equal(h.dialog.style.left,"170px");
  assert.equal(event.prevented,true);
  h.handlers.keydown({...event,key:"ArrowDown",shiftKey:true});
  assert.equal(h.dialog.style.top,"150px");
});
test("a resized viewport keeps the title bar on screen",()=>{
  const h=harness();
  h.handlers.pointerdown(h.event());
  h.handlers.pointerup(h.event());
  h.window.innerWidth=600;h.window.innerHeight=500;
  h.winHandlers.resize();
  assert.equal(h.dialog.style.left,"80px");
  assert.equal(h.dialog.style.top,"50px");
});
