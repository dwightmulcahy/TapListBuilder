const {test,expect}=require("./fixtures.cjs");
test.beforeEach(async({page})=>{
  await page.goto("/");
  await expect(page.locator("#tapList .tap-row").first()).toBeVisible();
});
test("JSON import shows versions, cancellation preserves menu, acceptance replaces it",async({page})=>{
  const file={name:"legacy-menu.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify({
    version:2.45,appVersion:"v0.1.0",
    items:[{type:"beer",name:"Imported Mango Cider",style:"Cider",description:"Imported from JSON",abv:"4.5",ibu:""}]
  }))};
  const input=page.locator('.app-menu-item input[type="file"][accept*=".json"]');
  await input.setInputFiles(file);
  const dialog=page.locator("#jsonVersionModal");
  await expect(dialog).toBeVisible();
  await expect(page.locator("#jsonSavedAppVersion")).toHaveText("v0.1.0");
  await expect(page.locator("#jsonCurrentAppVersion")).not.toBeEmpty();
  await dialog.locator('button[value="cancel"]').click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("#tapList .item-name").first()).not.toContainText("Imported Mango Cider");
  await input.setInputFiles(file);
  await expect(dialog).toBeVisible();
  await dialog.locator('button[value="load"]').click();
  await expect(page.locator("#tapList .item-name")).toHaveCount(1);
  await expect(page.locator("#tapList .item-name").first()).toHaveText("Imported Mango Cider");
  await expect.poll(()=>page.evaluate(async()=>{const backup=await draftDBRead();return backup?.snapshot?JSON.parse(backup.snapshot).items[0].name:null})).toBe("Imported Mango Cider");
  await expect.poll(()=>page.evaluate(async()=>{const backup=await draftDBRead();return backup?.snapshot?JSON.parse(backup.snapshot).appVersion:null})).toBeTruthy();
});
test("Save produces version-stamped JSON containing current menu and settings",async({page})=>{
  await page.evaluate(()=>{
    window.__savedJson="";
    window.showSaveFilePicker=async()=>({
      createWritable:async()=>({
        write:async data=>{window.__savedJson=data},
        close:async()=>{}
      })
    });
  });
  await page.locator(".app-menu-item").first().locator("summary").click();
  await page.locator(".app-menu-item").first().getByRole("button",{name:"Save",exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__savedJson.length)).toBeGreaterThan(100);
  const exported=await page.evaluate(()=>JSON.parse(window.__savedJson));
  expect(exported.appVersion).toBeTruthy();
  expect(exported.version).toBeGreaterThan(0);
  expect(exported.items.length).toBeGreaterThan(0);
  expect(exported.savedBeverages).toEqual([]);
  expect(exported.settings.sizesByPageSize.letter).toBeTruthy();
});
test("named profiles restore an edited menu after confirmation",async({page})=>{
  await page.evaluate(()=>openModal("menuProfilesModal"));
  page.once("dialog",dialog=>dialog.accept("Coverage Weekday"));
  await page.getByRole("button",{name:"Save as new"}).click();
  await expect(page.locator("#menuProfileStatus")).toContainText("Coverage Weekday");
  await page.locator('#menuProfilesModal [aria-label="Close"]').click();
  await page.evaluate(()=>setItem(0,"name","Changed After Profile Save"));
  await expect(page.locator("#tapList .item-name").first()).toHaveText("Changed After Profile Save");
  await page.evaluate(()=>openModal("menuProfilesModal"));
  await page.getByRole("button",{name:"Load selected"}).click();
  await expect(page.locator("#jsonVersionModal")).toBeVisible();
  await page.locator('#jsonVersionModal button[value="load"]').click();
  await expect(page.locator("#tapList .item-name").first()).not.toHaveText("Changed After Profile Save");
  await expect(page.locator("#menuProfileStatus")).toContainText("Loaded");
});
test("saved beverage library adds a real item after version confirmation",async({page})=>{
  await page.evaluate(()=>saveItemToLibrary(0));
  await page.evaluate(()=>openModal("libraryModal"));
  await expect(page.locator("#savedLibraryStatus")).toContainText("Saved “America IPA”");
  const before=await page.locator("#tapList .tap-row").count();
  await page.locator("#addSavedBeverageButton").click();
  await expect(page.locator("#jsonVersionModal")).toBeVisible();
  await page.locator('#jsonVersionModal button[value="load"]').click();
  await expect(page.locator("#tapList .tap-row")).toHaveCount(before+1);
  await expect(page.locator("#savedLibraryStatus")).toContainText("Added");
});
