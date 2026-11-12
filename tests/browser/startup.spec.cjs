const {test,expect}=require("./fixtures.cjs");

test("real browser boots the sample menu and renders editable items",async({page})=>{
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#tapList .tap-row").first()).toBeVisible();
  await expect(page.locator("#editor .beer-card").first()).toBeAttached();
  await expect(page.locator("#page")).toBeVisible();
  expect(errors).toEqual([]);
});
