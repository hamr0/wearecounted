# wearecounted

See the hidden tracking pixels, invisible iframes, and beacon calls embedded on every page you visit.

wearecounted detects and counts the invisible tracking infrastructure hidden on every website you visit. It scans for 1x1 tracking pixels, zero-size iframes, navigator.sendBeacon calls, and prefetch links to known tracker domains — all things designed to be invisible to you. Instead of blocking them, wearecounted makes them visible: who's tracking you, how many hidden elements they planted, and what they're for. The popup shows a per-site verdict with a breakdown by purpose (advertising, analytics, data brokers) and company name (Google Ads, Meta, Criteo, PubMatic, and 50+ others). Everything runs in your browser. No data is collected, transmitted, or shared.

Part of the **weare____** privacy tool series.

## What it detects

- **Tracking pixels** — invisible 1x1 images that trigger an HTTP request when loaded. The image is worthless — the request tells the tracker who you are, what page you're on, and when you visited. Used since the late 1990s because images bypass CORS, send cookies automatically, and need no JavaScript.
- **Hidden iframes** — zero-size `<iframe>` elements from third-party domains, often used for cookie syncing between ad companies ("this user is #456 in our system too").
- **Beacon calls** — `navigator.sendBeacon()` silently sends data to a server as you leave the page. Designed to be invisible and non-blocking.
- **Tracker prefetches** — `<link rel="prefetch">` and `<link rel="preconnect">` that tell your browser to start connecting to tracker domains before any ad even loads.

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
| Content script | Scans DOM for hidden images, iframes, prefetch links. Maps domains to 50+ company names. MutationObserver catches dynamically injected elements | Same |
| Inject script | Page-context script wrapping `navigator.sendBeacon` to intercept beacon calls | Same |
| Background | Service worker, stores results in `chrome.storage.session`, updates badge | Persistent background page, in-memory storage, `browser.*` API |
| Popup | Renders verdict + breakdown by purpose and company name | Same, `browser.*` promises |

## Project structure

```
wearecounted/
├── chrome-extension/
│   ├── manifest.json      # MV3 manifest
│   ├── content.js         # DOM scanner + company mapping + MutationObserver
│   ├── inject.js          # Page-context beacon wrapper
│   ├── background.js      # Badge updates, stores results per tab
│   ├── popup.html         # Popup shell
│   ├── popup.js           # Renders verdict + purpose/company breakdown
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
- 50+ company name mappings (Google, Meta, Amazon, Microsoft, Oracle, Salesforce, and major ad exchanges)
- MutationObserver catches trackers injected after page load
- Capped at 500 elements per page

## Known limitations

- Cannot detect tracking pixels loaded via CSS `background-image`
- Beacon wrapper requires page-context injection which some CSP policies may block
- Some legitimate 1x1 images (spacer GIFs) may be counted as tracking pixels
- Company domain list is bundled and static — not automatically updated

## Roadmap

- [ ] Highlight/overlay hidden elements on the page
- [ ] Dashboard page — aggregated view across all scanned domains
- [ ] Historical comparison — what changed since last visit
- [ ] Export/share report

## License

Open source. Part of the weare____ series.
