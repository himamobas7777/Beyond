/* main.js: boot */
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
  setTimeout(maybeShowGuide, 600);
  setInterval(() => { pollNotifications(); const r = typeof topRoute === 'function' ? topRoute() : null; if (!(r && (r.name === 'chat' || r.name === 'inbox'))) pollMessages(); }, 60000);
  setInterval(() => { const r = topRoute(); if (r && (r.name === 'chat' || r.name === 'inbox')) pollMessages(); }, 6000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { pollNotifications(); pollMessages(); } });
})();
