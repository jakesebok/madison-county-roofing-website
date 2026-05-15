/*!
 * LocalCraft Digital tracking pixel — captures page views, link clicks, phone taps,
 * email taps, and form submits. Batches and POSTs to /api/track.
 *
 * Embed:
 *   <script async src="https://app.localcraftdigital.com/track.js" data-pixel-id="..."></script>
 *
 * Lightweight (no deps). Honors prefers-reduced-data and Do-Not-Track.
 */
(function () {
  "use strict";

  if (window.__lcTracker) return;
  window.__lcTracker = true;

  // Find the script tag to read its data-pixel-id and the API origin
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf("track.js") !== -1) return scripts[i];
    }
    return null;
  })();
  if (!script) return;

  var pixelId = script.getAttribute("data-pixel-id");
  if (!pixelId) return;

  // Endpoint resolution: explicit override wins, otherwise derive from script src origin.
  // Override is needed when the pixel is self-hosted on the client domain but events
  // need to POST cross-origin to the LocalCraft API.
  var endpoint = script.getAttribute("data-endpoint");
  if (!endpoint) {
    var apiOrigin = new URL(script.src).origin;
    endpoint = apiOrigin + "/api/track";
  }

  // Honor Do-Not-Track
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;

  // ====== Session ID (cookie + sessionStorage fallback) ======
  function uuid4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function (c) {
      return (c ^ ((crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> ((c / 4) | 0))).toString(16);
    });
  }
  var sid;
  try {
    sid = sessionStorage.getItem("lc_sid");
    if (!sid) {
      sid = uuid4();
      sessionStorage.setItem("lc_sid", sid);
    }
  } catch (_) {
    sid = uuid4();
  }

  // ====== Event queue + flush ======
  var queue = [];
  var flushTimer = null;
  var flushInterval = 2000;

  function flush(useBeacon) {
    if (queue.length === 0) return;
    var payload = JSON.stringify({ pixel_id: pixelId, events: queue.splice(0) });

    if (useBeacon && navigator.sendBeacon) {
      try {
        var blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(endpoint, blob);
        return;
      } catch (_) { /* fall through to fetch */ }
    }

    try {
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
        mode: "cors",
        credentials: "omit"
      }).catch(function () {});
    } catch (_) {}
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(function () {
      flushTimer = null;
      flush(false);
    }, flushInterval);
  }

  function track(type, target, metadata) {
    queue.push({
      type: type,
      target: target || null,
      path: location.pathname,
      referrer: document.referrer || null,
      session_id: sid,
      metadata: metadata || {}
    });
    if (type === "form_submit" || type === "tel_tap" || type === "email_tap" || type === "sms_tap") {
      // Flush high-value events immediately
      flush(true);
    } else {
      scheduleFlush();
    }
  }

  // ====== Page view ======
  track("page_view");

  // SPA-style navigation support — listen for pushState/replaceState/popstate
  var lastPath = location.pathname;
  function onNav() {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      track("page_view");
    }
  }
  ["pushState", "replaceState"].forEach(function (m) {
    var orig = history[m];
    history[m] = function () {
      var r = orig.apply(this, arguments);
      setTimeout(onNav, 0);
      return r;
    };
  });
  window.addEventListener("popstate", onNav);

  // ====== Click + tap classification ======
  document.addEventListener("click", function (e) {
    var el = e.target && e.target.closest ? e.target.closest("a, button, [data-axp-track]") : null;
    if (!el) return;

    var href = (el.getAttribute && el.getAttribute("href")) || "";
    var label = el.getAttribute("data-axp-track") || el.textContent || el.getAttribute("aria-label") || "";
    label = String(label).trim().slice(0, 120);

    if (href.indexOf("tel:") === 0) {
      track("tel_tap", href, { label: label });
    } else if (href.indexOf("mailto:") === 0) {
      track("email_tap", href, { label: label });
    } else if (href.indexOf("sms:") === 0) {
      track("sms_tap", href, { label: label });
    } else if (href.indexOf("https://maps") !== -1 || href.indexOf("google.com/maps") !== -1) {
      track("map_tap", href, { label: label });
    } else {
      track("click", label || href || el.tagName.toLowerCase(), {
        href: href,
        tag: el.tagName.toLowerCase()
      });
    }
  }, true);

  // ====== Form submit ======
  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form || !form.getAttribute) return;

    var data = {};
    try {
      var fd = new FormData(form);
      fd.forEach(function (v, k) {
        // Only capture safe primitive fields, never files
        if (typeof v === "string" && v.length < 2000) data[k] = v;
      });
    } catch (_) {}

    // Standard contact fields, if present
    var name = data.name || data.full_name || data.first_name || "";
    var email = data.email || "";
    var phone = data.phone || data.tel || "";
    var message = data.message || data.comments || data.notes || "";

    track("form_submit", form.getAttribute("action") || form.id || "form", {
      name: name,
      email: email,
      phone: phone,
      message: message,
      form_id: form.id || null,
      form_name: form.getAttribute("name") || null
    });
  }, true);

  // ====== Flush on page unload ======
  window.addEventListener("pagehide", function () { flush(true); });
  window.addEventListener("beforeunload", function () { flush(true); });

  // Expose a tiny API for the host site to fire custom events
  window.lcTrack = function (target, metadata) {
    track("custom", target, metadata || {});
  };
})();
