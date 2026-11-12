const {test,expect}=require("./fixtures.cjs");
async function setRange(locator,value){
  await locator.evaluate((element,v)=>{
    element.value=String(v);
    element.dispatchEvent(new Event("input",{bubbles:true}));
  },value);
}
test.beforeEach(async({page})=>{
  await page.goto("/");
  await expect(page.locator("#tapList .tap-row").first()).toBeVisible();
});
test("beer edits, duplication, removal and undo update the real preview",async({page})=>{
  const initial=await page.locator("#tapList .tap-row").count();
  await page.getByRole("button",{name:"+ Add item"}).click();
  await expect(page.locator("#tapList .tap-row")).toHaveCount(initial+1);
  const card=page.locator("#editor .beer-card").last();
  await card.locator(".grid-name-row input").first().fill("Coverage Citrus IPA");
  await card.locator("textarea").first().fill("Real browser editing test");
  await expect(page.locator("#tapList .item-name").last()).toContainText("Coverage Citrus IPA");
  await expect(page.locator("#tapList .desc").last()).toContainText("Real browser editing test");
  await card.getByRole("button",{name:"Duplicate"}).click();
  await expect(page.locator("#tapList .item-name").last()).toContainText("Coverage Citrus IPA Copy");
  page.once("dialog",dialog=>dialog.accept());
  await page.locator("#editor .beer-card").last().getByRole("button",{name:"Remove"}).click();
  await expect(page.locator("#tapList .tap-row")).toHaveCount(initial+1);
  await page.locator(".app-toolbar .undo-button").click();
  await expect(page.locator("#tapList .item-name").last()).toContainText("Coverage Citrus IPA Copy");
});
test("divider spacing and text blocks render, then page density persists per size",async({page})=>{
  await page.getByRole("button",{name:"+ Add divider"}).click();
  const divider=page.locator("#editor .divider-card").last();
  await divider.locator('input[placeholder="e.g. CIDERS"]').fill("SEASONAL");
  await setRange(divider.locator(".divider-space-slider"),8);
  await expect(page.locator("#tapList .tap-divider-row").last()).toContainText("SEASONAL");
  const margin=await page.locator("#tapList .tap-divider-row").last().evaluate(el=>parseFloat(getComputedStyle(el).marginTop));
  expect(margin).toBeGreaterThan(15);
  await page.getByRole("button",{name:"+ Add text"}).click();
  await expect(page.locator("#tapList .tap-text-row").last()).toBeAttached();
  await page.getByRole("button",{name:"Page",exact:true}).click();
  await setRange(page.locator("#pageDensity"),70);
  await expect(page.locator("#pageDensityValue")).toHaveText("70%");
  await page.locator('#pageModal [aria-label="Close"]').click();
  await page.locator("#pageSizeCardBtn").click();
  expect(await page.evaluate(()=>state.settings.sizesByPageSize["4x6"].pageDensity)).toBe(0);
  await page.locator("#pageSizeLetterBtn").click();
  expect(await page.evaluate(()=>state.settings.sizesByPageSize.letter.pageDensity)).toBe(70);
});
test("gluten-free vertical layout works without icon and with NEW badge",async({page})=>{
  await page.evaluate(()=>{
    setItem(0,"glutenFree",true);
    setItem(0,"glutenFreePlacement","vertical");
    setItem(0,"glutenFreeFontSize",14);
    setItem(0,"hideIcon",true);
    setItem(0,"isNew",true);
    setItem(0,"hideIbu",true);
    setItem(0,"hideHopBar",true);
    setItem(0,"hideBitternessLabel",true);
  });
  const first=page.locator("#tapList .tap-row").first();
  await expect(first).toHaveClass(/tap-row-gluten-side/);
  await expect(first).toHaveClass(/tap-row-no-icon/);
  await expect(first.locator(".gluten-side-label")).toHaveText("GLUTEN FREE");
  await expect(first.locator(".new-badge-overlay")).toBeAttached();
  await expect(first.locator(".stats-row-single")).toBeAttached();
  expect(await first.evaluate(el=>el.style.getPropertyValue("--gluten-label-font-size"))).toBe("14pt");
});
