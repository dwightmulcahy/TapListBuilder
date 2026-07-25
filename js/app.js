// Core app state: item/state normalization, item CRUD, settings, custom icon upload,
// and the boot sequence that loads JSON data then does the first render.

const SIZE_KEYS=["iconScale","watermarkScale","watermarkOpacity","taproomFontSize","phoneFontSize","locationFontSize","globalDescriptionFontSize"];
const defaultState={
  version:2.45,
  settings:{
    pageSize:"letter",
    taproomLabel:"TAPROOM:",taproomHours:"NOON–5PM DAILY",
    phone:"+506 8733 7046",location:"3KM W OF DANIEL ODUBER AIRPORT",
    footerAutoFit:true,language:"en",
    translationContactEmail:"",
    headerSlots:[
      {type:"none",text:"",image:"",rotation:0},
      {type:"logo",text:"",image:"",rotation:0},
      {type:"none",text:"",image:"",rotation:0}
    ],
    sizesByPageSize:{
      letter:{iconScale:1,watermarkScale:1.33,watermarkOpacity:0.83,taproomFontSize:16,phoneFontSize:20,locationFontSize:28,globalDescriptionFontSize:15.75,headerSlotScales:[1,0.67,1]},
      "4x6":{iconScale:1,watermarkScale:1.33,watermarkOpacity:0.83,taproomFontSize:16,phoneFontSize:20,locationFontSize:28,globalDescriptionFontSize:15.75,headerSlotScales:[1,0.67,1]}
    }
  },
  items:[] // populated from data/beer-styles.json during boot()
};

let state=null;
let savedBeverages=[];

