const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const app = read("js/app.js");
const render = read("js/render.js");
const pdf = read("js/pdf.js");
const css = read("css/menu.css");
const html = read("index.html");

// Evaluate the actual normalization code, without booting the browser.
const stateCode = app.slice(0, app.indexOf("function updateGlobalDescriptionControl()"));
const normalizeState = vm.runInNewContext(stateCode + "\nnormalizeState");

test("older saved menus default to a visible header and footer", () => {
  const settings = normalizeState({settings: {}, items: []}).settings;
  assert.equal(settings.showHeader, true);
  assert.equal(settings.showFooter, true);
});

test("header and footer visibility are independent and survive normalization", () => {
  for (const showHeader of [true, false]) {
    for (const showFooter of [true, false]) {
      const settings = normalizeState({settings: {showHeader, showFooter}, items: []}).settings;
      assert.equal(settings.showHeader, showHeader);
      assert.equal(settings.showFooter, showFooter);
    }
  }
});

test("editor controls expose both independent visibility settings", () => {
  assert.match(render, /Show header on menu/);
  assert.match(render, /setSetting\(\\?'showHeader\\?',this\.checked\)/);
  assert.match(html, /id="showFooter"[^>]*onchange="setSetting\('showFooter',this\.checked\)"/);
  assert.match(render, /footerVisible\.checked=s\.showFooter/);
});

test("hidden header and footer release their grid tracks and avoid fitting", () => {
  assert.match(pdf, /classList\.toggle\("hide-header",!hasVisibleHeader\)/);
  assert.match(pdf, /classList\.toggle\("hide-footer",!s\.showFooter\)/);
  assert.match(pdf, /--header-height",hasVisibleHeader\?[^\n]*:"0px"/);
  assert.match(pdf, /--footer-height",s\.showFooter\?[^\n]*:"0px"/);
  assert.match(pdf, /!state\.settings\.showHeader/);
  assert.match(pdf, /s\.showHeader&&headerHasContent\(s\.headerSlots\)/);
  assert.match(pdf, /if\(!state\.settings\.showFooter\)return/);
  assert.match(css, /\.page\.hide-header \.header,\.page\.hide-footer \.footer\{display:none\}/);
});
