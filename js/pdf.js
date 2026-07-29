// Page sizing, live text-fit/shrink logic, and print/preview controls.
function applySettings(){
  const s=state.settings;
  const sizes=s.sizesByPageSize[s.pageSize];
  let w="8.5in",h="11in",pageCss="letter portrait",layoutScale=1;
  if(s.pageSize==="4x6"){
    w="4in";h="6in";pageCss="4in 6in";layoutScale=.5;
  }
  const pageEl=document.getElementById("page");
  pageEl.classList.toggle("show-corner-overlay",s.pageSize==="4x6");
  document.documentElement.style.setProperty("--page-w",w);
  document.documentElement.style.setProperty("--page-h",h);
  pageEl.style.setProperty("--page-w",w);
  pageEl.style.setProperty("--page-h",h);
  pageEl.style.setProperty("--layout-scale",String(layoutScale));
  if(s.pageSize==="4x6"){
    pageEl.style.setProperty("--page-pad-top","0.22in");
    pageEl.style.setProperty("--page-pad-right","0.24in");
    pageEl.style.setProperty("--page-pad-bottom","0.18in");
    pageEl.style.setProperty("--page-pad-left","0.24in");
    pageEl.style.setProperty("--corner-cut","0.42in");
  }else{
    pageEl.style.setProperty("--page-pad-top",`calc(6mm * ${layoutScale})`);
    pageEl.style.setProperty("--page-pad-right",`calc(10mm * ${layoutScale})`);
    pageEl.style.setProperty("--page-pad-bottom",`calc(4.5mm * ${layoutScale})`);
    pageEl.style.setProperty("--page-pad-left",`calc(10mm * ${layoutScale})`);
    pageEl.style.setProperty("--corner-cut","0px");
  }
  pageEl.style.setProperty("--icon-scale",String(clampNumber(sizes.iconScale,.50,1.80,1)));
  pageEl.style.setProperty("--stats-scale",String(clampNumber(sizes.statsScale,.50,2.00,1)));
  const maxHeaderSlotScale=Math.max(...sizes.headerSlotScales,0.5);
  pageEl.style.setProperty("--header-height",`${61 * layoutScale * maxHeaderSlotScale}mm`); // provisional, corrected below
  pageEl.style.setProperty("--footer-height",`${25 * layoutScale}mm`);
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
// The old header-height formula only accounted for scale, not rotation - a rotated slot's
// visual bounding box can be much taller than its unrotated footprint (e.g. wide text
// rotated 30-40deg sweeps well above/below its own center), which either got clipped or
// forced an oversized header that left the unrotated logo floating in empty space. This
// measures each slot's actual rendered (post-rotation) extent above/below the header's
// vertical center and sizes the header to match, symmetrically.
function fitHeader(){
  const pageEl=document.getElementById("page");
  const header=document.querySelector(".header");
  if(!pageEl||!header)return;
  const slotContents=[...document.querySelectorAll(".header-slot > *")];
  if(!slotContents.length)return; // every slot empty - keep the provisional height
  const headerRect=header.getBoundingClientRect();
  if(headerRect.height<=0)return; // not laid out (e.g. hidden) - skip, keep provisional
  const centerY=headerRect.top+headerRect.height/2;
  let maxExtent=0;
  slotContents.forEach(el=>{
    const r=el.getBoundingClientRect();
    maxExtent=Math.max(maxExtent,centerY-r.top,r.bottom-centerY);
  });
  if(maxExtent<=0)return;
  const scale=typeof currentShellScale==="number"&&currentShellScale>0?currentShellScale:1;
  const neededPx=Math.ceil((maxExtent*2)/scale)+16; // symmetric + a little breathing room
  pageEl.style.setProperty("--header-height",`${neededPx}px`);
}
function fitFooter(){
  const pageEl=document.getElementById("page");
  const top=document.querySelector(".footer-top");
  const bottom=document.querySelector(".footer-bottom");
  const taproomBlock=top?.children[0];
  const phoneBlock=top?.children[1];
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
function fitMenu(){
  const pageEl=document.getElementById("page");
  const list=document.getElementById("tapList");
  let fit=1;
  pageEl.style.setProperty("--fit",fit);
  const overflows=()=>list.scrollHeight>list.clientHeight+1||[...list.children].some(row=>row.scrollHeight>row.clientHeight+1);
  while(overflows()&&fit>.76){fit=Math.round((fit-.02)*100)/100;pageEl.style.setProperty("--fit",fit)}
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
function printMenu(){fitMenu();window.print()}
