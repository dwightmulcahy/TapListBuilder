// Page sizing, live text-fit/shrink logic, and print/preview controls.
function applySettings(){
  const s=state.settings;
  let w="210mm",h="297mm",pageCss="A4 portrait",layoutScale=1;
  if(s.pageSize==="letter"){
    w="8.5in";h="11in";pageCss="letter portrait";layoutScale=1;
  }else if(s.pageSize==="4x6"){
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
  const logoScale=clampNumber(s.logoScale,.60,1.50,1);
  pageEl.style.setProperty("--logo-scale",String(logoScale));
  pageEl.style.setProperty("--header-height",`${61 * layoutScale * logoScale}mm`);
  pageEl.style.setProperty("--footer-height",`${25 * layoutScale}mm`);
  pageEl.style.setProperty("--watermark-scale",String(clampNumber(s.watermarkScale,.50,1.80,1)));
  pageEl.style.setProperty("--watermark-opacity",String(clampNumber(s.watermarkOpacity,0,1,.22)));
  pageEl.style.setProperty("--taproom-font-size",`${clampNumber(s.taproomFontSize,10,32,20)}pt`);
  pageEl.style.setProperty("--phone-font-size",`${clampNumber(s.phoneFontSize,10,32,20)}pt`);
  pageEl.style.setProperty("--location-font-size",`${clampNumber(s.locationFontSize,10,32,19)}pt`);
  pageEl.style.setProperty("--taproom-scale","1");
  pageEl.style.setProperty("--phone-scale","1");
  pageEl.style.setProperty("--footer-bottom-scale","1");
  document.getElementById("printPageStyle").textContent=`@page{size:${pageCss};margin:0}`;
  document.getElementById("pTaproomLabel").textContent=s.taproomLabel||"";
  document.getElementById("pTaproomHours").textContent=s.taproomHours||"";
  document.getElementById("pPhone").textContent=s.phone||"";
  document.getElementById("pLocation").textContent=s.location||"";
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
  requestAnimationFrame(fitMenu);
}
function printMenu(){fitMenu();window.print()}
