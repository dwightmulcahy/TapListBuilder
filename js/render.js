// DOM rendering: editor cards, tap-list preview, and small formatting helpers.
function esc(v){return String(v??"").replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[s]))}

function headerSlotContent(slot,scale){
  const transform=`rotate(${slot.rotation}deg) scale(${scale})`;
  if(slot.type==="text"&&slot.text)return `<span class="header-slot-text" style="transform:${transform}">${esc(slot.text)}</span>`;
  if(slot.type==="logo"){
    const src=slot.image||"assets/logo/mhb_logo_transparent.png";
    return `<img src="${esc(src)}" alt="" style="transform:${transform}">`;
  }
  return "";
}
function renderHeader(){
  const s=state.settings;
  const scales=s.sizesByPageSize[s.pageSize].headerSlotScales;
  s.headerSlots.forEach((slot,i)=>{
    const el=document.getElementById(`headerSlot${i}`);
    if(el)el.innerHTML=headerSlotContent(slot,scales[i]);
  });
}

const HEADER_SLOT_LABELS=["Left","Center","Right"];
function headerSlotEditor(slot,index,scale){
  return `<fieldset class="header-slot-editor">
    <legend>${HEADER_SLOT_LABELS[index]}</legend>
    <label>Content
      <select onchange="setHeaderSlot(${index},'type',this.value);renderHeaderModalBody()">
        <option value="none" ${slot.type==="none"?"selected":""}>None (empty)</option>
        <option value="text" ${slot.type==="text"?"selected":""}>Text</option>
        <option value="logo" ${slot.type==="logo"?"selected":""}>Logo / image</option>
      </select>
    </label>
    ${slot.type==="text"?`<label>Text<textarea rows="2" oninput="setHeaderSlot(${index},'text',this.value)">${esc(slot.text)}</textarea></label>`:""}
    ${slot.type==="logo"?`
      <label class="custom-icon-row">Upload image<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onchange="uploadHeaderSlotImage(${index},event)"></label>
      ${slot.image?`<button onclick="setHeaderSlot(${index},'image','');renderHeaderModalBody()">Use default logo instead</button>`:'<p class="help">Using the default Monkey Head logo. Upload an image to replace it.</p>'}
    `:""}
    ${slot.type!=="none"?`
      <label>Size
        <div class="range-with-value">
          <input type="range" min="0.30" max="2.50" step="0.01" value="${scale}" oninput="setHeaderSlotScale(${index},Number(this.value));document.getElementById('headerSlotScaleValue${index}').value=Math.round(Number(this.value)*100)+'%'">
          <output id="headerSlotScaleValue${index}">${Math.round(scale*100)}%</output>
        </div>
      </label>
      <label>Rotation
        <div class="range-with-value">
          <input type="range" min="-180" max="180" step="1" value="${slot.rotation}" oninput="setHeaderSlot(${index},'rotation',Number(this.value));document.getElementById('headerSlotRotationValue${index}').value=this.value+'°'">
          <output id="headerSlotRotationValue${index}">${slot.rotation}°</output>
        </div>
      </label>
    `:""}
  </fieldset>`;
}
function renderHeaderModalBody(){
  const body=document.getElementById("headerModalBody");
  if(!body)return;
  const s=state.settings;
  const scales=s.sizesByPageSize[s.pageSize].headerSlotScales;
  body.innerHTML=s.headerSlots.map((slot,i)=>headerSlotEditor(slot,i,scales[i])).join("");
}

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
  if(item.type==="divider")return dividerEditorCard(item,i);
  if(item.type==="text")return textEditorCard(item,i);
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
          <div class="grid-name-row">
            <label>Name<input value="${esc(item.name)}" oninput="setItem(${i},'name',this.value)"></label>
            <label>Beer style<input list="styleOptions" value="${esc(item.style)}" oninput="setItem(${i},'style',this.value)"></label>
            <label>Accent color<input type="color" value="${esc(item.color)}" oninput="setItem(${i},'color',this.value);this.closest('fieldset').style.setProperty('--item-color',this.value)"></label>
          </div>
          <div class="grid2">
            <label class="checkbox-row"><input class="item-outline-enabled" type="checkbox" ${item.outlineEnabled?"checked":""} onchange="setItem(${i},'outlineEnabled',this.checked)"> Black outline on beer name</label>
            <label>Outline thickness
              <div class="range-with-value">
                <input class="item-outline-width-slider" data-item-index="${i}" type="range" min="0.5" max="3" step="0.1" value="${esc(clampNumber(item.outlineWidth,0.5,3,1.5))}" oninput="setItem(${i},'outlineWidth',Number(this.value));document.getElementById('outlineWidthValue-${i}').value=Number(this.value).toFixed(1)+' px'">
                <output id="outlineWidthValue-${i}">${clampNumber(item.outlineWidth,0.5,3,1.5).toFixed(1)} px</o>
              </div>
            </label>
          </div>
          <label class="checkbox-row"><input type="checkbox" ${item.isNew?"checked":""} onchange="setItem(${i},'isNew',this.checked)"> Mark as "New"</label>
          <label>"New" badge style
            <select onchange="setItem(${i},'newBadgeStyle',this.value)">
              <option value="pill" ${item.newBadgeStyle==="pill"?"selected":""}>Solid pill</option>
              <option value="text" ${item.newBadgeStyle==="text"?"selected":""}>Bold tilted text</option>
              <option value="outline" ${item.newBadgeStyle==="outline"?"selected":""}>Outlined</option>
              <option value="starburst" ${item.newBadgeStyle==="starburst"?"selected":""}>Starburst sticker</option>
            </select>
          </label>
          <div class="grid4">
            <label>ABV %<span id="abvCalcTag-${i}" class="calc-tag">${isAbvCalculated(item)?" (calculated)":""}</span><input id="abvInput-${i}" inputmode="decimal" value="${esc(item.abv)}" ${isAbvCalculated(item)?"readonly":""} oninput="setItem(${i},'abv',this.value)"></label>
            <label>IBU<input inputmode="numeric" value="${esc(item.ibu)}" oninput="setItem(${i},'ibu',this.value)"></label>
            <label>Gluten free<select onchange="setItem(${i},'glutenFree',this.value==='true')"><option value="false" ${!item.glutenFree?'selected':''}>No</option><option value="true" ${item.glutenFree?'selected':''}>Yes</option></select></label>
            <label>Icon<select onchange="setItem(${i},'icon',this.value,true)">${iconOptions(item.icon)}</select></label>
          </div>
          <div class="visibility-toggles">
            <label class="checkbox-row"><input type="checkbox" ${item.hideIcon?"checked":""} onchange="setItem(${i},'hideIcon',this.checked)"> Hide icon</label>
            <label class="checkbox-row"><input type="checkbox" ${item.hideAbv?"checked":""} onchange="setItem(${i},'hideAbv',this.checked)"> Hide ABV</label>
            <label class="checkbox-row"><input type="checkbox" ${item.hideIbu?"checked":""} onchange="setItem(${i},'hideIbu',this.checked)"> Hide IBU</label>
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

