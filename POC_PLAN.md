# wearecounted — POC Plan

## What is wearecounted?

A browser extension that detects and counts hidden tracking infrastructure on every page you visit: invisible tracking pixels (1x1 images), hidden iframes, beacon API calls, and prefetch links to tracker domains. Makes the invisible visible. Part of the "weare____" privacy tool series.

No data leaves your browser. No accounts. No tracking.

## Why build this?

- Tracker blockers silently remove these elements — users never learn how pervasive they are
- No extension shows the raw count of invisible tracking infrastructure per page
- The educational/transparency angle — showing rather than blocking — is unique
- "This page has 14 hidden tracking pixels from 8 companies" is immediately visceral

## POC Goal

**Prove that scanning the DOM for hidden tracking elements catches a meaningful number of invisible trackers on regular websites, and that the count alone is striking enough to be valuable.**

## POC Scope

### Happy Path
1. Content script runs on every page load, scans DOM for hidden tracking elements
2. Detects: tracking pixels (1x1 images), hidden iframes, beacon API calls, tracker prefetch links
3. MutationObserver catches dynamically injected elements after page load
4. Sends results to background script
5. Badge shows total count of hidden elements on current tab
6. Popup shows verdict: domain, total count, breakdown by type with destination domains

### Edge Cases
1. **No hidden elements** — clean site → badge shows "0", popup says "No hidden tracking found on this site"
2. **Huge DOM** — site has thousands of images → only check elements matching hidden criteria, cap at 500
3. **Dynamic injection** — trackers injected via JS after load → MutationObserver catches these

### Out of Scope for POC
- Blocking or removing hidden elements
- Historical tracking across sessions
- Dashboard page with aggregated view
- Firefox version (build Chrome first, port after)
- Highlight/overlay feature to outline hidden elements on the page

## Architecture

```
popup.html ←→ popup.js ←→ background.js ←→ content.js + inject.js
                              (storage)        (DOM scan)   (beacon wrap)
```

### Content Script (`content.js`)
- Runs at `document_idle` on all URLs
- Scans DOM for hidden tracking elements:
  - `<img>` with `naturalWidth <= 1` or `naturalHeight <= 1` or `display:none` or `visibility:hidden`
  - `<iframe>` with `width <= 1` or `height <= 1` or `display:none`
  - `<link rel="prefetch">` pointing to known tracker domains
- Injects `inject.js` into page context to wrap `navigator.sendBeacon`
- Listens for beacon events via `window.postMessage`
- Sets up MutationObserver for dynamically added elements
- Sends results to background via `chrome.runtime.sendMessage`:
  ```js
  {
    type: "scanResult",
    domain: location.hostname,
    url: location.href,
    timestamp: Date.now(),
    items: [
      { type: "pixel", src: "https://tracker.com/pixel.gif", domain: "tracker.com" },
      { type: "iframe", src: "https://ads.com/frame", domain: "ads.com" },
      { type: "beacon", url: "https://analytics.com/collect", domain: "analytics.com" },
      { type: "prefetch", href: "https://cdn.tracker.com/lib.js", domain: "cdn.tracker.com" }
    ],
    totals: { pixels: 8, iframes: 2, beacons: 4, prefetches: 1, total: 15 }
  }
  ```

### Inject Script (`inject.js`)
- Injected into page context (not content script world)
- Wraps `navigator.sendBeacon` to intercept calls
- Posts beacon URL back to content script via `window.postMessage`

### Background Script (`background.js`)
- Listens for `scanResult` messages from content script
- Stores latest scan per tab in `chrome.storage.session`
- Updates badge with total hidden element count
- Responds to `getResults` messages from popup

### Popup (`popup.html` + `popup.js`)
- Sends `getResults` message to background for current tab
- Renders verdict: domain, total count, breakdown by type
- Each type shows count and list of destination domains
- If no data: "No hidden tracking found on this site"

## Detection Rules

### Tracking Pixels
`<img>` elements matching ANY of:
- `naturalWidth <= 1 && naturalHeight <= 1` (classic 1x1 pixel)
- `width` or `height` attribute is "0" or "1"
- Computed `display: none` or `visibility: hidden`
- `src` contains known pixel paths: `/pixel`, `/track`, `/beacon`, `/collect`, `/t.gif`, `/p.gif`

Exclude: images with no `src`, data URIs, SVGs

### Hidden Iframes
`<iframe>` elements matching ANY of:
- `width <= 1` or `height <= 1` (attribute or computed)
- Computed `display: none` or `visibility: hidden`
- `src` pointing to a different domain than the page

### Beacon Calls
`navigator.sendBeacon()` calls intercepted via prototype wrapping in page context.

### Prefetch Links
`<link rel="prefetch">` or `<link rel="preconnect">` pointing to known tracker domains.

## Known Tracker Domains (bundled, partial list for POC)
```js
const TRACKER_DOMAINS = [
  "google-analytics.com", "googletagmanager.com", "doubleclick.net",
  "facebook.net", "facebook.com", "fbcdn.net",
  "hotjar.com", "clarity.ms", "fullstory.com",
  "segment.io", "segment.com", "cdn.segment.com",
  "mixpanel.com", "amplitude.com",
  "newrelic.com", "nr-data.net",
  "sentry.io", "bugsnag.com",
  "quantserve.com", "scorecardresearch.com",
  "outbrain.com", "taboola.com", "criteo.com",
  "adsrvr.org", "adnxs.com", "rubiconproject.com",
  "pubmatic.com", "openx.net", "casalemedia.com",
  "bluekai.com", "demdex.net", "krxd.net",
];
```

## Files

| File | Purpose |
|------|---------|
| `chrome-extension/manifest.json` | MV3 manifest |
| `chrome-extension/content.js` | DOM scanner, MutationObserver, beacon listener |
| `chrome-extension/inject.js` | Page-context beacon wrapper |
| `chrome-extension/background.js` | Badge updates, stores scan results per tab |
| `chrome-extension/popup.html` | Results popup shell |
| `chrome-extension/popup.js` | Reads results from background, renders breakdown |
| `chrome-extension/styles.css` | Dark theme (weare____ palette) |

## Validation Criteria

POC is successful if:
1. Loading any major website (cnn.com, amazon.com, reddit.com, nytimes.com) shows hidden tracking elements
2. At least some 1x1 tracking pixels are detected on sites using Google Analytics or Facebook Pixel
3. Badge count updates per tab and shows 0 on clean sites (e.g., example.com)
4. Beacon calls are intercepted on sites that use `sendBeacon` for analytics
5. MutationObserver catches dynamically injected pixels

## After POC Validates

If the POC works → stop, design properly, then build v1:
- Firefox MV2 port
- Dashboard page (aggregated view across all scanned domains)
- Highlight/overlay feature to outline hidden elements on the page
- Historical comparison
- Export/share report

## Test Manually

1. `chrome://extensions/` → Developer mode → Load unpacked → select `chrome-extension/`
2. Visit cnn.com → click extension icon → should see tracking pixels and hidden iframes
3. Visit amazon.com → badge should show count → popup shows breakdown
4. Visit example.com → badge shows 0 → popup shows empty state
5. Open multiple tabs → each tab has its own badge count and popup data
