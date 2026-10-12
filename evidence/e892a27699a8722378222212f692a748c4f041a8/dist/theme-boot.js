// Sets the stored appearance before the first paint (docs/74 §5): a file, not an inline script, so the Content
// Security Policy needs no 'unsafe-inline'. Only the two values the site writes are read; anything else is light.
try {
  if (localStorage.getItem('erp.web.theme') === 'dark') document.documentElement.dataset.theme = 'dark';
} catch (e) {
  /* storage refused: light */
}