function dividerEditorCard(item,i){
  return `<fieldset class="beer-card divider-card" style="--item-color:#888">
    <div class="card-header">
      <details class="beer-card-details" ${expandedItemIndices.has(i)?"open":""} ontoggle="onItemDetailsToggle(${i},this.open)">
        <summary>
          <span class="summary-text">
            <span class="summary-name">Divider</span>
            <span class="summary-meta">${item.text?esc(item.text):"(no text)"}</span>
          </span>
        </summary>
        <div class="beer-card-body">
          <label>Divider text (optional)<input value="${esc(item.text)}" placeholder="e.g. CIDERS" oninput="setItem(${i},'text',this.value)"></label>
          <label>Font size
            <div class="range-with-value">
              <input type="range" min="8" max="24" step="0.5" value="${item.fontSize}" oninput="setItem(${i},'fontSize',Number(this.value));document.getElementById('dividerFontSizeValue-${i}').value=this.value+' pt'">
              <output id="dividerFontSizeValue-${i}">${item.fontSize} pt</output>
            </div>
          </label>
          <p class="help">A divider prints as a horizontal rule across the menu, with this text centered on it if provided. Leave blank for a plain line.</p>
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

function textEditorCard(item,i){
  const preview=item.columns.map(c=>c.title||c.body).filter(Boolean).join(" · ")||"(empty)";
  const columnsHtml=item.columns.map((col,ci)=>`
    <fieldset class="header-slot-editor">
      <legend>Column ${ci+1}${item.columns.length>1?` <button class="icon-button danger" title="Remove column" aria-label="Remove column ${ci+1}" onclick="removeTextColumn(${i},${ci})">×</button>`:""}</legend>
      <label>Title<input value="${esc(col.title)}" oninput="setTextColumn(${i},${ci},'title',this.value)"></label>
      <label>Body<textarea rows="2" oninput="setTextColumn(${i},${ci},'body',this.value)">${esc(col.body)}</textarea></label>
    </fieldset>`).join("");
  return `<fieldset class="beer-card text-card" style="--item-color:#888">
    <div class="card-header">
      <details class="beer-card-details" ${expandedItemIndices.has(i)?"open":""} ontoggle="onItemDetailsToggle(${i},this.open)">
        <summary>
          <span class="summary-text">
            <span class="summary-name">Text block</span>
            <span class="summary-meta">${esc(preview)}</span>
          </span>
        </summary>
        <div class="beer-card-body">
          ${columnsHtml}
          ${item.columns.length<3?`<button onclick="addTextColumn(${i})">+ Add column (up to 3)</button>`:'<p class="help">Maximum of 3 columns.</p>'}
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
  const sizes=s.sizesByPageSize[s.pageSize];
  document.getElementById("pageSizeLetterBtn")?.classList.toggle("active",s.pageSize==="letter");
  document.getElementById("pageSizeCardBtn")?.classList.toggle("active",s.pageSize==="4x6");
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.value=value};
  set("translationContactEmail",s.translationContactEmail||"");
  set("iconScale",sizes.iconScale);
  set("iconScaleValue",`${Math.round(Number(sizes.iconScale)*100)}%`);
  set("statsScale",sizes.statsScale);
  set("statsScaleValue",`${Math.round(Number(sizes.statsScale)*100)}%`);
  set("watermarkOpacity",sizes.watermarkOpacity);
  set("watermarkOpacityValue",`${Math.round(Number(sizes.watermarkOpacity)*100)}%`);
  set("watermarkScale",sizes.watermarkScale);
  set("watermarkScaleValue",`${Math.round(Number(sizes.watermarkScale)*100)}%`);
  set("globalDescriptionFontSize",clampDescriptionFontSize(sizes.globalDescriptionFontSize));
  updateGlobalDescriptionControl();
  updateGlobalOutlineControl();
  set("taproomLabel",s.taproomLabel);
  set("taproomHours",s.taproomHours);
  set("phone",s.phone);
  set("location",s.location);
  set("footerAutoFit",String(Boolean(s.footerAutoFit)));
  set("taproomFontSize",sizes.taproomFontSize);
  set("taproomFontSizeValue",`${String(Number(sizes.taproomFontSize).toFixed(1)).replace(/\.0$/,"")} pt`);
  set("phoneFontSize",sizes.phoneFontSize);
  set("phoneFontSizeValue",`${String(Number(sizes.phoneFontSize).toFixed(1)).replace(/\.0$/,"")} pt`);
  set("locationFontSize",sizes.locationFontSize);
  set("locationFontSizeValue",`${String(Number(sizes.locationFontSize).toFixed(1)).replace(/\.0$/,"")} pt`);
  document.querySelectorAll(".page-size-context-label").forEach(el=>{el.textContent=s.pageSize==="4x6"?"4×6 Card":"US Letter"});
  const translateButton=document.getElementById("translateMenuButton");
  if(translateButton)translateButton.textContent=s.language==="es"?"Translate menu to English":"Translate menu to Spanish";
  renderSavedBeverageLibrary();
  renderMenuProfiles();
  renderHeaderModalBody();
}

