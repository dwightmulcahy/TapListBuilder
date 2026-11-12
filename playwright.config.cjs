const {defineConfig}=require("@playwright/test");
module.exports=defineConfig({
  testDir:"./tests/browser",
  testMatch:"**/*.spec.cjs",
  fullyParallel:false,
  retries:process.env.CI?1:0,
  workers:process.env.CI?2:undefined,
  reporter:process.env.CI?"github":"list",
  use:{
    baseURL:"http://127.0.0.1:8765",
    browserName:"chromium",
    viewport:{width:1600,height:1000},
    trace:"retain-on-failure"
  },
  webServer:{
    command:"python3 -m http.server 8765 --bind 127.0.0.1",
    url:"http://127.0.0.1:8765/",
    reuseExistingServer:!process.env.CI,
    timeout:30000
  }
});
