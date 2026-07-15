// Named menu profiles: lets you keep several full menus (settings + items) around and
// switch between them, e.g. "Weekday Menu" vs "Weekend Special". Separate from the single
// autosave slot and from the saved-beverage library (which is shared across all profiles).
const MENU_PROFILES_KEY="mhbMenuProfilesV1";
let menuProfiles=[];

function makeProfileId(){
  if(globalThis.crypto?.randomUUID)return crypto.randomUUID();
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function normalizeProfile(entry){
  return {
    id:String(entry?.id||makeProfileId()),
    name:String(entry?.name||"Untitled menu"),
    savedAt:String(entry?.savedAt||new Date().toISOString()),
    state:normalizeState(entry?.state||{})
  };
}
function loadMenuProfiles(){
  try{
    const raw=JSON.parse(localStorage.getItem(MENU_PROFILES_KEY)||"[]");
    return Array.isArray(raw)?raw.map(normalizeProfile).sort((a,b)=>a.name.localeCompare(b.name)):[];
  }catch(e){return []}
}
function persistMenuProfiles(){
  try{localStorage.setItem(MENU_PROFILES_KEY,JSON.stringify(menuProfiles))}catch(e){
    alert("Menu profiles could not be stored. A custom icon may be too large for browser storage.");
  }
}

function renderMenuProfiles(message=""){
  const select=document.getElementById("menuProfileSelect");
  if(!select)return;
  const previous=select.value;
  if(menuProfiles.length){
    select.innerHTML=menuProfiles.map(profile=>{
      const itemCount=profile.state.items.length;
      return `<option value="${esc(profile.id)}">${esc(profile.name)} (${itemCount} item${itemCount===1?"":"s"})</option>`;
    }).join("");
    if(menuProfiles.some(profile=>profile.id===previous))select.value=previous;
  }else{
    select.innerHTML='<option value="">No saved menu profiles yet</option>';
  }
  const hasProfiles=Boolean(menuProfiles.length);
  ["loadMenuProfileButton","overwriteMenuProfileButton","renameMenuProfileButton","deleteMenuProfileButton"].forEach(id=>{
    const button=document.getElementById(id);
    if(button)button.disabled=!hasProfiles;
  });
  const status=document.getElementById("menuProfileStatus");
  if(status)status.textContent=message||`${menuProfiles.length} saved menu profile${menuProfiles.length===1?"":"s"}. Save the current menu under a name to create one.`;
}

function saveCurrentAsNewProfile(){
  const name=prompt("Save current menu as a new profile named:");
  if(name===null)return;
  const trimmed=name.trim();
  if(!trimmed){alert("Give the profile a name.");return}
  const existing=menuProfiles.find(profile=>profile.name.trim().toLowerCase()===trimmed.toLowerCase());
  if(existing){
    if(!confirm(`A profile named "${trimmed}" already exists. Overwrite it?`))return;
    existing.state=deepCopy(state);
    existing.savedAt=new Date().toISOString();
  }else{
    menuProfiles.push({id:makeProfileId(),name:trimmed,savedAt:new Date().toISOString(),state:deepCopy(state)});
  }
  menuProfiles.sort((a,b)=>a.name.localeCompare(b.name));
  persistMenuProfiles();
  const select=document.getElementById("menuProfileSelect");
  if(select)select.value=(existing||menuProfiles.find(p=>p.name===trimmed)).id;
  renderMenuProfiles(`Saved current menu as "${trimmed}".`);
}
function getSelectedProfile(){
  const id=document.getElementById("menuProfileSelect")?.value;
  return menuProfiles.find(profile=>profile.id===id);
}
function overwriteSelectedProfile(){
  const profile=getSelectedProfile();
  if(!profile)return;
  if(!confirm(`Replace the saved menu "${profile.name}" with the current menu?`))return;
  profile.state=deepCopy(state);
  profile.savedAt=new Date().toISOString();
  persistMenuProfiles();
  renderMenuProfiles(`Updated "${profile.name}" with the current menu.`);
}
function renameSelectedProfile(){
  const profile=getSelectedProfile();
  if(!profile)return;
  const name=prompt("Rename profile to:",profile.name);
  if(name===null)return;
  const trimmed=name.trim();
  if(!trimmed){alert("Give the profile a name.");return}
  profile.name=trimmed;
  menuProfiles.sort((a,b)=>a.name.localeCompare(b.name));
  persistMenuProfiles();
  const select=document.getElementById("menuProfileSelect");
  renderMenuProfiles(`Renamed profile to "${trimmed}".`);
  if(select)select.value=profile.id;
}
function loadSelectedProfile(){
  const profile=getSelectedProfile();
  if(!profile)return;
  if(!confirm(`Load "${profile.name}"? This replaces the current menu (unsaved changes will be lost unless you've saved them as a profile).`))return;
  state=normalizeState(deepCopy(profile.state));
  itemsUndoStack=[]; // undo history from the previous menu doesn't apply to the newly loaded one
  updateUndoButton();
  autosave();renderEditor();renderPreview();
  renderMenuProfiles(`Loaded "${profile.name}".`);
}
function deleteSelectedProfile(){
  const profile=getSelectedProfile();
  if(!profile)return;
  if(!confirm(`Delete the saved menu profile "${profile.name}"? This cannot be undone.`))return;
  menuProfiles=menuProfiles.filter(p=>p.id!==profile.id);
  persistMenuProfiles();
  renderMenuProfiles(`Deleted "${profile.name}".`);
}
