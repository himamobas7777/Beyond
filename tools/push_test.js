// UI test for notifications using injected data (demo mode has no server).
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'); const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
(async () => {
  await new Promise((r) => srv.listen(8769, r));
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }).catch(() => chromium.launch({ args: ['--no-sandbox'] }));
  let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
  for (const lang of ['en', 'ar']) {
    const ctx = await br.newContext({ viewport: { width: 360, height: 740 } });
    await ctx.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "window.BEYOND_CONFIG={SUPABASE_URL:'',SUPABASE_ANON_KEY:'',OWNER:{legalName:'Beyond Team',contactEmail:'a@b.c',minAge:13}};" }));
    await ctx.route(/fonts\.|jsdelivr/, (r) => r.abort());
    const page = await ctx.newPage();  const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
    await page.addInitScript((l) => localStorage.setItem('beyond:lang', l), lang);
    await page.addInitScript(() => {
      window.__sub = null; window.__saved = null; window.__removed = null;
      const reg = { pushManager: { getSubscription: async () => window.__sub, subscribe: async (o) => { window.__sub = { endpoint: 'https://push.example/abc', options: { applicationServerKey: o.applicationServerKey.buffer }, toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'P', auth: 'A' } }; }, unsubscribe: async () => { window.__sub = null; return true; } }; return window.__sub; } } };
      Object.defineProperty(navigator, 'serviceWorker', { value: { ready: Promise.resolve(reg), getRegistration: async () => reg, register: async () => reg, addEventListener() {} }, configurable: true });
      window.PushManager = function () {};
      window.Notification = { permission: 'default', requestPermission: async () => { window.Notification.permission = window.__answer || 'granted'; return window.Notification.permission; } };
      const f = window.fetch; window.fetch = (u, o) => String(u).includes('/functions/v1/push') ? Promise.resolve({ ok: true, json: async () => ({ publicKey: 'BC425ovInQncV3N7mP74xvfjbUc5tZFDElrchEeoBIX4txfLvQaQw_SeckDVsVAf-A4KZSaXeSrrfA8xo-Qkdic' }) }) : f(u, o);
    });
    await page.goto('http://localhost:8769/index.html'); await page.waitForSelector('#app h1');
    await page.click('.welcome-hero .btn.primary'); await page.click('.check .box >> nth=0'); await page.click('.check .box >> nth=1'); await page.click('#app .btn.primary'); await page.waitForSelector('#ob-name'); await page.click('#app .btn.primary'); await page.waitForSelector('nav.tabs button');

    await page.waitForSelector('.modal'); await page.keyboard.press('Escape'); await page.waitForTimeout(80);
    // run the alerts code as if the site were live
    await page.evaluate(async () => {
      const code = await (await fetch('screens.js')).text();
      const a = code.indexOf('/* ---------- ALERTS'), b = code.indexOf('function langPicker()');
      CFG.SUPABASE_URL = 'https://x.supabase.co';
      API.savePushSubscription = async (...x) => { window.__saved = x; }; API.remove = async (...x) => { window.__removed = x; };
      window.__alerts = new Function('LIVE', code.slice(a, b) + '; return { pushCard, pushState, enablePush, disablePush };')(true);
    });
    const mount = async () => { await page.evaluate(() => { document.querySelectorAll('#probe').forEach((e) => e.remove()); const d = document.createElement('div'); d.id = 'probe'; d.style.cssText = 'position:fixed;top:8px;left:8px;right:8px;z-index:50;background:#0A1128'; d.append(window.__alerts.pushCard(false)); document.body.append(d); }); await page.waitForSelector('#probe .card .btn, #probe .card p + p'); };
    await mount();
    const turnOn = lang === 'ar' ? 'فعّل التنبيهات' : 'Turn on alerts', turnOff = lang === 'ar' ? 'أوقف التنبيهات' : 'Turn off alerts';
    ok((await page.$eval('#probe .btn', (e) => e.textContent)) === turnOn, lang + ': shows Turn on alerts when off');
    await page.click('#probe .btn'); await page.waitForSelector('#probe .btn.sec');
    ok((await page.$eval('#probe .btn', (e) => e.textContent)) === turnOff, lang + ': now shows Turn off');
    const saved = await page.evaluate(() => window.__saved);
    ok(saved && saved[0] === 'https://push.example/abc' && saved[1] === 'P' && saved[2] === 'A' && saved[3] === lang, lang + ': subscription saved with language ' + JSON.stringify(saved));
    ok(await page.evaluate(async () => (await window.__alerts.pushState()) === 'on'), lang + ': state on');
    await page.click('#probe .btn'); await page.waitForSelector('#probe .btn.primary');
    ok(await page.evaluate(() => window.__sub === null && window.__removed && window.__removed[1].endpoint === 'https://push.example/abc'), lang + ': turn off unsubscribes and removes from server');
    await page.evaluate(() => { window.__answer = 'denied'; });
    await page.click('#probe .btn'); await page.waitForTimeout(150);
    ok((await page.$eval('#probe .err', (e) => e.textContent)).length > 10, lang + ': denied shows a message');
    await page.evaluate(() => { window.Notification.permission = 'denied'; }); await mount().catch(() => {});
    ok((await page.$$('#probe .btn')).length === 0, lang + ': denied hides the button');
    ok(errs.length === 0, lang + ': no JS errors ' + errs.join(';')); await ctx.close();
  }
  await br.close(); srv.close(); process.exit(fail ? 1 : 0);
})();
