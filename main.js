/* main.js: boot */
// Opens the screen named in the address (used when someone taps an alert): ?open=chat&id=..., post, user, inbox, notifications
function openFromUrl(href) {
  let u; try { u = new URL(href, location.href); } catch (e) { return; }
  const what = u.searchParams.get('open'), id = u.searchParams.get('id'); if (!what || !S.me || !S.me.onboarded) return;
  const ok = { notifications: () => ({ name: 'notifications' }), inbox: () => ({ name: 'inbox' }), chat: () => id && { name: 'chat', id }, post: () => id && { name: 'post', id }, user: () => id && { name: 'user', id } }[what];
  const route = ok && ok(); if (!route) return;
  ui.stack = [route]; ui.focus = true; render(); window.scrollTo(0, 0);
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
}
(async () => {
  try {
    await initLang();
    await API.init();
    await refresh();
    // The database trigger normally creates the profile on first Google sign-in. If it lagged, create it here.
    if (LIVE && S.user && !S.me) {
      try { await API.insert('profiles', { id: S.user.id, username: 'beyonder_' + S.user.id.replace(/-/g, '').slice(0, 6) }); await refresh(); } catch (e) { /* shown below if still missing */ }
    }
  } catch (e) { S.error = errText(e); }
  S.ready = true;
  render();
  if (LIVE && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
    navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'open') refresh().then(() => openFromUrl(e.data.url)).catch(() => openFromUrl(e.data.url)); });
  }
  openFromUrl(location.href); refreshPushSub();
  { const m = /^#\/o\/([\w-]+)/.exec(location.hash || ''); if (m && getOpp(m[1])) { ui.stack = [{ name: 'detail', id: m[1] }]; ui.focus = true; render(); try { history.replaceState(null, '', location.pathname); } catch (e) {} } }
  setTimeout(maybeShowGuide, 600);
  setInterval(() => { pollNotifications(); const r = typeof topRoute === 'function' ? topRoute() : null; if (!(r && (r.name === 'chat' || r.name === 'inbox'))) pollMessages(); }, 60000);
  setInterval(() => { const r = topRoute(); if (r && (r.name === 'chat' || r.name === 'inbox')) pollMessages(); }, 6000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { pollNotifications(); pollMessages(); } });
})();
