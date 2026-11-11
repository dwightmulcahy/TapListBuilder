const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const app = read("js/app.js");
const render = read("js/render.js");
const html = read("index.html");
const css = read("css/menu.css");

const core = app.slice(0, app.indexOf("function updateGlobalDescriptionControl()"));
const context = vm.createContext({ICONS:{beer:true},inferIcon:()=>"beer"});
vm.runInContext(core, context);
const clamp = value => vm.runInContext("clampBeerNameFontSize(" + JSON.stringify(value) + ")",context);
const normalize = state => vm.runInContext("normalizeState(" + JSON.stringify(state) + ")",context);

test("beer name font sizes are clamped to 12–36 pt in half-point increments", () => {
  assert.equal(clamp(12),12);
  assert.equal(clamp(18),18);
  assert.equal(clamp(23.5),23.5);
  assert.equal(clamp(36),36);
  assert.equal(clamp(100),36);
  assert.equal(clamp(2),12);
  assert.equal(clamp(23.74),23.5);
  assert.equal(clamp(null),12);
  assert.equal(clamp("bad"),18);
});

test("old saved menus retain the original default and new sizes persist", () => {
  const old = normalize({settings:{},items:[{name:"Pilsner",icon:"beer"}]});
  assert.equal(old.items[0].nameFontSize,18);
  assert.equal(old.settings.sizesByPageSize.letter.globalBeerNameFontSize,18);
  const saved = normalize({settings:{sizesByPageSize:{letter:{globalBeerNameFontSize:26}}},items:[{name:"IPA",icon:"beer",nameFontSize:30}]});
  assert.equal(saved.items[0].nameFontSize,30);
  assert.equal(saved.settings.sizesByPageSize.letter.globalBeerNameFontSize,26);
});

test("individual and global font controls and preview use the same font size", () => {
  assert.match(html,/id="globalBeerNameFontSize"[^>]*min="12" max="36" step="0\.5"/);
  assert.match(render,/class="beer-name-font-slider"[^>]*min="12" max="36" step="0\.5"/);
  assert.match(render,/--name-font-size:\$\{clampBeerNameFontSize\(item\.nameFontSize\)\}pt/);
  assert.match(css,/font-size:calc\(var\(--name-font-size,18pt\) \* var\(--fit\) \* var\(--layout-scale,1\)\)/);
  assert.match(app,/function setAllBeerNameFontSizes\(value\)/);
  assert.match(app,/if\(key==="nameFontSize"\)value=clampBeerNameFontSize\(value\)/);
});
