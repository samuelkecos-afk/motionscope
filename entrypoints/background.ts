export default defineBackground(() => {
  // Clicking the toolbar icon opens the side panel.
  browser.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

  // Content scripts cannot read cross-origin stylesheets; the extension can,
  // thanks to host_permissions.
  browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type !== 'fetch-css' || typeof msg.url !== 'string') return false;
    if (!/^https?:/.test(msg.url)) {
      sendResponse(null);
      return false;
    }
    fetch(msg.url, { credentials: 'omit' })
      .then((r) => (r.ok ? r.text() : null))
      .then((t) => sendResponse(t))
      .catch(() => sendResponse(null));
    return true;
  });
});
