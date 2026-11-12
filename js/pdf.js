// Page sizing, live text-fit/shrink logic, and print/preview controls.
function applySettings(){
  const s=state.settings;
  const sizes=s.sizesByPageSize[s.pageSize];
  const density=clampNumber(sizes.pageDensity,0,100,0)/100;
  const spacingScale=1-.7*density;
  const iconSpaceScale=1-.18*density;
  const marginScale=1-.55*density;
  let w="8.5in",h="11in",pageCss="letter portrait",layoutScale=1;
  if(s.pageSize==="4x6"){
    w="4in";h="6in";pageCss="4in 6in";layoutScale=.5;
  }
  const pageEl=document.getElementById("page");
  const hasVisibleHeader=s.showHeader&&headerHasContent(s.headerSlots);
  pageEl.classList.toggle("hide-header",!hasVisibleHeader);
  pageEl.classList.toggle("hide-footer",!s.showFooter);
  pageEl.classList.toggle("show-corner-overlay",s.pageSize==="4x6");
  document.documentElement.style.setProperty("--page-w",w);
  document.documentElement.style.setProperty("--page-h",h);
  pageEl.style.setProperty("--page-w",w);
  pageEl.style.setProperty("--page-h",h);
  pageEl.style.setProperty("--layout-scale",String(layoutScale));
  pageEl.style.setProperty("--density-space",String(spacingScale));
  pageEl.style.setProperty("--density-icon",String(iconSpaceScale));
  if(s.pageSize==="4x6"){
    pageEl.style.setProperty("--page-pad-top","0.22in");
    pageEl.style.setProperty("--page-pad-right","0.24in");
    pageEl.style.setProperty("--page-pad-bottom","0.18in");
    pageEl.style.setProperty("--page-pad-left","0.24in");
    pageEl.style.setProperty("--corner-cut","0.42in");
  }else{
    pageEl.style.setProperty("--page-pad-top",`calc(6mm * ${layoutScale} * ${marginScale})`);
    pageEl.style.setProperty("--page-pad-right",`calc(10mm * ${layoutScale} * ${marginScale})`);
    pageEl.style.setProperty("--page-pad-bottom",`calc(4.5mm * ${layoutScale} * ${marginScale})`);
    pageEl.style.setProperty("--page-pad-left",`calc(10mm * ${layoutScale} * ${marginScale})`);
    pageEl.style.setProperty("--corner-cut","0px");
  }
  pageEl.style.setProperty("--icon-scale",String(clampNumber(sizes.iconScale,.50,1.80,1)*iconSpaceScale));
  pageEl.style.setProperty("--stats-scale",String(clampNumber(sizes.statsScale,.50,2.00,1)));
  const maxHeaderSlotScale=Math.max(...sizes.headerSlotScales,0.5);
  pageEl.style.setProperty("--header-height",hasVisibleHeader?`${61 * layoutScale * maxHeaderSlotScale}mm`:"0px"); // provisional, corrected below
  pageEl.style.setProperty("--footer-height",s.showFooter?`${25 * layoutScale}mm`:"0px");
  pageEl.style.setProperty("--watermark-scale",String(clampNumber(sizes.watermarkScale,.50,1.80,1)));
  pageEl.style.setProperty("--watermark-opacity",String(clampNumber(sizes.watermarkOpacity,0,1,.22)));
  pageEl.style.setProperty("--taproom-font-size",`${clampNumber(sizes.taproomFontSize,10,32,20)}pt`);
  pageEl.style.setProperty("--phone-font-size",`${clampNumber(sizes.phoneFontSize,10,32,20)}pt`);
  pageEl.style.setProperty("--location-font-size",`${clampNumber(sizes.locationFontSize,10,32,19)}pt`);
  pageEl.style.setProperty("--taproom-scale","1");
  pageEl.style.setProperty("--phone-scale","1");
  pageEl.style.setProperty("--footer-bottom-scale","1");
  document.getElementById("printPageStyle").textContent=`@page{size:${pageCss};margin:0}`;
  document.getElementById("pTaproomLabel").textContent=s.taproomLabel||"";
  document.getElementById("pTaproomHours").textContent=s.taproomHours||"";
  document.getElementById("pPhone").textContent=s.phone||"";
  document.getElementById("pLocation").textContent=s.location||"";
  try{renderHeader();}catch(err){console.error("renderHeader failed:",err);}
  try{fitHeader();}catch(err){console.error("fitHeader failed:",err);}
}
// The side slots occupy two half-width columns and remain vertically centered.
// The center slot is absolutely positioned near the top, above both columns.
// Measure the rotated/scaled content rather than the untransformed image boxes:
// this keeps the center near the printable margin without clipping it and gives
// the side images enough height, even at high scale/rotation settings.
function fitHeader(){
  const pageEl=document.getElementById("page");
  const header=document.querySelector(".header");
  if(!pageEl||!header||!state.settings.showHeader||!headerHasContent(state.settings.headerSlots))return;
  const contents=[0,1,2].map(i=>document.getElementById(`headerSlot${i}`)?.firstElementChild);
  if(!contents.some(Boolean))return; // empty slots already collapsed by applySettings()
  const headerRect=header.getBoundingClientRect();
  if(headerRect.height<=0)return; // not laid out (e.g. hidden)
  const printing=typeof window!=="undefined"&&typeof window.matchMedia==="function"&&window.matchMedia("print").matches;
  const scale=printing?1:(typeof currentShellScale==="number"&&currentShellScale>0?currentShellScale:1);
  const layoutScale=state.settings.pageSize==="4x6"?.5:1;
  const density=clampNumber(state.settings.sizesByPageSize?.[state.settings.pageSize]?.pageDensity,0,100,0)/100;
  const sideClearance=Math.max(2,Math.round(5*(1-.75*density)));
  const bottomClearance=Math.max(1,Math.round(4*(1-.75*density)));

  // A centered transform changes the visual top even when the slot itself is
  // top-anchored. Align the actual visible edge to the margin: shift smaller
  // logos upward and large/rotated logos downward as needed.
  const offsets=state.settings.sizesByPageSize[state.settings.pageSize].headerSlotYOffsets||[0,0,0];
  header.style.setProperty("--header-center-shift","0px");
  const center=contents[1];
  let centerBottom=0;
  let baseCenterBottom=0;
  if(center){
    const topClearance=Math.max(2,Math.round(5*layoutScale));
    const visualTop=(center.getBoundingClientRect().top-headerRect.top)/scale;
    const baseShift=Math.round(topClearance-visualTop);
    // The slider is a true offset from the automatically aligned position.
    // Do not clamp negative offsets to the header's top edge: the header allows
    // visible overflow into the page's top margin. The page itself clips
    // anything moved beyond the paper edge, matching print output.
    const offsetPx=clampNumber(offsets[1],-20,20,0)*96/25.4;
    const desiredTop=topClearance+offsetPx;
    const shift=Math.round(desiredTop-visualTop);
    header.style.setProperty("--header-center-shift",`${shift}px`);
    centerBottom=(center.getBoundingClientRect().bottom-headerRect.top)/scale;
    // Side positions are based on the unshifted center's natural height.
    // Moving the center down may grow the header, but must not move the sides.
    baseCenterBottom=centerBottom+baseShift-shift;
  }

  // Establish the original, centered side-column baseline using the *natural*
  // header height, independent of the user's offsets. If a moved side extends
  // lower, grow the header without moving the other side or the center logo.
  const sideSlots=[0,2].map(i=>document.getElementById(`headerSlot${i}`));
  sideSlots.forEach(slot=>{if(slot)slot.style.top="0px"});
  const sideHeight=Math.max(0,...[contents[0],contents[2]]
    .filter(Boolean).map(el=>el.getBoundingClientRect().height/scale));
  const naturalHeight=Math.max(sideHeight+2*sideClearance,baseCenterBottom+bottomClearance);
  let neededPx=Math.max(naturalHeight,centerBottom+bottomClearance);
  for(const i of [0,2]){
    const slot=document.getElementById(`headerSlot${i}`);
    const content=contents[i];
    if(!slot||!content)continue;
    const rect=content.getBoundingClientRect();
    const height=rect.height/scale;
    const offsetPx=clampNumber(offsets[i],-20,20,0)*96/25.4;
    const desiredTop=Math.max(2,(naturalHeight-height)/2+offsetPx);
    // Rotation and scaling can extend the visible content above its own box.
    const visualTopAtZero=(rect.top-headerRect.top)/scale;
    slot.style.top=`${Math.round(desiredTop-visualTopAtZero)}px`;
    neededPx=Math.max(neededPx,(content.getBoundingClientRect().bottom-headerRect.top)/scale+sideClearance);
  }
  neededPx=Math.ceil(neededPx);
  if(Number.isFinite(neededPx)&&neededPx>0)pageEl.style.setProperty("--header-height",`${neededPx}px`);
}
function fitFooter(){
  const pageEl=document.getElementById("page");
  const top=document.querySelector(".footer-top");
  const bottom=document.querySelector(".footer-bottom");
  const taproomBlock=top?.children[0];
  const phoneBlock=top?.children[1];
  if(!state.settings.showFooter)return;
  const autoFit=Boolean(state.settings.footerAutoFit);
  let taproomScale=1;
  let phoneScale=1;
  let bottomScale=1;
  pageEl.style.setProperty("--taproom-scale",taproomScale);
  pageEl.style.setProperty("--phone-scale",phoneScale);
  pageEl.style.setProperty("--footer-bottom-scale",bottomScale);
  if(!autoFit)return;
  while(taproomBlock && taproomBlock.scrollWidth>taproomBlock.clientWidth+1 && taproomScale>.35){
    taproomScale=Math.round((taproomScale-.02)*100)/100;
    pageEl.style.setProperty("--taproom-scale",taproomScale);
  }
  while(phoneBlock && phoneBlock.scrollWidth>phoneBlock.clientWidth+1 && phoneScale>.35){
    phoneScale=Math.round((phoneScale-.02)*100)/100;
    pageEl.style.setProperty("--phone-scale",phoneScale);
  }
  while(bottom && bottom.scrollWidth>bottom.clientWidth+1 && bottomScale>.35){
    bottomScale=Math.round((bottomScale-.02)*100)/100;
    pageEl.style.setProperty("--footer-bottom-scale",bottomScale);
  }
}
// Density reduces the vertical space assigned to each beer row, rather than merely
// changing padding inside rows that would otherwise stretch to fill the entire page.
function applyDensityRowSpacing(){
  const list=document.getElementById("tapList");
  if(!list)return;
  const settings=state.settings;
  const density=clampNumber(settings.sizesByPageSize[settings.pageSize].pageDensity,0,100,0)/100;
  const children=[...list.children];
  const beerRows=children.filter(row=>row.classList.contains("tap-row"));
  beerRows.forEach(row=>row.style.removeProperty("--row-target-height"));
  list.classList.toggle("density-layout",density>0);
  if(density<=0||!beerRows.length)return;

  // Measure the un-stretched rows, including margins on optional text rows.
  const occupied=children.reduce((sum,row)=>{
    const style=getComputedStyle(row);
    return sum+row.offsetHeight+(parseFloat(style.marginTop)||0)+(parseFloat(style.marginBottom)||0);
  },0);
  const spare=Math.max(0,list.clientHeight-occupied-2);
  const extraPerRow=spare*(1-density)/beerRows.length;
  if(extraPerRow>0)beerRows.forEach(row=>{
    row.style.setProperty("--row-target-height",`${row.offsetHeight+extraPerRow}px`);
  });
}
function fitMenu(){
  const pageEl=document.getElementById("page");
  const list=document.getElementById("tapList");
  let fit=1;
  pageEl.style.setProperty("--fit",fit);
  applyDensityRowSpacing();
  const overflows=()=>list.scrollHeight>list.clientHeight+1||[...list.children].some(row=>!row.classList.contains("tap-divider-row")&&row.scrollHeight>row.clientHeight+1);
  while(overflows()&&fit>.76){
    fit=Math.round((fit-.02)*100)/100;
    pageEl.style.setProperty("--fit",fit);
    applyDensityRowSpacing();
  }
  fitFooter();
  const status=document.getElementById("fitStatus");
  if(overflows()){
    status.className="status-bar warn";
    status.textContent="The menu is overfilled. Shorten descriptions or remove an item before printing.";
  }else{
    status.className="status-bar";
    status.textContent=fit<.98?`Menu fits after automatic text scaling (${Math.round(fit*100)}%).`:`Menu fits on one page.`;
  }
}

