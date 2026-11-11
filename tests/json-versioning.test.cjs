const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const app=read("js/app.js");
const storage=read("js/storage.js");
const library=read("js/library.js");
const profiles=read("js/profiles.js");
const html=read("index.html");
const appCore=app.slice(0,app.indexOf("function updateGlobalDescriptionControl()"));

function harness(){
  const saved=new Map();
  const elements=new Map();
  const dialog={
    open:false,returnValue:"",listeners:[],
    addEventListener(event,fn){if(event==="close")this.listeners.push(fn)},
    showModal(){this.open=true},
    close(value){
      if(value!==undefined)this.returnValue=value;
      this.open=false;
      const listeners=this.listeners.splice(0);
      listeners.forEach(fn=>fn());
    }
  };
  const document={
    getElementById(id){
      if(id==="jsonVersionModal")return dialog;
      if(!elements.has(id))elements.set(id,{textContent:"",value:""});
      return elements.get(id);
    },
    querySelector:()=>null
  };
  let lastReader;
  class FileReader {
    constructor(){lastReader=this}
    readAsText(file){this.result=file.text;this.finished=this.onload()}
  }
  const writes=[];
  const ctx=vm.createContext({
    ICONS:{beer:"icon"},inferIcon:()=>"beer",
    localStorage:{setItem:(k,v)=>saved.set(k,v),getItem:k=>saved.get(k)??null},
    document,FileReader,
    window:{
      TapListBuildInfo:{badgeText:info=>"v"+info.version},
      showSaveFilePicker:async()=>({createWritable:async()=>({
        write:async text=>writes.push(text),close:async()=>{}
      })})
    },
    alert:message=>{throw Error("Unexpected alert: "+message)},
    prompt:()=>null,confirm:()=>true,
    console,crypto:{randomUUID:()=>"generated-id"}
  });
  vm.runInContext(appCore,ctx);
  vm.runInContext(storage,ctx);
  vm.runInContext(library,ctx);
  vm.runInContext(profiles,ctx);
  vm.runInContext('setCurrentJsonAppVersion({version:"1.10.0"});state=normalizeState({items:[{name:"Current"}]});',ctx);
  ctx.renderEditor=()=>{};
  ctx.renderPreview=()=>{};
  ctx.renderSavedBeverageLibrary=()=>{};
  ctx.updateUndoButton=()=>{};
  return {ctx,saved,dialog,elements,writes,reader:()=>lastReader,
    eval:code=>vm.runInContext(code,ctx)};
}

test("export and autosave stamp actual app version without replacing numeric schema revision",async()=>{
  const h=harness();
  h.eval("autosave()");
  const saved=JSON.parse(h.saved.get("mhbTapListBuilderV2"));
  assert.equal(saved.appVersion,"v1.10.0");
  assert.equal(saved.version,2.45);
  assert.equal(saved.items[0].name,"Current");
  assert.equal(h.eval("loadAutosave().appVersion"),"v1.10.0");
  await h.eval("downloadJSON()");
  const exported=JSON.parse(h.writes[0]);
  assert.equal(exported.appVersion,"v1.10.0");
  assert.equal(exported.version,2.45);
  assert.deepEqual(exported.savedBeverages,[]);
});

test("compare release versions numerically, handle prereleases and legacy JSON",()=>{
  const h=harness();
  assert.equal(h.eval('compareJsonAppVersions("v1.9.9")'),"older");
  assert.equal(h.eval('compareJsonAppVersions("v1.10.0")'),"match");
  assert.equal(h.eval('compareJsonAppVersions("v1.11.0")'),"newer");
  assert.equal(h.eval('compareJsonAppVersions("v2.0.0")'),"newer");
  assert.equal(h.eval('compareJsonAppVersions("v1.10.0-rc.1")'),"older");
  assert.equal(h.eval('compareJsonAppVersions("dev-abcdef0")'),"different");
  assert.equal(h.eval("compareJsonAppVersions(null)"),"legacy");
  const legacy=h.eval("jsonVersionCheck({version:2.45})");
  assert.equal(legacy.savedAppVersion,"Unversioned (legacy)");
  assert.equal(legacy.currentAppVersion,"v1.10.0");
  assert.equal(legacy.savedSchema,"2.45");
  assert.equal(legacy.currentSchema,"2.45");
  assert.match(legacy.message,/predates application-version stamps/);
  assert.match(h.eval('jsonVersionCheck({appVersion:"v2.0.0",version:3}).message'),/data-format version is newer/);
});

test("native version dialog shows saved/current release and schema, then honors load or cancel",async()=>{
  const h=harness();
  const pending=h.eval('confirmJsonLoad({appVersion:"v1.9.0",version:2.4},"JSON file: old.json")');
  assert.equal(h.dialog.open,true);
  assert.equal(h.elements.get("jsonVersionSource").textContent,"JSON file: old.json");
  assert.equal(h.elements.get("jsonSavedAppVersion").textContent,"v1.9.0");
  assert.equal(h.elements.get("jsonCurrentAppVersion").textContent,"v1.10.0");
  assert.equal(h.elements.get("jsonSavedSchema").textContent,"2.4");
  assert.equal(h.elements.get("jsonCurrentSchema").textContent,"2.45");
  assert.match(h.elements.get("jsonVersionStatus").textContent,/older application release/);
  h.dialog.close("cancel");
  assert.equal(await pending,false);
  const accepted=h.eval('confirmJsonLoad({appVersion:"v1.10.0"},"Saved menu")');
  h.dialog.close("load");
  assert.equal(await accepted,true);
  assert.match(html,/id="jsonVersionModal"/);
  assert.match(html,/form method="dialog"/);
  assert.match(html,/value="load" class="primary"/);
});

