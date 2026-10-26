#!/usr/bin/env python3
"""Package a file:// compatible static edition with bundled runtime JSON."""
import json
import os
from pathlib import Path
import shutil
import zipfile

root = Path(__file__).resolve().parents[1]
out = root / "dist"
out.mkdir(exist_ok=True)
version = os.environ.get("VERSION", "dev")
name = f"TapListBuilder-v{version}-offline"
stage = out / name
if stage.exists():
    shutil.rmtree(stage)
stage.mkdir()
for folder in ("css", "js", "assets", "data"):
    shutil.copytree(root / folder, stage / folder)
for file in ("index.html", "favicon.ico"):
    if (root / file).exists():
        shutil.copy2(root / file, stage / file)
data = {p.name: json.loads(p.read_text(encoding="utf-8")) for p in (root / "data").glob("*.json")}
shim = """<script>
window.__OFFLINE_DATA__ = """ + json.dumps(data).replace("</", "<\\/") + """;
const __nativeFetch = window.fetch.bind(window);
window.fetch = function(resource, options) {
  const url = typeof resource === 'string' ? resource : resource.url;
  const name = url.replace(/^\\.\\//, '').split('?')[0];
  if (name.startsWith('data/') && Object.prototype.hasOwnProperty.call(window.__OFFLINE_DATA__, name.slice(5))) {
    return Promise.resolve(new Response(JSON.stringify(window.__OFFLINE_DATA__[name.slice(5)]), {status: 200, headers: {'Content-Type': 'application/json'}}));
  }
  return __nativeFetch(resource, options);
};
</script>"""
index = stage / "index.html"
html = index.read_text(encoding="utf-8")
html = html.replace("</head>", shim + "\n</head>", 1)
index.write_text(html, encoding="utf-8")
archive = out / f"{name}.zip"
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in sorted(stage.rglob("*")):
        if p.is_file():
            z.write(p, p.relative_to(stage))
print(archive)
