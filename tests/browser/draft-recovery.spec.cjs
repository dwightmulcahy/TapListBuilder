const {test,expect}=require("@playwright/test");

test("editing a menu creates a recoverable IndexedDB draft",async({page})=>{
  await page.goto("/");
  await expect(page.locator("#saveStatus")).toBeVisible();
  await page.evaluate(()=>setSetting("taproomHours","TEST DRAFT HOURS"));
  await expect(page.locator("#saveStatus")).toContainText("Draft backed up",{timeout:10000});
  const backup=await page.evaluate(async()=>await draftDBRead());
  expect(backup.snapshot).toContain("TEST DRAFT HOURS");
  await page.reload();
  await expect(page.locator("#taproomHours")).toHaveValue("TEST DRAFT HOURS");
});

test("failed IndexedDB writes are reported without claiming success",async({page})=>{
  await page.goto("/");
  await page.evaluate(()=>{
    window.draftDBWrite=async()=>{throw new Error("simulated quota failure")};
    setSetting("taproomHours","BACKUP FAILURE");
  });
  await expect(page.locator("#saveStatus")).toContainText("Backup failed",{timeout:10000});
  await expect(page.locator("#saveStatus")).toHaveAttribute("data-kind","error");
});

test("a successful file-picker export marks only the exported snapshot saved",async({page})=>{
  await page.goto("/");
  await page.evaluate(()=>{
    window.showSaveFilePicker=async()=>({
      createWritable:async()=>({write:async()=>{},close:async()=>{}})
    });
  });
  await page.evaluate(()=>downloadJSON());
  await expect(page.locator("#saveStatus")).toHaveText("Saved to JSON");
  await page.evaluate(()=>setSetting("taproomHours","AFTER EXPORT"));
  await expect(page.locator("#saveStatus")).toContainText("Unsaved changes");
});
