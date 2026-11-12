#!/usr/bin/env node
const fs=require("node:fs");
const path=require("node:path");
const dir=path.resolve(__dirname,"../coverage");
const summaryFile=path.join(dir,"coverage-summary.json");
const out=process.env.GITHUB_STEP_SUMMARY;
if(!out)process.exit(0);
if(!fs.existsSync(summaryFile)){
  fs.appendFileSync(out,"## Browser production JS coverage\n\nNo coverage report was produced. Check the browser test job logs.\n");
  process.exit(0);
}
const summary=JSON.parse(fs.readFileSync(summaryFile,"utf8"));
const rows=["statements","branches","functions","lines"].map(key=>`| ${key} | ${summary[key].pct}% | ${summary[key].covered} / ${summary[key].total} |`);
let markdown="## Browser production JS coverage\n\nChromium V8 execution, all production `js/*.js` included. Node VM/source-inspection tests are not counted.\n\n| Metric | Coverage | Covered / total |\n|:--|--:|--:|\n"+rows.join("\n")+"\n";
const byFile=path.join(dir,"coverage-by-file.json");
if(fs.existsSync(byFile)){
  const data=JSON.parse(fs.readFileSync(byFile,"utf8"));
  markdown+="\n### Per-module coverage\n\n| Module | Statements | Branches | Functions |\n|:--|--:|--:|--:|\n";
  markdown+=Object.entries(data).sort((a,b)=>a[0].localeCompare(b[0])).map(([file,s])=>
    `| \`${file}\` | ${s.statements.pct}% | ${s.branches.pct}% | ${s.functions.pct}% |`).join("\n")+"\n";
}
markdown+="\nDownload the `browser-coverage` artifact for HTML and LCOV reports.\n";
fs.appendFileSync(out,markdown);
