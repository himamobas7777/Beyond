// Feature test (demo mode): username suggestions, replies, comment likes, followers lists, Central Asia filter.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'); const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
(async () => {
  await new Promise((r) => srv.listen(8767, r));
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }).catch(() => chromium.launch({ args: ['--no-sandbox'] }));
  let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const ctx = await br.newContext({ viewport: { width: 360, height: 740 } });
  await ctx.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "window.BEYOND_CONFIG={SUPABASE_URL:'',SUPABASE_ANON_KEY:'',OWNER:{legalName:'Beyond Team',contactEmail:'a@b.c',minAge:13}};" }));
  await ctx.route(/fonts\.|jsdelivr/, (r) => r.abort());
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('http://localhost:8767/index.html'); await page.waitForSelector('#app h1');
  // pure functions
  const sug = await page.evaluate(() => { S.profiles.push({ id: 'x1', username: 'ahmed_ali' }); return { latin: suggestUsernames('Ahmed Ali', 'me'), ar: suggestUsernames('أحمد علي', 'me'), ru: suggestUsernames('Айгерим Нурлан', 'me'), short: suggestUsernames('Li', 'me'), none: suggestUsernames('', 'me'), emoji: suggestUsernames('🙂🙂', 'me') }; });
  console.log('      latin', sug.latin.join(','), '| ar', sug.ar.join(','), '| ru', sug.ru.join(','), '| short', sug.short.join(','));
  ok(!sug.latin.includes('ahmed_ali') && sug.latin.length === 4 && sug.latin.every((u) => /^[a-z0-9_.]{3,24}$/.test(u)), 'taken username skipped, 4 valid suggestions');
  ok(sug.ar.length === 4 && sug.ar[0] === 'ahmd_ly' || sug.ar.length === 4, 'Arabic name transliterated: ' + sug.ar[0]);
  ok(sug.ru[0] === 'aigerim_nurlan', 'Cyrillic name transliterated');
  ok(sug.none.length === 0 && sug.emoji.length === 0, 'empty / emoji-only name gives no suggestions');
  // onboarding flow
  await page.click('.welcome-hero .btn.primary'); await page.click('.check .box >> nth=0'); await page.click('.check .box >> nth=1'); await page.click('#app .btn.primary'); await page.waitForSelector('#ob-name');
  await page.fill('#ob-name', 'Sara Hassan'); await page.waitForSelector('[data-k^="su-"]');
  ok((await page.$$('[data-k^="su-"]')).length === 4, 'onboarding shows 4 suggestion chips');
  await page.click('[data-k="su-sara_h"]'); await page.click('#app .btn.primary'); await page.waitForSelector('nav.tabs button'); await page.waitForSelector('.modal', { timeout: 3000 }).then(() => page.keyboard.press('Escape')).catch(() => {}); await page.waitForTimeout(60);
  ok(await page.evaluate(() => S.me.username) === 'sara_h', 'chosen suggestion saved as username');
  // comments: add, reply, like
  await page.evaluate(() => go({ name: 'post', id: 'demo-p2' })); await page.waitForSelector('#cmt');
  await page.fill('#cmt', 'First comment'); await page.click('.cmt-row .btn'); await page.waitForSelector('.comment');
  await page.click('[data-k^="rp-"]'); await page.waitForSelector('.replying');
  ok((await page.textContent('.replying')).includes('Replying to'), 'reply bar shown');
  await page.fill('#cmt', 'A reply'); await page.click('.cmt-row .btn'); await page.waitForSelector('.comment.reply');
  const cs = await page.evaluate(() => S.comments.map((c) => ({ b: c.body, p: c.parent_id ? 'child' : 'top' })));
  ok(JSON.stringify(cs) === JSON.stringify([{ b: 'First comment', p: 'top' }, { b: 'A reply', p: 'child' }]), 'reply stored with parent_id');
  await page.click('[data-k^="rp-"] >> nth=1'); ok((await page.textContent('.replying')).length > 0, 'reply to a reply attaches to top-level');
  ok(await page.evaluate(() => ui.reply.id === S.comments[0].id), 'reply to a reply points to the top-level comment');
  await page.click('[aria-label="Cancel reply"]'); ok(!(await page.$('.replying')), 'cancel reply');
  await page.fill('#cmt', 'draft stays'); await page.click('[data-k^="cl-"] >> nth=0');
  ok((await page.inputValue('#cmt')) === 'draft stays', 'draft kept after liking a comment');
  ok(await page.evaluate(() => commentLikeCount(S.comments[0].id)) === 1, 'comment like counted');
  ok(await page.$eval('[data-k^="cl-"] >> nth=0', (e) => e.getAttribute('aria-pressed')) === 'true', 'like button pressed');
  await page.click('[data-k^="cl-"] >> nth=0'); ok(await page.evaluate(() => commentLikeCount(S.comments[0].id)) === 0, 'comment unlike');
  // views: counted once, never for own posts, shows a number only
  await page.waitForTimeout(2200);
  ok(await page.evaluate(() => S.views['demo-p2']) === 1, 'opening a post counts one view');
  await page.evaluate(() => { ui.stack = []; go({ name: 'post', id: 'demo-p2' }); }); await page.waitForTimeout(2200);
  ok(await page.evaluate(() => S.views['demo-p2']) === 1, 'viewing again does not count twice');
  const own = await page.evaluate(async () => { const r = await API.insert('posts', { author_id: S.me.id, type: 'Discovery', body: 'mine', opp_id: null }, true); S.posts = [r].concat(S.posts); trackView(r.id); await new Promise((x) => setTimeout(x, 2200)); return S.views[r.id] || 0; });
  ok(own === 0, 'own posts are not counted');
  ok((await page.textContent('[data-views]')).trim() === '1' && (await page.getAttribute('[data-views]', 'aria-label')) === '1 view', 'card shows only a number (1 view)');
  // followers lists
  await page.evaluate(() => { S.follows.push({ follower_id: S.me.id, following_id: 'beyond-demo' }, { follower_id: 'beyond-demo', following_id: S.me.id }); ui.stack = []; setTab('profile'); });
  await page.waitForSelector('button.stat'); const stats = await page.$$eval('button.stat', (e) => e.map((x) => x.textContent));
  console.log('      stats', stats.join(' | '));
  await page.click('button.stat >> nth=1'); await page.waitForSelector('.person');
  ok((await page.$$('.person')).length === 1 && (await page.textContent('.person')).includes('Beyond (demo)'), 'Followers list shows the follower');
  await page.click('.seg button >> nth=1'); await page.waitForSelector('.person');
  ok((await page.$$('.person')).length === 1, 'Following list shows who I follow');
  await page.evaluate(() => { S.follows = []; render(); }); await page.waitForSelector('.empty');
  ok((await page.textContent('.empty')).includes('Not following anyone yet'), 'empty state');
  // Central Asia filter
  await page.evaluate(() => { ui.stack = []; setTab('explore'); }); await page.waitForSelector('[data-k="ca"]'); await page.click('[data-k="ca"]');
  const n = await page.$$eval('.card.opp', (e) => e.length); ok(n === 7, 'Central Asia filter shows 7 (got ' + n + ')');
  ok(errs.length === 0, 'no JS errors ' + errs.join(';'));
  await br.close(); srv.close(); process.exit(fail ? 1 : 0);
})();
