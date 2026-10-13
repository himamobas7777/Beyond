// Runs sw.js against a fake service worker scope and checks what it does on push and on tapping the alert.
const vm = require('vm'), fs = require('fs');
const handlers = {}; const calls = []; let clientsList = [];
const self = { addEventListener: (n, f) => { handlers[n] = f; }, skipWaiting() {}, clients: { claim() {}, matchAll: async () => clientsList, openWindow: async (u) => { calls.push(['open', u]); } },
  registration: { scope: 'https://x.github.io/Beyond/', showNotification: async (t, o) => { calls.push(['show', t, o]); } } };
vm.runInNewContext(fs.readFileSync(__dirname + '/../sw.js', 'utf8'), { self, URL, console });
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
(async () => {
  const wait = []; handlers.push({ data: { json: () => ({ title: 'Beyond', body: 'Sara sent you a message', url: '?open=chat&id=u1', tag: 'msg-u1', lang: 'ar' }) }, waitUntil: (p) => wait.push(p) }); await Promise.all(wait);
  const s = calls.find((c) => c[0] === 'show');
  ok(s && s[1] === 'Beyond' && s[2].body === 'Sara sent you a message' && s[2].tag === 'msg-u1' && s[2].dir === 'rtl' && s[2].data.url === '?open=chat&id=u1', 'push shows the alert');
  wait.length = 0; calls.length = 0; handlers.push({ data: null, waitUntil: (p) => wait.push(p) }); await Promise.all(wait);
  ok(calls[0] && calls[0][1] === 'Beyond', 'push without data still shows a safe alert');
  // tap with no open window
  wait.length = 0; calls.length = 0; let closed = false;
  handlers.notificationclick({ notification: { close: () => { closed = true; }, data: { url: '?open=chat&id=u1' } }, waitUntil: (p) => wait.push(p) }); await Promise.all(wait);
  ok(closed && calls[0][0] === 'open' && calls[0][1] === 'https://x.github.io/Beyond/?open=chat&id=u1', 'tap opens the app on the right screen');
  // tap with an open window
  wait.length = 0; calls.length = 0; const posted = [];
  clientsList = [{ url: 'https://x.github.io/Beyond/', focus: async () => { calls.push(['focus']); }, postMessage: (m) => posted.push(m) }];
  handlers.notificationclick({ notification: { close() {}, data: { url: '?open=post&id=p1' } }, waitUntil: (p) => wait.push(p) }); await Promise.all(wait);
  ok(calls[0][0] === 'focus' && posted[0].type === 'open' && posted[0].url.endsWith('?open=post&id=p1'), 'tap focuses the open app and tells it where to go');
  process.exit(fail ? 1 : 0);
})();
