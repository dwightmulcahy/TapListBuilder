const {test,expect}=require("./fixtures.cjs");
function savedMenu(appVersion){
  return {
    version:2.45,
    ...(appVersion?{appVersion}:{}),
    settings:{pageSize:"letter"},
    items:[{name:"Restored Brewery Special",style:"IPA",abv:"6.2",ibu:"45",description:"Saved in this browser"}]
  };
}
test("startup autosave with a different release asks before restoring",async({page})=>{
  await page.addInitScript(data=>localStorage.setItem("mhbTapListBuilderV2",JSON.stringify(data)),savedMenu("v0.1.0"));
  await page.goto("/");
  await expect(page.locator("#jsonVersionModal")).toBeVisible();
  await expect(page.locator("#jsonVersionSource")).toContainText("Browser autosave");
  await page.locator('#jsonVersionModal button[value="load"]').click();
  await expect(page.locator("#tapList .item-name").first()).toHaveText("Restored Brewery Special");
  expect(await page.evaluate(()=>state.items.length)).toBe(1);
});
test("canceling startup restore keeps original autosave untouched",async({page})=>{
  await page.addInitScript(data=>localStorage.setItem("mhbTapListBuilderV2",JSON.stringify(data)),savedMenu("v99.0.0"));
  await page.goto("/");
  await expect(page.locator("#jsonVersionModal")).toBeVisible();
  await page.locator('#jsonVersionModal button[value="cancel"]').click();
  await expect(page.locator("#tapList .item-name").first()).not.toHaveText("Restored Brewery Special");
  const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem("mhbTapListBuilderV2")));
  expect(persisted.appVersion).toBe("v99.0.0");
});
test("legacy browser autosave gets stamped after explicit acceptance",async({page})=>{
  await page.addInitScript(data=>localStorage.setItem("mhbTapListBuilderV2",JSON.stringify(data)),savedMenu(null));
  await page.goto("/");
  await expect(page.locator("#jsonVersionModal")).toBeVisible();
  await expect(page.locator("#jsonSavedAppVersion")).toContainText("legacy");
  await page.locator('#jsonVersionModal button[value="load"]').click();
  await expect(page.locator("#tapList .item-name").first()).toHaveText("Restored Brewery Special");
  const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem("mhbTapListBuilderV2")));
  expect(persisted.appVersion).toBeTruthy();
});