test("JSON file import does not replace the menu or library until confirmed",async()=>{
  const h=harness();
  const raw=JSON.stringify({version:2.45,appVersion:"v1.9.0",items:[{name:"Imported"}],savedBeverages:[]});
  h.eval("loadJSON({target:{files:[{name:'menu.json',text:"+JSON.stringify(raw)+"}],value:'selected'}})");
  assert.equal(h.dialog.open,true);
  assert.equal(h.eval("state.items[0].name"),"Current");
  h.dialog.close("cancel");
  await h.reader().finished;
  assert.equal(h.eval("state.items[0].name"),"Current");
  h.eval("loadJSON({target:{files:[{name:'menu.json',text:"+JSON.stringify(raw)+"}],value:'selected'}})");
  h.dialog.close("load");
  await h.reader().finished;
  assert.equal(h.eval("state.items[0].name"),"Imported");
  assert.equal(JSON.parse(h.saved.get("mhbTapListBuilderV2")).appVersion,"v1.10.0");
});

test("library JSON uses stamped wrapper, reads legacy arrays, and checks version before adding",async()=>{
  const h=harness();
  const old=[{id:"old-beer",savedAt:"2026-01-01",item:{name:"Old Beer",icon:"beer"}}];
  h.saved.set("mhbSavedBeveragesV1",JSON.stringify(old));
  assert.equal(h.eval("loadSavedBeverages().length"),1);
  h.eval("savedBeverages=loadSavedBeverages();persistSavedBeverages()");
  const wrapper=JSON.parse(h.saved.get("mhbSavedBeveragesV1"));
  assert.equal(wrapper.appVersion,"v1.10.0");
  assert.equal(wrapper.version,2.45);
  assert.equal(wrapper.entries.length,1);
  assert.equal(wrapper.entries[0].appVersion,null);
  h.eval('storeItemInLibrary({name:"New Beer",icon:"beer"},{confirmOverwrite:false})');
  const next=JSON.parse(h.saved.get("mhbSavedBeveragesV1"));
  assert.equal(next.entries.find(e=>e.item.name==="New Beer").appVersion,"v1.10.0");
  h.ctx.document.getElementById("savedBeverageSelect").value="old-beer";
  const pending=h.eval("addSavedBeverage()");
  assert.equal(h.dialog.open,true);
  assert.equal(h.elements.get("jsonSavedAppVersion").textContent,"Unversioned (legacy)");
  h.dialog.close("cancel");
  await pending;
  assert.equal(h.eval("state.items.length"),1);
  const pending2=h.eval("addSavedBeverage()");
  h.dialog.close("load");
  await pending2;
  assert.equal(h.eval("state.items.length"),2);
});

test("menu profile JSON uses stamped wrapper, reads legacy arrays, and checks version before switching",async()=>{
  const h=harness();
  const old=[{id:"old-profile",name:"Old Menu",state:{version:2.3,items:[{name:"Older Beer"}]}}];
  h.saved.set("mhbMenuProfilesV1",JSON.stringify(old));
  assert.equal(h.eval("loadMenuProfiles().length"),1);
  h.eval("menuProfiles=loadMenuProfiles();persistMenuProfiles()");
  const wrapper=JSON.parse(h.saved.get("mhbMenuProfilesV1"));
  assert.equal(wrapper.appVersion,"v1.10.0");
  assert.equal(wrapper.version,2.45);
  assert.equal(wrapper.profiles[0].appVersion,null);
  h.ctx.document.getElementById("menuProfileSelect").value="old-profile";
  const pending=h.eval("loadSelectedProfile()");
  assert.equal(h.dialog.open,true);
  assert.equal(h.elements.get("jsonSavedSchema").textContent,"2.3");
  h.dialog.close("cancel");
  await pending;
  assert.equal(h.eval("state.items[0].name"),"Current");
  const accepted=h.eval("loadSelectedProfile()");
  h.dialog.close("load");
  await accepted;
  assert.equal(h.eval("state.items[0].name"),"Older Beer");
  h.eval('overwriteSelectedProfile()');
  const updated=JSON.parse(h.saved.get("mhbMenuProfilesV1"));
  assert.equal(updated.profiles[0].appVersion,"v1.10.0");
  assert.equal(updated.profiles[0].state.appVersion,"v1.10.0");
});

test("startup loads release metadata before checking browser autosave, without prompting on same version",()=>{
  assert.match(app,/window\.TapListBuildInfo\.load\(\)\.then\(setCurrentJsonAppVersion\)/);
  assert.match(app,/browserSave&&compareJsonAppVersions\(savedJsonAppVersion\(browserSave\)\)!=="match"/);
  assert.match(app,/await confirmJsonLoad\(browserSave,"Browser autosave"/);
  assert.match(app,/if\(restore&&!savedJsonAppVersion\(browserSave\)\)autosave\(\)/);
  assert.match(storage,/reader\.onload=async\(\)=>/);
  assert.match(storage,/if\(!await confirmJsonLoad\(raw,/);
});
