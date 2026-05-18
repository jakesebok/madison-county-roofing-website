/*!
 * Madison County Roofing — form UX layer.
 *
 * Every form on the site has method="POST" and no action attribute. The
 * LocalCraft tracking pixel (track.js) listens for the submit event in the
 * capture phase and posts the form data to the LocalCraft /api/track
 * endpoint, which auto-promotes form_submit events to the leads table and
 * fires a Resend email notification.
 *
 * This script does ONE thing: stop the browser's default form submission
 * (which would otherwise reload the page with no confirmation) and swap
 * the form for an inline "got it" thank-you message.
 *
 * The pixel still fires because it runs in the capture phase (true) and
 * captures the submit event BEFORE this script's bubble-phase listener
 * has a chance to call preventDefault.
 *
 * Validation: HTML5 constraint validation runs first. If a required field
 * is empty or an email is malformed, the browser blocks the submit event
 * entirely — neither this script nor the pixel sees it, and the user sees
 * the standard browser validation tooltip.
 */
(function () {
  "use strict";

  function buildThanksCard(form) {
    var card = document.createElement("div");
    card.setAttribute("role", "status");
    card.setAttribute("aria-live", "polite");
    card.setAttribute("tabindex", "-1");
    card.className = "form-thanks";
    card.style.cssText =
      "background: var(--paper-card); border: 1px solid var(--divider); " +
      "border-top: 4px solid var(--brick); padding: clamp(1.75rem, 4vw, 2.5rem); " +
      "border-radius: 2px; margin: var(--space-5) 0; box-shadow: 0 18px 40px -16px rgba(26,35,50,0.18);";

    card.innerHTML =
      '<div style="display: grid; gap: 0.875rem;">' +
        '<div style="display: flex; align-items: center; gap: 0.625rem; font-family: var(--font-body); font-size: 0.6875rem; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700; color: var(--brick-deep);">' +
          '<span style="width: 9px; height: 9px; border-radius: 50%; background: #4A9D4F; display: inline-block;"></span>' +
          'Got it' +
        '</div>' +
        '<h3 style="font-family: var(--font-display); font-weight: 700; font-size: clamp(1.375rem, 1.2rem + 0.6vw, 1.75rem); color: var(--ink); margin: 0; line-height: 1.2;">' +
          'We’ll be in touch within one business day.' +
        '</h3>' +
        '<p style="font-size: 0.9375rem; line-height: 1.55; color: var(--text-muted); margin: 0;">' +
          'Mark or Janet will reach out personally to schedule a free in-person estimate. ' +
          'If it’s urgent or you’d rather talk now, call ' +
          '<a href="tel:+16188764309" style="color: var(--brick-deep); font-weight: 600; white-space: nowrap;">(618) 876-4309</a> ' +
          '· Mon–Fri 8a–4:30p.' +
        '</p>' +
      '</div>';

    return card;
  }

  function handleSubmit(e) {
    var form = e.target;
    if (!form || form.tagName !== "FORM") return;
    // HTML5 validation already passed (or the browser would have blocked
    // the event entirely), but double-check anyway as defense-in-depth.
    if (typeof form.checkValidity === "function" && !form.checkValidity()) return;

    e.preventDefault();

    var thanks = buildThanksCard(form);

    // Insert the thanks card BEFORE the form, then remove the form.
    // Keep the surrounding section/heading visible.
    if (form.parentNode) {
      form.parentNode.insertBefore(thanks, form);
      form.style.display = "none";
    }

    // Scroll the thanks card into view and move focus for screen readers.
    try {
      thanks.scrollIntoView({ behavior: "smooth", block: "center" });
      // RAF + timeout so smooth scroll has started before we focus.
      requestAnimationFrame(function () {
        setTimeout(function () { thanks.focus(); }, 80);
      });
    } catch (_) {
      thanks.focus();
    }
  }

  function init() {
    var forms = document.querySelectorAll('form[data-lc-source]');
    for (var i = 0; i < forms.length; i++) {
      // Bubble phase (default) so the pixel's capture-phase listener
      // sees the submit event first.
      forms[i].addEventListener("submit", handleSubmit);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
