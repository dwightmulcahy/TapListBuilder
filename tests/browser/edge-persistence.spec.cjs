const {test,expect}=require("./fixtures.cjs");
test.beforeEach(async({page})=>{
  await page.goto("/");
  await expect(page.locator("#tapList .tap-row").first()).toBeVisible();
});
test("profile create, overwrite, rename and delete preserve current menu state",async({page})=>{
  await page.evaluate(()=>openModal("menuProfilesModal"));
  page.once("dialog",dialog=>dialog.accept("Coverage Profile"));
  await page.getByRole("button",{name:"Save as new"}).click();
  await expect(page.locator("#menuProfileStatus")).toContainText("Coverage Profile");
  await page.evaluate(()=>setItem(0,"name","Overwritten Beer"));
  page.once("dialog",dialog=>dialog.accept());
  await page.getByRole("button",{name:"Overwrite selected"}).click();
  await expect(page.locator("#menuProfileStatus")).toContainText("Updated");
  page.once("dialog",dialog=>dialog.accept("Renamed Coverage"));
  await page.getByRole("button",{name:"Rename selected"}).click();
  await expect(page.locator("#menuProfileStatus")).toContainText("Renamed Coverage");
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("mhbMenuProfilesV1")));
  expect(saved).toHaveLength(1);
  expect(saved[0].name).toBe("Renamed Coverage");
  expect(saved[0].state.items[0].name).toBe("Overwritten Beer");
  page.once("dialog",dialog=>dialog.accept());
  await page.getByRole("button",{name:"Delete selected"}).click();
  await expect(page.locator("#menuProfileStatus")).toContainText("Deleted");
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("mhbMenuProfilesV1")))).toEqual([]);
});
test("saved beverage library supports save all, overwrite, and delete",async({page})=>{
  await page.evaluate(()=>{
    saveAllItemsToLibrary();
    setItem(0,"abv","7.5");
    saveItemToLibrary(0);
  });
  const items=await page.evaluate(()=>JSON.parse(localStorage.getItem("mhbSavedBeveragesV1")));
  expect(items.length).toBeGreaterThan(1);
  expect(items.find(item=>item.item.name==="America IPA").item.abv).toBe("7.5");
  await page.evaluate(()=>openModal("libraryModal"));
  const selected=await page.locator("#savedBeverageSelect").evaluate(el=>Array.from(el.options).find(opt=>opt.textContent.includes("America IPA"))?.value);
  await page.locator("#savedBeverageSelect").selectOption(selected);
  page.once("dialog",dialog=>dialog.accept());
  await page.getByRole("button",{name:"Delete selected"}).click();
  const remaining=await page.evaluate(()=>JSON.parse(localStorage.getItem("mhbSavedBeveragesV1")));
  expect(remaining.some(item=>item.item.name==="America IPA")).toBe(false);
});
test("invalid JSON import is rejected without changing menu, newer versions show warning",async({page})=>{
  const input=page.locator('.app-menu-item input[type="file"][accept*=".json"]');
  const before=await page.evaluate(()=>state.items[0].name);
  const invalidAlert=new Promise(resolve=>page.once("dialog",async dialog=>{await dialog.accept();resolve()}));
  await input.setInputFiles({name:"broken.json",mimeType:"application/json",buffer:Buffer.from("{bad json")});
  await invalidAlert;
  expect(await page.evaluate(()=>state.items[0].name)).toBe(before);
  await input.setInputFiles({name:"future.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify({
    version:999,appVersion:"v99.0.0",items:[{name:"Future Beer"}]
  }))});
  await expect(page.locator("#jsonVersionModal")).toBeVisible();
  await expect(page.locator("#jsonVersionStatus")).toContainText("newer");
  await page.locator('#jsonVersionModal button[value="cancel"]').click();
  expect(await page.evaluate(()=>state.items[0].name)).toBe(before);
});
test("print preparation and About metadata run in real browser",async({page})=>{
  await page.evaluate(()=>{
    preparePrintLayout();
    restorePreviewAfterPrint();
  });
  await page.locator(".app-menu-item").last().locator("summary").click();
  await page.locator(".app-menu-item").last().getByRole("button",{name:"About"}).click();
  await expect(page.locator("#aboutModal")).toBeVisible();
  await expect(page.locator("#aboutVersionInfo")).not.toBeEmpty();
  await page.locator('#aboutModal [aria-label="Close"]').click();
  await page.evaluate(()=>{
    window.__printInvoked=0;
    window.print=()=>{window.__printInvoked++};
  });
  await page.evaluate(()=>printMenu());
  expect(await page.evaluate(()=>window.__printInvoked)).toBe(1);
});
