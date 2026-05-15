/*!
 * LocalCraft Pixel v1.0.0
 * Lightweight, privacy-respecting analytics for client sites.
 * Loaded via: <script async src="/lc.js" data-site-id="SITE_ID"></script>
 * https://localcraft.digital
 */
(function () {
  'use strict';

  // -------- Config --------
  var SCRIPT = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();
  if (!SCRIPT) return;

  var SITE_ID = SCRIPT.getAttribute('data-site-id');
  if (!SITE_ID) {
    if (window.console && console.warn) console.warn('[lc] missing data-site-id, pixel disabled');
    return;
  }

  // Honor Do Not Track
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1') {
    return;
  }

  var ENDPOINT = SCRIPT.getAttribute('data-endpoint') || 'https://api.localcraft.digital/p';
  var SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min idle = new session
  var DEBUG = SCRIPT.getAttribute('data-debug') === 'true';

  function log() {
    if (DEBUG && window.console) console.log.apply(console, ['[lc]'].concat([].slice.call(arguments)));
  }

  // -------- Visitor / Session IDs --------
  function uuid() {
    // RFC4122 v4-like — good enough for analytics IDs
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getVisitorId() {
    try {
      var vid = localStorage.getItem('lc_vid');
      if (!vid) {
        vid = uuid();
        localStorage.setItem('lc_vid', vid);
        localStorage.setItem('lc_vid_first', String(Date.now()));
      }
      return vid;
    } catch (e) {
      return 'no-ls-' + uuid();
    }
  }

  function getSessionId() {
    try {
      var raw = sessionStorage.getItem('lc_session');
      var now = Date.now();
      if (raw) {
        var s = JSON.parse(raw);
        if (s && (now - s.last) < SESSION_TIMEOUT_MS) {
          s.last = now;
          sessionStorage.setItem('lc_session', JSON.stringify(s));
          return s.id;
        }
      }
      var sid = uuid();
      sessionStorage.setItem('lc_session', JSON.stringify({ id: sid, start: now, last: now }));
      return sid;
    } catch (e) {
      return 'no-ss-' + uuid();
    }
  }

  // -------- URL / UTM --------
  function parseUtm() {
    var qs = window.location.search;
    var params = {};
    if (!qs) return params;
    var kv = qs.replace(/^\?/, '').split('&');
    for (var i = 0; i < kv.length; i++) {
      var pair = kv[i].split('=');
      var key = decodeURIComponent(pair[0] || '');
      if (/^utm_/i.test(key)) {
        params[key.toLowerCase()] = decodeURIComponent(pair[1] || '');
      }
    }
    return params;
  }

  var UTM = parseUtm();
  var IS_RETURNING = (function () {
    try { return !!localStorage.getItem('lc_vid_first'); } catch (e) { return false; }
  })();
  var VID = getVisitorId();
  var SID = getSessionId();

  // -------- Transport --------
  function send(eventType, eventData) {
    var payload = {
      site_id: SITE_ID,
      v: 1,
      ts: new Date().toISOString(),
      visitor_id: VID,
      session_id: SID,
      returning: IS_RETURNING,
      event: eventType,
      data: eventData || {},
      page: {
        url: location.href,
        path: location.pathname,
        title: document.title,
        referrer: document.referrer || null,
        hash: location.hash || null
      },
      utm: UTM,
      device: {
        ua: navigator.userAgent,
        lang: navigator.language || 'en',
        vw: window.innerWidth,
        vh: window.innerHeight,
        dpr: window.devicePixelRatio || 1,
        platform: navigator.platform || null
      }
    };

    log('send', eventType, payload);

    var body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon(ENDPOINT, blob)) return;
      }
      // Fallback: fetch with keepalive
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true,
        mode: 'no-cors'
      }).catch(function () {});
    } catch (e) {
      log('send failed', e);
    }
  }

  // Expose a manual API for custom events
  window.lc = window.lc || {};
  window.lc.track = function (name, data) { send(name, data || {}); };
  window.lc.identify = function (traits) {
    try {
      localStorage.setItem('lc_traits', JSON.stringify(traits || {}));
    } catch (e) {}
    send('identify', traits || {});
  };

  // -------- Automatic event capture --------

  // 1) Pageview
  send('pageview');

  // 2) Phone clicks (tel:)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var hrefLower = href.toLowerCase();

    if (hrefLower.indexOf('tel:') === 0) {
      send('phone_click', {
        number: href.replace(/^tel:/i, ''),
        text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
        location: a.getAttribute('aria-label') || a.className || null
      });
      return;
    }

    if (hrefLower.indexOf('mailto:') === 0) {
      send('email_click', {
        address: href.replace(/^mailto:/i, ''),
        text: (a.textContent || '').replace(/\s+/g, ' ').trim()
      });
      return;
    }

    // Outbound or maps directions
    if (a.host && a.host !== location.host) {
      var isMaps = /maps\.(google|apple)\.com|maps\.app\.goo\.gl/i.test(a.host);
      var isFacebook = /facebook\.com/i.test(a.host);
      send(isMaps ? 'directions_click' : 'outbound_click', {
        url: a.href,
        domain: a.host,
        is_facebook: isFacebook,
        text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120)
      });
    }
  }, true);

  // 3) Form interactions
  var trackedFormStarts = {};
  function getFormId(form) {
    return form.id || form.getAttribute('name') || form.action || 'unnamed-form';
  }
  document.addEventListener('focusin', function (e) {
    var form = e.target.form;
    if (!form) return;
    var fid = getFormId(form);
    if (trackedFormStarts[fid]) return;
    trackedFormStarts[fid] = true;
    send('form_start', {
      form: fid,
      first_field: e.target.name || e.target.id || e.target.type
    });
  });
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    var fields = {};
    var inputs = form.querySelectorAll('input,select,textarea');
    for (var i = 0; i < inputs.length; i++) {
      var f = inputs[i];
      if (!f.name) continue;
      if (/password|cc|card|cvv|ssn/i.test(f.name)) continue; // PII guard
      fields[f.name] = f.type === 'checkbox' ? !!f.checked : (f.value || '').slice(0, 200);
    }
    send('form_submit', {
      form: getFormId(form),
      field_count: inputs.length,
      fields: fields
    });
  }, true);

  // 4) Scroll depth milestones
  var scrollSeen = { 25: false, 50: false, 75: false, 100: false };
  function checkScroll() {
    var docH = Math.max(
      document.body.scrollHeight, document.documentElement.scrollHeight,
      document.body.offsetHeight, document.documentElement.offsetHeight
    );
    var viewBottom = window.scrollY + window.innerHeight;
    var pct = Math.min(100, Math.round((viewBottom / docH) * 100));
    [25, 50, 75, 100].forEach(function (mark) {
      if (pct >= mark && !scrollSeen[mark]) {
        scrollSeen[mark] = true;
        send('scroll_depth', { depth: mark });
      }
    });
  }
  var scrollTimer;
  window.addEventListener('scroll', function () {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(checkScroll, 200);
  }, { passive: true });

  // 5) Time on page (best-effort beforeunload)
  var arrived = Date.now();
  function sendTimeOnPage() {
    var secs = Math.round((Date.now() - arrived) / 1000);
    if (secs < 2) return;
    send('time_on_page', { seconds: secs });
  }
  window.addEventListener('beforeunload', sendTimeOnPage);
  // Safari/iOS fallback — pagehide fires more reliably
  window.addEventListener('pagehide', sendTimeOnPage);

  // 6) Visibility change — pause/resume awareness (lightweight)
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') sendTimeOnPage();
  });

  log('lc.js initialized', { siteId: SITE_ID, endpoint: ENDPOINT, vid: VID });
})();
