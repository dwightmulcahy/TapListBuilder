const {test,expect}=require("@playwright/test");

for(const size of ["letter","4x6"]){
  test(`Firefox print layout keeps ${size} menu on a single white sheet`,async({page,browserName})=>{
    test.skip(browserName!=="firefox","Firefox-specific print regression");
    await page.goto("/");
    await expect(page.locator("#tapList .tap-row").first()).toBeVisible();
    await page.evaluate(size=>setSetting("pageSize",size),size);
    await page.emulateMedia({media:"print"});
    await page.evaluate(()=>preparePrintLayout());
    const layout=await page.evaluate(()=>{
      const page=document.getElementById("page");
      const rect=page.getBoundingClientRect();
      const root=document.documentElement;
      const shell=document.getElementById("appShellViewport");
      const style=getComputedStyle(page);
      return {
        rect:{left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height},
        expectedWidth:parseFloat(getComputedStyle(root).getPropertyValue("--page-w"))||0,
        background:style.backgroundColor,
        position:style.position,
        shellHeight:shell.getBoundingClientRect().height,
        sheetWidth:parseFloat(getComputedStyle(root).getPropertyValue("--page-w"))||0,
        bodyBackground:getComputedStyle(document.body).backgroundColor,
        pageStyle:document.getElementById("printPageStyle").textContent
      };
    });
    const inches=size==="letter"?[8.5,11]:[4,6];
    expect(layout.rect.width).toBeCloseTo(inches[0]*96,0);
    expect(layout.rect.height).toBeCloseTo(inches[1]*96,0);
    expect(layout.rect.left).toBeGreaterThanOrEqual(-1);
    expect(layout.rect.top).toBeGreaterThanOrEqual(-1);
    expect(layout.rect.right).toBeLessThanOrEqual(inches[0]*96+1);
    expect(layout.rect.bottom).toBeLessThanOrEqual(inches[1]*96+1);
    expect(layout.position).toBe("fixed");
    expect(layout.shellHeight).toBeLessThanOrEqual(1);
    expect(layout.bodyBackground).toBe("rgb(255, 255, 255)");
    expect(layout.pageStyle).toContain(size==="letter"?"letter portrait":"4in 6in");
  });
}

test("Firefox three-up printing preserves three cards",async({page,browserName})=>{
  test.skip(browserName!=="firefox","Firefox-specific print regression");
  await page.goto("/");
  await expect(page.locator("#tapList .tap-row").first()).toBeVisible();
  await page.evaluate(()=>setSetting("pageSize","4x6"));
  await page.evaluate(()=>{window.print=()=>{};});
  await page.evaluate(()=>printThreeUp());
  await page.emulateMedia({media:"print"});
  await expect(page.locator("#printThreeUpSheet .three-up-card")).toHaveCount(3);
  await expect(page.locator("#appShellViewport")).toBeHidden();
  const dimensions=await page.locator("#printThreeUpSheet").boundingBox();
  expect(dimensions.width).toBeCloseTo(8.5*96,0);
  expect(dimensions.height).toBeCloseTo(11*96,0);
});
