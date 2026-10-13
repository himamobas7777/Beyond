/* Beyond service worker: shows alerts when the site is closed. It does not cache anything. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = {}; }
  event.waitUntil(self.registration.showNotification(d.title || 'Beyond', {
    body: d.body || '', tag: d.tag || undefined, lang: d.lang || undefined, dir: d.lang === 'ar' ? 'rtl' : 'ltr',
    icon: 'icon-192.png', badge: 'icon-192.png', data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if (c.url.startsWith(self.registration.scope)) { await c.focus(); c.postMessage({ type: 'open', url: target }); return; }
    }
    await self.clients.openWindow(target);
  })());
});
