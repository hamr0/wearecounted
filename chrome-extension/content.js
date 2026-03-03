"use strict";

var TRACKER_DOMAINS = [
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

var PIXEL_PATH_PATTERNS = /\/pixel|\/track|\/beacon|\/collect|\/t\.gif|\/p\.gif|\/\.gif|__utm\.gif/i;
var MAX_ELEMENTS = 500;

var items = [];
var totals = { pixels: 0, iframes: 0, beacons: 0, prefetches: 0, total: 0 };

function getDomain(urlStr) {
  try {
    return new URL(urlStr).hostname;
  } catch (e) {
    return "";
  }
}

function isTrackerDomain(domain) {
  for (var i = 0; i < TRACKER_DOMAINS.length; i++) {
    if (domain === TRACKER_DOMAINS[i] || domain.endsWith("." + TRACKER_DOMAINS[i])) {
      return true;
    }
  }
  return false;
}

function isHidden(el) {
  var style = window.getComputedStyle(el);
  return style.display === "none" || style.visibility === "hidden";
}

function addItem(type, url) {
  if (totals.total >= MAX_ELEMENTS) return;
  var domain = getDomain(url);
  if (!domain) return;

  // Deduplicate by type + url
  for (var i = 0; i < items.length; i++) {
    if (items[i].type === type && items[i].src === url) return;
  }

  items.push({ type: type, src: url, domain: domain });
  totals[type + "s"] = (totals[type + "s"] || 0) + 1;
  totals.total++;
}

function scanPixels() {
  var imgs = document.querySelectorAll("img");
  for (var i = 0; i < imgs.length; i++) {
    var img = imgs[i];
    var src = img.src;
    if (!src || src.startsWith("data:") || src.endsWith(".svg")) continue;

    var isSmall = (img.naturalWidth <= 1 && img.naturalHeight <= 1) ||
                  (img.width <= 1 && img.height <= 1) ||
                  img.getAttribute("width") === "0" || img.getAttribute("width") === "1" ||
                  img.getAttribute("height") === "0" || img.getAttribute("height") === "1";
    var hidden = isHidden(img);
    var pixelPath = PIXEL_PATH_PATTERNS.test(src);
    var tracker = isTrackerDomain(getDomain(src));

    if (isSmall || hidden || (pixelPath && tracker)) {
      addItem("pixel", src);
    }
  }
}

function scanIframes() {
  var iframes = document.querySelectorAll("iframe");
  for (var i = 0; i < iframes.length; i++) {
    var iframe = iframes[i];
    var src = iframe.src;
    if (!src) continue;

    var domain = getDomain(src);
    if (domain === location.hostname) continue;

    var w = parseInt(iframe.getAttribute("width") || iframe.offsetWidth, 10) || 0;
    var h = parseInt(iframe.getAttribute("height") || iframe.offsetHeight, 10) || 0;
    var isSmall = w <= 1 || h <= 1;
    var hidden = isHidden(iframe);

    if (isSmall || hidden) {
      addItem("iframe", src);
    }
  }
}

function scanPrefetches() {
  var links = document.querySelectorAll('link[rel="prefetch"], link[rel="preconnect"], link[rel="dns-prefetch"]');
  for (var i = 0; i < links.length; i++) {
    var href = links[i].href;
    if (!href) continue;
    var domain = getDomain(href);
    if (isTrackerDomain(domain)) {
      addItem("prefetch", href);
    }
  }
}

function scanElement(el) {
  if (el.tagName === "IMG") {
    var src = el.src;
    if (!src || src.startsWith("data:") || src.endsWith(".svg")) return;
    var isSmall = (el.naturalWidth <= 1 && el.naturalHeight <= 1) ||
                  (el.width <= 1 && el.height <= 1);
    var hidden = isHidden(el);
    var pixelPath = PIXEL_PATH_PATTERNS.test(src);
    var tracker = isTrackerDomain(getDomain(src));
    if (isSmall || hidden || (pixelPath && tracker)) {
      addItem("pixel", src);
      sendResults();
    }
  } else if (el.tagName === "IFRAME") {
    var iframeSrc = el.src;
    if (!iframeSrc) return;
    var domain = getDomain(iframeSrc);
    if (domain === location.hostname) return;
    var w = parseInt(el.getAttribute("width") || el.offsetWidth, 10) || 0;
    var h = parseInt(el.getAttribute("height") || el.offsetHeight, 10) || 0;
    if (w <= 1 || h <= 1 || isHidden(el)) {
      addItem("iframe", iframeSrc);
      sendResults();
    }
  } else if (el.tagName === "LINK") {
    var rel = (el.getAttribute("rel") || "").toLowerCase();
    if (rel === "prefetch" || rel === "preconnect" || rel === "dns-prefetch") {
      var href = el.href;
      if (href && isTrackerDomain(getDomain(href))) {
        addItem("prefetch", href);
        sendResults();
      }
    }
  }
}

function sendResults() {
  chrome.runtime.sendMessage({
    type: "scanResult",
    domain: location.hostname,
    url: location.href,
    timestamp: Date.now(),
    items: items,
    totals: totals,
  });
}

// Inject beacon wrapper into page context
function injectBeaconWrapper() {
  var script = document.createElement("script");
  script.src = chrome.runtime.getURL("inject.js");
  (document.head || document.documentElement).appendChild(script);
  script.onload = function () { script.remove(); };
}

// Listen for beacon events from injected script
window.addEventListener("message", function (event) {
  if (event.source !== window) return;
  if (!event.data || event.data.type !== "__wearecounted_beacon__") return;

  addItem("beacon", event.data.url);
  sendResults();
});

// Run
injectBeaconWrapper();
scanPixels();
scanIframes();
scanPrefetches();
sendResults();

// Watch for dynamically injected elements
var observer = new MutationObserver(function (mutations) {
  for (var i = 0; i < mutations.length; i++) {
    var nodes = mutations[i].addedNodes;
    for (var j = 0; j < nodes.length; j++) {
      var node = nodes[j];
      if (node.nodeType !== 1) continue;
      scanElement(node);
      // Also check children
      var children = node.querySelectorAll ? node.querySelectorAll("img, iframe, link") : [];
      for (var k = 0; k < children.length; k++) {
        scanElement(children[k]);
      }
    }
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true });
