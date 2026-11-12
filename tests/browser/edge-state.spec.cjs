const {test,expect}=require("./fixtures.cjs");
test.beforeEach(async({page})=>{
  await page.goto("/");
  await expect(page.locator("#tapList .tap-row").first()).toBeVisible();
});
test("normalization and page-size settings handle legacy and out-of-range data",async({page})=>{
  const values=await page.evaluate(()=>{
    const old=normalizeState({version:1,items:[
      {name:"Legacy Cider",abv:"4.5",glutenFree:true,glutenFreePlacement:"vertical",glutenFreeFontSize:999},
      {type:"divider",text:"Seasonal",spaceAbove:100},
      {type:"text",columns:[{title:"Info",body:"Happy hour"}]}
    ],settings:{pageSize:"4x6",sizesByPageSize:{"4x6":{pageDensity:150,headerSlotYOffsets:[-99,99,0]}}}});
    return {
      pageSize:old.settings.pageSize,
      density:old.settings.sizesByPageSize["4x6"].pageDensity,
      offsets:old.settings.sizesByPageSize["4x6"].headerSlotYOffsets,
      gluten:old.items[0].glutenFreeFontSize,
      divider:old.items[1].spaceAbove,
      textColumns:old.items[2].columns.length,
      legacyName:old.items[0].name
    };
  });
  expect(values).toMatchObject({pageSize:"4x6",density:100,offsets:[-20,20,0],gluten:20,divider:20,textColumns:1,legacyName:"Legacy Cider"});
  await page.evaluate(()=>{
    setSetting("pageSize","4x6");
    setSetting("pageDensity",100);
    setSetting("iconScale",1.7);
    setSetting("statsScale",.6);
    setSetting("watermarkOpacity",.25);
    setSetting("watermarkScale",1.4);
    setSetting("pageSize","letter");
  });
  expect(await page.evaluate(()=>state.settings.sizesByPageSize["4x6"].pageDensity)).toBe(100);
  expect(await page.evaluate(()=>state.settings.sizesByPageSize.letter.pageDensity)).toBe(0);
});
test("text blocks, columns, reordering and undo survive browser rerender",async({page})=>{
  const initial=await page.evaluate(()=>state.items.length);
  await page.evaluate(()=>{
    addTextItem();
    const i=state.items.length-1;
    setTextColumn(i,0,"title","HOURS");
    setTextColumn(i,0,"body","Open daily");
    addTextColumn(i);
    setTextColumn(i,1,"title","LOCATION");
    setTextColumn(i,1,"body","Guanacaste");
    addTextColumn(i);
    setTextColumn(i,2,"title","CONTACT");
    removeTextColumn(i,1);
  });
  expect(await page.evaluate(()=>state.items.at(-1).columns.length)).toBe(2);
  await expect(page.locator("#tapList .tap-text-row").last()).toContainText("HOURS");
  await expect(page.locator("#tapList .tap-text-row").last()).toContainText("CONTACT");
  await page.evaluate(()=>moveItem(state.items.length-1,-1));
  expect(await page.evaluate(()=>state.items.at(-2).type)).toBe("text");
  await page.evaluate(()=>undoItems());
  expect(await page.evaluate(()=>state.items.at(-1).type)).toBe("text");
  expect(await page.evaluate(()=>state.items.length)).toBe(initial+1);
});
test("header text, scaling, offsets, rotations, and empty-header collapse are measured",async({page})=>{
  await page.evaluate(()=>{
    setHeaderSlot(0,"type","text");
    setHeaderSlot(0,"text","MONKEY HEAD");
    setHeaderSlot(2,"type","text");
    setHeaderSlot(2,"text","BREWING CO.");
    setHeaderSlotScale(0,1.25);
    setHeaderSlotScale(1,.9);
    setHeaderSlot(1,"rotation",8);
    setHeaderSlotYOffset(0,-6);
    setHeaderSlotYOffset(1,5);
    setHeaderSlotYOffset(2,7);
    fitHeader();
  });
  await expect(page.locator("#headerSlot0")).toContainText("MONKEY HEAD");
  await expect(page.locator("#headerSlot2")).toContainText("BREWING CO.");
  expect(await page.evaluate(()=>state.settings.sizesByPageSize.letter.headerSlotYOffsets)).toEqual([-6,5,7]);
  const height=await page.locator("#page").evaluate(el=>parseFloat(getComputedStyle(el).getPropertyValue("--header-height")));
  expect(height).toBeGreaterThan(0);
  await page.evaluate(()=>{
    for(let i=0;i<3;i++)setHeaderSlot(i,"type","none");
  });
  await expect(page.locator("#page")).toHaveClass(/hide-header/);
  expect(await page.locator("#page").evaluate(el=>getComputedStyle(el).getPropertyValue("--header-height").trim())).toBe("0px");
});
test("bitterness and ABV controls exercise visible, hidden and calculated modes",async({page})=>{
  await page.evaluate(()=>{
    setItem(0,"sg","1.060");
    setItem(0,"fg","1.010");
    setItem(0,"hideAbvLabel",true);
    setItem(0,"hideIbuLabel",true);
    setItem(0,"hideStatsDivider",true);
    setItem(0,"hideHopMarker",true);
    setItem(0,"hideBitternessLabel",true);
    setItem(0,"hideHopBar",true);
    setItem(0,"hideIbu",true);
    setItem(0,"statsWidth",33);
    setItem(0,"statsGap",2);
    applyStatsToAllBeers(0);
    applyStyleAppearanceToAllBeers(0);
  });
  const first=page.locator("#tapList .tap-row").first();
  await expect(first.locator(".stats-row-single")).toBeAttached();
  await expect(first.locator(".bitterness-meter")).toHaveCount(0);
  expect(await page.evaluate(()=>state.items[0].abv)).toBe("6.6");
  expect(await page.evaluate(()=>state.items.filter(x=>x.type==="beer").every(x=>x.hideIbu))).toBe(true);
  await page.evaluate(()=>{
    setItem(0,"hideIbu",false);
    setItem(0,"hideHopBar",false);
    setItem(0,"hideBitternessLabel",false);
    setItem(0,"hideHopMarker",false);
  });
  await expect(first.locator(".bitterness-meter")).toBeAttached();
  await expect(first.locator(".stats-row-single")).toHaveCount(0);
});
