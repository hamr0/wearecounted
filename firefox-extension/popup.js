"use strict";

var TYPE_LABELS = {
  pixels: "Tracking pixels",
  iframes: "Hidden iframes",
  beacons: "Beacon calls",
  prefetches: "Tracker prefetches",
};

var TYPE_ORDER = ["pixels", "iframes", "beacons", "prefetches"];

document.addEventListener("DOMContentLoaded", function () {
  browser.runtime.sendMessage({ type: "getResults" }).then(function (data) {
    render(data);
  });
});

function render(data) {
  var verdictEl = document.getElementById("verdict");
  var breakdownEl = document.getElementById("breakdown");
  var emptyEl = document.getElementById("empty");

  if (!data || !data.items || data.items.length === 0) {
    verdictEl.appendChild(buildVerdict(data ? data.domain : "Unknown", 0));
    emptyEl.classList.remove("hidden");
    return;
  }

  verdictEl.appendChild(buildVerdict(data.domain, data.totals.total));

  if (data.totals.total > 0) {
    breakdownEl.classList.remove("hidden");
    buildBreakdown(breakdownEl, data.totals, data.items);
  } else {
    emptyEl.classList.remove("hidden");
  }
}

function buildVerdict(domain, total) {
  var level = "clean";
  var message = "No hidden tracking found.";
  if (total > 0 && total <= 5) {
    level = "warn";
    message = total + " hidden tracking element" + (total !== 1 ? "s" : "") + " found.";
  } else if (total > 5) {
    level = "bad";
    message = total + " hidden tracking elements found.";
  }

  var wrap = el("div", "verdict verdict-" + level);

  var domainEl = el("div", "verdict-domain");
  domainEl.textContent = domain;
  wrap.appendChild(domainEl);

  var countEl = el("div", "verdict-count");
  var num = el("span", "verdict-flagged");
  num.textContent = total;
  countEl.appendChild(num);
  wrap.appendChild(countEl);

  var msg = el("div", "verdict-message");
  msg.textContent = message;
  wrap.appendChild(msg);

  return wrap;
}

function buildBreakdown(container, totals, items) {
  var label = el("div", "section-label");
  label.textContent = "Breakdown";
  container.appendChild(label);

  var bd = el("div", "breakdown-list");

  for (var i = 0; i < TYPE_ORDER.length; i++) {
    var type = TYPE_ORDER[i];
    var count = totals[type] || 0;
    if (count === 0) continue;

    var row = el("div", "breakdown-row");
    var catEl = el("span", "breakdown-category");
    catEl.textContent = TYPE_LABELS[type];
    var countEl = el("span", "breakdown-count");
    countEl.textContent = count;
    row.appendChild(catEl);
    row.appendChild(countEl);
    bd.appendChild(row);

    var typeSingular = type.slice(0, -1);
    var domains = {};
    for (var j = 0; j < items.length; j++) {
      if (items[j].type === typeSingular) {
        domains[items[j].domain] = (domains[items[j].domain] || 0) + 1;
      }
    }
    var domainKeys = Object.keys(domains).sort(function (a, b) {
      return domains[b] - domains[a];
    });
    if (domainKeys.length > 0) {
      var domainList = el("div", "domain-list");
      for (var d = 0; d < domainKeys.length && d < 8; d++) {
        var domainRow = el("div", "domain-row");
        var domainName = el("span", "domain-name");
        domainName.textContent = domainKeys[d];
        var domainCount = el("span", "domain-count");
        domainCount.textContent = domains[domainKeys[d]];
        domainRow.appendChild(domainName);
        domainRow.appendChild(domainCount);
        domainList.appendChild(domainRow);
      }
      if (domainKeys.length > 8) {
        var more = el("div", "domain-more");
        more.textContent = "+" + (domainKeys.length - 8) + " more";
        domainList.appendChild(more);
      }
      bd.appendChild(domainList);
    }
  }

  container.appendChild(bd);
}

function el(tag, className) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
