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
    appVersion:savedJsonAppVersion(entry)||savedJsonAppVersion(entry?.state),
    version:entry?.version??entry?.state?.version??null,
    state:normalizeState(entry?.state||{})
  };
}
function loadMenuProfiles(){
  try{
    const raw=JSON.parse(localStorage.getItem(MENU_PROFILES_KEY)||"[]");
    const profiles=Array.isArray(raw)?raw:raw?.profiles; // legacy array or stamped wrapper
    return Array.isArray(profiles)?profiles.map(normalizeProfile).sort((a,b)=>a.name.localeCompare(b.name)):[];
  }catch(e){return []}
}
function persistMenuProfiles(){
  try{localStorage.setItem(MENU_PROFILES_KEY,JSON.stringify(stampJson({profiles:menuProfiles})))}catch(e){
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
    existing.state=stampJson(deepCopy(state));
    existing.appVersion=currentJsonAppVersion;
    existing.version=defaultState.version;
    existing.savedAt=new Date().toISOString();
  }else{
    menuProfiles.push({id:makeProfileId(),name:trimmed,savedAt:new Date().toISOString(),appVersion:currentJsonAppVersion,version:defaultState.version,state:stampJson(deepCopy(state))});
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
  profile.state=stampJson(deepCopy(state));
  profile.appVersion=currentJsonAppVersion;
  profile.version=defaultState.version;
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
async function loadSelectedProfile(){
  const profile=getSelectedProfile();
  if(!profile)return;
  if(!await confirmJsonLoad(profile,`Menu profile: ${profile.name}`,"Loading replaces the current menu. Unsaved changes will be lost."))return;
  state=normalizeState(deepCopy(profile.state));
  itemsUndoStack=[]; // undo history from the previous menu doesn't apply to the newly loaded one
  expandedItemIndices=new Set();
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
