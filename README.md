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

**Cache-busting**: the Dockerfile appends `?v=<version>-<sha>` to every local CSS/JS reference in `index.html` at build time, and `nginx.conf` long-caches those versioned URLs while explicitly no-caching `index.html` itself. This means a new deploy is immune to stale-asset problems from *any* caching layer (browser, an intermediate CDN like Cloudflare, a proxy) — the URLs genuinely change on every build, rather than relying on a TTL that a cache in front of the origin might not honor.

### Running on a QNAP (Container Station)
`docker-compose.yml` is a ready-to-import example — set your Docker Hub username in it, then in Container Station: Create → Create Application → paste or upload the file. Defaults to `http://<nas-ip>:8081`; see comments in the file for adjusting the port or mounting your own `data/` folder to override the sample menu without rebuilding.

## Data files
- `data/beer-styles.json` — the 8 sample menu items and the English⇄Spanish beer-style-name lookup, loaded once at boot and used to seed `defaultState`.
- `data/translations.json` — the exact-match and phrase-level English→Spanish description translation dictionary.

Editing either file changes the sample menu / translation behavior without touching any JS.
