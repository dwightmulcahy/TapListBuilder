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
  clampDescriptionFontSize: value => value || 12
});
vm.runInContext(render, context);
const makeItem = style => ({
  type:"beer",name:"Test IPA",isNew:true,newBadgeStyle:style,
  hideIcon:true,hideAbv:true,hideIbu:true,glutenFree:false,
  color:"#123456",description:"Test description",
  nameFontSize:18,descriptionFontSize:12,outlineEnabled:false,style:"IPA"
});
const tapRow = item => vm.runInContext("renderTapRow(" + JSON.stringify(item) + ")",context);

test("all four NEW badge styles render in the left rail, not the beer name", () => {
  for (const style of ["pill","text","outline","starburst"]) {
    const markup = tapRow(makeItem(style));
    assert.match(markup, /class="new-badge-rail" aria-label="NEW"/);
    const name = markup.match(/<h2 class="item-name"[^>]*>(.*?)<\/h2>/)?.[1];
    assert.equal(name,"Test IPA");
    assert.equal((markup.match(/new-badge-rail/g)||[]).length,1);
    assert.match(markup, new RegExp("badge-new-" + style));
  }
});

test("only new beers have a badge and Spanish translation is retained", () => {
  const ordinary = makeItem("pill");
  ordinary.isNew = false;
  assert.doesNotMatch(tapRow(ordinary),/new-badge-rail/);
  context.state.settings.language = "es";
  assert.match(tapRow(makeItem("outline")),/aria-label="NUEVO"/);
});

test("vertical badge occupies the existing page margin, not a grid track", () => {
  assert.match(css,/\.new-badge-rail\{[\s\S]*?position:absolute;left:calc\(-5mm \* var\(--layout-scale,1\)\)/);
  assert.match(css,/\.new-badge-rail \.badge\{margin-left:0;flex:0 0 auto;transform:rotate\(-90deg\)\}/);
  assert.match(css,/\.tap-row\{[\s\S]*?position:relative;overflow:visible/);
  const rowBlock = css.match(/\.tap-row\{([^}]*)\}/)?.[1];
  assert.ok(rowBlock);
  assert.doesNotMatch(rowBlock,/padding-left:/);
});
