const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const render = fs.readFileSync(path.join(root, "js/render.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

// Exercise the production clamping function without starting the browser app.
const source = app.match(/function clampDescriptionFontSize\(value\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(source, "description font size normalization function exists");
const clamp = vm.runInNewContext(source + "\nclampDescriptionFontSize");

test("description font size supports 8 to 24 pt in quarter-point steps", () => {
  assert.equal(clamp(8), 8);
  assert.equal(clamp(16), 16);
  assert.equal(clamp(23.75), 23.75);
  assert.equal(clamp(24), 24);
  assert.equal(clamp(24.5), 24);
  assert.equal(clamp(7), 8);
  assert.equal(clamp(23.88), 24);
  assert.equal(clamp(17.12), 17);
  assert.equal(clamp("invalid"), 11.75);
});

test("both font-size sliders expose the full 24 pt range", () => {
  assert.match(html, /id="globalDescriptionFontSize"[^>]*type="range" min="8" max="24" step="0\.25"/);
  assert.match(render, /class="description-font-slider"[^>]*type="range" min="8" max="24" step="0\.25"/);
});

test("loaded descriptions and printed preview use the same clamp", () => {
  assert.match(app, /descriptionFontSize:clampDescriptionFontSize\(item\.descriptionFontSize\)/);
  assert.match(app, /globalDescriptionFontSize:clampDescriptionFontSize\(src\.globalDescriptionFontSize\)/);
  assert.match(render, /--desc-font-size:\$\{clampDescriptionFontSize\(item\.descriptionFontSize\)\}pt/);
});
