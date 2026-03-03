# wearecounted

See the invisible tracking infrastructure hidden on every page you visit.

wearecounted detects and counts hidden tracking pixels (1x1 images), invisible iframes, beacon API calls, and prefetch links to tracker domains on every website you visit. Tracker blockers silently remove these elements — wearecounted makes them visible instead. Open the popup for a per-site count: how many hidden elements, what type they are, and which companies are behind them. Everything runs in your browser. No data is collected, transmitted, or shared.

Part of the **weare____** privacy tool series.

## What it detects

- **Tracking pixels** — invisible 1x1 images, hidden `<img>` elements, and known pixel paths (`/pixel`, `/track`, `/collect`, `/t.gif`)
- **Hidden iframes** — zero-size or hidden `<iframe>` elements from third-party domains
- **Beacon calls** — `navigator.sendBeacon()` calls used to silently transmit analytics data
- **Tracker prefetches** — `<link rel="prefetch">` and `<link rel="preconnect">` pointing to known tracker domains

## Install

### Chrome

1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `chrome-extension/`

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on** → select `firefox-extension/manifest.json`

## How it works

```
popup.html ←→ popup.js ←→ background.js ←→ content.js + inject.js
                              (storage)     (DOM scan)    (beacon wrap)
```

| Component | Chrome (MV3) | Firefox (MV2) |
|-----------|-------------|---------------|
| Content script | Scans DOM for hidden images, iframes, prefetch links. MutationObserver catches dynamically injected elements | Same |
| Inject script | Page-context script wrapping `navigator.sendBeacon` to intercept beacon calls | Same |
| Background | Service worker, stores results in `chrome.storage.session`, updates badge | Persistent background page, in-memory storage, `browser.*` API |
| Popup | Renders verdict + type breakdown with destination domains | Same, `browser.*` promises |

## Project structure

```
wearecounted/
├── chrome-extension/
│   ├── manifest.json      # MV3 manifest
│   ├── content.js         # DOM scanner + MutationObserver
│   ├── inject.js          # Page-context beacon wrapper
│   ├── background.js      # Badge updates, stores results per tab
│   ├── popup.html         # Popup shell
│   ├── popup.js           # Renders verdict + breakdown
│   ├── styles.css         # Dark theme
│   └── icon{16,48,128}.png
├── firefox-extension/
│   ├── manifest.json      # MV2 manifest
│   ├── content.js         # Same scanner, browser.* API
│   ├── inject.js          # Same beacon wrapper
│   ├── background.js      # Persistent background page
│   ├── popup.html
│   ├── popup.js           # Same UI, browser.* promises
│   ├── styles.css
│   └── icon{16,48,128}.png
├── CLAUDE.md
├── POC_PLAN.md
└── README.md
```

## Design

- Pure vanilla JS — zero dependencies, no build step
- Local-only — nothing leaves the browser
- Dark theme matching the weare____ design language
- MutationObserver catches trackers injected after page load
- Capped at 500 elements per page

## Known limitations

- Cannot detect tracking pixels loaded via CSS `background-image`
- Beacon wrapper requires page-context injection which some CSP policies may block
- Some legitimate 1x1 images (spacer GIFs) may be counted as tracking pixels
- Tracker domain list is bundled and static — not automatically updated

## Roadmap

- [ ] Highlight/overlay hidden elements on the page
- [ ] Dashboard page — aggregated view across all scanned domains
- [ ] Historical comparison — what changed since last visit
- [ ] Export/share report

## License

Open source. Part of the weare____ series.
