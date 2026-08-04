/**
 * preview.js — styles the preview pane beside each form.
 *
 * The preview itself is Sveltia's own: it lists the fields of the entry and
 * updates as you type. This file hands it the website's stylesheet, so the
 * values appear in the site's typography and colour rather than the
 * editor's.
 *
 * ── Why there are no custom preview templates here ────────────────────
 *
 * There were. They rendered each entry in the site's own markup, and they
 * worked correctly in isolation — all eleven, checked against the real
 * content. Inside the CMS they did not run at all, and worse, registering
 * them *replaced* Sveltia's working preview with an empty pane. Every
 * collection previewed as a blank white rectangle.
 *
 * Measured rather than assumed:
 *
 *   - `CMS.registerPreviewTemplate` exists and accepts a registration
 *     without throwing.
 *   - The component is then never invoked. Probes registered under five
 *     name variants — collection name, collection-file name, field name,
 *     "collection/file", and the display label — recorded zero calls.
 *   - Both a plain function component and a class with a `render` method
 *     were tried. Neither ran.
 *   - `window.React` is undefined. Sveltia does not bundle React, and the
 *     documented API expects a React component.
 *   - Removing the registrations restores the built-in preview.
 *
 * So custom previews are unavailable in this build, and attempting them
 * costs the preview that does work. If a later version renders them, the
 * renderers are recoverable from this file's history.
 *
 * `registerPreviewStyle` does work — verified: 193 rules applied inside the
 * preview iframe, with the page's paper background reaching it.
 */

(function stylePreview() {
  const attach = () => {
    const CMS = window.CMS;
    if (!CMS || typeof CMS.registerPreviewStyle !== "function") return false;
    try {
      /* Resolved against this page rather than written as an absolute
         path: the site lives under /basantmaheshwari/ once deployed but at
         the root when served locally, and a hardcoded path is wrong in one
         of those two places. */
      CMS.registerPreviewStyle(new URL("preview.css", location.href).href);
    } catch (e) {
      /* An unstyled preview is still a working preview. */
      console.warn("could not style the preview pane", e);
    }
    return true;
  };

  /* The CMS script loads before this one, but wait for it rather than
     assume: a registration that runs too early is silently lost, which
     looks exactly like a preview that does not work. */
  if (attach()) return;
  let tries = 0;
  const timer = setInterval(() => {
    if (attach() || ++tries > 100) clearInterval(timer);
  }, 50);
})();
