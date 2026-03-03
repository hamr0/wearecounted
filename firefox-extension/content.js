"use strict";

// Domain → company name + purpose
var COMPANY_MAP = {
  // Google
  "google-analytics.com": { name: "Google Analytics", purpose: "Analytics" },
  "googletagmanager.com": { name: "Google Tag Manager", purpose: "Analytics" },
  "doubleclick.net": { name: "Google Ads", purpose: "Advertising" },
  "googlesyndication.com": { name: "Google Ads", purpose: "Advertising" },
  "googleadservices.com": { name: "Google Ads", purpose: "Advertising" },
  "google.com": { name: "Google", purpose: "Analytics" },

  // Facebook / Meta
  "facebook.net": { name: "Meta", purpose: "Advertising" },
  "facebook.com": { name: "Meta", purpose: "Advertising" },
  "fbcdn.net": { name: "Meta", purpose: "Advertising" },

  // Analytics
  "hotjar.com": { name: "Hotjar", purpose: "Analytics" },
  "clarity.ms": { name: "Microsoft Clarity", purpose: "Analytics" },
  "fullstory.com": { name: "FullStory", purpose: "Analytics" },
  "segment.io": { name: "Segment", purpose: "Analytics" },
  "segment.com": { name: "Segment", purpose: "Analytics" },
  "mixpanel.com": { name: "Mixpanel", purpose: "Analytics" },
  "amplitude.com": { name: "Amplitude", purpose: "Analytics" },
  "newrelic.com": { name: "New Relic", purpose: "Analytics" },
  "nr-data.net": { name: "New Relic", purpose: "Analytics" },
  "optimizely.com": { name: "Optimizely", purpose: "Analytics" },
  "bounceexchange.com": { name: "Bounce Exchange", purpose: "Analytics" },
  "permutive.com": { name: "Permutive", purpose: "Analytics" },
  "chartbeat.com": { name: "Chartbeat", purpose: "Analytics" },
  "scorecardresearch.com": { name: "Comscore", purpose: "Analytics" },
  "quantserve.com": { name: "Quantcast", purpose: "Analytics" },

  // Error tracking
  "sentry.io": { name: "Sentry", purpose: "Error tracking" },
  "bugsnag.com": { name: "Bugsnag", purpose: "Error tracking" },

  // Advertising
  "outbrain.com": { name: "Outbrain", purpose: "Advertising" },
  "taboola.com": { name: "Taboola", purpose: "Advertising" },
  "criteo.com": { name: "Criteo", purpose: "Advertising" },
  "adsrvr.org": { name: "The Trade Desk", purpose: "Advertising" },
  "adnxs.com": { name: "Microsoft Advertising", purpose: "Advertising" },
  "rubiconproject.com": { name: "Magnite (Rubicon)", purpose: "Advertising" },
  "pubmatic.com": { name: "PubMatic", purpose: "Advertising" },
  "openx.net": { name: "OpenX", purpose: "Advertising" },
  "casalemedia.com": { name: "Index Exchange", purpose: "Advertising" },
  "indexww.com": { name: "Index Exchange", purpose: "Advertising" },
  "amazon-adsystem.com": { name: "Amazon Ads", purpose: "Advertising" },
  "amazonaax.com": { name: "Amazon Ads", purpose: "Advertising" },
  "assoc-amazon.com": { name: "Amazon Ads", purpose: "Advertising" },
  "amazon.com": { name: "Amazon", purpose: "Analytics" },
  "ssl-images-amazon.com": { name: "Amazon", purpose: "Content" },
  "media-amazon.com": { name: "Amazon", purpose: "Content" },
  "cloudfront.net": { name: "Amazon CloudFront", purpose: "CDN" },
  "amazonaws.com": { name: "Amazon AWS", purpose: "Infrastructure" },
  "advertising.com": { name: "Yahoo Advertising", purpose: "Advertising" },
  "bidswitch.net": { name: "BidSwitch", purpose: "Advertising" },
  "sharethrough.com": { name: "Sharethrough", purpose: "Advertising" },
  "33across.com": { name: "33Across", purpose: "Advertising" },
  "lijit.com": { name: "Sovrn", purpose: "Advertising" },
  "sovrn.com": { name: "Sovrn", purpose: "Advertising" },
  "media.net": { name: "Media.net", purpose: "Advertising" },
  "btloader.com": { name: "BidTellect", purpose: "Advertising" },
  "safeframe.googlesyndication.com": { name: "Google Ads", purpose: "Advertising" },

  // Data brokers
  "bluekai.com": { name: "Oracle (BlueKai)", purpose: "Data broker" },
  "demdex.net": { name: "Adobe Audience Manager", purpose: "Data broker" },
  "krxd.net": { name: "Salesforce (Krux)", purpose: "Data broker" },
  "rlcdn.com": { name: "LiveRamp", purpose: "Data broker" },
  "pippio.com": { name: "LiveRamp", purpose: "Data broker" },
  "exelator.com": { name: "Nielsen", purpose: "Data broker" },
  "agkn.com": { name: "Neustar", purpose: "Data broker" },
};

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

