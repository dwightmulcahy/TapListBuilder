const {test,expect}=require("./fixtures.cjs");
test("shared library migrates local beers and confirms server writes",async({page})=>{
  let remote={revision:0,entries:[]};
  await page.route("**/api/library",async route=>{
    expect(route.request().headers().authorization).toBe("Bearer test-token");
    if(route.request().method()==="PUT"){
      const body=route.request().postDataJSON();
      expect(body.revision).toBe(remote.revision);
      remote={revision:remote.revision+1,entries:body.entries};
    }
    await route.fulfill({json:remote});
  });
  await page.goto("/");
  await expect(page.locator("#tapList .tap-row").first()).toBeVisible();
  page.on("dialog",d=>d.type()==="prompt"?d.accept("test-token"):d.accept());
  await page.evaluate(()=>{saveItemToLibrary(0);return connectSharedLibrary()});
  expect(remote.entries.length).toBe(1);
  await page.evaluate(()=>saveItemToLibrary(1));
  await expect.poll(()=>remote.entries.length).toBe(2);
  await expect.poll(()=>page.locator("#sharedLibraryStatus").textContent()).toBe("Server save confirmed");
  await page.route("**/api/library",r=>r.fulfill({status:409,json:{error:"conflict"}}));
  await page.evaluate(()=>saveItemToLibrary(2));
  await expect.poll(()=>page.locator("#sharedLibraryStatus").textContent()).toContain("NOT saved to server");
  await page.unroute("**/api/library");
  await page.route("**/api/library",async route=>{
    if(route.request().method()==="PUT")remote={revision:remote.revision+1,entries:route.request().postDataJSON().entries};
    await route.fulfill({json:remote});
  });
  await page.evaluate(()=>recoverSharedLibrary());
  expect(remote.entries.length).toBe(3);
  await expect(page.locator("#sharedLibraryStatus")).toContainText("Recovered");
});
