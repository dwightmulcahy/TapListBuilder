# MHB Tap List Builder

Print-ready one-page tap menu builder for Monkey Head Brewing. Client-side only — no build step, no server-side code.

## Structure
```
TapListBuilder/
├── index.html          entry point
├── css/                layout.css (editor UI), menu.css (printed page), print.css (@media print)
├── js/                 app.js (state/boot), render.js, pdf.js, icons.js, ibu.js,
│                       translation.js, library.js, storage.js
├── assets/             logo, watermark, paper texture
└── data/                beer-styles.json (sample items + style-name translations),
                          translations.json (description translation dictionary)
```

## Running locally
`data/*.json` is loaded with `fetch()`, which browsers block on `file://` URLs. Serve the folder over HTTP instead:

```
cd TapListBuilder
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploying
Static files only — works as-is on GitHub Pages (Settings → Pages → deploy from branch, root of this folder).

### Docker
`Dockerfile`, `.dockerignore`, and `nginx.conf` build a small nginx image serving these static files. `.github/workflows/docker-release.yml` builds a multi-arch (amd64 + arm64) image and pushes it to Docker Hub as `<DOCKERHUB_USERNAME>/taplistbuilder` on:
- pushes to the `release` branch — tagged `release` and `sha-<short-sha>` (development builds)
- a stable `vMAJOR.MINOR.PATCH` tag reachable from `release` — tagged with its exact version; the newest release in each line also updates the appropriate `MAJOR` and `MAJOR.MINOR` aliases, and the newest overall updates `latest`

Every build also gets a `sha-<short-sha>` tag, and the image is labeled with the resolved version and build date (from a `v*.*.*` tag if present, otherwise `dev-<short-sha>`).

Required repo secrets (Settings → Secrets and variables → Actions):
- `DOCKERHUB_USERNAME` — your Docker Hub username
- `DOCKERHUB_TOKEN` — a Docker Hub access token (hub.docker.com → Account Settings → Security → New Access Token)

**Version display:** The version beside **Tap List Builder** and in **Help → About** comes from `version.json` baked into the Docker image. Tagged builds pass the validated SemVer and commit SHA into the shared Docker publisher; the Dockerfile records the build timestamp. If an existing `:latest` image still shows `dev`, it was built before this fix and must be replaced by a new, manually tagged release containing the changes. Simply pulling the same unchanged image will not correct its embedded metadata.

**Saved JSON version checks:** File → Save now records `appVersion` (the same release/build shown beside the title) alongside the existing numeric `version` data-format revision. Browser autosaves carry the app version at the top level; new saved-beverage and named-menu-profile entries carry their own version stamps while keeping the existing array storage format for rollback compatibility. Previously saved unversioned JSON remains readable. File → Load, profile loads, and adding saved beverages show a confirmation dialog comparing the saved and current app versions and data formats **before changing anything**. Newer-version files warn that unsupported settings may be lost if saved with an older app. Browser autosaves restore without a prompt when versions match; legacy or differing versions prompt once before restoration. If the build metadata is unavailable, the app uses the honest `dev` label rather than inventing a release number.

**Cache-busting**: the Dockerfile appends `?v=<version>-<sha>` to every local CSS/JS reference in `index.html` at build time, and `nginx.conf` long-caches those versioned URLs while explicitly no-caching `index.html` itself. This means a new deploy is immune to stale-asset problems from *any* caching layer (browser, an intermediate CDN like Cloudflare, a proxy) — the URLs genuinely change on every build, rather than relying on a TTL that a cache in front of the origin might not honor.

### Running on a QNAP (Container Station)
`docker-compose.yml` is a ready-to-import example — set your Docker Hub username in it, then in Container Station: Create → Create Application → paste or upload the file. Defaults to `http://<nas-ip>:8081`; see comments in the file for adjusting the port or mounting your own `data/` folder to override the sample menu without rebuilding.

## Printing a saved menu on one page
Importing a JSON file restores the menu settings and content; the JSON itself is **not** a printable PDF. Choose **US Letter** or **4×6 Card** in the toolbar, then **File → Print**. The print stylesheet isolates one physical page at that exact size, removes editor viewport scaling/centering, and waits for imported header images to decode before opening the browser print dialog.

In the browser/printer dialog, verify that the **paper size matches the toolbar**, set **margins to None**, **scale to 100%**, and disable browser **headers and footers**. If the preview still shows more than one sheet, cancel instead of printing and check the browser/printer paper size. Printer drivers can override the CSS `@page` size; no web application can force an arbitrary physical printer to accept the requested stock. Save as PDF first when sending a menu to another computer, and verify that the PDF has one page before sharing.

## Divider spacing
Each divider has a **Whitespace above divider** slider from 0 to 20 mm (0.5 mm steps). The setting is stored per divider in the exported JSON and defaults to 0 for older menus. A nonzero value adds actual vertical space before the divider, which reduces the space available for beer rows. The same behavior applies to dividers with or without a text label and to both Letter and 4×6 layouts.

## Gluten-free labels
Each beer can display **GLUTEN FREE** (or **SIN GLUTEN** in Spanish) inline beside its name or vertically in a slim gutter to the left of its icon. The vertical label remains in that gutter even when the icon is hidden; if a vertical NEW badge is also shown, the two use separate adjacent columns. The per-beer gluten-free label font size is adjustable from 6 to 20 pt and saved in JSON. Older menus default to 7 pt.

## Header layout
The header uses **two side columns**: left and right images/text each occupy half the printable width. The center logo/image is a separate top-aligned overlay that may overlap both side columns and renders above them. The header automatically adjusts its height to fit the visible, rotated/scaled content, including on 4×6 cards. Each slot retains its independent size and rotation settings. All three header slots have independent vertical-position sliders (−20 to +20 mm), stored separately for US Letter and 4×6. Side positions are measured against the natural header height; moving the center logo does not shift the side columns. Negative center offsets can extend into the top page margin; the page itself clips any image content moved past the paper edge, in both preview and print. Downward offsets expand the header as needed. Images loaded asynchronously trigger a fresh layout fit.

## Data files
- `data/beer-styles.json` — the 8 sample menu items and the English⇄Spanish beer-style-name lookup, loaded once at boot and used to seed `defaultState`.
- `data/translations.json` — the exact-match and phrase-level English→Spanish description translation dictionary.

Editing either file changes the sample menu / translation behavior without touching any JS.

## Test coverage

Production JavaScript coverage is measured by **Chromium V8** during real Playwright browser tests, then converted to Istanbul. Unlike the Node VM and source-inspection tests, this records execution of the scripts served to users. All `js/*.js` modules are included in the denominator, including untouched files.

Run locally with Node 22+, Python 3 and Chromium dependencies:

```sh
npm install
npx playwright install chromium
npm run test:unit
npm run test:coverage
```

The report is written to `coverage/index.html`, `coverage/coverage-summary.json`, and `coverage/lcov.info`. This initial baseline has no enforced threshold; browser scenarios and CI publication are added separately.
