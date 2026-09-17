// Apply before paint; private browsing/storage restrictions must not block the app.
(() => {
  try {
    const saved = localStorage.getItem('tabibi:theme');
    if (saved === 'dark' || (!saved && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.dataset.theme = 'dark';
  } catch { /* Keep the default theme. */ }
})();
