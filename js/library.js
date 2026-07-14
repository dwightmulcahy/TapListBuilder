// Saved beverage library: persisted separately from the current menu in localStorage.
const SAVED_BEVERAGES_KEY="mhbSavedBeveragesV1";

function makeSavedBeverageId(){
  if(globalThis.crypto?.randomUUID)return crypto.randomUUID();
  return `saved-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function normalizeSavedBeverage(entry){
  const item=normalizeItem(entry?.item||entry||{});
  return {id:String(entry?.id||makeSavedBeverageId()),savedAt:String(entry?.savedAt||new Date().toISOString()),item};
}
function loadSavedBeverages(){
  try{
    const raw=JSON.parse(localStorage.getItem(SAVED_BEVERAGES_KEY)||"[]");
    return Array.isArray(raw)?raw.map(normalizeSavedBeverage).sort((a,b)=>a.item.name.localeCompare(b.item.name)):[];
  }catch(e){return []}
}
function persistSavedBeverages(){
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
    savedBeverages[existingIndex]={id:existing.id,savedAt:new Date().toISOString(),item:deepCopy(normalized)};
  }else{
    savedBeverages.push({id:makeSavedBeverageId(),savedAt:new Date().toISOString(),item:deepCopy(normalized)});
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
function addSavedBeverage(){
  const id=document.getElementById("savedBeverageSelect")?.value;
  const entry=savedBeverages.find(saved=>saved.id===id);
  if(!entry)return;
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
