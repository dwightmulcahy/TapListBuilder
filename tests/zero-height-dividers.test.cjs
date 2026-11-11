const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "css/menu.css"), "utf8");
const render = fs.readFileSync(path.join(root, "js/render.js"), "utf8");

test("dividers consume zero vertical height, even with labels", () => {
  const block = css.match(/\.tap-divider-row\{([\s\S]*?)\}/)?.[1];
  assert.ok(block);
  assert.match(block, /flex:0 0 0/);
  assert.match(block, /height:0/);
  assert.match(block, /min-height:0/);
  assert.match(block, /margin:0/);
  assert.match(block, /padding:0/);
  assert.match(block, /overflow:visible/);
});

test("dividers retain both labeled and plain rules", () => {
  assert.match(render, /class="tap-divider-row"/);
  assert.match(render, /class="tap-divider-row tap-divider-row-plain"/);
  assert.match(css, /\.tap-divider-row::before,\.tap-divider-row::after/);
  assert.match(css, /\.tap-divider-row-plain::after\{display:none\}/);
  assert.match(css, /--divider-font-size/);
});

test("dividers do not change beer row flex sizing", () => {
  assert.match(css, /\.tap-row\{\s*flex:1 1 0/);
  assert.match(css, /\.tap-divider-row\{[\s\S]*?position:relative;z-index:2/);
});
