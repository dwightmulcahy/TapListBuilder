#!/usr/bin/env node
// Convert Chromium V8 coverage to Istanbul for every production JS module.
// Unexecuted modules count as zero, and only /js/*.js are included.
const fs=require("node:fs");
const path=require("node:path");
const v8toIstanbul=require("v8-to-istanbul");
const libCoverage=require("istanbul-lib-coverage");
const libReport=require("istanbul-lib-report");
const reports=require("istanbul-reports");

const root=path.resolve(__dirname,"..");
const jsDir=path.join(root,"js");
const rawDir=path.join(root,"coverage/raw");
const outDir=path.join(root,"coverage");
const files=fs.readdirSync(jsDir).filter(name=>name.endsWith(".js")).map(name=>path.join(jsDir,name));
const allowed=new Set(files);
const collected=new Map(files.map(file=>[file,[]]));
if(!fs.existsSync(rawDir))throw new Error("No browser coverage found; run npm run test:browser first");
const rawFiles=fs.readdirSync(rawDir).filter(name=>name.endsWith(".json"));
if(!rawFiles.length)throw new Error("No browser coverage files found");
for(const rawFile of rawFiles){
  const entries=JSON.parse(fs.readFileSync(path.join(rawDir,rawFile),"utf8"));
  for(const entry of entries){
    let url;
    try{url=new URL(entry.url)}catch{continue}
    const file=path.resolve(root,decodeURIComponent(url.pathname).replace(/^\/+/, ""));
    if(allowed.has(file))collected.get(file).push(entry.functions);
  }
}
async function main(){
  const map=libCoverage.createCoverageMap({});
  for(const file of files){
    const converter=v8toIstanbul(file,0,{source:fs.readFileSync(file,"utf8")});
    await converter.load();
    const coverages=collected.get(file);
    if(!coverages.length)converter.applyCoverage([]);
    for(const functions of coverages)converter.applyCoverage(functions);
    map.merge(converter.toIstanbul());
  }
  fs.mkdirSync(outDir,{recursive:true});
  const summary=map.getCoverageSummary().toJSON();
  fs.writeFileSync(path.join(outDir,"coverage-summary.json"),JSON.stringify(summary,null,2)+"\n");
  const context=libReport.createContext({dir:outDir,coverageMap:map});
  for(const format of ["text-summary","lcovonly","html"])reports.create(format).execute(context);
  console.log("Production JS modules: "+files.length);
  console.log("Browser coverage (not Node VM test coverage): "+
    ["statements","branches","functions","lines"].map(k=>k+" "+summary[k].pct+"%").join(", "));
  console.log("Report: coverage/index.html; LCOV: coverage/lcov.info");
}
main().catch(error=>{console.error(error);process.exitCode=1});
