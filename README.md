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
`Dockerfile`, `.dockerignore`, and `nginx.conf` build a small nginx image serving these static files. `.github/workflows/docker-release.yml` builds a multi-arch (amd64 + arm64) image and pushes it to Docker Hub whenever a GitHub Release is published (or via manual dispatch from the Actions tab).

Required repo secrets (Settings → Secrets and variables → Actions):
- `DOCKERHUB_USERNAME` — your Docker Hub username
- `DOCKERHUB_TOKEN` — a Docker Hub access token (hub.docker.com → Account Settings → Security → New Access Token)

Tag releases with semver (e.g. `v1.2.0`) so the version-numbered image tags get populated; `latest` is always updated too. Rename `IMAGE_NAME` in the workflow if your Docker Hub repo isn't called `taplistbuilder`.

### Running on a QNAP (Container Station)
`docker-compose.yml` is a ready-to-import example — set your Docker Hub username in it, then in Container Station: Create → Create Application → paste or upload the file. Defaults to `http://<nas-ip>:8081`; see comments in the file for adjusting the port or mounting your own `data/` folder to override the sample menu without rebuilding.

## Data files
- `data/beer-styles.json` — the 8 sample menu items and the English⇄Spanish beer-style-name lookup, loaded once at boot and used to seed `defaultState`.
- `data/translations.json` — the exact-match and phrase-level English→Spanish description translation dictionary.

Editing either file changes the sample menu / translation behavior without touching any JS.