function setDisplayMode(mode){
  const isPreview=mode==="preview";
  document.body.classList.toggle("preview-only",isPreview);
  document.getElementById("editTabButton")?.classList.toggle("active",!isPreview);
  document.getElementById("previewTabButton")?.classList.toggle("active",isPreview);
  const viewToggle=document.getElementById("viewToggleMenuItem");
  if(viewToggle)viewToggle.textContent=isPreview?"Edit":"Preview";
  requestAnimationFrame(fitMenu);
}
// Re-measure after print CSS removes the editor's responsive zoom. Otherwise
// the header fit can use the on-screen scale while printing at physical size.
function preparePrintLayout(){fitHeader();fitMenu()}
function restorePreviewAfterPrint(){
  requestAnimationFrame(()=>{
    fitAppShell();
    fitHeader();
    fitMenu();
  });
}
async function printMenu(){
  // Imported JSON can contain large embedded header images. Wait for their
  // first decode (bounded to 4s) before opening the browser print dialog.
  const images=[...document.querySelectorAll("#page img")];
  if(images.length){
    const ready=Promise.all(images.map(img=>typeof img.decode==="function"?img.decode().catch(()=>{}):Promise.resolve()));
    let timeoutId;
    try{
      await Promise.race([ready,new Promise(resolve=>{timeoutId=setTimeout(resolve,4000)})]);
    }finally{
      clearTimeout(timeoutId);
    }
  }
  preparePrintLayout();
  window.print();
}

