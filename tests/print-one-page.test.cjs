const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");

const root=path.join(__dirname,"..");
const read=name=>fs.readFileSync(path.join(root,name),"utf8");
const css=read("css/print.css");
const pdf=read("js/pdf.js");
const app=read("js/app.js");

test("print styles force the complete app shell to one physical sheet",()=>{
  assert.match(css,/@media print/);
  assert.match(css,/html,body\{[^}]*width:var\(--page-w\)!important;height:var\(--page-h\)!important/s);
  assert.match(css,/html,body\{[^}]*min-height:0!important;max-height:var\(--page-h\)!important/s);
  assert.match(css,/#appShellViewport,#appShell,\.app,\.display-area,\.preview-wrap\{[^}]*height:var\(--page-h\)!important/s);
  assert.match(css,/#appShellViewport,#appShell,\.app,\.display-area,\.preview-wrap\{[^}]*display:block!important/s);
  assert.match(css,/#appShellViewport,#appShell,\.app,\.display-area,\.preview-wrap\{[^}]*transform:none!important/s);
  assert.match(css,/\.page\{[^}]*width:var\(--page-w\)!important;height:var\(--page-h\)!important/s);
  assert.match(css,/\.page\{[^}]*break-inside:avoid;page-break-inside:avoid/s);
  assert.doesNotMatch(css,/min-height:100vh|align-items:center|justify-content:center/);
});

test("print dimensions are set from the selected page size for Letter and 4x6",()=>{
  assert.match(pdf,/w="8\.5in",h="11in",pageCss="letter portrait"/);
  assert.match(pdf,/w="4in";h="6in";pageCss="4in 6in"/);
  assert.match(pdf,/document\.documentElement\.style\.setProperty\("--page-w",w\)/);
  assert.match(pdf,/document\.documentElement\.style\.setProperty\("--page-h",h\)/);
  assert.match(pdf,/@page\{size:\$\{pageCss\};margin:0\}/);
});

test("print hooks refit header and menu, then restore screen layout",()=>{
  assert.match(app,/addEventListener\("beforeprint",preparePrintLayout\)/);
  assert.match(app,/addEventListener\("afterprint",restorePreviewAfterPrint\)/);
  assert.match(pdf,/function preparePrintLayout\(\)\{fitHeader\(\);fitMenu\(\)\}/);
  assert.match(pdf,/function restorePreviewAfterPrint\(\)\{[\s\S]*fitAppShell\(\);[\s\S]*fitHeader\(\);[\s\S]*fitMenu\(\)/);
  assert.match(pdf,/const scale=printing\?1:/);
});

test("printMenu waits for embedded image decoding before invoking browser print",async()=>{
  let decodeResolve;
  let printed=0;
  const pending=new Promise(resolve=>{decodeResolve=resolve});
  const image={decode:()=>pending};
  const calls=[];
  const ctx=vm.createContext({
    document:{querySelectorAll:()=>[image]},
    window:{print:()=>{printed++}},
    setTimeout,clearTimeout,
    Promise,
    fitHeader:()=>calls.push("header"),
    fitMenu:()=>calls.push("menu")
  });
  // Evaluate only the print orchestration to avoid browser-dependent page sizing.
  vm.runInContext(pdf.slice(pdf.indexOf("function preparePrintLayout()")),ctx);
  const result=vm.runInContext("printMenu()",ctx);
  await Promise.resolve();
  assert.equal(printed,0);
  decodeResolve();
  await result;
  assert.equal(printed,1);
  assert.deepEqual(calls,["header","menu"]);
});

test("printMenu still opens the dialog if an imported image cannot decode",async()=>{
  let printed=0;
  const ctx=vm.createContext({
    document:{querySelectorAll:()=>[{decode:()=>Promise.reject(new Error("invalid image"))}]},
    window:{print:()=>{printed++}},
    setTimeout,clearTimeout,Promise,
    fitHeader:()=>{},fitMenu:()=>{}
  });
  vm.runInContext(pdf.slice(pdf.indexOf("function preparePrintLayout()")),ctx);
  await vm.runInContext("printMenu()",ctx);
  assert.equal(printed,1);
});
