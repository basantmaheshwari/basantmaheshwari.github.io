/**
 * livepreview.js — the real website, docked beside the editor.
 *
 * Sveltia will not render a custom preview template: it accepts the
 * registration and never calls the component, and registering one replaces
 * its working pane with an empty rectangle. So this does not use that API
 * at all. It simply docks a panel of its own onto the editor page holding
 * an iframe of the live site in ?preview mode.
 *
 * That page watches the repository and redraws within seconds of a save, so
 * the panel shows the finished article — the portrait, the typography, the
 * water in the rail, the solved cross-section — beside the form you are
 * filling in. Saving is what updates it; there is no per-keystroke hook to
 * hang off, and inventing one by scraping the editor's form would break the
 * first time its markup changed.
 *
 * Nothing here touches Sveltia's internals. If the editor changes, the worst
 * that happens is the panel keeps showing the published page.
 */

(function () {
  var SITE = '../?preview';
  var KEY  = 'bm-live-preview';           /* remembers open/shut and width */

  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  var open  = state.open !== false;        /* open unless told otherwise */
  /* Proportional by default so the editor keeps room on a laptop, and
     absolute once the reader has dragged it. */
  var width = Math.min(Math.max(state.width || Math.round(Math.min(560, innerWidth * 0.45)), 300), 1000);

  var css = document.createElement('style');
  css.textContent = [
    '#bm-lp{position:fixed;top:0;right:0;bottom:0;z-index:2147483000;display:flex;',
    '  flex-direction:column;background:#f6f4ef;border-left:1px solid rgba(21,34,43,.16);',
    '  box-shadow:-12px 0 32px rgba(21,34,43,.10);font-family:ui-sans-serif,-apple-system,',
    '  BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}',
    '#bm-lp[hidden]{display:none}',
    '#bm-lp-bar{display:flex;align-items:center;gap:10px;padding:9px 12px;',
    '  border-bottom:1px solid rgba(21,34,43,.12);background:#efebe2;flex:0 0 auto}',
    '#bm-lp-bar b{font-weight:400;font-size:11px;letter-spacing:.16em;text-transform:uppercase;',
    '  color:#526169;margin-right:auto}',
    '#bm-lp button{font:inherit;font-size:11px;letter-spacing:.1em;text-transform:uppercase;',
    '  padding:6px 11px;border:1px solid rgba(21,34,43,.18);background:#fbfaf7;color:#15222b;',
    '  cursor:pointer;border-radius:2px}',
    '#bm-lp button:hover{border-color:#12617f;color:#12617f}',
    '#bm-lp iframe{flex:1 1 auto;width:100%;border:0;display:block;background:#f6f4ef}',
    '#bm-lp-grip{position:absolute;left:-3px;top:0;bottom:0;width:7px;cursor:col-resize}',
    '#bm-lp-grip:hover{background:rgba(18,97,127,.25)}',
    '#bm-lp-show{position:fixed;right:0;top:50%;transform:translateY(-50%);z-index:2147483000;',
    '  writing-mode:vertical-rl;padding:14px 7px;border:1px solid rgba(21,34,43,.18);',
    '  border-right:0;background:#efebe2;color:#15222b;font-size:11px;letter-spacing:.16em;',
    '  text-transform:uppercase;cursor:pointer;border-radius:3px 0 0 3px}',
    '#bm-lp-show[hidden]{display:none}',
    /* Sveltia's shell is position:fixed across the whole viewport, so
       padding on <html> does nothing — the panel would simply cover the
       form. Pulling its right edge in is what actually makes room. */
    'body > .app-shell,body > div.sui.app-shell{right:var(--bm-lp-w,0px)!important;',
    '  width:auto!important}'
  ].join('');
  document.head.appendChild(css);

  var panel = document.createElement('aside');
  panel.id = 'bm-lp';
  panel.innerHTML =
    '<div id="bm-lp-grip" title="Drag to resize"></div>' +
    '<div id="bm-lp-bar"><b>Live preview</b>' +
      '<button type="button" data-act="reload">Refresh</button>' +
      '<button type="button" data-act="open">Open in a tab</button>' +
      '<button type="button" data-act="hide">Hide</button></div>' +
    '<iframe id="bm-lp-frame" title="The website as it will look"></iframe>';
  document.body.appendChild(panel);

  var show = document.createElement('button');
  show.id = 'bm-lp-show';
  show.type = 'button';
  show.textContent = 'Live preview';
  document.body.appendChild(show);

  var frame = panel.querySelector('#bm-lp-frame');

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({open: open, width: width})); } catch (e) {}
  }

  /* The editor is a full-viewport app, so it is pushed over rather than
     covered — otherwise the panel would sit on top of the form. */
  function layout() {
    panel.hidden = !open;
    show.hidden = open;
    panel.style.width = width + 'px';
    document.documentElement.style.setProperty('--bm-lp-w', (open ? width : 0) + 'px');
  }

  function load() {
    /* Cache-busted so a refresh really refetches rather than showing the
       copy the browser already has. */
    frame.src = SITE + '&t=' + Date.now();
  }

  panel.addEventListener('click', function (e) {
    var act = e.target.getAttribute && e.target.getAttribute('data-act');
    if (act === 'reload') load();
    if (act === 'open') window.open(SITE, '_blank', 'noopener');
    if (act === 'hide') { open = false; layout(); save(); }
  });
  show.addEventListener('click', function () { open = true; layout(); save(); if (!frame.src) load(); });

  /* Drag the left edge to resize. */
  var dragging = false;
  panel.querySelector('#bm-lp-grip').addEventListener('mousedown', function (e) {
    dragging = true; e.preventDefault();
    document.body.style.userSelect = 'none';
  });
  window.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    width = Math.min(Math.max(window.innerWidth - e.clientX, 320), 900);
    layout();
  });
  window.addEventListener('mouseup', function () {
    if (!dragging) return;
    dragging = false; document.body.style.userSelect = ''; save();
  });

  layout();
  if (open) load();

  /* A save should show up immediately rather than on the preview's own
     four-second cycle. The event API is used defensively: if the name is
     not supported the panel still updates, just a moment later. */
  try {
    if (window.CMS && typeof CMS.registerEventListener === 'function') {
      ['postSave', 'postPublish'].forEach(function (name) {
        try { CMS.registerEventListener({ name: name, handler: function () { setTimeout(load, 900); } }); }
        catch (e) {}
      });
    }
  } catch (e) {}
})();
