// Sets the appearance before the first paint (docs/74 §5): a file, not an inline script, so the Content Security
// Policy needs no 'unsafe-inline'. The visitor's stored choice wins ('dark' or 'light' only, as the site writes them);
// without one, the device's prefers-color-scheme decides (the 2026-10-17 refinement), as src/theme/theme.tsx does.
(function () {
  var stored = null;
  try {
    stored = localStorage.getItem('erp.web.theme');
  } catch (e) {
    /* storage refused: follow the device */
  }
  var dark = stored === 'dark';
  if (stored !== 'dark' && stored !== 'light') {
    try {
      dark = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch (e) {
      dark = false;
    }
  }
  if (dark) document.documentElement.dataset.theme = 'dark';
})();
