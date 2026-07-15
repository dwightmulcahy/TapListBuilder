// DOM rendering: editor cards, tap-list preview, and small formatting helpers.
function esc(v){return String(v??"").replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[s]))}

const CURATED_BEER_STYLES=[
  "IPA","Hazy IPA","Session IPA","Double IPA","Pale Ale","Blonde Ale","Amber Ale","Brown Ale","Red Ale",
  "Kölsch","Pilsner","Lager","Helles","Oktoberfest / Märzen",
  "Stout","Imperial Stout","Porter",
  "Gose","Berliner Weisse","Sour Ale","Wild Ale",
  "Saison","Wheat Beer","Witbier","Barleywine",
  "Cider","Mead","Non-Alcoholic"
];
function renderStyleOptions(){
  const el=document.getElementById("styleOptions");
  if(!el)return;
  const custom=state.items.map(item=>item.style).filter(Boolean);
  const all=[...new Set([...CURATED_BEER_STYLES,...custom])].sort((a,b)=>a.localeCompare(b));
  el.innerHTML=all.map(style=>`<option value="${esc(style)}">`).join("");
}

function editorCard(item,i){
  const metaParts=[item.isNew?"NEW":"",item.abv?`${esc(item.abv)}%`:"",item.ibu?`${esc(item.ibu)} IBU`:"",item.style?esc(item.style):""].filter(Boolean);
  return `<fieldset class="beer-card" style="--item-color:${esc(item.color)}">
    <div class="card-header">
      <details class="beer-card-details" ${expandedItemIndices.has(i)?"open":""} ontoggle="onItemDetailsToggle(${i},this.open)">
        <summary>
          <span class="summary-text">
            <span class="summary-name">${esc(item.name)||`Item ${i+1}`}</span>
            <span class="summary-meta">${metaParts.join(" · ")}</span>
          </span>
        </summary>
        <div class="beer-card-body">
          <div class="grid2">
            <label>Name<input value="${esc(item.name)}" oninput="setItem(${i},'name',this.value)"></label>
            <label>Accent color<input type="color" value="${esc(item.color)}" oninput="setItem(${i},'color',this.value);this.closest('fieldset').style.setProperty('--item-color',this.value)"></label>
          </div>
          <label>Beer style<input list="styleOptions" value="${esc(item.style)}" oninput="setItem(${i},'style',this.value)"></label>
          <label class="checkbox-row"><input type="checkbox" ${item.isNew?"checked":""} onchange="setItem(${i},'isNew',this.checked)"> Mark as "New"</label>
          <div class="grid4">
            <label>ABV %<span id="abvCalcTag-${i}" class="calc-tag">${isAbvCalculated(item)?" (calculated)":""}</span><input id="abvInput-${i}" inputmode="decimal" value="${esc(item.abv)}" ${isAbvCalculated(item)?"readonly":""} oninput="setItem(${i},'abv',this.value)"></label>
            <label>IBU<input inputmode="numeric" value="${esc(item.ibu)}" oninput="setItem(${i},'ibu',this.value)"></label>
            <label>Gluten free<select onchange="setItem(${i},'glutenFree',this.value==='true')"><option value="false" ${!item.glutenFree?'selected':''}>No</option><option value="true" ${item.glutenFree?'selected':''}>Yes</option></select></label>
            <label>Icon<select onchange="setItem(${i},'icon',this.value,true)">${iconOptions(item.icon)}</select></label>
          </div>
          <details class="advanced-abv" id="advancedAbv-${i}" ${isAbvCalculated(item)?"open":""}>
            <summary>Advanced: calculate ABV from gravity (SG/FG)</summary>
            <div class="section-body">
              <div class="grid2">
                <label>Original gravity (SG)<input inputmode="decimal" placeholder="e.g. 1.050" value="${esc(item.sg)}" oninput="setItem(${i},'sg',this.value);updateAbvField(${i})"></label>
                <label>Final gravity (FG)<input inputmode="decimal" placeholder="e.g. 1.010" value="${esc(item.fg)}" oninput="setItem(${i},'fg',this.value);updateAbvField(${i})"></label>
              </div>
              <p id="abvHelp-${i}" class="help" style="${isAbvCalculated(item)?"":"display:none"}">ABV is calculated from SG/FG. Clear either gravity field to enter ABV manually.</p>
            </div>
          </details>
          ${item.icon==='custom'?`<label class="custom-icon-row">Upload icon<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onchange="uploadCustomIcon(${i},event)"></label>`:''}
          <div class="item-library-actions"><button id="translateItemBtn-${i}" onclick="toggleItemTranslation(${i})">${item.language==="es"?"Translate to English":"Translate to Spanish"}</button><button onclick="saveItemToLibrary(${i})">Save item to library</button></div>
          <label>Description<textarea oninput="setItem(${i},'description',this.value)">${esc(item.description)}</textarea></label>
          <label>Description font size
            <div class="range-with-value">
              <input class="description-font-slider" data-item-index="${i}" type="range" min="8" max="16" step="0.25" value="${esc(clampDescriptionFontSize(item.descriptionFontSize))}" oninput="setItem(${i},'descriptionFontSize',Number(this.value));document.getElementById('descFontSizeValue-${i}').value=formatDescriptionFontSize(Number(this.value))">
              <output id="descFontSizeValue-${i}">${esc(formatDescriptionFontSize(item.descriptionFontSize))}</o>
            </div>
          </label>
        </div>
      </details>
      <div class="card-actions">
        <button class="icon-button" title="Move up" aria-label="Move item up" ${i===0?'disabled':''} onclick="moveItem(${i},-1)">↑</button>
        <button class="icon-button" title="Move down" aria-label="Move item down" ${i===state.items.length-1?'disabled':''} onclick="moveItem(${i},1)">↓</button>
        <button class="icon-button" title="Duplicate" aria-label="Duplicate item" onclick="duplicateItem(${i})">⧉</button>
        <button class="icon-button danger" title="Remove" aria-label="Remove item" onclick="removeItem(${i})">×</button>
      </div>
    </div>
  </fieldset>`;
}

