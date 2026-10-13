// UI test for notifications using injected data (demo mode has no server).
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'); const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
(async () => {
  await new Promise((r) => srv.listen(8768, r));
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }).catch(() => chromium.launch({ args: ['--no-sandbox'] }));
  let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
  for (const lang of ['en', 'ar']) {
    const ctx = await br.newContext({ viewport: { width: 360, height: 740 } });
    await ctx.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "window.BEYOND_CONFIG={SUPABASE_URL:'',SUPABASE_ANON_KEY:'',OWNER:{legalName:'Beyond Team',contactEmail:'a@b.c',minAge:13}};" }));
    await ctx.route(/fonts\.|jsdelivr/, (r) => r.abort());
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
    await page.addInitScript((l) => localStorage.setItem('beyond:lang', l), lang);
    await page.goto('http://localhost:8768/index.html'); await page.waitForSelector('#app h1');

    await page.click('.welcome-hero .btn.primary'); await page.click('.check .box >> nth=0'); await page.click('.check .box >> nth=1'); await page.click('#app .btn.primary'); await page.waitForSelector('#ob-name'); await page.click('#app .btn.primary');
    await page.waitForSelector('.modal');
    ok(await page.evaluate(() => document.getElementById('sheet-title').textContent) === (lang === 'ar' ? 'أهلًا في Beyond' : 'Welcome to Beyond'), lang + ': tour opens after onboarding');
    ok(await page.evaluate(() => document.body.classList.contains('modal-open')), lang + ': page scroll locked');
    await page.screenshot({ path: '/tmp/claude-0/tour_' + lang + '.png' });
    for (let i = 0; i < 4; i++) await page.click('.modal .btn.primary');
    ok((await page.$eval('.modal .btn.primary', (e) => e.textContent)) === (lang === 'ar' ? 'تم' : 'Done'), lang + ': last step shows Done');
    await page.click('.modal .btn.primary'); await page.waitForTimeout(100);
    ok((await page.$$('.modal')).length === 0, lang + ': tour closes');
    ok(await page.evaluate(() => localStorage.getItem('beyond:seenVersion') === WHATS_NEW[0].v), lang + ': version stored');
    await page.reload(); await page.waitForSelector('nav.tabs button'); await page.waitForTimeout(900);
    ok((await page.$$('.modal')).length === 0, lang + ': no popup on reload');
    // existing person who saw an older version
    await page.evaluate(() => localStorage.setItem('beyond:seenVersion', '2026-01-01'));
    await page.reload(); await page.waitForSelector('.modal');
    ok((await page.$$('.newlist li')).length === 8, lang + ': what is new lists 8 items (two releases)');
    await page.screenshot({ path: '/tmp/claude-0/new_' + lang + '.png' });
    await page.keyboard.press('Escape'); await page.waitForTimeout(80);
    ok((await page.$$('.modal')).length === 0, lang + ': Escape closes');
    ok(await page.evaluate(() => localStorage.getItem('beyond:seenVersion')) === '2026-01-01', lang + ': Escape does not mark as seen (shown again next time)');
    await page.reload(); await page.waitForSelector('.modal'); await page.click('.modal .btn.primary'); await page.waitForTimeout(80);
    ok(await page.evaluate(() => localStorage.getItem('beyond:seenVersion') === WHATS_NEW[0].v), lang + ': Got it marks as seen');
    // settings buttons
    await page.evaluate(() => { go({ name: 'settings' }); });
    await page.waitForSelector('text=' + (lang === 'ar' ? 'مساعدة' : 'Help'));
    await page.click('text=' + (lang === 'ar' ? 'اعرض الجولة مرة تانية' : 'Show the tour again')); await page.waitForSelector('.modal');
    ok((await page.$$('.dots span')).length === 5, lang + ': tour reopens from settings');
    await page.keyboard.press('Escape');
    ok(errs.length === 0, lang + ': no JS errors ' + errs.join(';')); await ctx.close();
  }
  await br.close(); srv.close(); process.exit(fail ? 1 : 0);
})();