function deepCopy(v){return JSON.parse(JSON.stringify(v))}
function clampNumber(value,min,max,fallback){
  const n=Number(value);
  return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;
}
function clampDescriptionFontSize(value){
  const n=Number(value);
  return Number.isFinite(n)?Math.min(16,Math.max(8,Math.round(n*4)/4)):11.75;
}
function formatDescriptionFontSize(value){
  return `${clampDescriptionFontSize(value).toFixed(2).replace(/\.00$/,"").replace(/0$/,"")} pt`;
}
function inferStyle(name=""){
  const n=String(name||"").toLowerCase();
  if(n.includes("hazy")||n.includes("neipa"))return "Hazy IPA";
  if(n.includes("ipa"))return "IPA";
  if(n.includes("pale ale"))return "Pale Ale";
  if(n.includes("blonde"))return "Blonde Ale";
  if(n.includes("kölsch")||n.includes("kolsch"))return "Kölsch";
  if(n.includes("pils"))return "Pilsner";
  if(n.includes("lager"))return "Lager";
  if(n.includes("stout"))return "Stout";
  if(n.includes("porter"))return "Porter";
  if(n.includes("gose"))return "Gose";
  if(n.includes("berliner"))return "Berliner Weisse";
  if(n.includes("sour"))return "Sour Ale";
  if(n.includes("cider"))return "Cider";
  if(n.includes("saison")||n.includes("farmhouse"))return "Saison";
  if(n.includes("witbier")||n.includes("weizen")||n.includes("wheat"))return "Wheat Beer";
  return "";
}
function calculateAbv(sg,fg){
  const og=Number.parseFloat(String(sg??"").replace(",","."));
  const fgNum=Number.parseFloat(String(fg??"").replace(",","."));
  if(!Number.isFinite(og)||!Number.isFinite(fgNum)||og<=fgNum)return null;
  return (og-fgNum)*131.25;
}
function isAbvCalculated(item){
  return calculateAbv(item.sg,item.fg)!==null;
}
function normalizeItem(item={},defaultLanguage="en"){
  if(item.type==="divider"){
    return {type:"divider",text:String(item.text??"")};
  }
  const language=item.language==="es"?"es":item.language==="en"?"en":defaultLanguage==="es"?"es":"en";
  const name=String(item.name??"New item");
  const description=String(item.description??"");
  const source=item.translations&&typeof item.translations==="object"?item.translations:{};
  const translations={
    en:{
      name:String(source.en?.name??(language==="en"?name:"")),
      description:String(source.en?.description??(language==="en"?description:""))
    },
    es:{
      name:String(source.es?.name??(language==="es"?name:"")),
      description:String(source.es?.description??(language==="es"?description:""))
    }
  };
  return {
    type:"beer",
    name,
    style:typeof item.style==="string"?item.style:inferStyle(name),
    sg:String(item.sg??""),
    fg:String(item.fg??""),
    abv:(()=>{const calculated=calculateAbv(item.sg,item.fg);return calculated!==null?calculated.toFixed(1):String(item.abv??"");})(),
    ibu:String(item.ibu??""),
    glutenFree:Boolean(item.glutenFree),
    isNew:Boolean(item.isNew),
    newBadgeStyle:["pill","text","outline","starburst"].includes(item.newBadgeStyle)?item.newBadgeStyle:"pill",
    color:/^#[0-9a-f]{6}$/i.test(item.color||"")?item.color:"#444444",
    icon:ICONS[item.icon]?item.icon:inferIcon(item.name),
    customIcon:item.customIcon||"",
    hideIcon:Boolean(item.hideIcon),
    hideAbv:Boolean(item.hideAbv),
    hideIbu:Boolean(item.hideIbu),
    descriptionFontSize:clampDescriptionFontSize(item.descriptionFontSize),
    description,
    language,
    translations
  };
}
function clampSizeBucket(src){
  src=src&&typeof src==="object"?src:{};
  const rawScales=Array.isArray(src.headerSlotScales)?src.headerSlotScales:null;
  const legacyLogoScale=clampNumber(src.logoScale,.30,2.50,.67); // pre-header-slots format
  return {
    iconScale:clampNumber(src.iconScale,.50,1.80,1),
    watermarkScale:clampNumber(src.watermarkScale,.50,1.80,1),
    watermarkOpacity:clampNumber(src.watermarkOpacity,0,1,.22),
    taproomFontSize:clampNumber(src.taproomFontSize,10,32,20),
    phoneFontSize:clampNumber(src.phoneFontSize,10,32,20),
    locationFontSize:clampNumber(src.locationFontSize,10,32,19),
    globalDescriptionFontSize:clampDescriptionFontSize(src.globalDescriptionFontSize),
    headerSlotScales:rawScales?[0,1,2].map(i=>clampNumber(rawScales[i],.30,2.50,1)):[1,legacyLogoScale,1]
  };
}
function clampHeaderSlot(src,defaultType){
  src=src&&typeof src==="object"?src:{};
  return {
    type:["none","text","logo"].includes(src.type)?src.type:defaultType,
    text:String(src.text??""),
    image:String(src.image??""),
    rotation:clampNumber(src.rotation,-180,180,0)
  };
}
function normalizeState(raw){
  const base=deepCopy(defaultState);
  if(!raw||typeof raw!=="object")return base;
  let settings={...base.settings,...(raw.settings||{})};
  settings.pageSize=settings.pageSize==="4x6"?"4x6":"letter"; // "a4" and anything else collapse to letter
  // Sizes (logo/icon/watermark/fonts) are saved per page size. Old saved files had these as
  // flat settings; use those as the migration fallback for both buckets if present.
  const rawBuckets=raw.settings?.sizesByPageSize||{};
  const legacyFlat=raw.settings||{};
  settings.sizesByPageSize={
    letter:clampSizeBucket(rawBuckets.letter||legacyFlat),
    "4x6":clampSizeBucket(rawBuckets["4x6"]||legacyFlat)
  };
  SIZE_KEYS.forEach(key=>{delete settings[key]});
  const rawSlots=Array.isArray(raw.settings?.headerSlots)?raw.settings.headerSlots:null;
  const defaultSlotTypes=["none","logo","none"]; // matches the old single-centered-logo look
  settings.headerSlots=[0,1,2].map(i=>clampHeaderSlot(rawSlots?.[i],defaultSlotTypes[i]));
  settings.footerAutoFit = typeof settings.footerAutoFit === "boolean" ? settings.footerAutoFit : true;
  settings.language=settings.language==="es"?"es":"en";
  settings.translationContactEmail=String(settings.translationContactEmail??"").trim();
  settings.locationTranslations={en:String(settings.locationTranslations?.en??""),es:String(settings.locationTranslations?.es??"")};
  if(!settings.locationTranslations[settings.language])settings.locationTranslations[settings.language]=settings.location;
  if(raw.header){
    if(raw.header.phone)settings.phone=raw.header.phone;
    if(raw.header.location)settings.location=raw.header.location;
    if(raw.header.taproom){
      const parts=String(raw.header.taproom).split(":");
      if(parts.length>1){settings.taproomLabel=parts.shift().trim()+":";settings.taproomHours=parts.join(":").trim()}
      else settings.taproomHours=raw.header.taproom;
    }
  }
  const items=Array.isArray(raw.items)?raw.items.map(item=>normalizeItem(item,settings.language)):base.items.map(item=>normalizeItem(item,settings.language));
  const sizes=settings.sizesByPageSize[settings.pageSize];
  const hadExplicitGlobalFontSize=rawBuckets[settings.pageSize]?.globalDescriptionFontSize!=null||legacyFlat.globalDescriptionFontSize!=null;
  const beerItems=items.filter(item=>item.type==="beer");
  if(!hadExplicitGlobalFontSize&&beerItems.length){
    const first=clampDescriptionFontSize(beerItems[0].descriptionFontSize);
    if(beerItems.every(item=>clampDescriptionFontSize(item.descriptionFontSize)===first))sizes.globalDescriptionFontSize=first;
  }
  return {version:2.45,settings,items};
}

