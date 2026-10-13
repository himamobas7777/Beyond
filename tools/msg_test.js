// UI test for notifications using injected data (demo mode has no server).
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'); const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
(async () => {
  await new Promise((r) => srv.listen(8767, r));
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }).catch(() => chromium.launch({ args: ['--no-sandbox'] }));
  let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
  for (const lang of ['en', 'ar']) {
    const ctx = await br.newContext({ viewport: { width: 360, height: 740 } });
    await ctx.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "window.BEYOND_CONFIG={SUPABASE_URL:'',SUPABASE_ANON_KEY:'',OWNER:{legalName:'Beyond Team',contactEmail:'a@b.c',minAge:13}};" }));
    await ctx.route(/fonts\.|jsdelivr/, (r) => r.abort());
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
    await page.addInitScript((l) => localStorage.setItem('beyond:lang', l), lang);
    await page.goto('http://localhost:8767/index.html'); await page.waitForSelector('#app h1');
    await page.click('.welcome-hero .btn.primary'); await page.click('.check .box >> nth=0'); await page.click('.check .box >> nth=1'); await page.click('#app .btn.primary'); await page.waitForSelector('#ob-name'); await page.click('#app .btn.primary'); await page.waitForSelector('nav.tabs button');

    // second person who follows me and whom I follow
    await page.evaluate(() => {
      const d = LocalAPI.db; d.profiles.push({ id: 'sara', username: 'sara_k', display_name: 'Sara K', bio: '', avatar_url: null, quest: '', stage: '', interests: [], is_public: true });
      d.profiles.push({ id: 'omar', username: 'omar_x', display_name: 'Omar X', bio: '', avatar_url: null, quest: '', stage: '', interests: [], is_public: true });
      d.follows.push({ follower_id: 'local-me', following_id: 'sara' }, { follower_id: 'sara', following_id: 'local-me' }, { follower_id: 'local-me', following_id: 'omar' });
      d.messages = [{ id: 'm1', sender_id: 'sara', recipient_id: 'local-me', body: 'Hi! <b>not bold</b> مرحبا', created_at: new Date(Date.now() - 600e3).toISOString(), read_at: null, hidden_by_sender: false, hidden_by_recipient: false }];
      LocalAPI.save();
    });
    await page.evaluate(async () => { await refresh(); render(); });
    ok(await page.evaluate(() => unreadMessages()) === 1, lang + ': 1 unread message');
    ok((await page.$$('.msgbtn .badge:not([hidden])')).length === 1, lang + ': mail badge visible on home');
    await page.screenshot({ path: '/tmp/claude-0/msg_home_' + lang + '.png' });
    await page.click('.msgbtn'); await page.waitForSelector('.notif');
    ok((await page.$$('.notif.unread')).length === 1, lang + ': inbox row unread');
    ok((await page.$$('.person')).length === 0, lang + ': no start-a-chat rows when the only mutual person already has a chat');
    await page.screenshot({ path: '/tmp/claude-0/msg_inbox_' + lang + '.png' });
    await page.click('.notif'); await page.waitForSelector('.bubble');
    ok(await page.evaluate(() => unreadMessages()) === 0, lang + ': opening chat marks read');
    ok((await page.$$('.bubble.theirs b')).length === 0, lang + ': HTML in message not rendered');
    await page.fill('#msg-in', 'Hello Sara'); await page.click('.send-btn'); await page.waitForSelector('.bubble.mine');
    ok((await page.$$('.bubble')).length === 2, lang + ': sent message appears');
    await page.fill('#msg-in', 'second'); await page.press('#msg-in', 'Enter'); await page.waitForFunction(() => document.querySelectorAll('.bubble.mine').length === 2);
    ok(true, lang + ': Enter sends');
    await page.screenshot({ path: '/tmp/claude-0/msg_chat_' + lang + '.png' });
    // not mutual user: no composer
    await page.evaluate(() => { ui.stack = [{ name: 'chat', id: 'omar' }]; render(); });
    ok((await page.$$('#msg-in')).length === 0, lang + ': no composer for non-mutual');
    // profile message button
    await page.evaluate(() => { ui.stack = [{ name: 'user', id: 'sara' }]; render(); });
    await page.click('text=' + (lang === 'ar' ? 'رسالة' : 'Message')); await page.waitForSelector('.bubble');
    ok(true, lang + ': profile Message opens chat');
    // block
    await page.click('[aria-label="' + (lang === 'ar' ? 'خيارات أخرى' : 'More options') + '"]'); await page.waitForSelector('.menu');
    await page.click('.menu .btn >> nth=0'); await page.waitForTimeout(150);
    ok(await page.evaluate(() => iBlocked('sara')), lang + ': blocked');
    ok((await page.$$('#msg-in')).length === 0, lang + ': composer gone after block');
    await page.evaluate(() => { LocalAPI.db.blocks = []; refresh().then(render); }); await page.waitForTimeout(100);
    // delete chat
    await page.evaluate(() => { ui.stack = [{ name: 'chat', id: 'sara' }]; render(); });
    await page.click('[aria-label="' + (lang === 'ar' ? 'خيارات أخرى' : 'More options') + '"]'); await page.waitForSelector('.menu');
    await page.click('.menu .btn >> nth=2'); await page.click('.menu .btn.danger'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => conversations().length) === 0, lang + ': chat deleted for me');
    ok(errs.length === 0, lang + ': no JS errors ' + errs.join(';')); await ctx.close();
  }
  await br.close(); srv.close(); process.exit(fail ? 1 : 0);
})();
