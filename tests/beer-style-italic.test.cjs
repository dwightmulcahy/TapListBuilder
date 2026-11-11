const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "css/menu.css"), "utf8");
const render = fs.readFileSync(path.join(root, "js/render.js"), "utf8");
const print = fs.readFileSync(path.join(root, "css/print.css"), "utf8");

test("beer style beside the name is italic and solid black, not the beer accent color", () => {
  const styleRule=css.match(/\.item-style\{([^}]*)\}/)?.[1];
  assert.ok(styleRule);
  assert.match(styleRule,/font-style:italic/);
  assert.match(styleRule,/color:#000/);
  assert.match(styleRule,/opacity:1/);
  assert.doesNotMatch(styleRule,/color:currentColor/);
  assert.match(styleRule,/var\(--style-font-size,11\.5pt\)/);
});

test("beer style remains beside the beer name and the same rule applies when printing", () => {
  assert.match(render,/const styleHtml=item\.hideStyle\|\|!item\.style/);
  assert.match(render,/class="item-title-line".*\$\{styleHtml\}<\/div>/);
  assert.doesNotMatch(print,/\.item-style/);
});
