/**
 * preview.js — shows the real website beside each form.
 *
 * The preview is not a second rendering of the design. It is the site
 * itself, loaded in an iframe with `?cms-preview=1`, with the entry you
 * are editing posted into it. The page swaps that into its content
 * registry and redraws — so what you see is the actual page, with its
 * typography, its portrait, the rail's water and the solved cross-section,
 * and it cannot drift from the published site because it *is* the
 * published site.
 *
 * `createClass` and `h` are Decap globals.
 */

(function () {
  /* collection file name → the array it edits, and the page to show. */
  var PAGES = {
    profile_metrics:       { key: 'METRICS',      panel: 'home' },
    research_themes:       { key: 'RESEARCH',     panel: 'research' },
    publications_list:     { key: 'PUBLICATIONS', panel: 'publications' },
    publications_sections: { key: 'PUB_KINDS',    panel: 'publications' },
    programmes_list:       { key: 'PROGRAMS',     panel: 'programs' },
    team_people:           { key: 'TEAM',         panel: 'team' },
    team_sections:         { key: 'TEAM_ROLES',   panel: 'team' },
    teaching_areas:        { key: 'TEACHING',     panel: 'teaching' },
    news_items:            { key: 'NEWS',         panel: 'news' },
    contact_channels:      { key: 'CONTACT',      panel: 'contact' },
    site_sections:         { key: 'SECTIONS',     panel: 'home' }
  };

  /* A newly chosen image is a blob in the browser and not yet a file in the
     repository, so resolve any asset path to something the frame can load
     before sending it across. */
  var resolveAssets = function (props, value) {
    if (Array.isArray(value)) {
      return value.map(function (item) { return resolveAssets(props, item); });
    }
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce(function (copy, key) {
      var v = value[key];
      if (typeof v === 'string' && /^(image|portrait|photo)$/i.test(key)) {
        var asset = props.getAsset && props.getAsset(v);
        copy[key] = asset ? asset.toString() : v;
      } else {
        copy[key] = resolveAssets(props, v);
      }
      return copy;
    }, {});
  };

  var createPagePreview = function (name) {
    var target = PAGES[name];
    return createClass({
      componentDidMount: function () {
        var self = this;
        /* The frame announces itself when it is ready. A message sent
           before that is simply lost, and the preview would sit showing
           saved content while the form says something else. */
        this.onReady = function (event) {
          if (event.origin === window.location.origin &&
              self.frame && event.source === self.frame.contentWindow &&
              event.data && event.data.type === 'bm:cms-preview-ready') {
            self.send();
          }
        };
        window.addEventListener('message', this.onReady);
      },

      componentWillUnmount: function () {
        if (this.onReady) window.removeEventListener('message', this.onReady);
      },

      componentDidUpdate: function () { this.send(); },

      send: function () {
        if (!this.frame || !this.frame.contentWindow) return;
        var data = this.props.entry.get('data').toJS();
        this.frame.contentWindow.postMessage({
          type: 'bm:cms-preview',
          key: target.key,
          panel: target.panel,
          data: resolveAssets(this.props, data)
        }, window.location.origin);
      },

      render: function () {
        var self = this;
        return h('iframe', {
          src: '../?cms-preview=1#' + target.panel,
          title: 'Live preview of the website',
          style: { width: '100%', height: '100%', border: '0', display: 'block' },
          ref: function (frame) { self.frame = frame; },
          onLoad: function () { self.send(); }
        });
      }
    });
  };

  CMS.registerPreviewStyle('preview-pane.css');
  Object.keys(PAGES).forEach(function (name) {
    CMS.registerPreviewTemplate(name, createPagePreview(name));
  });
})();