function formatAbv(value){const v=String(value??"").trim();return v?`${esc(v)}%`:"—"}
function formatIbu(value){const v=String(value??"").trim();return v?esc(v):"—"}
function glutenFreeBadge(){return state.settings.language==="es"?"SIN GLUTEN":"GLUTEN FREE"}
function newBadge(){return state.settings.language==="es"?"NUEVO":"NEW"}
function newBadgeMarkup(item){
  const text=newBadge();
  const style=item.newBadgeStyle||"pill";
  if(style==="starburst")return `<span class="badge badge-new-starburst"><span class="badge-new-starburst-text">${text}</span></span>`;
  const styleClass=style==="outline"?"badge-new-outline":style==="text"?"badge-new-text":"badge-new-pill";
  return `<span class="badge ${styleClass}">${text}</span>`;
}
function renderTapRow(item){
  if(item.type==="divider"){
    return item.text
      ? `<div class="tap-divider-row"><span style="--divider-font-size:${item.fontSize}pt">${esc(item.text)}</span></div>`
      : `<div class="tap-divider-row tap-divider-row-plain"></div>`;
  }
  if(item.type==="text"){
    const cols=item.columns.map(c=>`<div class="tap-text-col">${c.title?`<div class="tap-text-col-title">${esc(c.title)}</div>`:""}${c.body?`<div class="tap-text-col-body">${esc(c.body)}</div>`:""}</div>`).join("");
    return `<div class="tap-text-row" style="grid-template-columns:repeat(${item.columns.length},1fr)">${cols}</div>`;
  }
  const statCells=[];
  if(!item.hideAbv)statCells.push(`<div class="stat"><div class="value">${formatAbv(item.abv)}</div><div class="stat-label">ABV</div></div>`);
  if(!item.hideIbu)statCells.push(`<div class="stat"><div class="value">${formatIbu(item.ibu)}</div><div class="stat-label">IBU</div></div>`);
  const statsRowHtml=statCells.length?`<div class="stats-row${statCells.length===1?" stats-row-single":""}">${statCells.join("")}</div>`:"";
  return `<article class="tap-row" style="color:${esc(item.color)}">
    <div class="icon-wrap${item.hideIcon?" icon-wrap-hidden":""}">${item.hideIcon?"":renderedIcon(item)}</div>
    <div class="tap-divider"></div>
    <div class="item-copy">
      <h2 class="item-name" style="--outline-w:${item.outlineEnabled?clampNumber(item.outlineWidth,0.5,3,1.5):0}px">${esc(item.name)}${item.isNew?newBadgeMarkup(item):''}${item.glutenFree?`<span class="badge">${glutenFreeBadge()}</span>`:''}</h2>
      <p class="desc" style="--desc-font-size:${clampDescriptionFontSize(item.descriptionFontSize)}pt">${esc(item.description)}</p>
    </div>
    <div class="stats">
      <div class="style-label">${esc(item.style||"")}</div>
      ${statsRowHtml}
      ${item.hideIbu?"":bitternessMeter(item.ibu,item.sg,item.fg)}
    </div>
  </article>`;
}
function renderPreview(){
  const list=document.getElementById("tapList");
  list.innerHTML=state.items.map(renderTapRow).join("");
  applySettings();
  requestAnimationFrame(fitMenu);
}
