const {test,expect}=require("./fixtures.cjs");

test("three-up printing creates two portrait and one rotated card on Letter",async({page})=>{
  await page.goto("/");
  await page.evaluate(()=>setSetting("pageSize","4x6"));
  await page.evaluate(()=>{window.print=()=>{window.__printInvoked=true}});
  await page.evaluate(()=>printThreeUp());
  await expect(page.locator("#printThreeUpSheet .three-up-card")).toHaveCount(3);
  expect(await page.evaluate(()=>window.__printInvoked)).toBe(true);
  expect(await page.locator("#printPageStyle").textContent()).toContain("letter portrait");
  await page.emulateMedia({media:"print"});
  const result=await page.evaluate(()=>{
    const sheet=document.getElementById("printThreeUpSheet");
    const cards=[...sheet.children];
    const rects=cards.map(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,top:r.top,right:r.right,bottom:r.bottom}});
    return {sheet:{width:sheet.getBoundingClientRect().width,height:sheet.getBoundingClientRect().height},rects};
  });
  expect(result.rects[0].height).toBeGreaterThan(result.rects[0].width);
  expect(result.rects[1].height).toBeGreaterThan(result.rects[1].width);
  expect(result.rects[2].width).toBeGreaterThan(result.rects[2].height);
  expect(result.rects[0].right).toBeLessThanOrEqual(result.rects[1].left+1);
  expect(result.rects[2].top).toBeGreaterThanOrEqual(result.rects[0].bottom);
  for(const r of result.rects){
    expect(r.left).toBeGreaterThanOrEqual(-1);
    expect(r.top).toBeGreaterThanOrEqual(-1);
    expect(r.right).toBeLessThanOrEqual(result.sheet.width+1);
    expect(r.bottom).toBeLessThanOrEqual(result.sheet.height+1);
  }
  await page.evaluate(()=>clearThreeUpPrint());
  await expect(page.locator("#printThreeUpSheet")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveClass(/printing-three-up/);
  expect(await page.locator("#printPageStyle").textContent()).toContain("4in 6in");
});

test("three-up printing requires a 4x6 menu and does not change settings",async({page})=>{
  await page.goto("/");
  await page.evaluate(()=>{window.__alerts=[];window.alert=msg=>window.__alerts.push(msg);window.print=()=>{throw Error("must not print")}});
  await page.evaluate(()=>printThreeUp());
  expect(await page.evaluate(()=>window.__alerts)).toEqual([expect.stringContaining("Select 4×6 Card")]);
  await expect(page.locator("#printThreeUpSheet")).toHaveCount(0);
  expect(await page.evaluate(()=>state.settings.pageSize)).toBe("letter");
});