function lookupCompany(domain) {
  // Try exact match, then walk up subdomains
  var parts = domain.split(".");
  for (var i = 0; i < parts.length - 1; i++) {
    var candidate = parts.slice(i).join(".");
    if (COMPANY_MAP[candidate]) return COMPANY_MAP[candidate];
  }
  return null;
}

function isKnownTracker(domain) {
  return lookupCompany(domain) !== null;
}

function isHidden(el) {
  var style = window.getComputedStyle(el);
  return style.display === "none" || style.visibility === "hidden";
}

function addItem(type, url) {
  if (totals.total >= MAX_ELEMENTS) return;
  var domain = getDomain(url);
  if (!domain) return;

  for (var i = 0; i < items.length; i++) {
    if (items[i].type === type && items[i].src === url) return;
  }

  var company = lookupCompany(domain);
  items.push({
    type: type,
    src: url,
    domain: domain,
    company: company ? company.name : domain,
    purpose: company ? company.purpose : "Unknown",
  });
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
    var tracker = isKnownTracker(getDomain(src));

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
    if (isKnownTracker(domain)) {
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
    var tracker = isKnownTracker(getDomain(src));
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
      if (href && isKnownTracker(getDomain(href))) {
        addItem("prefetch", href);
        sendResults();
      }
    }
  }
}

function sendResults() {
  try {
    browser.runtime.sendMessage({
      type: "scanResult",
      domain: location.hostname,
      url: location.href,
      timestamp: Date.now(),
      items: items,
      totals: totals,
    });
  } catch (e) {
    observer.disconnect();
    window.removeEventListener("message", onBeaconMessage);
  }
}

function injectBeaconWrapper() {
  var script = document.createElement("script");
  script.src = browser.runtime.getURL("inject.js");
  (document.head || document.documentElement).appendChild(script);
  script.onload = function () { script.remove(); };
}

function onBeaconMessage(event) {
  if (event.source !== window) return;
  if (!event.data || event.data.type !== "__wearecounted_beacon__") return;

  addItem("beacon", event.data.url);
  sendResults();
}

window.addEventListener("message", onBeaconMessage);

var observer = new MutationObserver(function (mutations) {
  for (var i = 0; i < mutations.length; i++) {
    var nodes = mutations[i].addedNodes;
    for (var j = 0; j < nodes.length; j++) {
      var node = nodes[j];
      if (node.nodeType !== 1) continue;
      scanElement(node);
      var children = node.querySelectorAll ? node.querySelectorAll("img, iframe, link") : [];
      for (var k = 0; k < children.length; k++) {
        scanElement(children[k]);
      }
    }
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true });

injectBeaconWrapper();
scanPixels();
scanIframes();
scanPrefetches();
sendResults();
