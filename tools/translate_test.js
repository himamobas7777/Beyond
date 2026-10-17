// UI test for notifications using injected data (demo mode has no server).
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'); const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
(async () => {
  await new Promise((r) => srv.listen(8772, r));
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }).catch(() => chromium.launch({ args: ['--no-sandbox'] }));
  let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
  for (const lang of ['ar', 'fr', 'de', 'es', 'it', 'ja', 'zh']) {
    const ctx = await br.newContext({ viewport: { width: 360, height: 740 } });
    await ctx.route('**/config.js*', (r) => r.fulfill({ contentType: 'text/javascript', body: "window.BEYOND_CONFIG={SUPABASE_URL:'',SUPABASE_ANON_KEY:'',OWNER:{legalName:'Beyond Team',contactEmail:'a@b.c',minAge:13}};" }));
    await ctx.route(/fonts\.|jsdelivr/, (r) => r.abort());
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
    await page.addInitScript((l) => localStorage.setItem('beyond:lang', l), lang);
    await page.goto('http://localhost:8772/index.html'); await page.waitForSelector('#app h1');
    await page.click('.welcome-hero .btn.primary'); await page.click('.check .box >> nth=0'); await page.click('.check .box >> nth=1'); await page.click('#app .btn.primary'); await page.waitForSelector('#ob-name'); await page.fill('#ob-name', 'Test'); 
    await page.evaluate(() => { document.querySelectorAll('#app .btn.primary').forEach((b) => b.click()); });
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape'); await page.waitForTimeout(100);
    await page.evaluate(() => { try { S.me.onboarded = true; } catch (e) {} ui.stack = []; ui.tab = 'home'; render(); });
    ok((await page.$$('.quest')).length >= 1, lang + ': home shows My Path card');
    await page.evaluate(() => go({ name: 'path' })); await page.waitForSelector('#app input[type=text]');
    await page.fill('#app input[type=text] >> nth=0', 'MIT'); await page.fill('#app input[type=text] >> nth=1', 'Computer Science');
    await page.click('#app .btn.primary');
    ok((await page.$$('button.card')).length === 6, lang + ': six countries');
    await page.click('button.card >> nth=0'); await page.click('#app .btn.primary');
    ok((await page.textContent('#app')).length > 300, lang + ': country overview shown');
    await page.click('#app .btn.primary');
    ok((await page.$$('button.card')).length === 3, lang + ': three systems');
    await page.click('button.card >> nth=0'); await page.click('#app .btn.primary');
    await page.click('button.card >> nth=2'); await page.click('#app .btn.primary');
    await page.waitForSelector('.progress');
    const r = await page.evaluate(() => {
      const d = PATH_DEST.usa, firstDoc = d.documents[0];
      const text = document.querySelector('#app').innerText;
      const items = [...document.querySelectorAll('.path-item')].map((e) => e.innerText);
      return { stepTranslated: !!DICT[d.timeline[0].step] && text.includes(DICT[d.timeline[0].step].slice(0, 25)), engLeft: text.includes(d.timeline[0].step.slice(0, 30)), noticeOk: text.includes(DICT['Facts are translated from the official English pages. Open the source link for the exact wording.'].slice(0, 12)), items: items.length };
    });
    ok(r.stepTranslated && !r.engLeft, lang + ': plan steps are translated (no English left in first step)');
    ok(r.noticeOk, lang + ': translated-notice shown');
    const o = await page.evaluate(async () => { go({ name: 'detail', id: 'rsi' }); await new Promise((x) => setTimeout(x, 100)); const t = document.querySelector('#app').innerText; const od = getOpp('rsi'); return { descr: t.includes(DICT[od.descr].slice(0, 20)), eng: t.includes(od.descr.slice(0, 40)), title: t.includes(od.title) }; });
    ok(o.descr && !o.eng, lang + ': opportunity description translated');
    ok(o.title, lang + ': opportunity title kept in English');
    ok(errs.length === 0, lang + ': no page errors ' + errs.join('|'));
    await ctx.close();
  }
  await br.close(); srv.close(); console.log(fail ? fail + ' FAILED' : 'ALL PASSED'); process.exit(fail ? 1 : 0);
})();
