// Browser V8 coverage measures real, loaded production scripts. Source-inspection
// tests and vm.runInContext unit tests do not inflate these percentages.
const {test:base,expect}=require("@playwright/test");
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const rawDir=path.resolve(__dirname,"../../coverage/raw");

const test=base.extend({
  page:async({page},use,testInfo)=>{
    await page.coverage.startJSCoverage({resetOnNavigation:false,useBlockCoverage:true});
    try{
      await use(page);
    }finally{
      const entries=await page.coverage.stopJSCoverage();
      const appEntries=entries.filter(entry=>{
        try{return new URL(entry.url).pathname.startsWith("/js/")}catch{return false}
      });
      fs.mkdirSync(rawDir,{recursive:true});
      const name=crypto.createHash("sha256").update(testInfo.testId).digest("hex").slice(0,16);
      fs.writeFileSync(path.join(rawDir,`${name}-${testInfo.retry}.json`),JSON.stringify(appEntries));
    }
  }
});
module.exports={test,expect};
