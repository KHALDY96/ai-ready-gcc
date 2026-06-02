/* =====================================================================
   AI Ready GCC — lightweight i18n engine (English / Arabic, RTL)
   - Detects language (localStorage > browser > English default)
   - Sets <html dir/lang>, swaps [data-i18n] text live (no reload)
   - Keeps stored/submitted values English (handled in each page)
   - Page scripts use AIRG_I18N.ready(cb) to render dynamic content
   ===================================================================== */
(function () {
  var SUPPORTED = ['en', 'ar'];
  var DEFAULT = 'en';
  var cache = {};
  var dict = null;
  var lang = DEFAULT;
  var readyCbs = [];

  function detect() {
    try {
      var s = localStorage.getItem('airg_lang');
      if (s && SUPPORTED.indexOf(s) > -1) return s;
    } catch (e) {}
    var nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
    return nav.indexOf('ar') === 0 ? 'ar' : 'en';
  }

  // Dot-path lookup, e.g. "results.bands.ready.name"
  function get(path) {
    if (!dict || !path) return undefined;
    var parts = path.split('.'), cur = dict, i;
    for (i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function applyDom(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = get(el.getAttribute('data-i18n'));
      if (typeof v === 'string') el.textContent = v;
    });
    root.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var v = get(el.getAttribute('data-i18n-html'));
      if (typeof v === 'string') el.innerHTML = v;
    });
    // data-i18n-attr="placeholder:key; aria-label:key2"
    root.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var kv = pair.split(':');
        if (kv.length < 2) return;
        var v = get(kv[1].trim());
        if (typeof v === 'string') el.setAttribute(kv[0].trim(), v);
      });
    });
    var t = get('meta.title');
    if (typeof t === 'string') document.title = t;
  }

  function setDir() {
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
  }

  function reveal() {
    document.documentElement.classList.remove('i18n-hide');
  }

  function updateSwitchUI() {
    document.querySelectorAll('[data-lang-switch]').forEach(function (el) {
      el.textContent = (lang === 'ar') ? 'English' : 'العربية';
      el.setAttribute('aria-label', (lang === 'ar') ? 'Switch to English' : 'التبديل إلى العربية');
    });
  }

  function fireReady() {
    readyCbs.forEach(function (cb) { try { cb(dict, lang); } catch (e) {} });
  }

  function load(l, cb) {
    if (cache[l]) { dict = cache[l]; cb(); return; }
    fetch('lang/' + l + '.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (j) { cache[l] = j; dict = j; cb(); })
      .catch(function () { dict = cache[l] || null; cb(); }); // fall back to in-HTML English
  }

  function activate(l) {
    lang = l;
    setDir();
    load(l, function () {
      if (dict) applyDom(document);
      updateSwitchUI();
      fireReady();
      reveal();
    });
  }

  window.AIRG_I18N = {
    t: get,
    get lang() { return lang; },
    ready: function (cb) {
      readyCbs.push(cb);
      if (dict) { try { cb(dict, lang); } catch (e) {} }
    },
    setLang: function (l) {
      if (SUPPORTED.indexOf(l) < 0) return;
      try { localStorage.setItem('airg_lang', l); } catch (e) {}
      activate(l);
    },
    toggle: function () { this.setLang(lang === 'ar' ? 'en' : 'ar'); }
  };

  function init() {
    lang = detect();
    document.querySelectorAll('[data-lang-switch]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); window.AIRG_I18N.toggle(); });
    });
    activate(lang);
    setTimeout(reveal, 1500); // failsafe so content never stays hidden
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
