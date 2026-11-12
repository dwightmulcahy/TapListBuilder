#!/usr/bin/env node
// Browser-executed production JS coverage floor. Do not count source regex
// tests or vm-evaluated unit tests toward this threshold.
const fs=require("node:fs");
const path=require("node:path");
const report=path.resolve(__dirname,"../coverage/coverage-summary.json");
if(!fs.existsSync(report)){
  console.error("Coverage summary missing; run npm run test:coverage");
  process.exit(1);
}
const coverage=JSON.parse(fs.readFileSync(report,"utf8"));
const limits={
  statements:Number(process.env.COVERAGE_MIN_STATEMENTS??80),
  branches:Number(process.env.COVERAGE_MIN_BRANCHES??60),
  functions:Number(process.env.COVERAGE_MIN_FUNCTIONS??80),
  lines:Number(process.env.COVERAGE_MIN_LINES??80)
};
let failed=false;
for(const [key,min] of Object.entries(limits)){
  const actual=coverage[key]?.pct;
  if(!Number.isFinite(min)||min<0||min>100)throw new Error("Invalid coverage floor for "+key);
  const passed=typeof actual==="number"&&actual>=min;
  console.log(`${passed?"PASS":"FAIL"} ${key}: ${actual??"missing"}% (minimum ${min}%)`);
  if(!passed)failed=true;
}
if(failed)process.exitCode=1;
