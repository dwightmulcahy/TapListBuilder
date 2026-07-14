// Name/description translation (English <-> Spanish). Data populated from data/beer-styles.json
// and data/translations.json by app.js during boot (see loadData()).
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
function translateNameToSpanish(name=""){
  const trimmed=String(name||"").trim();
  const exact=SPANISH_STYLE_NAMES[normalizeTranslationKey(trimmed)];
  if(exact)return exact;
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
function translateDescriptionToSpanish(description=""){
  const original=String(description||"").trim();
  if(!original)return "";
  const exact=SPANISH_DESCRIPTION_EXACT[normalizeTranslationKey(original)];
  if(exact)return exact;
  let out=original;
  SPANISH_PHRASES.forEach(([from,to])=>{
    out=out.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"),to);
  });
  return out;
}
function reverseExactMap(map){
  const reversed={};
  Object.entries(map).forEach(([english,spanish])=>{reversed[normalizeTranslationKey(spanish)]=english});
  return reversed;
}
// ENGLISH_DESCRIPTION_EXACT is derived from SPANISH_DESCRIPTION_EXACT once that
// data has loaded; see initTranslationData() below, called from app.js's boot().
function escapeRegExp(value){return String(value).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}
function translateNameToEnglish(name=""){
  const trimmed=String(name||"").trim();
  const exact=ENGLISH_STYLE_NAMES[normalizeTranslationKey(trimmed)];
  if(exact)return exact;
  return trimmed
    .replace(/\bIPA Americana\b/gi,"America IPA")
    .replace(/\bAle Rubia\b/gi,"Blonde Ale")
    .replace(/\bSidra\b/gi,"Cider");
}
function translateDescriptionToEnglish(description=""){
  const original=String(description||"").trim();
  if(!original)return "";
  const exact=ENGLISH_DESCRIPTION_EXACT[normalizeTranslationKey(original)];
  if(exact)return exact.charAt(0).toUpperCase()+exact.slice(1);
  let out=original;
  [...SPANISH_PHRASES].reverse().forEach(([english,spanish])=>{
    out=out.replace(new RegExp(escapeRegExp(spanish),"gi"),english);
  });
  return out;
}
function setItemLanguage(item,targetLanguage){
  const normalized=normalizeItem(item,item.language||state.settings.language);
  const current=normalized.language;
  normalized.translations[current]=normalized.translations[current]||{name:"",description:""};
  normalized.translations[current].name=normalized.name;
  normalized.translations[current].description=normalized.description;
  normalized.translations[targetLanguage]=normalized.translations[targetLanguage]||{name:"",description:""};
  if(targetLanguage==="es"){
    const englishName=normalized.translations.en.name||normalized.name;
    const englishDescription=normalized.translations.en.description||normalized.description;
    if(!normalized.translations.es.name)normalized.translations.es.name=translateNameToSpanish(englishName);
    if(!normalized.translations.es.description)normalized.translations.es.description=translateDescriptionToSpanish(englishDescription);
  }else{
    const spanishName=normalized.translations.es.name||normalized.name;
    const spanishDescription=normalized.translations.es.description||normalized.description;
    if(!normalized.translations.en.name)normalized.translations.en.name=translateNameToEnglish(spanishName);
    if(!normalized.translations.en.description)normalized.translations.en.description=translateDescriptionToEnglish(spanishDescription);
  }
  normalized.language=targetLanguage;
  normalized.name=normalized.translations[targetLanguage].name;
  normalized.description=normalized.translations[targetLanguage].description;
  return normalized;
}
function updateMenuLanguageFromItems(){
  state.settings.language=state.items.length&&state.items.every(item=>item.language==="es")?"es":"en";
}
function toggleItemTranslation(index){
  if(!state.items[index])return;
  const target=state.items[index].language==="es"?"en":"es";
  state.items[index]=setItemLanguage(state.items[index],target);
  updateMenuLanguageFromItems();
  autosave();renderEditor();renderPreview();
}
function translateAllToSpanish(){
  if(!state.items.length){alert("There are no items to translate.");return}
  state.items=state.items.map(item=>setItemLanguage(item,"es"));
  state.settings.language="es";
  if(normalizeTranslationKey(state.settings.taproomHours)==="noon–5pm daily"||normalizeTranslationKey(state.settings.taproomHours)==="noon-5pm daily")state.settings.taproomHours="MEDIODÍA–5PM DIARIO";
  if(normalizeTranslationKey(state.settings.taproomLabel)==="taproom:")state.settings.taproomLabel="TAPROOM:";
  autosave();renderEditor();renderPreview();
}
function translateAllToEnglish(){
  if(!state.items.length){alert("There are no items to translate.");return}
  state.items=state.items.map(item=>setItemLanguage(item,"en"));
  state.settings.language="en";
  const hours=normalizeTranslationKey(state.settings.taproomHours);
  if(["mediodía–5pm diario","mediodia–5pm diario","mediodía-5pm diario","mediodia-5pm diario"].includes(hours))state.settings.taproomHours="NOON–5PM DAILY";
  autosave();renderEditor();renderPreview();
}
function toggleMenuTranslation(){
  if(state.settings.language==="es")translateAllToEnglish();
  else translateAllToSpanish();
}
