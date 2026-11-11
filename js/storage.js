// Menu persistence: autosave to localStorage, JSON export/import, and saved-beverage imports.
// "version" is the existing numeric JSON schema revision; "appVersion" records the
// actual release/build shown in the title. They are intentionally independent.
let currentJsonAppVersion="dev";
function setCurrentJsonAppVersion(info){
  currentJsonAppVersion=window.TapListBuildInfo.badgeText(info);
}
function stampJson(data){return {...data,appVersion:currentJsonAppVersion}}
function savedJsonAppVersion(raw){
  return typeof raw?.appVersion==="string"&&raw.appVersion.trim()?raw.appVersion.trim():null;
}
function compareJsonAppVersions(saved,current=currentJsonAppVersion){
  if(!saved)return "legacy";
  if(saved===current)return "match";
  const semver=value=>/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value);
  const a=semver(saved),b=semver(current);
  if(!a||!b)return "different";
  for(let i=1;i<=3;i++){
    if(Number(a[i])<Number(b[i]))return "older";
    if(Number(a[i])>Number(b[i]))return "newer";
  }
  // A release is newer than its prerelease. Other prerelease comparisons are
  // intentionally classified as different rather than guessing compatibility.
  if(a[4]&&!b[4])return "older";
  if(!a[4]&&b[4])return "newer";
  return "different";
}
function jsonVersionCheck(raw){
  const saved=savedJsonAppVersion(raw);
  const status=compareJsonAppVersions(saved);
  const savedSchema=raw?.version??null;
  const currentSchema=defaultState.version;
  const newerSchema=Number.isFinite(Number(savedSchema))&&savedSchema!==null&&Number(savedSchema)>Number(currentSchema);
  const notes={
    match:"Application versions match.",
    legacy:"This JSON predates application-version stamps. Legacy menus are supported.",
    older:"This JSON was saved by an older application release. It will be normalized when loaded.",
    newer:"This JSON was saved by a newer application release. This app may discard unsupported settings when you save it.",
    different:"These builds differ, or their versions cannot be ordered reliably. Check compatibility before continuing."
  };
  return {
    savedAppVersion:saved||"Unversioned (legacy)",
    currentAppVersion:currentJsonAppVersion,
    savedSchema:savedSchema===null?"Not specified":String(savedSchema),
    currentSchema:String(currentSchema),
    status,
    message:notes[status]+(newerSchema?" The JSON data-format version is newer than this app supports.":"")
  };
}
// Always confirm explicit file/profile/library loads. Browser autosaves are
// checked at startup only when their version differs, avoiding a dialog on
// every ordinary page refresh.
function confirmJsonLoad(raw,source="JSON file",impact="Loading replaces the current menu."){
  const check=jsonVersionCheck(raw);
  const dialog=document.getElementById("jsonVersionModal");
  if(!dialog)return Promise.resolve(false);
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
  set("jsonVersionSource",source);
  set("jsonSavedAppVersion",check.savedAppVersion);
  set("jsonCurrentAppVersion",check.currentAppVersion);
  set("jsonSavedSchema",check.savedSchema);
  set("jsonCurrentSchema",check.currentSchema);
  set("jsonVersionStatus",check.message);
  set("jsonVersionImpact",impact);
  if(dialog.open)return Promise.resolve(false);
  return new Promise(resolve=>{
    dialog.returnValue="cancel";
    dialog.addEventListener("close",()=>resolve(dialog.returnValue==="load"),{once:true});
    dialog.showModal();
  });
}
function autosave(){try{localStorage.setItem("mhbTapListBuilderV2",JSON.stringify(stampJson(state)))}catch(e){}}
function loadAutosave(){try{const raw=localStorage.getItem("mhbTapListBuilderV2");return raw?JSON.parse(raw):null}catch(e){return null}}

function mergeSavedBeverages(entries,sourceAppVersion=null){
  if(!Array.isArray(entries))return 0;
  let count=0;
  entries.map(entry=>normalizeSavedBeverage({...entry,appVersion:savedJsonAppVersion(entry)||sourceAppVersion})).forEach(incoming=>{
    const key=incoming.item.name.trim().toLowerCase();
    if(!key)return;
    const existingIndex=savedBeverages.findIndex(saved=>saved.item.name.trim().toLowerCase()===key);
    if(existingIndex>=0){
      savedBeverages[existingIndex]={...incoming,id:savedBeverages[existingIndex].id};
    }else savedBeverages.push(incoming);
    count++;
  });
  savedBeverages.sort((a,b)=>a.item.name.localeCompare(b.item.name));
  persistSavedBeverages();
  return count;
}

async function downloadJSON(){
  const exportData={...stampJson(state),savedBeverages:deepCopy(savedBeverages)};
  const json=JSON.stringify(exportData,null,2);
  const defaultName="mhb-tap-list-and-library.json";
  if(typeof window.showSaveFilePicker==="function"){
    try{
      const handle=await window.showSaveFilePicker({
        suggestedName:defaultName,
        types:[{description:"Tap list JSON",accept:{"application/json":[".json"]}}]
      });
      const writable=await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return;
    }catch(err){
      if(err&&err.name==="AbortError")return; // user cancelled the save dialog
      console.warn("File System Access save failed, falling back to download:",err);
    }
  }
  let fileName=prompt("Save as filename:",defaultName);
  if(fileName===null)return; // user cancelled the prompt
  fileName=fileName.trim()||defaultName;
  fileName=fileName.replace(/[\\/:*?"<>|]/g,"-");
  if(!/\.json$/i.test(fileName))fileName+=".json";
  const blob=new Blob([json],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=fileName;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function loadJSON(event){
  const file=event.target.files?.[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=async()=>{
    let raw;
    try{
      raw=JSON.parse(reader.result);
      if(!raw||typeof raw!=="object"||Array.isArray(raw)||!Array.isArray(raw.items)){
        throw new Error("Missing menu items");
      }
    }catch(err){alert("That file is not valid tap-list JSON.");return}
    if(!await confirmJsonLoad(raw,`JSON file: ${file.name}`))return;
    try{
      state=normalizeState(raw);
      expandedItemIndices=new Set();
      itemsUndoStack=[];
      updateUndoButton();
      const imported=mergeSavedBeverages(raw.savedBeverages,savedJsonAppVersion(raw));
      autosave();renderEditor();renderPreview();
      if(imported)renderSavedBeverageLibrary(`Loaded the menu and imported ${imported} saved library item${imported===1?"":"s"}.`);
    }catch(err){console.error("JSON import failed:",err);alert("Could not load the selected tap-list JSON.")}
  };
  reader.onerror=()=>alert("Could not read the selected JSON file.");
  reader.readAsText(file);event.target.value="";
}
