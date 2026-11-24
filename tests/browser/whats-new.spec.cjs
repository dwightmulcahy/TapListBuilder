const {test,expect}=require("./fixtures.cjs");

const changelog={current:"1.3.0",repository:"dwightmulcahy/taplistbuilder",releases:[
  {version:"1.3.0",tag:"v1.3.0",previous:"v1.2.0",date:"2026-11-20",internal:2,
   sections:[{type:"feat",title:"Features",items:[{text:"print two menus per page (#42)",sha:"abc1234"}]}]},
  {version:"1.2.0",tag:"v1.2.0",previous:null,date:"2026-11-01",internal:1,sections:[]}]};

async function serve(page,body){
  await page.route("**/changelog.json",route=>route.fulfill({json:body}));
}

test("placeholder changelog shows nothing on first start",async({page})=>{
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("#tapList .tap-row").first()).toBeVisible();
  await expect(page.locator("#wn-dlg")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("after an upgrade the new release notes open once",async({page})=>{
  await serve(page,changelog);
  await page.addInitScript(()=>{ if(!sessionStorage.getItem("seeded")){localStorage.setItem("taplist.seenVersion","1.1.0");sessionStorage.setItem("seeded","1");} });
  await page.goto("/");
  const dlg=page.locator("#wn-dlg");
  await expect(dlg).toBeVisible();
  await expect(dlg).toContainText("print two menus per page");
  await expect(dlg.locator('a[href$="/pull/42"]')).toBeVisible();
  await dlg.locator(".wn-ok").click();
  await expect(dlg).toBeHidden();
  expect(await page.evaluate(()=>localStorage.getItem("taplist.seenVersion"))).toBe("1.3.0");
  await page.reload();
  await expect(page.locator("#tapList .tap-row").first()).toBeVisible();
  await expect(page.locator("#wn-dlg[open]")).toHaveCount(0);
  await page.locator("summary",{hasText:"Help"}).click();
  await page.getByRole("button",{name:"What's new"}).click();
  await expect(dlg).toBeVisible();
  await expect(dlg).toContainText("v1.3.0");
});

test("breaking changes, internal-only releases and the close button",async({page})=>{
  await serve(page,{current:"2.1.0",repository:"",releases:[
    {version:"2.1.0",tag:"v2.1.0",previous:"v2.0.1",date:"2026-11-22",internal:3,sections:[]},
    {version:"2.0.1",tag:"v2.0.1",previous:"v2.0.0",date:"2026-11-21",internal:1,sections:[]},
    {version:"2.0.0",tag:"v2.0.0",previous:"v1.0.0",date:"2026-11-20",internal:0,
     sections:[{type:"breaking",title:"Breaking changes",items:[{text:"menus saved before 1.0 no longer load (#7)",sha:"1"}]},
               {type:"fix",title:"Bug fixes",items:[{text:"<b>escaped</b>",sha:"2"}]}]},
    {version:"1.0.0",tag:"v1.0.0",previous:null,date:"2026-10-01",internal:0,sections:[]}]});
  await page.addInitScript(()=>localStorage.setItem("taplist.seenVersion","v1.0.0"));
  await page.goto("/");
  const dlg=page.locator("#wn-dlg");
  await expect(dlg).toBeVisible();
  await expect(dlg.locator("h4.wn-break")).toBeVisible();
  await expect(dlg).toContainText("<b>escaped</b>");
  await expect(dlg).toContainText("internal changes only");
  await dlg.locator(".wn-x").click();
  await expect(dlg).toBeHidden();
});

test("first visit records the version silently; a missing changelog is ignored",async({page})=>{
  await serve(page,changelog);
  await page.goto("/");
  await expect(page.locator("#tapList .tap-row").first()).toBeVisible();
  await expect(page.locator("#wn-dlg[open]")).toHaveCount(0);
  expect(await page.evaluate(()=>localStorage.getItem("taplist.seenVersion"))).toBe("1.3.0");
  await page.unroute("**/changelog.json");
  await page.route("**/changelog.json",route=>route.abort());
  await page.reload();
  await page.locator("summary",{hasText:"Help"}).click();
  await page.getByRole("button",{name:"What's new"}).click();
  await expect(page.locator("#wn-dlg")).toContainText("Release notes aren't included in this build.");
});

test("the placeholder changelog says there are no notes yet",async({page})=>{
  await page.goto("/");
  await page.locator("summary",{hasText:"Help"}).click();
  await page.getByRole("button",{name:"What's new"}).click();
  await expect(page.locator("#wn-dlg")).toContainText("No release notes yet.");
});
