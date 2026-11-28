const {chromium}=require("playwright");
const assert=require("node:assert/strict");
(async()=>{
  const url="http://127.0.0.1:8089";
  assert.equal((await fetch(url+"/api/library")).status,401);
  assert.equal((await fetch(url+"/server/library_api.py")).status,404);
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();
    await page.goto(url);
    await page.locator("#tapList .tap-row").first().waitFor();
    page.on("dialog",d=>d.type()==="prompt"?d.accept("ci-test-token"):d.accept());
    await page.evaluate(()=>connectSharedLibrary());
    await page.evaluate(()=>saveItemToLibrary(0));
    await page.waitForFunction(()=>document.getElementById("sharedLibraryStatus").textContent==="Server save confirmed");
    const other=await browser.newPage();
    await other.goto(url);
    await other.locator("#tapList .tap-row").first().waitFor();
    other.on("dialog",d=>d.type()==="prompt"?d.accept("ci-test-token"):d.accept());
    await other.evaluate(()=>connectSharedLibrary());
    assert.equal(await other.evaluate(()=>savedBeverages.length),1);
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
