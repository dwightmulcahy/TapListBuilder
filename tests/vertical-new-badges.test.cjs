const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const render = fs.readFileSync(path.join(root, "js/render.js"), "utf8");
const css = fs.readFileSync(path.join(root, "css/menu.css"), "utf8");
const context = vm.createContext({
  state: {settings: {language: "en"}},
  clampBeerNameFontSize: value => value || 18,
  clampDescriptionFontSize: value => value || 12,
  bitternessMeter: () => "",
  STATS_SIZE_LIMITS: {statsWidth:[24,65,41]},
  clampStatsSize: (_,value) => value ?? 41
});
vm.runInContext(render, context);
const makeItem = style => ({
  type:"beer",name:"Test IPA",isNew:true,newBadgeStyle:style,
  hideIcon:true,hideAbv:true,hideIbu:true,glutenFree:false,
  color:"#123456",description:"Test description",
  nameFontSize:18,descriptionFontSize:12,outlineEnabled:false,style:"IPA"
});
const tapRow = item => vm.runInContext("renderTapRow(" + JSON.stringify(item) + ")",context);

test("all four NEW badge styles appear once inside the icon slot, not the beer name", () => {
  for (const style of ["pill","text","outline","starburst"]) {
    const markup = tapRow(makeItem(style));
    assert.match(markup, /class="tap-row tap-row-no-icon tap-row-has-new tap-row-no-stats"/);
    assert.match(markup, /class="icon-wrap icon-wrap-hidden"><div class="new-badge-overlay" aria-label="NEW">/);
    assert.equal((markup.match(/new-badge-overlay/g)||[]).length,1);
    assert.match(markup, new RegExp("badge-new-" + style));
    const name = markup.match(/<h2 class="item-name"[^>]*>(.*?)<\/h2>/)?.[1];
    assert.equal(name,"Test IPA");
    assert.doesNotMatch(markup,/new-badge-rail/);
  }
});

test("visible icon has a badge over it, hidden icon has badge beside divider", () => {
  const withIcon=makeItem("pill");
  withIcon.hideIcon=false;
  context.renderedIcon=()=>'<svg class="test-icon"></svg>';
  const visible=tapRow(withIcon);
  assert.match(visible, /class="tap-row tap-row-has-new tap-row-no-stats"/);
  assert.match(visible, /class="icon-wrap"><svg class="test-icon"><\/svg><div class="new-badge-overlay"/);
  const hidden=tapRow(makeItem("pill"));
  assert.match(hidden, /class="icon-wrap icon-wrap-hidden"><div class="new-badge-overlay"/);
  assert.match(css, /\.tap-row-no-icon\.tap-row-has-new\{--icon-column:calc\(19mm \* var\(--layout-scale,1\) \* var\(--density-icon,1\)\)\}/);
  assert.match(css, /\.tap-row-no-icon \.new-badge-overlay\{top:50%\}/);
  assert.match(css, /\.new-badge-overlay\{[\s\S]*?position:absolute;z-index:3/);
  assert.match(css, /\.icon-wrap\{[\s\S]*?position:relative/);
});

test("badges are larger and unrotated in both icon placements", () => {
  assert.match(css,/font-size:calc\(4\.2mm \* var\(--fit\)/);
  assert.match(css,/font-size:calc\(4\.5mm \* var\(--fit\)/);
  assert.match(css,/font-size:calc\(4mm \* var\(--fit\)/);
  assert.match(css,/width:calc\(12mm \* var\(--fit\)/);
  assert.match(css,/font-size:calc\(2\.4mm \* var\(--fit\)/);
  assert.doesNotMatch(css,/\.new-badge-rail/);
  assert.doesNotMatch(css,/transform:rotate\(-90deg\)/);
});

test("ordinary beers do not reserve badge space and Spanish NEW text remains translated", () => {
  const ordinary=makeItem("pill");
  ordinary.isNew=false;
  const markup=tapRow(ordinary);
  assert.doesNotMatch(markup,/tap-row-has-new/);
  assert.doesNotMatch(markup,/new-badge-overlay/);
  assert.match(css,/\.tap-row-no-icon\{--icon-column:0px\}/);
  context.state.settings.language="es";
  assert.match(tapRow(makeItem("outline")) ,/aria-label="NUEVO"/);
  assert.match(tapRow(makeItem("starburst")) ,/badge-new-starburst-text">NUEVO/);
});