function updateAbvField(i){
  const item=state.items[i];
  if(!item)return;
  const calculated=isAbvCalculated(item);
  const input=document.getElementById(`abvInput-${i}`);
  if(input){
    input.value=item.abv;
    input.readOnly=calculated;
  }
  const tag=document.getElementById(`abvCalcTag-${i}`);
  if(tag)tag.textContent=calculated?" (calculated)":"";
  const help=document.getElementById(`abvHelp-${i}`);
  if(help)help.style.display=calculated?"":"none";
  if(calculated){
    const details=document.getElementById(`advancedAbv-${i}`);
    if(details)details.open=true;
  }
}
function renderEditor(){
  document.getElementById("editor").innerHTML=state.items.map(editorCard).join("");
  renderStyleOptions();
  updateUndoButton();
  const s=state.settings;
  document.getElementById("pageSize").value=s.pageSize;
  document.getElementById("newBadgeStyle").value=s.newBadgeStyle;
  document.getElementById("translationContactEmail").value=s.translationContactEmail||"";
  document.getElementById("logoScale").value=s.logoScale;
  document.getElementById("logoScaleValue").value=`${Math.round(Number(s.logoScale)*100)}%`;
  document.getElementById("watermarkOpacity").value=s.watermarkOpacity;
  document.getElementById("watermarkOpacityValue").value=`${Math.round(Number(s.watermarkOpacity)*100)}%`;
  document.getElementById("watermarkScale").value=s.watermarkScale;
  document.getElementById("watermarkScaleValue").value=`${Math.round(Number(s.watermarkScale)*100)}%`;
  document.getElementById("globalDescriptionFontSize").value=clampDescriptionFontSize(s.globalDescriptionFontSize);
  updateGlobalDescriptionControl();
  document.getElementById("taproomLabel").value=s.taproomLabel;
  document.getElementById("taproomHours").value=s.taproomHours;
  document.getElementById("phone").value=s.phone;
  document.getElementById("location").value=s.location;
  document.getElementById("footerAutoFit").value=String(Boolean(s.footerAutoFit));
  document.getElementById("taproomFontSize").value=s.taproomFontSize;
  document.getElementById("taproomFontSizeValue").value=`${String(Number(s.taproomFontSize).toFixed(1)).replace(/\.0$/,"")} pt`;
  document.getElementById("phoneFontSize").value=s.phoneFontSize;
  document.getElementById("phoneFontSizeValue").value=`${String(Number(s.phoneFontSize).toFixed(1)).replace(/\.0$/,"")} pt`;
  document.getElementById("locationFontSize").value=s.locationFontSize;
  document.getElementById("locationFontSizeValue").value=`${String(Number(s.locationFontSize).toFixed(1)).replace(/\.0$/,"")} pt`;
  const translateButton=document.getElementById("translateMenuButton");
  if(translateButton)translateButton.textContent=s.language==="es"?"Translate menu to English":"Translate menu to Spanish";
  renderSavedBeverageLibrary();
  renderMenuProfiles();
}

function formatAbv(value){const v=String(value??"").trim();return v?`${esc(v)}%`:"—"}
function formatIbu(value){const v=String(value??"").trim();return v?esc(v):"—"}
function glutenFreeBadge(){return state.settings.language==="es"?"SIN GLUTEN":"GLUTEN FREE"}
function newBadge(){return state.settings.language==="es"?"NUEVO":"NEW"}
function newBadgeMarkup(){
  const text=newBadge();
  const style=state.settings.newBadgeStyle||"pill";
  if(style==="starburst")return `<span class="badge badge-new-starburst"><span class="badge-new-starburst-text">${text}</span></span>`;
  const styleClass=style==="outline"?"badge-new-outline":style==="text"?"badge-new-text":"badge-new-pill";
  return `<span class="badge ${styleClass}">${text}</span>`;
}
function renderPreview(){
  const list=document.getElementById("tapList");
  list.innerHTML=state.items.map(item=>`<article class="tap-row" style="color:${esc(item.color)}">
    <div class="icon-wrap">${renderedIcon(item)}</div>
    <div class="tap-divider"></div>
    <div class="item-copy">
      <h2 class="item-name">${esc(item.name)}${item.isNew?newBadgeMarkup():''}${item.glutenFree?`<span class="badge">${glutenFreeBadge()}</span>`:''}</h2>
      <p class="desc" style="--desc-font-size:${clampDescriptionFontSize(item.descriptionFontSize)}pt">${esc(item.description)}</p>
    </div>
    <div class="stats">
      <div class="style-label">${esc(item.style||"")}</div>
      <div class="stats-row">
        <div class="stat"><div class="value">${formatAbv(item.abv)}</div><div class="stat-label">ABV</div></div>
        <div class="stat"><div class="value">${formatIbu(item.ibu)}</div><div class="stat-label">IBU</div></div>
      </div>
      ${bitternessMeter(item.ibu,item.sg,item.fg)}
    </div>
  </article>`).join("");
  applySettings();
  requestAnimationFrame(fitMenu);
}
