const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "css/menu.css"), "utf8");
const render = fs.readFileSync(path.join(root, "js/render.js"), "utf8");

test("icon column and icon both scale together without a fixed oversized gutter", () => {
  assert.match(css, /grid-template-columns:calc\(22mm \* var\(--layout-scale,1\) \* var\(--icon-scale,1\)\)/);
  assert.match(css, /width:calc\(19mm \* var\(--layout-scale,1\) \* var\(--icon-scale,1\)\)/);
  assert.match(css, /height:calc\(19mm \* var\(--layout-scale,1\) \* var\(--icon-scale,1\)\)/);
  assert.match(css, /gap:calc\(1\.8mm \* var\(--layout-scale,1\)\)/);
});

test("hidden icons reclaim their grid column without shifting the remaining cells", () => {
  assert.match(render, /class="tap-row\$\{item\.hideIcon\?" tap-row-no-icon":""\}"/);
  assert.match(css, /\.tap-row-no-icon\{grid-template-columns:0px/);
  assert.match(css, /\.icon-wrap-hidden\{width:0;height:0;border:0;background:transparent\}/);
});

test("the row still provides a minimum width for description and statistics", () => {
  assert.match(css, /minmax\(0,1fr\) calc\(41mm/);
  assert.match(css, /padding:calc\(\.8mm \* var\(--fit\)/);
});
