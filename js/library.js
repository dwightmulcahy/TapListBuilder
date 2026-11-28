// Saved beverage library: persisted separately from the current menu in localStorage.
const SAVED_BEVERAGES_KEY="mhbSavedBeveragesV1";

function makeSavedBeverageId(){
  if(globalThis.crypto?.randomUUID)return crypto.randomUUID();
  return `saved-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function normalizeSavedBeverage(entry){
  const item=normalizeItem(entry?.item||entry||{});
  return {id:String(entry?.id||makeSavedBeverageId()),savedAt:String(entry?.savedAt||new Date().toISOString()),appVersion:savedJsonAppVersion(entry),version:entry?.version??null,item};
}
function loadSavedBeverages(){
  try{
    const raw=JSON.parse(localStorage.getItem(SAVED_BEVERAGES_KEY)||"[]");
    const entries=Array.isArray(raw)?raw:raw?.entries; // legacy array or stamped wrapper
    return Array.isArray(entries)?entries.map(normalizeSavedBeverage).sort((a,b)=>a.item.name.localeCompare(b.item.name)):[];
  }catch(e){return []}
}
function persistSavedBeverages(){
  if(sharedLibraryToken)queueSharedLibrarySave();
  try{localStorage.setItem(SAVED_BEVERAGES_KEY,JSON.stringify(savedBeverages))}catch(e){
    alert("The saved beverage library could not be stored. A custom icon may be too large for browser storage.");
  }
}

function renderSavedBeverageLibrary(message=""){
  const select=document.getElementById("savedBeverageSelect");
  if(!select)return;
  const previous=select.value;
  if(savedBeverages.length){
    select.innerHTML=savedBeverages.map(entry=>{
      const abv=entry.item.abv?` — ${entry.item.abv}% ABV`:"";
      return `<option value="${esc(entry.id)}">${esc(entry.item.name)}${esc(abv)}</option>`;
    }).join("");
    if(savedBeverages.some(entry=>entry.id===previous))select.value=previous;
  }else{
    select.innerHTML='<option value="">No saved items yet</option>';
  }
  document.getElementById("addSavedBeverageButton").disabled=!savedBeverages.length;
  document.getElementById("deleteSavedBeverageButton").disabled=!savedBeverages.length;
  const status=document.getElementById("savedLibraryStatus");
  if(status)status.textContent=message||`${savedBeverages.length} saved item${savedBeverages.length===1?"":"s"}. Save an item from its editor card to add or update it here.`;
}
function storeItemInLibrary(item,{confirmOverwrite=true}={}){
  const normalized=normalizeItem(item);
  const name=normalized.name.trim();
  if(!name){alert("Give the item a name before saving it.");return false}
  normalized.name=name;
  const existingIndex=savedBeverages.findIndex(entry=>entry.item.name.trim().toLowerCase()===name.toLowerCase());
  if(existingIndex>=0){
    if(confirmOverwrite&&!confirm(`Replace the saved settings for “${name}”?`))return false;
    const existing=savedBeverages[existingIndex];
    savedBeverages[existingIndex]={id:existing.id,savedAt:new Date().toISOString(),appVersion:currentJsonAppVersion,version:defaultState.version,item:deepCopy(normalized)};
  }else{
    savedBeverages.push({id:makeSavedBeverageId(),savedAt:new Date().toISOString(),appVersion:currentJsonAppVersion,version:defaultState.version,item:deepCopy(normalized)});
  }
  savedBeverages.sort((a,b)=>a.item.name.localeCompare(b.item.name));
  persistSavedBeverages();
  return true;
}
function saveItemToLibrary(index){
  const item=state.items[index];
  if(!item)return;
  if(storeItemInLibrary(item))renderSavedBeverageLibrary(`Saved “${item.name}” with all item settings.`);
}
function saveAllItemsToLibrary(){
  if(!state.items.length){alert("There are no current items to save.");return}
  let added=0,updated=0;
  state.items.forEach(item=>{
    const name=String(item.name||"").trim();
    if(!name)return;
    const exists=savedBeverages.some(entry=>entry.item.name.trim().toLowerCase()===name.toLowerCase());
    if(storeItemInLibrary(item,{confirmOverwrite:false})){exists?updated++:added++}
  });
  renderSavedBeverageLibrary(`Saved ${added} new and updated ${updated} existing item${updated===1?"":"s"}.`);
}
async function addSavedBeverage(){
  const id=document.getElementById("savedBeverageSelect")?.value;
  const entry=savedBeverages.find(saved=>saved.id===id);
  if(!entry)return;
  if(!await confirmJsonLoad(entry,`Saved beverage: ${entry.item.name}`,"This adds the selected beverage to the current menu."))return;
  state.items.push(deepCopy(entry.item));
  autosave();renderEditor();renderPreview();
  renderSavedBeverageLibrary(`Added “${entry.item.name}” to the current menu.`);
  document.querySelector("#editor fieldset:last-child")?.scrollIntoView({behavior:"smooth",block:"center"});
}
function deleteSavedBeverage(){
  const id=document.getElementById("savedBeverageSelect")?.value;
  const entry=savedBeverages.find(saved=>saved.id===id);
  if(!entry)return;
  if(!confirm(`Delete “${entry.item.name}” from the saved beverage library?`))return;
  savedBeverages=savedBeverages.filter(saved=>saved.id!==id);
  persistSavedBeverages();
  renderSavedBeverageLibrary(`Deleted “${entry.item.name}” from the saved library.`);
}


function savedBeverageOptions(){
  return '<option value="">Select a saved beer…</option>' + savedBeverages.map(entry => {
    const abv=entry.item.abv?` — ${entry.item.abv}% ABV`:"";
    return `<option value="${esc(entry.id)}">${esc(entry.item.name)}${esc(abv)}</option>`;
  }).join("");
}

async function fillItemFromLibrary(index,id){
  if(!id)return;
  const entry=savedBeverages.find(saved=>saved.id===id);
  const item=state.items[index];
  if(!entry||!item||item.type==="divider"||item.type==="text")return;
  const picker=document.getElementById(`itemLibrarySelect-${index}`);
  if(!await confirmJsonLoad(entry,`Saved beverage: ${entry.item.name}`,`This replaces “${item.name}” and all its fields and settings with the saved beverage.`)){
    if(picker)picker.value="";
    return;
  }
  pushItemsUndoSnapshot();
  state.items[index]=deepCopy(normalizeItem(entry.item));
  expandedItemIndices.add(index);
  autosave();renderEditor();renderPreview();
  document.querySelectorAll("#editor fieldset")[index]?.scrollIntoView({behavior:"smooth",block:"center"});
}

 // Shared mode is opt-in; credentials stay in memory and are never exported.
let sharedLibraryToken="";
let sharedLibraryRevision=0;
let sharedLibraryQueue=Promise.resolve();
let sharedLibraryBlocked=false;
let sharedLibraryConnecting=false;
function sharedLibraryStatus(message){
  const el=document.getElementById("sharedLibraryStatus");
  if(el)el.textContent=message;
}
async function sharedLibraryRequest(method,token,payload){
  const response=await fetch("/api/library",{
    method,cache:"no-store",headers:{Authorization:"Bearer "+token,
      ...(payload?{"Content-Type":"application/json"}:{})},
    ...(payload?{body:JSON.stringify(payload)}:{})
  });
  if(!response.ok)throw new Error(response.status===409?"Library changed on another device":`Server returned ${response.status}`);
  const data=await response.json();
  if(!Number.isSafeInteger(data.revision)||!Array.isArray(data.entries))throw new Error("Invalid server response");
  return data;
}
async function connectSharedLibrary(){
  if(sharedLibraryConnecting)return;
  const token=prompt("Shared library access token:", "");
  if(!token)return;
  sharedLibraryConnecting=true;
  try{
    await sharedLibraryQueue;
    const remote=await sharedLibraryRequest("GET",token);
    const local=deepCopy(savedBeverages);
    const entries=remote.entries.map(normalizeSavedBeverage);
    const names=new Set(entries.map(e=>e.item.name.trim().toLowerCase()));
    const ids=new Set(entries.map(e=>e.id));
    const missing=local.filter(e=>!names.has(e.item.name.trim().toLowerCase()));
    let result=remote;
    if(missing.length&&confirm(`Import ${missing.length} local items into the shared library? Existing server items will not be overwritten.`)){
      for(const e of missing){
        if(ids.has(e.id))e.id=makeSavedBeverageId();
        ids.add(e.id);
        entries.push(e);
      }
      result=await sharedLibraryRequest("PUT",token,{revision:remote.revision,entries});
    }else if(local.length&&!confirm("Load the server library? Export your local library first if you need to preserve local-only items or different versions."))return;
    sharedLibraryToken=token;
    sharedLibraryRevision=result.revision;
    sharedLibraryBlocked=false;
    savedBeverages=result.entries.map(normalizeSavedBeverage).sort((a,b)=>a.item.name.localeCompare(b.item.name));
    localStorage.setItem(SAVED_BEVERAGES_KEY,JSON.stringify(savedBeverages));
    renderEditor();
    sharedLibraryStatus("Connected · Server library loaded");
  }catch(error){sharedLibraryStatus("Connection failed: "+error.message)}
  finally{sharedLibraryConnecting=false}
}
function queueSharedLibrarySave(){
  const entries=deepCopy(savedBeverages);
  const token=sharedLibraryToken;
  sharedLibraryStatus("Local copy saved · Server save pending");
  sharedLibraryQueue=sharedLibraryQueue.then(async()=>{
    if(sharedLibraryBlocked||token!==sharedLibraryToken)return;
    try{
      const result=await sharedLibraryRequest("PUT",token,{revision:sharedLibraryRevision,entries});
      sharedLibraryRevision=result.revision;
      sharedLibraryStatus("Server save confirmed");
    }catch(error){
      sharedLibraryBlocked=true;
      sharedLibraryStatus("NOT saved to server: "+error.message+". Export JSON before reconnecting.");
    }
  });
}

async function recoverSharedLibrary(){
  if(!sharedLibraryToken||!sharedLibraryBlocked)return;
  await sharedLibraryQueue;
  if(!confirm("Compare local unsynced items with the server? Existing server items will be preserved. Export JSON first to retain conflicting edits and deletions."))return;
  try{
    const remote=await sharedLibraryRequest("GET",sharedLibraryToken);
    const entries=remote.entries.map(normalizeSavedBeverage);
    const names=new Set(entries.map(e=>e.item.name.trim().toLowerCase()));
    const ids=new Set(entries.map(e=>e.id));
    for(const entry of deepCopy(savedBeverages)){
      const name=entry.item.name.trim().toLowerCase();
      if(names.has(name))continue;
      if(ids.has(entry.id))entry.id=makeSavedBeverageId();
      names.add(name);ids.add(entry.id);entries.push(entry);
    }
    const result=await sharedLibraryRequest("PUT",sharedLibraryToken,{revision:remote.revision,entries});
    sharedLibraryRevision=result.revision;
    sharedLibraryBlocked=false;
    savedBeverages=result.entries.map(normalizeSavedBeverage).sort((a,b)=>a.item.name.localeCompare(b.item.name));
    localStorage.setItem(SAVED_BEVERAGES_KEY,JSON.stringify(savedBeverages));
    renderEditor();
    sharedLibraryStatus("Recovered · Server items preserved");
  }catch(error){sharedLibraryStatus("Recovery failed: "+error.message)}
}
