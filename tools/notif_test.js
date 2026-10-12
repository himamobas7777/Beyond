// UI test for notifications using injected data (demo mode has no server).
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'); const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
(async () => {
  await new Promise((r) => srv.listen(8766, r));
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }).catch(() => chromium.launch({ args: ['--no-sandbox'] }));
  let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
  for (const lang of ['en', 'ar']) {
    const ctx = await br.newContext({ viewport: { width: 360, height: 740 } });
    await ctx.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "window.BEYOND_CONFIG={SUPABASE_URL:'',SUPABASE_ANON_KEY:'',OWNER:{legalName:'Beyond Team',contactEmail:'a@b.c',minAge:13}};" }));
    await ctx.route(/fonts\.|jsdelivr/, (r) => r.abort());
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
    await page.addInitScript((l) => localStorage.setItem('beyond:lang', l), lang);
    await page.goto('http://localhost:8766/index.html'); await page.waitForSelector('#app h1');
    await page.click('.welcome-hero .btn.primary'); await page.click('.check .box >> nth=0'); await page.click('.check .box >> nth=1'); await page.click('#app .btn.primary'); await page.waitForSelector('#ob-name'); await page.click('#app .btn.primary'); await page.waitForSelector('nav.tabs button');
    await page.evaluate(() => {
      S.notifications = [
        { id: 'n1', user_id: S.me.id, actor_id: 'beyond-demo', type: 'like', post_id: 'demo-p1', created_at: new Date().toISOString(), read_at: null },
        { id: 'n2', user_id: S.me.id, actor_id: 'beyond-demo', type: 'comment', post_id: 'demo-p2', created_at: new Date(Date.now() - 3600e3).toISOString(), read_at: null },
        { id: 'n3', user_id: S.me.id, actor_id: 'beyond-demo', type: 'follow', post_id: null, created_at: new Date(Date.now() - 7200e3).toISOString(), read_at: new Date().toISOString() }];
      go({ name: 'notifications' });
    });
    await page.waitForSelector('.notif');
    ok((await page.$$('.notif')).length === 3, lang + ': 3 rows');
    ok((await page.$$('.notif.unread')).length === 2, lang + ': 2 unread highlighted');
    ok(await page.evaluate(() => unreadCount()) === 2, lang + ': unreadCount 2');
    const txt = await page.$$eval('.notif .ntext > span:first-child', (e) => e.map((x) => x.textContent));
    console.log('     ', txt.join(' | '));
    await page.screenshot({ path: '/tmp/claude-0/notif_' + lang + '.png' });
    await page.click('.notif >> nth=0'); await page.waitForSelector('.post');
    ok(await page.evaluate(() => unreadCount()) === 1, lang + ': click marks read');
    await page.evaluate(() => back()); await page.waitForSelector('.notif');
    ok((await page.$$('.notif.unread')).length === 1, lang + ': back shows 1 unread');
    await page.click('#app .btn.sec'); await page.waitForTimeout(100);
    ok(await page.evaluate(() => unreadCount()) === 0, lang + ': mark all read');
    // bell badge
    const b = await page.evaluate(() => { S.notifications.push({ id: 'n9', read_at: null, type: 'like', actor_id: 'x', post_id: 'demo-p1', created_at: nowIso() }); const el = bellButton(); document.body.append(el); updateBell(); return { hidden: el.querySelector('.badge').hidden, label: el.getAttribute('aria-label'), n: el.querySelector('.badge').textContent }; });
    ok(!b.hidden && b.n === '1', lang + ': bell badge shows 1 (' + b.label + ')');
    ok(errs.length === 0, lang + ': no JS errors ' + errs.join(';')); await ctx.close();
  }
  await br.close(); srv.close(); process.exit(fail ? 1 : 0);
})();