function updateGlobalDescriptionControl(){
  const input=document.getElementById("globalDescriptionFontSize");
  const output=document.getElementById("globalDescriptionFontSizeValue");
  if(!input||!output)return;
  const sizes=state.settings.sizesByPageSize[state.settings.pageSize];
  const beerItems=state.items.filter(item=>item.type==="beer");
  if(!beerItems.length){
    const size=clampDescriptionFontSize(sizes.globalDescriptionFontSize);
    input.value=size;
    output.value=formatDescriptionFontSize(size);
    return;
  }
  const first=clampDescriptionFontSize(beerItems[0].descriptionFontSize);
  const allSame=beerItems.every(item=>clampDescriptionFontSize(item.descriptionFontSize)===first);
  if(allSame){
    sizes.globalDescriptionFontSize=first;
    input.value=first;
    output.value=formatDescriptionFontSize(first);
  }else{
    input.value=clampDescriptionFontSize(sizes.globalDescriptionFontSize);
    output.value="Mixed";
  }
}
function setAllDescriptionFontSizes(value){
  const size=clampDescriptionFontSize(value);
  state.settings.sizesByPageSize[state.settings.pageSize].globalDescriptionFontSize=size;
  state.items.forEach(item=>{if(item.type==="beer")item.descriptionFontSize=size});
  document.querySelectorAll(".description-font-slider").forEach(slider=>{
    slider.value=size;
    const index=Number(slider.dataset.itemIndex);
    const output=document.getElementById(`descFontSizeValue-${index}`);
    if(output)output.value=formatDescriptionFontSize(size);
  });
  const output=document.getElementById("globalDescriptionFontSizeValue");
  if(output)output.value=formatDescriptionFontSize(size);
  autosave();
  renderPreview();
}
function setSetting(key,value){
  if(SIZE_KEYS.includes(key)){
    value=key==="taproomFontSize"||key==="phoneFontSize"||key==="locationFontSize"?clampNumber(value,10,32,20):Number(value);
    state.settings.sizesByPageSize[state.settings.pageSize][key]=value;
    autosave();renderPreview();
    return;
  }
  state.settings[key]=value;
  if(key==="location"){
    state.settings.locationTranslations=state.settings.locationTranslations||{en:"",es:""};
    state.settings.locationTranslations[state.settings.language]=String(value);
  }
  autosave();renderPreview();
  if(key==="pageSize")renderEditor();
}
function setItem(i,key,value,rerenderEditor=false){
  if(key==="descriptionFontSize")value=clampDescriptionFontSize(value);
  const item=state.items[i];
  item[key]=value;
  if(key==="name"||key==="description"){
    item.translations=item.translations||{en:{name:"",description:""},es:{name:"",description:""}};
    item.translations[item.language]=item.translations[item.language]||{name:"",description:""};
    item.translations[item.language][key]=String(value);
    const other=item.language==="es"?"en":"es";
    item.translations[other]=item.translations[other]||{name:"",description:""};
    item.translations[other][key]="";
  }
  if(key==="name"&&(!item.icon||item.icon==="beer"))item.icon=inferIcon(value);
  if(key==="descriptionFontSize")updateGlobalDescriptionControl();
  if(key==="sg"||key==="fg"){
    const calculated=calculateAbv(item.sg,item.fg);
    if(calculated!==null)item.abv=calculated.toFixed(1);
  }
  autosave();
  if(rerenderEditor)renderEditor();
  renderPreview();
}
const ITEMS_UNDO_LIMIT=20;
let itemsUndoStack=[];
function pushItemsUndoSnapshot(){
  itemsUndoStack.push(deepCopy(state.items));
  if(itemsUndoStack.length>ITEMS_UNDO_LIMIT)itemsUndoStack.shift();
  updateUndoButton();
}
function updateUndoButton(){
  document.querySelectorAll(".undo-button").forEach(button=>{button.disabled=itemsUndoStack.length===0});
}
function undoItems(){
  if(!itemsUndoStack.length)return;
  state.items=itemsUndoStack.pop();
  expandedItemIndices=new Set(); // indices from before the undone action no longer apply reliably
  updateUndoButton();
  autosave();renderEditor();renderPreview();
}

