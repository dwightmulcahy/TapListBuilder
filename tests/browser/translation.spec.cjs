const {test,expect}=require("./fixtures.cjs");
test("language toggles and global font controls affect rendered browser content",async({page})=>{
  // Never rely on the external translation API in deterministic CI.
  await page.route("https://api.mymemory.translated.net/**",route=>route.fulfill({
    status:200,contentType:"application/json",
    body:JSON.stringify({responseData:{translatedText:"Traducción"},responseStatus:200})
  }));
  await page.goto("/");
  await expect(page.locator("#tapList .tap-row").first()).toBeVisible();
  await page.locator(".app-menu-item").nth(3).locator("summary").click();
  await page.locator("#translateMenuButton").click();
  await expect.poll(()=>page.evaluate(()=>state.settings.language)).toBe("es");
  await page.evaluate(()=>{
    setAllBeerNameFontSizes(23);
    setAllDescriptionFontSizes(14.5);
    setAllOutlineEnabled(false);
    setAllOutlineWidth(2);
  });
  const first=page.locator("#tapList .tap-row").first();
  expect(await first.locator(".item-name").evaluate(el=>el.style.getPropertyValue("--name-font-size"))).toBe("23pt");
  expect(await first.locator(".desc").evaluate(el=>el.style.getPropertyValue("--desc-font-size"))).toBe("14.5pt");
  await page.evaluate(()=>toggleMenuTranslation());
  expect(await page.evaluate(()=>state.settings.language)).toBe("en");
});
