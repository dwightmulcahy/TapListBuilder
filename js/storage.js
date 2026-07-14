// Menu persistence: autosave to localStorage, JSON export/import, sample reset, and
// merging an imported saved-beverage library into the existing one.
function autosave(){try{localStorage.setItem("mhbTapListBuilderV2",JSON.stringify(state))}catch(e){}}
function loadAutosave(){try{const raw=localStorage.getItem("mhbTapListBuilderV2");return raw?JSON.parse(raw):null}catch(e){return null}}

function mergeSavedBeverages(entries){
  if(!Array.isArray(entries))return 0;
  let count=0;
  entries.map(normalizeSavedBeverage).forEach(incoming=>{
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
  const exportData={...state,savedBeverages:deepCopy(savedBeverages)};
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
  reader.onload=()=>{
    try{
      const raw=JSON.parse(reader.result);
      state=normalizeState(raw);
      const imported=mergeSavedBeverages(raw.savedBeverages);
      autosave();renderEditor();renderPreview();
      if(imported)renderSavedBeverageLibrary(`Loaded the menu and imported ${imported} saved library item${imported===1?"":"s"}.`);
    }catch(err){alert("That file is not valid tap-list JSON.")}
  };
  reader.readAsText(file);event.target.value="";
}