/**
 * Print three identical 4×6 cards on US Letter without changing the menu's
 * stored page size. Two cards remain portrait; the third is rotated 90°.
 * The printable sheet uses 0.25in outer margins and a 0.25in row gap.
 */
async function printThreeUp(){
  if(state.settings.pageSize!=="4x6"){
    alert("Select 4×6 Card in Page Setup before printing three per sheet.");
    return;
  }
  // Use the same image-decode and layout preparation as the normal print path.
  const images=[...document.querySelectorAll("#page img")];
  if(images.length){
    const ready=Promise.all(images.map(img=>typeof img.decode==="function"?img.decode().catch(()=>{}):Promise.resolve()));
    let timeoutId;
    try{await Promise.race([ready,new Promise(resolve=>{timeoutId=setTimeout(resolve,4000)})]);}
    finally{clearTimeout(timeoutId);}
  }
  preparePrintLayout();
  clearThreeUpPrint();
  const sheet=document.createElement("div");
  sheet.id="printThreeUpSheet";
  sheet.setAttribute("aria-hidden","true");
  const source=document.getElementById("page");
  for(let i=0;i<3;i++){
    const card=document.createElement("div");
    card.className="three-up-card three-up-card-"+i;
    const copy=source.cloneNode(true);
    // Avoid duplicate DOM ids while preserving class-based print styling.
    copy.removeAttribute("id");
    copy.querySelectorAll("[id]").forEach(el=>el.removeAttribute("id"));
    card.appendChild(copy);
    sheet.appendChild(card);
  }
  document.body.appendChild(sheet);
  document.body.classList.add("printing-three-up");
  document.documentElement.classList.add("printing-three-up");
  document.getElementById("printPageStyle").textContent="@page{size:letter portrait;margin:0}";
  try{window.print();}
  catch(err){clearThreeUpPrint();throw err;}
}
function clearThreeUpPrint(){
  document.getElementById("printThreeUpSheet")?.remove();
  document.body.classList.remove("printing-three-up");
  document.documentElement.classList.remove("printing-three-up");
  if(state?.settings){
    document.getElementById("printPageStyle").textContent=
      state.settings.pageSize==="4x6"?"@page{size:4in 6in;margin:0}":"@page{size:letter portrait;margin:0}";
  }
}
