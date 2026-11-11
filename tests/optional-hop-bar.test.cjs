const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const app = read("js/app.js");
const render = read("js/render.js");
const ibu = read("js/ibu.js");
const ctx = vm.createContext({ICONS:{beer:true},inferIcon:()=>"beer"});
vm.runInContext(app.slice(0,app.indexOf("function updateGlobalDescriptionControl()")) + "\n" + ibu + "\n" + render, ctx);
vm.runInContext('state={settings:{language:"en"}}', ctx);
const normalize = item => vm.runInContext("normalizeItem(" + JSON.stringify(item) + ")",ctx);
const row = item => vm.runInContext("renderTapRow(" + JSON.stringify(item) + ")",ctx);

test("older menus preserve IBU-hidden => meter-hidden behavior", () => {
  assert.equal(normalize({name:"Old IPA",icon:"beer",hideIbu:true}).hideHopBar,true);
  assert.equal(normalize({name:"Old IPA",icon:"beer",hideIbu:false}).hideHopBar,false);
});

test("explicit hop bar setting is independent of IBU visibility", () => {
  assert.equal(normalize({name:"IPA",icon:"beer",hideIbu:true,hideHopBar:false}).hideHopBar,false);
  assert.equal(normalize({name:"IPA",icon:"beer",hideIbu:false,hideHopBar:true}).hideHopBar,true);
});

test("hop bar may be hidden while ABV and IBU remain visible", () => {
  const markup = row(normalize({name:"IPA",icon:"beer",hideIcon:true,abv:"6.4",ibu:"60",sg:"1.060",hideHopBar:true}));
  assert.match(markup,/class="stat-label stat-label-abv">ABV/);
  assert.match(markup,/class="stat-label stat-label-ibu">IBU/);
  assert.doesNotMatch(markup,/class="bitterness-meter"/);
});

test("hop bar can display even when the IBU number is hidden", () => {
  const markup = row(normalize({name:"IPA",icon:"beer",hideIcon:true,abv:"6.4",ibu:"60",sg:"1.060",hideIbu:true,hideHopBar:false}));
  assert.match(markup,/class="stat-label stat-label-abv">ABV/);
  assert.doesNotMatch(markup,/class="stat-label stat-label-ibu">IBU/);
  assert.match(markup,/class="bitterness-meter"/);
});

test("beer editor exposes a dedicated hop bar toggle", () => {
  assert.match(render,/Hide hop bar/);
  assert.match(render,/setItem\(\$\{i\},'hideHopBar',this\.checked\)/);
});
