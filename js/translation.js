// Name/description translation (English <-> Spanish). Exact-phrase data populated from
// data/beer-styles.json and data/translations.json by app.js during boot (see loadData()).
// Anything not in that hand-curated dictionary (i.e. any real, custom-written item) is
// translated live via a free public API, with the phrase list as an offline fallback if
// the network call fails.
let SPANISH_STYLE_NAMES={};
let ENGLISH_STYLE_NAMES={};
let SPANISH_DESCRIPTION_EXACT={};
let SPANISH_PHRASES=[];
let ENGLISH_DESCRIPTION_EXACT={};

function initTranslationData(styleNameTranslations,translations){
  SPANISH_STYLE_NAMES=styleNameTranslations.enToEs||{};
  ENGLISH_STYLE_NAMES=styleNameTranslations.esToEn||{};
  SPANISH_DESCRIPTION_EXACT=translations.descriptionExactEsFromEn||{};
  SPANISH_PHRASES=translations.phraseMap||[];
  ENGLISH_DESCRIPTION_EXACT=reverseExactMap(SPANISH_DESCRIPTION_EXACT);
}
function normalizeTranslationKey(value){return String(value||"").trim().replace(/\s+/g," ").toLowerCase()}
function escapeRegExp(value){return String(value).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}
function reverseExactMap(map){
  const reversed={};
  Object.entries(map).forEach(([english,spanish])=>{reversed[normalizeTranslationKey(spanish)]=english});
  return reversed;
}

// Live translation via MyMemory's free public API (no key required). Returns null on any
// failure (offline, timeout, rate limit, bad response) so callers can fall back gracefully.
async function translateViaApi(text,sourceLang,targetLang){
  const trimmed=String(text||"").trim();
  if(!trimmed)return null;
  if(typeof fetch!=="function")return null;
  const controller=typeof AbortController!=="undefined"?new AbortController():null;
  const timeoutId=controller?setTimeout(()=>controller.abort(),8000):null;
  try{
    const url=`https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${sourceLang}|${targetLang}`;
    const response=await fetch(url,controller?{signal:controller.signal}:undefined);
    if(!response.ok)throw new Error(`Translation request failed (${response.status})`);
    const data=await response.json();
    const translated=data?.responseData?.translatedText;
    if(typeof translated!=="string"||!translated.trim())throw new Error("Empty translation response");
    if(/please select two distinct languages|invalid language pair/i.test(translated))throw new Error("Translation API rejected the request");
    return translated;
  }catch(err){
    console.warn("Live translation unavailable, using offline fallback:",err?.message||err);
    return null;
  }finally{
    if(timeoutId)clearTimeout(timeoutId);
  }
}

async function translateNameToSpanish(name=""){
  const trimmed=String(name||"").trim();
  if(!trimmed)return "";
  const exact=SPANISH_STYLE_NAMES[normalizeTranslationKey(trimmed)];
  if(exact)return exact;
  const live=await translateViaApi(trimmed,"en","es");
  if(live)return live;
  return trimmed
    .replace(/\bAmerican IPA\b/gi,"IPA Americana")
    .replace(/\bAmerica IPA\b/gi,"IPA Americana")
    .replace(/\bBlonde Ale\b/gi,"Ale Rubia")
    .replace(/\bPale Ale\b/gi,"Pale Ale")
    .replace(/\bPilsner\b/gi,"Pilsner")
    .replace(/\bSour\b/gi,"Sour")
    .replace(/\bCider\b/gi,"Sidra")
    .replace(/\bStout\b/gi,"Stout");
}
async function translateDescriptionToSpanish(description=""){
  const original=String(description||"").trim();
  if(!original)return "";
  const exact=SPANISH_DESCRIPTION_EXACT[normalizeTranslationKey(original)];
  if(exact)return exact;
  const live=await translateViaApi(original,"en","es");
  if(live)return live;
  let out=original;
  SPANISH_PHRASES.forEach(([from,to])=>{
    out=out.replace(new RegExp(escapeRegExp(from),"gi"),to);
  });
  return out;
}
async function translateNameToEnglish(name=""){
  const trimmed=String(name||"").trim();
  if(!trimmed)return "";
  const exact=ENGLISH_STYLE_NAMES[normalizeTranslationKey(trimmed)];
  if(exact)return exact;
  const live=await translateViaApi(trimmed,"es","en");
  if(live)return live;
  return trimmed
    .replace(/\bIPA Americana\b/gi,"America IPA")
    .replace(/\bAle Rubia\b/gi,"Blonde Ale")
    .replace(/\bSidra\b/gi,"Cider");
}
async function translateDescriptionToEnglish(description=""){
  const original=String(description||"").trim();
  if(!original)return "";
  const exact=ENGLISH_DESCRIPTION_EXACT[normalizeTranslationKey(original)];
  if(exact)return exact.charAt(0).toUpperCase()+exact.slice(1);
  const live=await translateViaApi(original,"es","en");
  if(live)return live;
  let out=original;
  [...SPANISH_PHRASES].reverse().forEach(([english,spanish])=>{
    out=out.replace(new RegExp(escapeRegExp(spanish),"gi"),english);
  });
  return out;
}