// Which item cards are expanded, tracked by array index (kept roughly in sync across
// inserts/removes/reorders below; not worth full item-identity tracking for a UI nicety).
let expandedItemIndices=new Set();
function onItemDetailsToggle(i,isOpen){
  if(isOpen)expandedItemIndices.add(i);
  else expandedItemIndices.delete(i);
}
function shiftExpandedIndicesForInsert(atIndex){
  const next=new Set();
  expandedItemIndices.forEach(idx=>next.add(idx>=atIndex?idx+1:idx));
  expandedItemIndices=next;
}
function shiftExpandedIndicesForRemove(atIndex){
  const next=new Set();
  expandedItemIndices.forEach(idx=>{
    if(idx===atIndex)return;
    next.add(idx>atIndex?idx-1:idx);
  });
  expandedItemIndices=next;
}
function swapExpandedIndices(i,j){
  const hasI=expandedItemIndices.has(i),hasJ=expandedItemIndices.has(j);
  if(hasI===hasJ)return;
  if(hasI){expandedItemIndices.delete(i);expandedItemIndices.add(j)}
  else{expandedItemIndices.delete(j);expandedItemIndices.add(i)}
}

function addItem(){
  pushItemsUndoSnapshot();
  state.items.push(normalizeItem({name:"New Beer",abv:"5.0",ibu:"",glutenFree:false,color:"#444444",icon:"beer",customIcon:"",descriptionFontSize:clampDescriptionFontSize(state.settings.sizesByPageSize[state.settings.pageSize].globalDescriptionFontSize),description:"Enter the beverage description here."}));
  expandedItemIndices.add(state.items.length-1); // open the new item so it's ready to edit
  autosave();renderEditor();renderPreview();
  document.querySelector("#editor fieldset:last-child")?.scrollIntoView({behavior:"smooth",block:"center"});
}
function addDivider(){
  pushItemsUndoSnapshot();
  state.items.push(normalizeItem({type:"divider",text:""}));
  expandedItemIndices.add(state.items.length-1);
  autosave();renderEditor();renderPreview();
  document.querySelector("#editor fieldset:last-child")?.scrollIntoView({behavior:"smooth",block:"center"});
}
function removeItem(i){
  const item=state.items[i];
  if(!item)return;
  const label=item.type==="divider"?(item.text||"this divider"):(item.name||"this item");
  if(!confirm(`Remove "${label}" from the menu?`))return;
  pushItemsUndoSnapshot();
  state.items.splice(i,1);
  shiftExpandedIndicesForRemove(i);
  autosave();renderEditor();renderPreview();
}
function duplicateItem(i){
  pushItemsUndoSnapshot();
  const copy=deepCopy(state.items[i]);
  if(copy.type==="divider"){
    // no name/translations to touch
  }else{
    copy.name=`${copy.name} Copy`;
    copy.translations=copy.translations||{en:{name:"",description:""},es:{name:"",description:""}};
    copy.translations[copy.language]=copy.translations[copy.language]||{name:"",description:""};
    copy.translations[copy.language].name=copy.name;
  }
  state.items.splice(i+1,0,copy);
  shiftExpandedIndicesForInsert(i+1);
  expandedItemIndices.add(i+1); // open the new copy
  autosave();renderEditor();renderPreview();
}
function moveItem(i,delta){
  const j=i+delta;if(j<0||j>=state.items.length)return;
  pushItemsUndoSnapshot();
  swapExpandedIndices(i,j);
  [state.items[i],state.items[j]]=[state.items[j],state.items[i]];autosave();renderEditor();renderPreview();
}

function uploadCustomIcon(i,event){
  const file=event.target.files?.[0];if(!file)return;
  if(file.size>1500000){alert("Use an icon smaller than 1.5 MB.");event.target.value="";return}
  const reader=new FileReader();
  reader.onload=()=>{state.items[i].customIcon=String(reader.result);autosave();renderPreview()};
  reader.readAsDataURL(file);
}
function setHeaderSlot(index,key,value){
  const slot=state.settings.headerSlots[index];
  if(!slot)return;
  slot[key]=key==="rotation"?clampNumber(value,-180,180,0):value;
  autosave();renderPreview();
}
function setHeaderSlotScale(index,value){
  const scales=state.settings.sizesByPageSize[state.settings.pageSize].headerSlotScales;
  scales[index]=clampNumber(value,.30,2.50,1);
  autosave();renderPreview();
}
function uploadHeaderSlotImage(index,event){
  const file=event.target.files?.[0];if(!file)return;
  if(file.size>1500000){alert("Use an image smaller than 1.5 MB.");event.target.value="";return}
  const reader=new FileReader();
  reader.onload=()=>{
    state.settings.headerSlots[index].image=String(reader.result);
    autosave();renderPreview();renderHeaderModalBody();
  };
  reader.readAsDataURL(file);
}
function resetSample(){
  if(!confirm("Restore the sample menu and replace the current tap list?"))return;
  pushItemsUndoSnapshot();
  state=deepCopy(defaultState);state.items=state.items.map(item=>normalizeItem(item));
  expandedItemIndices=new Set();
  autosave();renderEditor();renderPreview();
}

