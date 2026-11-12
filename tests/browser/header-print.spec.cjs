const {test,expect}=require("./fixtures.cjs");
async function setRange(locator,value){
  await locator.evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event("input",{bubbles:true}))},value);
}
test.beforeEach(async({page})=>{
  await page.goto("/");
  await expect(page.locator("#headerSlot1").first()).toBeAttached();
  await expect(page.locator("#tapList .tap-row").first()).toBeVisible();
});
test("center header moves upward across negative slider range and saves per paper size",async({page})=>{
  await page.getByRole("button",{name:"Header",exact:true}).click();
  const slider=page.locator('#headerModal input[oninput*="setHeaderSlotYOffset(1"]');
  const top=()=>page.locator("#headerSlot1").evaluate(el=>el.firstElementChild.getBoundingClientRect().top);
  const original=await top();
  await setRange(slider,-1);
  const slightlyHigher=await top();
  await setRange(slider,-10);
  const muchHigher=await top();
  expect(slightlyHigher).toBeLessThan(original);
  expect(muchHigher).toBeLessThan(slightlyHigher-20);
  expect(await page.evaluate(()=>state.settings.sizesByPageSize.letter.headerSlotYOffsets[1])).toBe(-10);
  await page.locator('#headerModal [aria-label="Close"]').click();
  await page.locator("#pageSizeCardBtn").click();
  expect(await page.evaluate(()=>state.settings.sizesByPageSize["4x6"].headerSlotYOffsets[1])).toBe(0);
  await page.locator("#pageSizeLetterBtn").click();
  expect(await page.evaluate(()=>state.settings.sizesByPageSize.letter.headerSlotYOffsets[1])).toBe(-10);
});
test("header and footer can be hidden, reclaiming actual page space",async({page})=>{
  const before=await page.locator("#tapList").evaluate(el=>el.getBoundingClientRect().height);
  await page.evaluate(()=>{setSetting("showHeader",false);setSetting("showFooter",false)});
  await expect(page.locator("#page")).toHaveClass(/hide-header/);
  await expect(page.locator("#page")).toHaveClass(/hide-footer/);
  const after=await page.locator("#tapList").evaluate(el=>el.getBoundingClientRect().height);
  expect(after).toBeGreaterThan(before);
});
test("Chromium produces a single physical page for US Letter and 4×6 menus",async({page})=>{
  // Real PDF generation catches multi-page print regressions that CSS regex
  // assertions and fake window.print() unit tests cannot detect.
  for(const size of ["letter","4x6"]){
    await page.evaluate(size=>setSetting("pageSize",size),size);
    await page.evaluate(()=>preparePrintLayout());
    const pdf=await page.pdf({printBackground:true,preferCSSPageSize:true});
    expect(pdf.subarray(0,5).toString()).toBe("%PDF-");
    const pages=(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)||[]).length;
    expect(pages,`expected one printed page for ${size}`).toBe(1);
  }
});
