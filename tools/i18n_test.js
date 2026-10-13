// Smoke test: opens the site in every language (demo mode), walks the main screens, reports English leaks, errors and overflow.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
(async () => {
  await new Promise((r) => srv.listen(8765, r));
  const keys = JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n_keys.json'), 'utf8'));
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }).catch(() => chromium.launch({ args: ['--no-sandbox'] }));
  let problems = 0;
  for (const lang of ['en', 'ar', 'fr', 'es', 'de', 'it', 'ja', 'zh']) {
    const ctx = await br.newContext({ viewport: { width: 360, height: 740 } });
    await ctx.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "window.BEYOND_CONFIG={SUPABASE_URL:'',SUPABASE_ANON_KEY:'',OWNER:{legalName:'Beyond Team',contactEmail:'a@b.c',minAge:13,updated:'2026-10-12'}};" }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com|jsdelivr/, (r) => r.abort());
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::/.test(m.text())) errs.push(m.text()); });
    await page.addInitScript((l) => { try { localStorage.setItem('beyond:lang', l); } catch (e) {} }, lang);
    await page.goto('http://localhost:8765/index.html'); await page.waitForSelector('#app h1');
    const seen = new Set(); const window_dict = await page.evaluate(() => DICT); const leaks = []; const over = [];
    const scan = async (label) => {
      const r = await page.evaluate(() => {
        const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (w.nextNode()) { const n = w.currentNode; const p = n.parentElement; if (!p || ['SCRIPT', 'STYLE', 'OPTION'].includes(p.tagName)) continue; const t = n.nodeValue.trim(); if (t) out.push(t); }
        document.querySelectorAll('[aria-label],[placeholder]').forEach((e) => { out.push(e.getAttribute('aria-label') || ''); out.push(e.getAttribute('placeholder') || ''); });
        const skipTxt = []; BUILTIN_OPPS.forEach((o) => skipTxt.push(o.title, o.org)); (S.posts || []).forEach((p) => skipTxt.push(p.body));
        return { skipTxt, t: out.filter(Boolean), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, dir: document.documentElement.dir, lang: document.documentElement.lang };
      });
      if (r.sw > r.cw + 1) over.push(label + ' ' + r.sw + '>' + r.cw);
      r.t.forEach((t) => { if (seen.has(t)) return; seen.add(t); if (r.skipTxt.some((x) => x && t.includes(x))) return; if (/^Beyond \(demo\)/.test(t)) return;
        if (lang !== 'en') {
          if (keys.includes(t) && !/^(Beyond|BEYOND|Google|Demo|Math)$/.test(t) && !(window_dict && window_dict[t] === t)) leaks.push(t);
          const latin = t.replace(/Beyonders?|BEYOND|Google|Supabase|https?:\S+|@\S+|\S+@\S+|[A-Za-z0-9_.]+@[a-z.]+/gi, '');
          if (['ar', 'ja', 'zh'].includes(lang) && /[A-Za-z]{4,}/.test(latin)) leaks.push(t);
        } });
      return r;
    };
    let info = await scan('welcome');
    await page.click('.welcome-hero .btn.primary'); await page.waitForTimeout(100); await scan('join');
    await page.click('.check .box >> nth=0'); await page.click('.check .box >> nth=1'); await scan('consent');
    await page.click('#app .btn.primary'); await page.waitForSelector('#ob-name'); await scan('onboarding');
    await page.click('#app .btn.primary'); await page.waitForSelector('nav.tabs button'); await page.waitForSelector('.modal'); await scan('tour'); await page.keyboard.press('Escape'); await scan('home');
    const tabs = await page.$$('nav.tabs button');
    for (const [i, name] of ['home', 'explore', 'feed', 'profile'].entries()) { await (await page.$$('nav.tabs button'))[i].click(); await page.waitForTimeout(80); await scan(name); }
    // explore -> open first opportunity, edit profile, settings, legal
    await (await page.$$('nav.tabs button'))[1].click(); await page.waitForTimeout(80); await page.click('.card.opp >> nth=0'); await page.waitForTimeout(80); await scan('detail');
    await page.evaluate(() => { ui.stack = []; setTab('profile'); }); await page.evaluate(() => go({ name: 'edit' })); await page.waitForTimeout(80); await scan('edit');
    await page.evaluate(() => go({ name: 'settings' })); await page.waitForTimeout(80); await scan('settings');
    await page.evaluate(() => go({ name: 'legal', doc: 'privacy' })); await page.waitForTimeout(80); await scan('legal');
    await page.evaluate(() => { ui.stack = []; ui.tab = 'feed'; render(); go({ name: 'compose' }); }); await page.waitForTimeout(80); await scan('compose');
    if (['ar', 'ja'].includes(lang)) { await page.evaluate(() => { ui.stack = []; ui.tab = 'home'; render(); }); await page.screenshot({ path: '/tmp/claude-0/shot_' + lang + '_home.png' }); }
    console.log(lang, 'dir=' + info.dir, 'lang=' + info.lang, 'leaks=' + leaks.length, 'overflow=' + over.length, 'errors=' + errs.length);
    leaks.slice(0, 25).forEach((x) => console.log('   LEAK:', x.slice(0, 110))); over.forEach((x) => console.log('   OVER:', x)); errs.slice(0, 5).forEach((x) => console.log('   ERR:', x.slice(0, 160)));
    problems += leaks.length + over.length + errs.length; await ctx.close();
  }
  await br.close(); srv.close(); process.exit(problems ? 1 : 0);
})();
