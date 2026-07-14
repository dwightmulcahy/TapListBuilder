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

function downloadJSON(){
  const exportData={...state,savedBeverages:deepCopy(savedBeverages)};
  const blob=new Blob([JSON.stringify(exportData,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="mhb-tap-list-and-library.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
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