function closeAppMenus(){
  document.querySelectorAll(".app-menu-item[open]").forEach(menu=>{menu.open=false});
}
function openModal(id){
  document.getElementById(id)?.showModal();
}
function closeModal(id){
  document.getElementById(id)?.close();
}
async function showAbout(){
  const info=document.getElementById("aboutVersionInfo");
  if(info){
    info.textContent="Loading version info…";
    try{
      const response=await fetch("version.json",{cache:"no-store"});
      const data=await response.json();
      const parts=[];
      if(data.version&&data.version!=="dev")parts.push(`Version ${data.version}`);
      if(data.sha&&data.sha!=="unknown")parts.push(`commit ${data.sha.slice(0,7)}`);
      if(data.buildDate&&data.buildDate!=="unknown")parts.push(`built ${data.buildDate}`);
      info.textContent=parts.length?parts.join(" · "):"Development build (not built via the Docker release workflow).";
    }catch(err){
      info.textContent="Version info unavailable.";
    }
  }
  openModal("aboutModal");
}
function toggleDisplayMode(){
  setDisplayMode(document.body.classList.contains("preview-only")?"edit":"preview");
}

const APP_SHELL_DESIGN_WIDTH=1050;
const APP_SHELL_MIN_SCALE=0.55;
let currentShellScale=1;
function fitAppShell(){
  const viewport=document.getElementById("appShellViewport");
  const shell=document.getElementById("appShell");
  if(!viewport||!shell)return;
  const availableWidth=window.innerWidth;
  if(availableWidth>=APP_SHELL_DESIGN_WIDTH){
    shell.style.width="";
    shell.style.transform="";
    viewport.style.width="";
    viewport.style.height="";
    currentShellScale=1;
    return;
  }
  shell.style.width=`${APP_SHELL_DESIGN_WIDTH}px`;
  const scale=Math.max(availableWidth/APP_SHELL_DESIGN_WIDTH,APP_SHELL_MIN_SCALE);
  shell.style.transformOrigin="top left";
  shell.style.transform=`scale(${scale})`;
  viewport.style.width=`${APP_SHELL_DESIGN_WIDTH*scale}px`;
  viewport.style.height=`${shell.offsetHeight*scale}px`;
  currentShellScale=scale;
}

async function boot(){
  const [beerStyles,translations]=await Promise.all([
    fetch("data/beer-styles.json").then(r=>r.json()),
    fetch("data/translations.json").then(r=>r.json())
  ]);
  defaultState.items=beerStyles.defaultItems;
  initTranslationData(beerStyles.styleNameTranslations,translations);

  state=loadAutosave()||deepCopy(defaultState);
  state=normalizeState(state);
  savedBeverages=loadSavedBeverages();
  menuProfiles=loadMenuProfiles();

  Object.entries(footerSvgs).forEach(([key,svg])=>document.getElementById(`${key}Icon`).innerHTML=svg);
  renderEditor();renderPreview();
  fitAppShell();
  fitHeader();
  window.addEventListener("resize",()=>requestAnimationFrame(fitMenu));
  window.addEventListener("resize",()=>requestAnimationFrame(()=>{fitAppShell();fitHeader();}));
  window.addEventListener("beforeprint",fitMenu);
  if(typeof ResizeObserver!=="undefined"){
    const shellEl=document.getElementById("appShell");
    if(shellEl)new ResizeObserver(()=>requestAnimationFrame(fitAppShell)).observe(shellEl);
  }
  document.addEventListener("click",(event)=>{
    document.querySelectorAll(".app-menu-item[open]").forEach(menu=>{
      if(!menu.contains(event.target))menu.open=false;
    });
  });
  document.querySelectorAll(".app-modal").forEach(dialog=>{
    dialog.addEventListener("click",(event)=>{
      if(event.target===dialog)dialog.close();
    });
  });
}
boot();