async function setItemLanguage(item,targetLanguage){
  const normalized=normalizeItem(item,item.language||state.settings.language);
  const current=normalized.language;
  normalized.translations[current]=normalized.translations[current]||{name:"",description:""};
  normalized.translations[current].name=normalized.name;
  normalized.translations[current].description=normalized.description;
  normalized.translations[targetLanguage]=normalized.translations[targetLanguage]||{name:"",description:""};
  if(targetLanguage==="es"){
    const englishName=normalized.translations.en.name||normalized.name;
    const englishDescription=normalized.translations.en.description||normalized.description;
    if(!normalized.translations.es.name)normalized.translations.es.name=await translateNameToSpanish(englishName);
    if(!normalized.translations.es.description)normalized.translations.es.description=await translateDescriptionToSpanish(englishDescription);
  }else{
    const spanishName=normalized.translations.es.name||normalized.name;
    const spanishDescription=normalized.translations.es.description||normalized.description;
    if(!normalized.translations.en.name)normalized.translations.en.name=await translateNameToEnglish(spanishName);
    if(!normalized.translations.en.description)normalized.translations.en.description=await translateDescriptionToEnglish(spanishDescription);
  }
  normalized.language=targetLanguage;
  normalized.name=normalized.translations[targetLanguage].name;
  normalized.description=normalized.translations[targetLanguage].description;
  return normalized;
}
function updateMenuLanguageFromItems(){
  state.settings.language=state.items.length&&state.items.every(item=>item.language==="es")?"es":"en";
}
async function toggleItemTranslation(index){
  if(!state.items[index])return;
  const target=state.items[index].language==="es"?"en":"es";
  const button=document.getElementById(`translateItemBtn-${index}`);
  const originalLabel=button?button.textContent:"";
  if(button){button.disabled=true;button.textContent="Translating…";}
  try{
    state.items[index]=await setItemLanguage(state.items[index],target);
    updateMenuLanguageFromItems();
    autosave();renderEditor();renderPreview();
  }catch(err){
    console.error(err);
    if(button){button.disabled=false;button.textContent=originalLabel;}
    alert("Translation failed. Check your connection and try again.");
  }
}
async function translateAllToSpanish(){
  if(!state.items.length){alert("There are no items to translate.");return}
  const button=document.getElementById("translateMenuButton");
  if(button){button.disabled=true;button.textContent="Translating…";}
  try{
    state.items=await Promise.all(state.items.map(item=>setItemLanguage(item,"es")));
    state.settings.language="es";
    if(normalizeTranslationKey(state.settings.taproomHours)==="noon–5pm daily"||normalizeTranslationKey(state.settings.taproomHours)==="noon-5pm daily")state.settings.taproomHours="MEDIODÍA–5PM DIARIO";
    if(normalizeTranslationKey(state.settings.taproomLabel)==="taproom:")state.settings.taproomLabel="TAPROOM:";
    autosave();renderEditor();renderPreview();
  }catch(err){
    console.error(err);
    alert("Some items may not have translated due to a network issue. Please try again.");
  }finally{
    if(button){button.disabled=false;button.textContent=state.settings.language==="es"?"Translate menu to English":"Translate menu to Spanish";}
  }
}
async function translateAllToEnglish(){
  if(!state.items.length){alert("There are no items to translate.");return}
  const button=document.getElementById("translateMenuButton");
  if(button){button.disabled=true;button.textContent="Translating…";}
  try{
    state.items=await Promise.all(state.items.map(item=>setItemLanguage(item,"en")));
    state.settings.language="en";
    const hours=normalizeTranslationKey(state.settings.taproomHours);
    if(["mediodía–5pm diario","mediodia–5pm diario","mediodía-5pm diario","mediodia-5pm diario"].includes(hours))state.settings.taproomHours="NOON–5PM DAILY";
    autosave();renderEditor();renderPreview();
  }catch(err){
    console.error(err);
    alert("Some items may not have translated due to a network issue. Please try again.");
  }finally{
    if(button){button.disabled=false;button.textContent=state.settings.language==="es"?"Translate menu to English":"Translate menu to Spanish";}
  }
}
async function toggleMenuTranslation(){
  if(state.settings.language==="es")await translateAllToEnglish();
  else await translateAllToSpanish();
}
