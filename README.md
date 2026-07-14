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

## Data files
- `data/beer-styles.json` — the 8 sample menu items and the English⇄Spanish beer-style-name lookup, loaded once at boot and used to seed `defaultState`.
- `data/translations.json` — the exact-match and phrase-level English→Spanish description translation dictionary.

Editing either file changes the sample menu / translation behavior without touching any JS.
