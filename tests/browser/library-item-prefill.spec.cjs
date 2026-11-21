const {test,expect}=require("./fixtures.cjs");

test("new item can load all fields from the saved beer library and undo",async({page})=>{
  await page.goto("/");
  await expect(page.locator("#editor .beer-card").first()).toBeVisible();
  await page.evaluate(()=>{
    const saved=normalizeItem({
      name:"Library Nelson IPA",style:"American IPA",abv:"6.7",ibu:"55",
      color:"#2255aa",description:"Nelson hops and citrus",glutenFree:true,
      icon:"beer",isNew:true,hideHopBar:true,sg:"1.060",fg:"1.010"
    });
    savedBeverages=[{id:"test-nelson",item:saved,appVersion:currentJsonAppVersion,version:defaultState.version}];
    renderEditor();
  });
  await page.getByRole("button",{name:"+ Add item"}).click();
  const card=page.locator("#editor .beer-card").last();
  await expect(card.locator(".item-library-picker select")).toBeEnabled();
  await card.locator(".item-library-picker select").selectOption("test-nelson");
  await expect(page.locator("#jsonVersionModal")).toBeVisible();
  await expect(page.locator("#jsonVersionImpact")).toContainText("replaces");
  await page.locator('#jsonVersionModal button[value="load"]').click();
  await expect(page.locator("#jsonVersionModal")).not.toBeVisible();
  await expect(page.locator("#tapList .item-name").last()).toContainText("Library Nelson IPA");
  const item=await page.evaluate(()=>state.items[state.items.length-1]);
  expect(item.name).toBe("Library Nelson IPA");
  expect(item.style).toBe("American IPA");
  expect(item.ibu).toBe("55");
  expect(item.color).toBe("#2255aa");
  expect(item.description).toBe("Nelson hops and citrus");
  expect(item.glutenFree).toBe(true);
  expect(item.hideHopBar).toBe(true);
  expect(item.sg).toBe("1.060");
  await page.locator(".app-toolbar .undo-button").click();
  await expect(page.locator("#tapList .item-name").last()).toContainText("New Beer");
});

test("canceling library selection leaves the current item unchanged",async({page})=>{
  await page.goto("/");
  await expect(page.locator("#editor .beer-card").first()).toBeVisible();
  await page.evaluate(()=>{
    savedBeverages=[{id:"test-beer",item:normalizeItem({name:"Saved Beer",abv:"7.0"}),appVersion:currentJsonAppVersion,version:defaultState.version}];
    renderEditor();
  });
  await page.getByRole("button",{name:"+ Add item"}).click();
  await page.locator("#editor .beer-card").last().locator(".item-library-picker select").selectOption("test-beer");
  await page.locator('#jsonVersionModal button[value="cancel"]').click();
  await expect(page.locator("#tapList .item-name").last()).toContainText("New Beer");
  await expect(page.locator("#editor .beer-card").last().locator(".item-library-picker select")).toHaveValue("");
});
