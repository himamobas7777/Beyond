/* screens.js: navigation, actions and every screen. */
const ui = { tab: 'home', stack: [], focus: false, guest: false, wStep: 0, exploreTab: 'opps', feedTab: 'foryou', profTab: 'posts', q: '', cat: null, free: false, arab: false, ca: false, eu: false, reply: null, cdraft: null, consent: { age: false, terms: false }, menu: null, busy: false };
const POST_TYPES = ['Discovery', 'Experience', 'Question', 'Project', 'Milestone', 'Discussion'];
const TYPE_COLOR = { Discovery: '#22D3EE', Experience: '#A78BFA', Question: '#FBBF24', Project: '#4ADE80', Milestone: '#F472B6', Discussion: '#60A5FA' };
const $ = (s) => document.querySelector(s);

/* ---------- navigation ---------- */
function go(route) { ui.stack.push(route); ui.focus = true; ui.menu = null; ui.chatMenu = null; render(); window.scrollTo(0, 0); }
function back() { ui.stack.pop(); ui.focus = true; ui.menu = null; ui.chatMenu = null; render(); window.scrollTo(0, 0); }
function setTab(t) { ui.stack = []; ui.tab = t; ui.focus = true; ui.menu = null; render(); window.scrollTo(0, 0); }
function requireAuth() { if (S.me) return true; go({ name: 'signin' }); return false; }
let toastTimer = null;
function toast(msg) { const el = $('#toast'); el.textContent = tr(msg); el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 3200); }
const errText = (e) => tr((e && e.message) || 'Something went wrong. Please try again.');

/* optimistic update with rollback */
async function act(apply, call, undo) {
  apply(); render();
  try { await call(); } catch (e) { if (undo) undo(); render(); toast(errText(e)); }
}
function toggleRow(table, row) {
  const same = (r) => Object.keys(row).every((k) => r[k] === row[k]);
  const prev = S[table].slice();
  if (S[table].some(same)) act(() => { S[table] = S[table].filter((r) => !same(r)); }, () => API.remove(table, row), () => { S[table] = prev; });
  else act(() => { S[table] = S[table].concat(Object.assign({ created_at: nowIso() }, row)); }, () => API.insert(table, row), () => { S[table] = prev; });
}
const toggleSaveOpp = (id) => { if (requireAuth()) toggleRow('saved_opportunities', { user_id: myId(), opp_id: id }); };
const toggleDoneOpp = (id) => { if (requireAuth()) toggleRow('completed_opportunities', { user_id: myId(), opp_id: id }); };
const toggleLike = (pid) => { if (requireAuth()) toggleRow('post_likes', { post_id: pid, user_id: myId() }); };
const toggleCommentLike = (cid) => { if (requireAuth()) toggleRow('comment_likes', { comment_id: cid, user_id: myId() }); };
const toggleSavePost = (pid) => { if (requireAuth()) toggleRow('post_saves', { post_id: pid, user_id: myId() }); };
const toggleFollow = (id) => { if (requireAuth() && id !== myId()) toggleRow('follows', { follower_id: myId(), following_id: id }); };
async function updateMe(patch) { await API.update('profiles', { id: myId() }, patch); Object.assign(S.me, patch); }
function copyText(text, okMsg) {
  const fallback = () => toast(tr(okMsg) + ' ' + text);
  try { navigator.clipboard.writeText(text).then(() => toast(okMsg), fallback); } catch (e) { fallback(); }
}

/* ---------- small shared pieces ---------- */
const chip = (label, on, fn, color, k) => h('button', { class: 'chip', type: 'button', 'aria-pressed': on ? 'true' : 'false', 'data-k': k || label, style: color ? '--chip:' + color : null, onclick: fn }, (on ? '✓ ' : '') + tr(label));
const pill = (text, color) => h('span', { class: 'pill', style: '--pc:' + color }, text);
const empty = (t, m, btn) => h('div', { class: 'empty' }, h('h3', null, t), h('p', { class: 'muted' }, m), btn || null);
const btn = (label, fn, cls, extra) => h('button', Object.assign({ class: 'btn ' + (cls || ''), type: 'button', onclick: fn }, extra || {}), label);
function backHeader(title, right) { return h('div', { class: 'header' }, h('button', { class: 'back', type: 'button', onclick: back }, (LANG === 'ar' ? '› ' : '‹ ') + t('Back')), h('div', { class: 'title' }, title), right || h('div', { class: 'spacer' })); }
const needsConsentGate = () => !(ui.consent.age && ui.consent.terms);

function oppCard(o) {
  const saved = mySaved().includes(o.id), done = myDone().includes(o.id);
  return h('button', { class: 'card opp', type: 'button', style: '--cat:' + (CAT_COLOR[o.category] || '#22D3EE'), onclick: () => go({ name: 'detail', id: o.id }), 'aria-label': o.title + ', ' + o.org + ', ' + tr(o.category) + (done ? ', ' + t('completed') : saved ? ', ' + t('saved') : '') },
    h('div', { class: 'row tight' }, pill(o.category, CAT_COLOR[o.category] || '#22D3EE'), o.deadline ? pill('Deadline', 'var(--warn)') : null, done ? pill('Done', 'var(--good)') : saved ? pill('Saved', '#A78BFA') : null),
    h('h3', null, o.title), h('div', { class: 'muted small' }, o.org + '  •  ' + tr(o.mode) + '  •  ' + tr(o.cost)),
    h('div', { class: 'muted small' }, o.lastVerified ? t('Source checked {d}', { d: o.lastVerified }) : t('Not checked by Beyond yet')));
}
function miniOpp(o) {
  return h('button', { class: 'mini', type: 'button', onclick: () => go({ name: 'detail', id: o.id }), 'aria-label': t('Open opportunity: {title}', { title: o.title }) }, h('span', { class: 'bar', style: 'background:' + (CAT_COLOR[o.category] || '#22D3EE') }), h('span', null, h('b', null, o.title), h('span', { class: 'muted small', style: 'display:block' }, o.org)));
}
function personRow(u) {
  const f = isFollowing(u.id);
  return h('div', { class: 'person' },
    h('button', { class: 'person-main', type: 'button', onclick: () => go({ name: 'user', id: u.id }), 'aria-label': t('Open profile of {name}', { name: u.display_name || u.username }) }, avatar(u, 48), h('span', null, h('b', null, utext(u.display_name || '\u200E@' + u.username)), h('span', { class: 'muted small', style: 'display:block' }, utext('\u200E@' + u.username + (u.is_demo ? ' • ' + t('Demo') : ''))))),
    u.id === myId() ? null : h('button', { class: 'btn small-btn' + (f ? '' : ' primary'), type: 'button', 'aria-pressed': String(f), onclick: () => toggleFollow(u.id) }, f ? 'Following' : 'Follow'));
}

/* ---------- POST CARD ---------- */
const viewTimers = {};
const viewObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entries) => entries.forEach((en) => {
  const id = en.target.dataset.pid; if (!id) return;
  if (en.isIntersecting) { clearTimeout(viewTimers[id]); viewTimers[id] = setTimeout(() => trackView(id), 1000); } else clearTimeout(viewTimers[id]);
}), { threshold: 0.5 }) : null;
function updateViewCounts() { document.querySelectorAll('[data-views]').forEach((e) => { const n = viewCount(e.dataset.views); e.querySelector('.vn').textContent = compact(n); e.setAttribute('aria-label', tn('{n} view', '{n} views', n)); }); }
function postCard(p, full) {
  const a = getUser(p.author_id) || { display_name: 'Beyonder', username: 'unknown' };
  const liked = iLiked(p.id), saved = iSavedPost(p.id), lc = likeCount(p.id), cc = commentsOf(p.id).length;
  const o = p.opp_id ? getOpp(p.opp_id) : null;
  const action = (ic, label, count, on, fn, k) => h('button', { class: 'act' + (on ? ' on' : ''), type: 'button', 'aria-label': label, 'aria-pressed': on == null ? null : String(!!on), 'data-k': k, onclick: fn }, icon(ic, 22, on), count == null ? null : h('span', null, compact(count)));
  const menuOpen = ui.menu && ui.menu.id === p.id;
  const card = h('article', { class: 'post', 'data-pid': p.id },
    h('div', { class: 'post-head' },
      h('button', { class: 'person-main', type: 'button', onclick: () => go({ name: 'user', id: a.id }), 'aria-label': t('Open profile of {name}', { name: a.display_name || a.username }) }, avatar(a, 40), h('span', null, h('b', null, utext(a.display_name || '\u200E@' + a.username)), h('span', { class: 'muted small', style: 'display:block' }, utext('\u200E@' + a.username + ' • ' + ago(p.created_at))))),
      pill(p.type, TYPE_COLOR[p.type] || '#22D3EE'), a.is_demo ? pill('Demo', 'var(--warn)') : null),
    h(full ? 'div' : 'button', full ? { class: 'post-body' } : { class: 'post-body as-btn', type: 'button', onclick: () => go({ name: 'post', id: p.id }), 'aria-label': 'Open post and comments' }, utext(p.body)),
    o ? miniOpp(o) : null,
    h('div', { class: 'post-actions' },
      action('heart', liked ? 'Unlike' : 'Like', lc, liked, () => toggleLike(p.id), 'like-' + p.id),
      action('comment', 'Comments', cc, null, () => go({ name: 'post', id: p.id }), 'cm-' + p.id),
      action('bookmark', saved ? 'Remove saved post' : 'Save post', null, saved, () => toggleSavePost(p.id), 'sv-' + p.id),
      action('more', 'More options', null, null, () => { ui.menu = menuOpen ? null : { id: p.id, step: 0 }; render(); }, 'mo-' + p.id),
      h('span', { class: 'views', 'data-views': p.id, 'aria-label': tn('{n} view', '{n} views', viewCount(p.id)) }, icon('eye', 18), h('span', { class: 'vn' }, compact(viewCount(p.id))))),
    menuOpen ? h('div', { class: 'menu', role: 'group', 'aria-label': 'Post options' },
      btn('Copy text', () => { ui.menu = null; copyText(p.body, 'Copied'); render(); }),
      ui.menu.step === 0 ? btn('Report this post', () => { ui.menu.step = 1; render(); }) : btn('Confirm report', async () => {
        if (!requireAuth()) return; ui.menu = null; render();
        try { await API.insert('reports', { post_id: p.id, reporter_id: myId(), reason: 'Reported from feed' }); toast('Thanks. We will review it.'); } catch (e) { toast(errText(e)); }
      }, 'danger'),
      btn('Hide this post', () => { hidden.add(p.id); try { localStorage.setItem('beyond:hidden', JSON.stringify([...hidden])); } catch (e) {} ui.menu = null; render(); toast('Hidden on this device.'); })) : null);
  if (viewObserver) viewObserver.observe(card);
  return card;
}

/* ---------- NOTIFICATIONS ---------- */
function bellButton() {
  const n = unreadCount();
  return h('button', { class: 'bell plain', type: 'button', 'aria-label': t('Notifications, {n} unread', { n }), onclick: () => { if (requireAuth()) go({ name: 'notifications' }); } }, icon('bell', 24), h('span', { class: 'badge', hidden: n === 0 }, n > 9 ? '9+' : String(n)));
}
function updateBell() {
  const n = unreadCount();
  document.querySelectorAll('.bell').forEach((b) => { b.setAttribute('aria-label', t('Notifications, {n} unread', { n })); const g = b.querySelector('.badge'); if (g) { g.hidden = n === 0; g.textContent = n > 9 ? '9+' : String(n); } });
}
async function pollNotifications() {
  if (!LIVE || !S.me || document.visibilityState !== 'visible') return;
  try { S.notifications = await API.loadNotifications(); updateBell(); if (ui.stack.length && ui.stack[ui.stack.length - 1].name === 'notifications') render(); } catch (e) { /* try again next time */ }
}
function notificationsView() {
  const markRead = (n) => { if (n.read_at) return; n.read_at = nowIso(); API.update('notifications', { id: n.id }, { read_at: n.read_at }).catch(() => {}); };
  const text = (n, a) => t(n.type === 'like' ? (n.detail === 'comment' ? '{name} liked your comment' : '{name} liked your post') : n.type === 'comment' ? (n.detail === 'reply' ? '{name} replied to your comment' : '{name} commented on your post') : '{name} started following you', { name: (a && (a.display_name || '\u200E@' + a.username)) || t('Someone') });
  const row = (n) => {
    const a = getUser(n.actor_id);
    return h('button', { class: 'notif' + (n.read_at ? '' : ' unread'), type: 'button', onclick: () => { markRead(n); updateBell(); if (n.type === 'follow') go({ name: 'user', id: n.actor_id }); else go({ name: 'post', id: n.post_id }); } },
      avatar(a, 40), h('span', { class: 'ntext' }, h('span', null, utext(text(n, a))), h('span', { class: 'muted small', style: 'display:block' }, ago(n.created_at))), n.read_at ? null : h('span', { class: 'dot', 'aria-hidden': 'true' }));
  };
  const list = S.notifications;
  const markAll = btn('Mark all as read', async () => { try { await API.markAllRead(); S.notifications.forEach((n) => { if (!n.read_at) n.read_at = nowIso(); }); updateBell(); render(); } catch (e) { toast(errText(e)); } }, 'sec');
  return h('div', null, backHeader('Notifications'), LIVE ? pushCard(true) : null,
    list.length ? [unreadCount() ? markAll : null, h('div', null, list.map(row))] : empty('No notifications yet', 'When someone likes, comments on or follows you, it shows up here.'));
}


/* ---------- PRIVATE MESSAGES (only between people who follow each other) ---------- */
function msgButton() {
  const n = unreadMessages();
  return h('button', { class: 'bell msgbtn plain', type: 'button', 'aria-label': t('Messages, {n} unread', { n }), onclick: () => { if (requireAuth()) go({ name: 'inbox' }); } }, icon('mail', 24), h('span', { class: 'badge', hidden: n === 0 }, n > 9 ? '9+' : String(n)));
}
function updateMsgBadge() {
  const n = unreadMessages();
  document.querySelectorAll('.msgbtn').forEach((b) => { b.setAttribute('aria-label', t('Messages, {n} unread', { n })); const g = b.querySelector('.badge'); if (g) { g.hidden = n === 0; g.textContent = n > 9 ? '9+' : String(n); } });
}
const topRoute = () => (ui.stack.length ? ui.stack[ui.stack.length - 1] : null);
async function pollMessages() {
  if (!S.me || document.visibilityState !== 'visible') return;
  const r = topRoute(); const open = r && (r.name === 'chat' || r.name === 'inbox');
  try {
    const list = await API.loadMessages();
    const changed = list.length !== S.messages.length || list.some((m, i) => !S.messages[i] || m.id !== S.messages[i].id || (m.read_at || '') !== (S.messages[i].read_at || ''));
    S.messages = list; updateMsgBadge();
    if (r && r.name === 'chat' && unreadFrom(r.id)) markChatRead(r.id);
    if (open && changed) { const box = document.getElementById('msg-in'); const had = box && document.activeElement === box; render(); if (had) { const b2 = document.getElementById('msg-in'); if (b2) b2.focus(); } }
  } catch (e) { /* try again next time */ }
}
async function markChatRead(id) {
  S.messages.forEach((m) => { if (m.sender_id === id && m.recipient_id === myId() && !m.read_at) m.read_at = nowIso(); });
  updateMsgBadge();
  try { await API.markConversationRead(id); } catch (e) { /* will be marked again on the next open */ }
}
function inboxView() {
  const list = conversations().filter((c) => getUser(c.other));
  const row = (c) => {
    const u = getUser(c.other), mine = c.last.sender_id === myId();
    return h('button', { class: 'notif' + (c.unread ? ' unread' : ''), type: 'button', 'data-k': 'ib-' + c.other, onclick: () => go({ name: 'chat', id: c.other }) },
      avatar(u, 48),
      h('span', { class: 'ntext' }, h('b', null, utext(u.display_name || '‎@' + u.username)), h('span', { class: 'muted small', dir: 'auto', style: 'display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis' }, utext((mine ? t('You') + ': ' : '') + c.last.body))),
      h('span', { class: 'muted small' }, utext(ago(c.last.created_at))), c.unread ? h('span', { class: 'dot', 'aria-hidden': 'true' }) : null);
  };
  const friends = S.follows.filter((f) => f.follower_id === myId() && isMutual(f.following_id)).map((f) => getUser(f.following_id)).filter((u) => u && !conversations().some((c) => c.other === u.id));
  return h('div', null, backHeader('Messages'),
    h('p', { class: 'muted small' }, 'You can message people who follow you back.'),
    list.length ? h('div', null, list.map(row)) : empty('No messages yet', 'Follow someone and ask them to follow you back. Then you can chat here.'),
    friends.length ? [h('h2', null, 'Start a chat'), friends.map((u) => h('div', { class: 'person' }, h('button', { class: 'person-main', type: 'button', onclick: () => go({ name: 'chat', id: u.id }), 'aria-label': t('Message {name}', { name: u.display_name || u.username }) }, avatar(u, 48), h('span', null, h('b', null, utext(u.display_name || '‎@' + u.username)), h('span', { class: 'muted small', style: 'display:block' }, utext('‎@' + u.username)))), h('button', { class: 'btn small-btn primary', type: 'button', onclick: () => go({ name: 'chat', id: u.id }) }, 'Message')))] : null);
}
function chatView(r) {
  const u = getUser(r.id);
  if (!u || u.id === myId()) return h('div', null, backHeader('Messages'), empty('Profile not found', 'It may have been removed.'));
  if (unreadFrom(u.id)) markChatRead(u.id);
  const msgs = chatWith(u.id), blocked = iBlocked(u.id), ok = isMutual(u.id) && !blocked;
  ui.mdraft = ui.mdraft || {};
  const nm = u.display_name || '‎@' + u.username;
  const header = h('div', { class: 'header' }, h('button', { class: 'back', type: 'button', onclick: back }, (LANG === 'ar' ? '› ' : '‹ ') + t('Back')),
    h('button', { class: 'plain chat-title', type: 'button', onclick: () => go({ name: 'user', id: u.id }), 'aria-label': t('Open profile of {name}', { name: u.display_name || u.username }) }, avatar(u, 30), h('span', null, utext(nm))),
    h('button', { class: 'back', style: 'text-align:end', type: 'button', 'aria-label': 'More options', onclick: () => { ui.chatMenu = ui.chatMenu ? null : { step: 0 }; render(); } }, icon('more', 24)));
  const menu = ui.chatMenu ? h('div', { class: 'menu', role: 'group', 'aria-label': 'Chat options' },
    btn(blocked ? 'Unblock this person' : 'Block this person', async () => {
      ui.chatMenu = null;
      try { if (blocked) { S.blocks = S.blocks.filter((b) => b.blocked_id !== u.id); render(); await API.remove('blocks', { blocker_id: myId(), blocked_id: u.id }); toast('Unblocked.'); } else { S.blocks = S.blocks.concat({ blocker_id: myId(), blocked_id: u.id }); render(); await API.insert('blocks', { blocker_id: myId(), blocked_id: u.id }); toast('Blocked. They can no longer message you.'); } } catch (e) { await refresh(); render(); toast(errText(e)); }
    }),
    ui.chatMenu.step === 0 ? btn('Report this chat', () => { ui.chatMenu.step = 1; render(); }) : (ui.chatMenu.step === 2 ? null : btn('Confirm report', async () => {
      ui.chatMenu = null; render();
      try { await API.reportConversation(u.id, 'Reported from chat'); toast('Thanks. We will review it. The last 10 messages are sent to us.'); } catch (e) { toast(errText(e)); }
    }, 'danger')),
    ui.chatMenu.step === 0 ? btn('Delete this chat for me', () => { ui.chatMenu.step = 2; render(); }) : (ui.chatMenu.step === 2 ? btn('Confirm delete', async () => {
      ui.chatMenu = null;
      try { await API.hideConversation(u.id); S.messages = S.messages.filter((m) => m.sender_id !== u.id && m.recipient_id !== u.id); ui.stack.pop(); render(); toast('Chat deleted for you.'); } catch (e) { render(); toast(errText(e)); }
    }, 'danger') : null)) : null;
  const bubble = (m) => { const mine = m.sender_id === myId(); return h('div', { class: 'bubble ' + (mine ? 'mine' : 'theirs') }, h('div', { dir: 'auto' }, utext(m.body)), h('div', { class: 'bmeta' }, utext(ago(m.created_at) + (mine && m.read_at ? ' · ' + t('Seen') : '')))); };
  const input = h('textarea', { id: 'msg-in', dir: 'auto', rows: '1', maxlength: '1000', placeholder: 'Write a message', 'aria-label': 'Write a message', oninput: (e) => { ui.mdraft[u.id] = e.target.value; e.target.style.height = 'auto'; e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px'; } });
  input.value = ui.mdraft[u.id] || '';
  const err = h('p', { class: 'err', 'aria-live': 'polite' });
  const sendBtn = h('button', { class: 'btn primary send-btn', type: 'button', 'aria-label': 'Send message', onclick: async () => {
    const body = input.value.trim(); if (!body) return; sendBtn.disabled = true; err.textContent = '';
    try { const m = await API.sendMessage(u.id, body); S.messages = S.messages.concat(m); ui.mdraft[u.id] = ''; render(); } catch (e) { sendBtn.disabled = false; err.textContent = errText(e); }
  } }, icon('send', 22));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendBtn.click(); } });
  const composer = ok ? h('div', { class: 'composer' }, input, sendBtn)
    : h('div', { class: 'composer note' }, h('p', { class: 'muted small' }, blocked ? 'You blocked this person. Unblock them from the menu to chat again.' : 'You can only message people who follow you back.'));
  setTimeout(() => { window.scrollTo(0, document.body.scrollHeight); }, 0);
  return h('div', { class: 'chat' }, header, menu, h('div', { class: 'bubbles', 'aria-live': 'polite' }, msgs.length ? msgs.map(bubble) : h('p', { class: 'muted center small' }, ok ? 'Say hi. Be kind and keep it safe.' : '')), err, composer);
}


/* ---------- GUIDE: a short tour for new people, and a "What's new" popup after updates ---------- */
const TOUR = [
  ['home', 'Welcome to Beyond', 'Find real opportunities: courses, competitions, scholarships, volunteering and universities.'],
  ['explore', 'Explore', 'Search and filter by category, region or cost. Tap Save on what you like and mark it done when you finish.'],
  ['feed', 'Share and learn', 'Post a discovery, project or question in the Feed. Like, comment and reply.'],
  ['mail', 'Follow people', 'Follow people you like. When you follow each other, you can send private messages.'],
  ['profile', 'Your profile', 'Add a photo, a bio and your current quest. Likes, comments and new followers show up under the bell.']
];
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
function openSheet(build) {
  closeSheet();
  const opener = document.activeElement;
  const bg = h('div', { class: 'modal-bg', id: 'sheet' });
  const card = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sheet-title' });
  bg.append(card);
  const close = () => { document.removeEventListener('keydown', onKey); bg.remove(); document.body.classList.remove('modal-open'); if (opener && opener.focus && document.contains(opener)) opener.focus(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  document.body.append(bg); document.body.classList.add('modal-open');
  build(card, close);
  const first = card.querySelector('[data-first]') || card.querySelector('button'); if (first) first.focus();
  return close;
}
function closeSheet() { const e = document.getElementById('sheet'); if (e) { e.remove(); document.body.classList.remove('modal-open'); } }
function showTour() {
  let i = 0;
  openSheet((card, close) => {
    const draw = () => {
      const [ic, title, body] = TOUR[i], last = i === TOUR.length - 1;
      card.replaceChildren(
        h('div', { class: 'tour-ic' }, icon(ic, 36)),
        h('h2', { id: 'sheet-title', style: 'margin:8px 0 4px;text-align:center' }, title),
        h('p', { style: 'text-align:center;margin:0 0 12px' }, body),
        h('div', { class: 'dots', 'aria-hidden': 'true' }, TOUR.map((_, k) => h('span', { class: k === i ? 'on' : '' }))),
        h('p', { class: 'muted small', style: 'text-align:center;margin:0' }, t('Step {a} of {b}', { a: i + 1, b: TOUR.length })),
        h('div', { class: 'row', style: 'gap:8px;margin-top:8px' },
          i > 0 ? h('button', { class: 'btn sec', type: 'button', onclick: () => { i--; draw(); } }, 'Back') : h('button', { class: 'btn sec', type: 'button', onclick: finish }, 'Skip'),
          h('button', { class: 'btn primary', type: 'button', 'data-first': '', onclick: () => { if (last) finish(); else { i++; draw(); } } }, last ? 'Done' : 'Next')));
      const f = card.querySelector('[data-first]'); if (f) f.focus();
    };
    const finish = () => { if (S.me) lsSet('beyond:tour:' + S.me.id, 'done'); lsSet('beyond:seenVersion', WHATS_NEW[0].v); close(); };
    draw();
  });
}
function showWhatsNew(sinceV) {
  const list = WHATS_NEW.filter((r) => !sinceV || r.v > sinceV).slice(0, 2);
  const items = (list.length ? list : WHATS_NEW.slice(0, 1)).flatMap((r) => r.items).slice(0, 8);
  openSheet((card, close) => {
    card.replaceChildren(
      h('div', { class: 'tour-ic' }, icon('bell', 32)),
      h('h2', { id: 'sheet-title', style: 'margin:8px 0 8px;text-align:center' }, 'What’s new in Beyond'),
      h('ul', { class: 'newlist' }, items.map((x) => h('li', null, x))),
      h('button', { class: 'btn primary', type: 'button', 'data-first': '', onclick: () => { lsSet('beyond:seenVersion', WHATS_NEW[0].v); close(); } }, 'Got it'));
  });
}
function maybeShowGuide() {
  if (ui.guideChecked || !S.ready || S.error || !S.me || !S.me.onboarded || document.getElementById('sheet')) return;
  ui.guideChecked = true;
  const tourKey = 'beyond:tour:' + S.me.id, seen = lsGet('beyond:seenVersion'), cur = WHATS_NEW[0].v;
  if (lsGet(tourKey) === 'pending') { showTour(); return; }
  if (seen !== cur) { if (seen) showWhatsNew(seen); else lsSet('beyond:seenVersion', cur); }
}


/* ---------- ALERTS (web push): notifications that show up even when Beyond is closed ---------- */
const pushSupported = () => LIVE && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const b64ToBytes = (b64) => { const pad = '='.repeat((4 - (b64.length % 4)) % 4), raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(raw, (c) => c.charCodeAt(0)); };
const bytesToB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function pushState() {
  if (!pushSupported()) return isIOS() && !isStandalone() ? 'ios-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  try { const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription(); return sub && Notification.permission === 'granted' ? 'on' : 'off'; } catch (e) { return 'off'; }
}
async function saveSub(sub) { const j = sub.toJSON(); await API.savePushSubscription(j.endpoint, j.keys.p256dh, j.keys.auth, LANG); }
async function enablePush() {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error(t('Alerts are blocked in your browser settings. Allow notifications for this site to turn them on.'));
  const res = await fetch(CFG.SUPABASE_URL + '/functions/v1/push'); if (!res.ok) throw new Error(t('Could not turn on alerts.'));
  const { publicKey } = await res.json();
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub && bytesToB64(sub.options.applicationServerKey) !== publicKey) { await sub.unsubscribe(); sub = null; }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
  await saveSub(sub);
}
async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription();
  if (sub) { const ep = sub.endpoint; await sub.unsubscribe(); try { await API.remove('push_subscriptions', { endpoint: ep }); } catch (e) { /* the server removes dead addresses by itself */ } }
}
async function refreshPushSub() { // keeps the saved language and account up to date; silent
  try { if (!S.me || (await pushState()) !== 'on') return; const reg = await navigator.serviceWorker.getRegistration(); await saveSub(await reg.pushManager.getSubscription()); } catch (e) {}
}
function pushCard(compact) {
  const box = h('div', { class: 'card', style: 'margin:8px 0' });
  const draw = async () => {
    const st = await pushState(); if (st === 'unsupported' && compact) { box.remove(); return; }
    if (st === 'on' && compact) { box.remove(); return; }
    const msg = h('p', { class: 'err', 'aria-live': 'polite', style: 'margin:6px 0 0' });
    const text = { on: 'Alerts are on for this device.', off: 'Get alerts even when Beyond is closed.', denied: 'Alerts are blocked in your browser settings. Allow notifications for this site to turn them on.', 'ios-install': 'On iPhone: tap Share, then Add to Home Screen, open Beyond from your Home Screen, and come back here.', unsupported: 'Your browser does not support alerts.' }[st];
    const act = st === 'off' ? btn('Turn on alerts', async () => { try { await enablePush(); toast('Alerts are turned on.'); draw(); } catch (e) { msg.textContent = errText(e); } }, 'primary') : st === 'on' ? [btn('Send a test alert', async () => { try { const reg = await navigator.serviceWorker.getRegistration(); await saveSub(await reg.pushManager.getSubscription()); const n = await API.sendTestPush(); msg.className = 'muted small'; msg.textContent = t(n ? 'Test sent. If nothing appears in a few seconds, check the notification settings of your browser on your phone.' : 'This device was not saved. Turn alerts off and on again.'); } catch (e) { msg.className = 'err'; msg.textContent = errText(e); } }, 'primary'), btn('Turn off alerts', async () => { try { await disablePush(); toast('Alerts are turned off.'); draw(); } catch (e) { msg.textContent = errText(e); } }, 'sec')] : null;
    box.replaceChildren(...[compact ? h('b', null, 'Alerts on this device') : null, h('p', { class: 'muted', style: 'margin:4px 0 0' }, text), st === 'on' || st === 'off' ? h('p', { class: 'muted small', style: 'margin:4px 0 0' }, 'Alerts never show message text, only who wrote.') : null].concat(act || [], msg).filter(Boolean));
  };
  draw(); return box;
}

function langPicker() {
  return h('div', { class: 'lang-pick' }, h('select', { id: 'lang-sel', 'aria-label': 'Language', onchange: (e) => setLang(e.target.value, true) }, LANGS.map(([c, n]) => h('option', { value: c, selected: c === LANG }, utext(n)))));
}
/* ---------- WELCOME / SIGN-IN / ONBOARDING ---------- */
function consentBox(key, children) {
  return h('button', { class: 'check', type: 'button', role: 'checkbox', 'aria-checked': String(ui.consent[key]), onclick: (e) => { if (e.target.closest('.linklike')) return; ui.consent[key] = !ui.consent[key]; render(); } }, h('span', { class: 'box' }, ui.consent[key] ? '✓' : ''), h('span', null, children));
}
const lk = (label, doc) => h('span', { class: 'linklike', role: 'link', tabindex: '0', onclick: (e) => { e.stopPropagation(); go({ name: 'legal', doc }); }, onkeydown: (e) => { if (e.key === 'Enter') { e.stopPropagation(); go({ name: 'legal', doc }); } } }, label);
function consentBlock() {
  const blocked = needsConsentGate();
  const main = LIVE
    ? btn('Continue with Google', async () => {
      try { localStorage.setItem('beyond:consent', JSON.stringify({ at: nowIso(), minAge: OWNER.minAge })); } catch (e) {}
      try { await API.signInGoogle(); } catch (e) { toast(errText(e)); }
    }, 'primary', { disabled: blocked })
    : btn('Let’s go beyond', async () => { await LocalAPI.createLocalUser(); await refresh(); ui.stack = []; ui.focus = true; render(); }, 'primary', { disabled: blocked });
  return h('div', null,
    h('h2', null, 'Before you start'),
    consentBox('age', t('I am at least {n} years old.', { n: OWNER.minAge || 13 })),
    consentBox('terms', tpl('I have read the {privacy} and the {terms}.', { privacy: lk(t('Privacy Policy'), 'privacy'), terms: lk(t('Terms of Service'), 'terms') })),
    main,
    LIVE ? h('p', { class: 'muted small', style: 'margin-top:10px' }, 'Beyond receives your name and email from Google to create your account. Your email is never shown to other people. We never post for you.') : h('p', { class: 'muted small', style: 'margin-top:10px' }, 'This preview keeps everything on this device. Google sign-in is switched on when the site is connected to Supabase.'),
    blocked ? h('p', { class: 'muted small' }, 'Tick both boxes to continue.') : null,
    LIVE && ui.stack.length === 0 ? btn('Browse opportunities first', () => { ui.guest = true; ui.tab = 'explore'; ui.focus = true; render(); }) : null);
}
function welcome() {
  if (ui.wStep === 0) return h('div', { class: 'welcome-hero' },
    langPicker(), h('div', { class: 'brand' }, 'BEYOND'), h('h1', { tabindex: '-1' }, 'There’s more to your story than a grade.'),
    h('p', { class: 'muted' }, 'Find things worth doing, meet people building their own path, and keep track of what you try. Beyond is free to use.'),
    btn('What’s your Beyond?', () => { ui.wStep = 1; ui.focus = true; render(); }, 'primary', { style: 'margin-top:24px' }));
  return h('div', null, h('div', { class: 'brand' }, 'BEYOND'), h('h1', { tabindex: '-1', style: 'margin-top:8px' }, 'Join the Beyonders'), h('p', { class: 'muted' }, 'Create your profile, post what you’re working on, and follow people who inspire you.'), consentBlock());
}
function onboarding() {
  const d = { name: (S.me.display_name || '').trim(), interests: (S.me.interests || []).slice(), username: '', picked: false };
  const chips = h('div', { class: 'row' });
  const sugBox = h('div', { 'aria-live': 'polite' });
  const drawSug = () => {
    const list = suggestUsernames(d.name, S.me.id);
    if (!list.length) { d.username = ''; sugBox.replaceChildren(); return; }
    if (!d.picked || !list.includes(d.username)) { d.username = list[0]; d.picked = false; }
    sugBox.replaceChildren(h('p', { class: 'muted small', style: 'margin:8px 0 6px' }, utext(t('Your username will be @{u}. You can change it later in Edit profile.', { u: d.username }))),
      h('div', { class: 'row' }, list.map((u) => chip('\u200E@' + u, d.username === u, () => { d.username = u; d.picked = true; drawSug(); }, null, 'su-' + u))));
  };
  const draw = () => chips.replaceChildren(...INTERESTS.map((i) => chip(i, d.interests.includes(i), () => { d.interests = d.interests.includes(i) ? d.interests.filter((x) => x !== i) : d.interests.concat(i); draw(); })));
  draw(); drawSug();
  const err = h('p', { class: 'err', 'aria-live': 'polite' });
  return h('div', null, h('h1', { tabindex: '-1' }, 'Tell us a little'),
    h('p', { class: 'muted' }, 'Both are optional. Other Beyonders can see your name and interests, so share only what you are comfortable with.'),
    h('h2', null, h('label', { for: 'ob-name' }, 'What should we call you?')),
    h('input', { type: 'text', id: 'ob-name', maxlength: '40', placeholder: 'A nickname is fine', value: d.name, oninput: (e) => { d.name = e.target.value; drawSug(); } }), sugBox,
    h('h2', null, 'What are you curious about?'), chips,
    btn('Finish', async () => {
      try {
        const patch = { display_name: d.name.trim(), interests: d.interests, onboarded: true };
        if (!S.me.consent_at) { let c = null; try { c = JSON.parse(localStorage.getItem('beyond:consent')); } catch (e) {} if (c) { patch.consent_at = c.at; patch.min_age = c.minAge; } }
        const keepDefault = /^beyonder(_[a-z0-9]{6})?$/.test(S.me.username || '');
        if (d.username && d.name.trim() && keepDefault) patch.username = d.username;
        try { await updateMe(patch); } catch (e) { if (patch.username && e && e.code === '23505') { delete patch.username; await updateMe(patch); } else throw e; }
        lsSet('beyond:tour:' + myId(), 'pending'); ui.guideChecked = false;
        ui.tab = 'home'; ui.focus = true; render(); setTimeout(maybeShowGuide, 400);
      } catch (e) { err.textContent = errText(e); }
    }, 'primary', { style: 'margin-top:20px' }), err);
}

/* ---------- HOME ---------- */
function home() {
  const me = S.me, name = me ? (me.display_name || 'Beyonder') : 'Beyonder';
  const interests = me ? me.interests || [] : [];
  const recs = recommend(interests, myDone(), 4);
  const pending = mySaved().filter((id) => !myDone().includes(id)).map(getOpp).filter(Boolean).slice(0, 3);
  const latest = S.posts.filter((p) => !hidden.has(p.id)).slice(0, 2);
  return h('div', null, h('div', { class: 'brand-row' }, h('div', { class: 'brand' }, 'BEYOND'), me ? h('div', { class: 'row tight', style: 'gap:0' }, msgButton(), LIVE ? bellButton() : null) : null), h('h1', { tabindex: '-1', style: 'margin-top:8px' }, t('Hey {name}.', { name })), h('p', { class: 'muted' }, 'What’s your Beyond today?'),
    me ? h('button', { class: 'card quest', type: 'button', onclick: () => setTab('profile'), 'aria-label': 'Your current quest. Open profile to change it.' }, h('div', { class: 'label' }, 'Current quest'), h('div', { class: 'quest-text' }, me.quest ? utext(me.quest) : 'What are you trying to explore right now? Set your quest.'))
      : h('div', { class: 'card quest' }, h('div', { class: 'label' }, 'You are browsing as a guest'), h('p', { style: 'margin:6px 0 0' }, 'Sign in to save things, post and follow people.'), btn('Sign in', () => go({ name: 'signin' }), 'primary')),
    pathHomeCard(),
    h('h2', null, interests.length ? 'Picked for your interests' : 'Your next move'), interests.length ? null : h('p', { class: 'muted' }, 'Add interests in your profile to get better picks.'),
    recs.map(oppCard),
    pending.length ? [h('h2', null, 'Saved, still waiting for you'), pending.map(oppCard)] : null,
    latest.length ? [h('h2', null, 'From the feed'), latest.map((p) => postCard(p)), btn('Open the feed', () => setTab('feed'))] : null,
    btn('Explore everything', () => setTab('explore')));
}

/* ---------- EXPLORE (opportunities, people, posts) ---------- */
function explore() {
  const results = h('div', { 'aria-live': 'polite' }), count = h('p', { class: 'muted' }), filtersRow = h('div');
  const needle = () => ui.q.trim().toLowerCase();
  function draw() {
    const n = needle(); let items = [];
    if (ui.exploreTab === 'opps') {
      const res = S.opps.filter((o) => o.published !== false && (!ui.cat || o.category === ui.cat) && (!ui.free || o.cost === 'Free' || o.cost === 'Funded') && (!ui.arab || (o.tags || []).includes('arab')) && (!ui.ca || (o.tags || []).includes('centralasia')) && (!ui.eu || (o.tags || []).includes('europe')) && (!n || [o.title, o.org, o.descr, o.category, tr(o.category), o.grade, o.eligibility].concat(o.tags || []).join(' ').toLowerCase().includes(n)));
      items = res.length ? res.map(oppCard) : [empty('No match yet', 'Try a different word or clear a filter.')]; count.textContent = tn('{n} opportunity', '{n} opportunities', res.length);
      filtersRow.replaceChildren(h('div', { class: 'row' }, CATEGORIES.map((c) => chip(c, ui.cat === c, () => { ui.cat = ui.cat === c ? null : c; draw(); }, CAT_COLOR[c], 'cat-' + c))), h('div', { class: 'row' }, chip('Free or funded', ui.free, () => { ui.free = !ui.free; draw(); }, null, 'free'), chip('Arab region', ui.arab, () => { ui.arab = !ui.arab; draw(); }, null, 'arab'), chip('Central Asia', ui.ca, () => { ui.ca = !ui.ca; draw(); }, null, 'ca'), chip('Europe', ui.eu, () => { ui.eu = !ui.eu; draw(); }, null, 'eu')));
    } else if (ui.exploreTab === 'people') {
      const res = S.profiles.filter((u) => u.id !== myId() && (!n || [u.display_name, u.username, u.bio].concat(u.interests || []).join(' ').toLowerCase().includes(n)));
      items = res.length ? res.map(personRow) : [empty('No people found', S.me || !LIVE ? 'As more Beyonders join, you will find them here.' : 'Sign in to find people.')]; count.textContent = t('{n} people', { n: res.length }); filtersRow.replaceChildren();
    } else {
      const res = S.posts.filter((p) => !hidden.has(p.id) && (!n || p.body.toLowerCase().includes(n)));
      items = res.length ? res.map((p) => postCard(p)) : [empty('No posts found', S.me || !LIVE ? 'Try another word.' : 'Sign in to see posts.')]; count.textContent = tn('{n} post', '{n} posts', res.length); filtersRow.replaceChildren();
    }
    results.replaceChildren(...items);
    const k = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.k; if (k) { const a = document.querySelector('[data-k="' + k.replace(/"/g, '') + '"]'); if (a) a.focus(); }
  }
  const seg = h('div', { class: 'seg', role: 'tablist' });
  const drawSeg = () => seg.replaceChildren(...[['opps', 'Opportunities'], ['people', 'People'], ['posts', 'Posts']].map(([k, l]) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(ui.exploreTab === k), onclick: () => { ui.exploreTab = k; drawSeg(); draw(); } }, l)));
  drawSeg();
  const root = h('div', null, h('h1', { tabindex: '-1' }, 'Explore'),
    h('input', { type: 'text', id: 'search', placeholder: 'Search Beyond', 'aria-label': 'Search Beyond', value: ui.q, oninput: (e) => { ui.q = e.target.value; draw(); } }),
    h('div', { style: 'height:12px' }), seg, filtersRow, count, results);
  draw(); return root;
}

/* ---------- OPPORTUNITY DETAIL ---------- */
function detail(id) {
  const o = getOpp(id); if (!o) return h('div', null, backHeader('Opportunity'), h('p', null, 'This opportunity could not be found.'));
  const kv = (k, v) => h('div', { class: 'kv' }, h('span', null, k), h('span', null, tr(v || NS)));
  const saved = mySaved().includes(id), done = myDone().includes(id), about = S.posts.filter((p) => p.opp_id === id && !hidden.has(p.id));
  return h('div', null, backHeader('Opportunity'),
    h('div', { class: 'row' }, pill(o.category, CAT_COLOR[o.category] || '#22D3EE'), o.featured ? pill('Featured', 'var(--accent)') : null),
    h('h1', { tabindex: '-1' }, o.title), h('p', { class: 'muted' }, o.org),
    o.url && safeUrl(o.url) ? h('a', { class: 'btn primary', href: o.url, target: '_blank', rel: 'noopener noreferrer' }, 'Visit official website ↗') : null,
    h('h2', null, 'About'), h('p', null, o.descr),
    h('h2', null, 'Details'), kv('Mode', tr(o.mode)), kv('Cost', tr(o.cost)), kv('Grade / age', tr(o.grade)), kv('Eligibility', tr(o.eligibility)), kv('Deadline', o.deadline),
    h('h2', null, 'Source'), h('p', null, t('Organization: {org}', { org: o.org })),
    o.url && safeUrl(o.url) ? h('p', { class: 'muted', style: 'overflow-wrap:anywhere' }, t('Official page: {url}', { url: o.url })) : h('p', { class: 'muted' }, 'No official link has been added for this entry yet.'),
    h('p', { class: 'muted' }, o.lastVerified ? t('Beyond read this official page on {d}. Details may have changed since.', { d: o.lastVerified }) : t('Not checked by Beyond yet.')),
    h('p', { class: 'muted small' }, 'The summary above is written by Beyond from the official page. “Not stated” means the page did not say. Always confirm on the official page before you apply. Beyond does not guarantee acceptance, scholarships, admission or any other outcome.'),
    h('button', { class: 'btn', type: 'button', 'data-k': 'save', 'aria-pressed': String(saved), onclick: () => toggleSaveOpp(id) }, saved ? 'Saved (tap to remove)' : 'Save for later'),
    h('button', { class: 'btn', type: 'button', 'data-k': 'done', 'aria-pressed': String(done), onclick: () => toggleDoneOpp(id) }, done ? 'Marked as done (tap to undo)' : 'I did this'),
    btn('Post about this', () => { if (requireAuth()) go({ name: 'compose', opp: id }); }),
    about.length ? [h('h2', null, 'From Beyonders'), about.map((p) => postCard(p))] : null);
}

/* ---------- FEED ---------- */
function feedRank(list) {
  const want = ((S.me && S.me.interests) || []).map((i) => i.toLowerCase());
  const score = (p) => { const o = p.opp_id ? getOpp(p.opp_id) : null; const hrs = (Date.now() - new Date(p.created_at).getTime()) / 36e5; return (isFollowing(p.author_id) ? 2 : 0) + (o ? (o.tags || []).filter((t) => want.includes(t)).length * 2 : 0) + 3 / (1 + hrs / 24); };
  return list.slice().sort((a, b) => score(b) - score(a));
}
function feed() {
  const tabs = h('div', { class: 'feed-tabs', role: 'tablist' }, [['foryou', 'For you'], ['following', 'Following'], ['discover', 'Discover']].map(([k, l]) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(ui.feedTab === k), onclick: () => { ui.feedTab = k; render(); } }, l)));
  const head = h('div', { class: 'header' }, h('h1', { tabindex: '-1', style: 'margin:0' }, 'Feed'), h('button', { class: 'fab', type: 'button', 'aria-label': 'Create a post', onclick: () => { if (requireAuth()) go({ name: 'compose' }); } }, icon('plus', 22)));
  if (!S.me && LIVE) return h('div', null, head, empty('Sign in to see the feed', 'Posts, projects and experiences from other Beyonders show up here.', btn('Sign in', () => go({ name: 'signin' }), 'primary')));
  let list = S.posts.filter((p) => !hidden.has(p.id));
  if (ui.feedTab === 'following') list = list.filter((p) => isFollowing(p.author_id) || p.author_id === myId()); else if (ui.feedTab === 'foryou') list = feedRank(list);
  const msg = ui.feedTab === 'following' ? ['Nothing from people you follow yet', 'Follow Beyonders from Explore to see their posts here.'] : ['No posts yet', 'Be the first. Share something you found, built or learned.'];
  return h('div', null, head, tabs, list.length ? list.map((p) => postCard(p)) : empty(msg[0], msg[1], btn('Create a post', () => { if (requireAuth()) go({ name: 'compose' }); }, 'primary')));
}
function composeView(r) {
  const d = { type: 'Discovery', body: '', opp: r.opp || '' };
  const chips = h('div', { class: 'row' }), err = h('p', { class: 'err', 'aria-live': 'polite' }), cnt = h('span', { class: 'muted small' }, '0 / 500');
  const draw = () => chips.replaceChildren(...POST_TYPES.map((t) => chip(t, d.type === t, () => { d.type = t; draw(); }, TYPE_COLOR[t], 'ty-' + t)));
  draw();
  const sel = h('select', { id: 'c-opp', onchange: (e) => { d.opp = e.target.value; } }, h('option', { value: '' }, t('None')), S.opps.map((o) => h('option', { value: o.id, selected: o.id === d.opp }, o.title)));
  const post = btn('Post', async () => {
    const body = d.body.trim(); if (body.length < 1) { err.textContent = t('Write something first.'); return; }
    post.disabled = true;
    try {
      const row = { author_id: myId(), type: d.type, body, opp_id: d.opp || null };
      const saved = await API.insert('posts', row, true); S.posts = [Object.assign({ created_at: nowIso() }, saved)].concat(S.posts);
      ui.stack = []; ui.tab = 'feed'; ui.feedTab = 'discover'; ui.focus = true; render(); toast('Posted.');
    } catch (e) { post.disabled = false; err.textContent = errText(e); }
  }, 'primary');
  return h('div', null, backHeader('New post'), h('h2', { style: 'margin-top:8px' }, 'What kind of post?'), chips,
    h('h2', null, h('label', { for: 'c-body' }, 'What do you want to share?')),
    h('textarea', { id: 'c-body', maxlength: '500', placeholder: 'A discovery, something you learned, a question…', oninput: (e) => { d.body = e.target.value; cnt.textContent = e.target.value.length + ' / 500'; } }), cnt,
    h('h2', null, h('label', { for: 'c-opp' }, 'Link an opportunity (optional)')), sel,
    h('p', { class: 'muted small' }, 'Posts are visible to other Beyonders. Do not share private details like phone numbers or addresses.'), post, err);
}
function postView(id) {
  const p = S.posts.find((x) => x.id === id); if (!p) return h('div', null, backHeader('Post'), empty('Post not found', 'It may have been removed.'));
  trackView(id);
  const list = commentsOf(id);
  const reply = ui.reply && ui.reply.postId === id ? ui.reply : null;
  const draft = ui.cdraft && ui.cdraft.id === id ? ui.cdraft.text : '';
  const input = h('input', { type: 'text', id: 'cmt', maxlength: '300', placeholder: 'Add a comment', 'aria-label': 'Add a comment', value: draft, oninput: (e) => { ui.cdraft = { id, text: e.target.value }; } }), err = h('p', { class: 'err', 'aria-live': 'polite' });
  const send = btn('Send', async () => {
    if (!requireAuth()) return; const body = input.value.trim(); if (!body) return; send.disabled = true;
    try {
      const row = { post_id: id, author_id: myId(), body, parent_id: reply ? reply.id : null };
      const saved = await API.insert('comments', row, true); S.comments = S.comments.concat(Object.assign({ created_at: nowIso() }, saved));
      ui.reply = null; ui.cdraft = null; render();
    } catch (e) { send.disabled = false; err.textContent = errText(e); }
  }, 'primary');
  const one = (c, isReply) => {
    const a = getUser(c.author_id) || { display_name: 'Beyonder', username: 'unknown' }, nm = a.display_name || '\u200E@' + a.username;
    const liked = iLikedComment(c.id), lc = commentLikeCount(c.id);
    return h('div', { class: 'comment' + (isReply ? ' reply' : '') },
      h('button', { class: 'plain', type: 'button', onclick: () => go({ name: 'user', id: a.id }), 'aria-label': t('Open profile of {name}', { name: nm }) }, avatar(a, isReply ? 26 : 32)),
      h('div', { style: 'min-width:0;flex:1' }, h('b', { class: 'small' }, utext(nm)), h('span', { class: 'muted small' }, utext('  ' + ago(c.created_at))), h('div', { class: 'cbody' }, utext(c.body)),
        h('div', { class: 'cactions' },
          h('button', { class: 'cact' + (liked ? ' on' : ''), type: 'button', 'aria-pressed': String(liked), 'aria-label': t(liked ? 'Unlike comment' : 'Like comment'), 'data-k': 'cl-' + c.id, onclick: () => toggleCommentLike(c.id) }, icon('heart', 16, liked), lc ? h('span', null, compact(lc)) : null),
          h('button', { class: 'cact', type: 'button', 'data-k': 'rp-' + c.id, onclick: () => { ui.reply = { postId: id, id: c.parent_id || c.id, name: nm }; render(); setTimeout(() => { const i = $('#cmt'); if (i) i.focus(); }, 0); } }, 'Reply'))));
  };
  const top = list.filter((c) => !c.parent_id);
  return h('div', null, backHeader('Post'), postCard(p, true), h('h2', null, tn('{n} comment', '{n} comments', list.length)),
    top.map((c) => [one(c, false), list.filter((r) => r.parent_id === c.id).map((r) => one(r, true))]),
    reply ? h('div', { class: 'replying' }, h('span', null, utext(t('Replying to {name}', { name: reply.name }))), h('button', { class: 'plain', type: 'button', 'aria-label': t('Cancel reply'), onclick: () => { ui.reply = null; render(); } }, '✕')) : null,
    h('div', { class: 'cmt-row' }, input, send), err);
}

/* ---------- PROFILE (TikTok style) ---------- */
function statBlock(n, label, fn) { return fn ? h('button', { class: 'stat plain', type: 'button', onclick: fn, 'aria-label': tr(label) + ': ' + n }, h('b', null, compact(n)), h('span', null, label)) : h('div', { class: 'stat' }, h('b', null, compact(n)), h('span', null, label)); }
function peopleView(r) {
  const u = getUser(r.id); if (!u) return h('div', null, backHeader('Profile'), empty('Profile not found', 'It may have been removed.'));
  const tab = r.tab || 'followers';
  const list = (tab === 'followers' ? followersOf(u.id).map((f) => getUser(f.follower_id)) : followingOf(u.id).map((f) => getUser(f.following_id))).filter(Boolean);
  const seg = h('div', { class: 'seg', role: 'tablist' }, [['followers', 'Followers', followersOf(u.id).length], ['following', 'Following', followingOf(u.id).length]].map(([k, l, n]) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(tab === k), onclick: () => { r.tab = k; render(); } }, tr(l) + ' ' + n)));
  return h('div', null, backHeader(utext('\u200E@' + u.username)), seg, list.length ? list.map(personRow) : empty(tab === 'followers' ? 'No followers yet' : 'Not following anyone yet', ''));
}
function tile(p) {
  return h('button', { class: 'tile', type: 'button', onclick: () => go({ name: 'post', id: p.id }), 'aria-label': t('{type} post: {body}', { type: tr(p.type), body: p.body.slice(0, 80) }), style: '--tc:' + (TYPE_COLOR[p.type] || '#22D3EE') }, h('span', { class: 'ttype' }, p.type), h('span', { class: 'tbody' }, utext(p.body)), h('span', { class: 'tlikes' }, icon('heart', 14, true), compact(likeCount(p.id))));
}
function oppTile(o) {
  return h('button', { class: 'tile otile', type: 'button', onclick: () => go({ name: 'detail', id: o.id }), 'aria-label': o.title, style: '--tc:' + (CAT_COLOR[o.category] || '#22D3EE') }, h('span', { class: 'ttype' }, o.category), h('span', { class: 'tbody' }, o.title), h('span', { class: 'tlikes' }, o.org));
}
function profileView(u, isMe) {
  const posts = postsBy(u.id).filter((p) => !hidden.has(p.id));
  const tabsDef = isMe ? [['posts', 'grid', 'Posts'], ['saved', 'bookmark', 'Saved'], ['done', 'check', 'Completed']] : [['posts', 'grid', 'Posts']];
  if (!tabsDef.some((t) => t[0] === ui.profTab)) ui.profTab = 'posts';
  const f = isFollowing(u.id);
  let grid;
  if (ui.profTab === 'posts') grid = posts.length ? posts.map(tile) : [empty(isMe ? 'No posts yet' : 'No posts yet', isMe ? 'Share a discovery, project or question.' : 'Nothing posted yet.', isMe ? btn('Create a post', () => go({ name: 'compose' }), 'primary') : null)];
  else if (ui.profTab === 'saved') { const l = mySaved().map(getOpp).filter(Boolean); grid = l.length ? l.map(oppTile) : [empty('Nothing saved yet', 'Saved means “maybe”. Tap Save on an opportunity.')]; }
  else { const l = myDone().map(getOpp).filter(Boolean); grid = l.length ? l.map(oppTile) : [empty('Nothing completed yet', 'Finished something? Mark it as done and it shows up here.')]; }
  const bar = isMe
    ? h('div', { class: 'header' }, h('div', { class: 'spacer' }), h('h1', { class: 'handle', tabindex: '-1' }, utext('\u200E@' + u.username)), h('button', { class: 'back', style: 'text-align:end', type: 'button', 'aria-label': 'Menu: settings, privacy and legal', onclick: () => go({ name: 'settings' }) }, icon('menu', 26)))
    : h('div', { class: 'header' }, h('button', { class: 'back', type: 'button', onclick: back }, (LANG === 'ar' ? '› ' : '‹ ') + t('Back')), h('h1', { class: 'handle', tabindex: '-1' }, utext('\u200E@' + u.username)), h('div', { class: 'spacer' }));
  return h('div', null, bar,
    h('div', { class: 'ptop' }, avatar(u, 96), h('div', { class: 'pname' }, utext(u.display_name || '\u200E@' + u.username)), u.is_demo ? pill('Demo account', 'var(--warn)') : null,
      h('div', { class: 'stats' }, statBlock(followingOf(u.id).length, 'Following', () => go({ name: 'people', id: u.id, tab: 'following' })), statBlock(followersOf(u.id).length, 'Followers', () => go({ name: 'people', id: u.id, tab: 'followers' })), statBlock(likesReceived(u.id), 'Likes')),
      h('div', { class: 'pbtns' },
        isMe ? btn('Edit profile', () => go({ name: 'edit' }), 'sec') : h('button', { class: 'btn ' + (f ? 'sec' : 'primary'), type: 'button', 'aria-pressed': String(f), onclick: () => toggleFollow(u.id) }, f ? 'Following' : 'Follow'),
        isMe ? null : h('button', { class: 'btn sec', type: 'button', onclick: () => { if (!requireAuth()) return; if (isMutual(u.id)) go({ name: 'chat', id: u.id }); else toast('You can only message people who follow you back.'); } }, 'Message'),
        btn('Share profile', () => copyText(location.origin + location.pathname + ' (@' + u.username + ' on Beyond)', 'Copied'), 'sec'),
        isMe ? h('button', { class: 'btn sec icon-btn', type: 'button', 'aria-label': 'Create a post', onclick: () => go({ name: 'compose' }) }, icon('plus', 22)) : null),
      u.bio ? h('p', { class: 'pbio' }, utext(u.bio)) : (isMe ? h('p', { class: 'pbio muted' }, 'Add a bio so people know who you are.') : null),
      u.quest ? h('div', { class: 'pquest' }, h('span', { class: 'label' }, 'Current quest'), h('span', null, utext(u.quest))) : null,
      (u.interests || []).length || u.stage ? h('div', { class: 'row center' }, u.stage ? pill(u.stage, 'var(--accent)') : null, (u.interests || []).map((i) => pill(i, 'var(--muted)'))) : null),
    h('div', { class: 'ptabs', role: 'tablist' }, tabsDef.map(([k, ic, l]) => h('button', { type: 'button', role: 'tab', 'aria-label': l, 'aria-selected': String(ui.profTab === k), onclick: () => { ui.profTab = k; render(); } }, icon(ic, 24)))),
    h('div', { class: 'grid' }, grid));
}
function profileTab() {
  if (!S.me) return h('div', null, h('h1', { tabindex: '-1' }, 'Your Beyond'), empty('Sign in to build your profile', 'Add a photo, share what you’re working on and keep track of what you try.', btn('Sign in', () => go({ name: 'signin' }), 'primary')));
  return profileView(S.me, true);
}
function userView(id) { const u = getUser(id); if (!u) return h('div', null, backHeader('Profile'), empty('Profile not found', 'It may have been removed.')); return profileView(u, u.id === myId()); }

function editProfile() {
  const m = S.me; const d = { display_name: m.display_name || '', username: m.username || '', bio: m.bio || '', quest: m.quest || '', stage: m.stage || '', interests: (m.interests || []).slice(), avatar_url: m.avatar_url, blob: null };
  const av = h('div', { class: 'ed-av' }), stageRow = h('div', { class: 'row' }), intRow = h('div', { class: 'row' }), err = h('p', { class: 'err', 'aria-live': 'polite' });
  const drawAv = () => av.replaceChildren(avatar({ display_name: d.display_name || d.username, avatar_url: d.avatar_url }, 104));
  const draw = () => { drawAv(); stageRow.replaceChildren(...STAGES.map((s) => chip(s, d.stage === s, () => { d.stage = d.stage === s ? '' : s; draw(); }, null, 'st-' + s))); intRow.replaceChildren(...INTERESTS.map((i) => chip(i, d.interests.includes(i), () => { d.interests = d.interests.includes(i) ? d.interests.filter((x) => x !== i) : d.interests.concat(i); draw(); }, null, 'in-' + i))); };
  draw();
  const file = h('input', { type: 'file', id: 'avatar-file', accept: 'image/*', hidden: true, onchange: async (e) => { try { const r = await resizeImage(e.target.files[0], 320); d.blob = r.blob; d.avatar_url = r.dataUrl; drawAv(); err.textContent = ''; } catch (x) { err.textContent = errText(x); } } });
  const fld = (id, label, el) => [h('h2', null, h('label', { for: id }, label)), el];
  const userInput = h('input', { type: 'text', id: 'e-user', maxlength: '24', value: d.username, autocapitalize: 'none', oninput: (e) => { d.username = e.target.value; drawSug(); } });
  const sugRow = h('div', { class: 'row', style: 'margin-top:8px' });
  const drawSug = () => { const l = suggestUsernames(d.display_name, m.id).filter((u) => u !== slug(d.username)); sugRow.replaceChildren(...(l.length ? [h('span', { class: 'muted small' }, 'Suggestions')].concat(l.map((u) => chip('\u200E@' + u, false, () => { d.username = u; userInput.value = u; drawSug(); }, null, 'su-' + u))) : [])); };
  drawSug();
  const save = btn('Save', async () => {
    const un = slug(d.username); if (!/^[a-z0-9_.]{3,24}$/.test(un)) { err.textContent = t('Username needs 3 to 24 letters, numbers, dots or underscores.'); return; }
    save.disabled = true; err.textContent = '';
    try {
      let url = d.avatar_url; if (d.blob) url = await API.uploadAvatar(d.blob, m.id, d.avatar_url);
      await updateMe({ display_name: d.display_name.trim(), username: un, bio: d.bio.trim(), quest: d.quest.trim(), stage: d.stage, interests: d.interests, avatar_url: url });
      back(); toast('Profile saved.');
    } catch (e) { save.disabled = false; err.textContent = e && e.code === '23505' ? t('That username is taken. Try another.') : errText(e); }
  }, 'primary');
  return h('div', null, backHeader('Edit profile'),
    h('div', { class: 'ed-top' }, av, file, h('button', { class: 'btn sec', type: 'button', onclick: () => file.click() }, h('span', { class: 'inline-ic' }, icon('camera', 20), 'Change photo')),
      d.avatar_url ? h('button', { class: 'linklike', type: 'button', onclick: () => { d.avatar_url = null; d.blob = null; draw(); } }, 'Remove photo') : null),
    h('p', { class: 'muted small' }, 'Your profile is visible to other Beyonders. Your email is never shown.'),
    fld('e-name', 'Name', h('input', { type: 'text', id: 'e-name', maxlength: '40', value: d.display_name, oninput: (e) => { d.display_name = e.target.value; drawSug(); } })),
    fld('e-user', 'Username', userInput), sugRow,
    fld('e-bio', 'Bio', h('textarea', { id: 'e-bio', maxlength: '160', placeholder: 'A line about you', oninput: (e) => { d.bio = e.target.value; } }, utext(d.bio))),
    fld('e-quest', 'Current quest', h('input', { type: 'text', id: 'e-quest', maxlength: '120', placeholder: 'What are you exploring right now?', value: d.quest, oninput: (e) => { d.quest = e.target.value; } })),
    h('h2', null, 'Where are you now?'), stageRow, h('h2', null, 'Interests'), intRow, save, err);
}

/* ---------- SETTINGS, LEGAL ---------- */
let confirmingDelete = false;
function settings() {
  const box = h('div'), err = h('p', { class: 'err', 'aria-live': 'polite' });
  const draw = () => {
    if (!confirmingDelete) box.replaceChildren(btn('Delete my account and data', () => { confirmingDelete = true; draw(); }, 'danger'));
    else box.replaceChildren(h('div', { class: 'notice', role: 'alertdialog', 'aria-label': 'Confirm deletion' }, h('h3', null, 'Delete everything?'),
      h('p', null, LIVE ? 'This permanently deletes your account, profile, photo, posts, comments, likes, follows, private messages, saved and completed items. It cannot be undone.' : 'This permanently removes your profile, posts, saved and completed items from this device. It cannot be undone.'),
      btn('Yes, delete everything', async () => { try { await API.deleteAccount(); confirmingDelete = false; ui.stack = []; ui.tab = 'home'; ui.guest = false; ui.wStep = 0; ui.consent = { age: false, terms: false }; await refresh(); ui.focus = true; render(); toast('Your data was deleted.'); } catch (e) { err.textContent = errText(e); } }, 'danger'),
      btn('Cancel', () => { confirmingDelete = false; draw(); })));
  };
  draw();
  const doc = (label, d) => btn(label, () => go({ name: 'legal', doc: d }));
  return h('div', null, backHeader('Settings'), h('h1', { tabindex: '-1', style: 'font-size:1.5rem' }, 'Privacy & data'),
    h('div', { class: 'card' }, h('p', { style: 'margin:0' }, LIVE ? 'Your data is stored in Beyond’s database (hosted by Supabase). We do not sell it or use it for ads or tracking.' : 'This preview keeps everything on this device only. Nothing is sent anywhere.')),
    memoryOnly ? h('div', { class: 'notice' }, 'Your browser is blocking storage, so changes will be lost when you close this page.') : null,
    S.me ? [h('h2', null, 'Account'), btn('Edit profile', () => go({ name: 'edit' })), LIVE ? btn('Sign out', async () => { await API.signOut(); ui.stack = []; ui.tab = 'home'; await refresh(); ui.focus = true; render(); }) : null] : null,
    S.me && LIVE ? [h('h2', null, 'Alerts on this device'), pushCard(false)] : null,
    h('h2', null, 'Help'), btn('Show the tour again', () => showTour()), btn('What’s new in Beyond', () => showWhatsNew(null)),
    h('h2', null, 'Language'), langPicker(), h('h2', null, 'Read the details'), doc('Privacy Policy', 'privacy'), doc('Terms of Service', 'terms'), doc('Cookies & tracking', 'cookies'), doc('Pricing & refunds', 'pricing'),
    S.me ? [h('h2', null, 'Delete my data'), h('p', { class: 'muted' }, 'Removes your account and everything you added. This cannot be undone.'), box, err] : null,
    h('h2', null, 'Contact'), h('p', { class: 'muted' }, t('Questions about privacy or your data: {email}', { email: todo(OWNER.contactEmail, 'contact email in config.js') })));
}
function legalDocs() {
  const em = todo(OWNER.contactEmail, 'contact email in config.js'), who = todo(OWNER.legalName, 'legal/owner name in config.js'), age = OWNER.minAge || 13, up = OWNER.updated || '';
  const live = LIVE;
  return {
    privacy: ['Privacy Policy', live ? [
      ['Who we are', 'Beyond is run by ' + who + '. Contact: ' + em + '.'],
      ['What we collect', 'From Google sign-in: your name and email address. From you: username, optional photo, bio, current quest, education stage, interests, posts, comments, likes, follows, private messages you send and receive, people you block, saved and completed opportunities, and reports you file. We also record that you confirmed your age and accepted these policies, with the date, and which posts you have viewed (only to count views).'],
      ['Why', 'Your email is used only to sign you in and contact you about your account. Everything else powers the features you use: your profile, the feed, recommendations and your history. We do not collect passwords, contacts, precise location or device identifiers.'],
      ['Who can see what', 'Your name, username, photo, bio, quest, stage, interests and posts are visible to other signed-in Beyonders. Your email is never shown to other people. Posts show how many people viewed them, never who. Private messages are visible only to you and the person you write to. Only people who follow each other can message each other, and either person can block, report or delete a chat. We do not read private messages, except the last 10 messages of a chat that someone reports to us.'],
      ['My Path', 'Your My Path answers (dream university, major, country, school system, year and the steps you tick) are saved only in your browser on this device. They are not sent to Beyond’s database. The facts shown come from official pages and carry a source link and a last-checked date. They are a guide, not official advice.'],
      ['Where it is stored', 'In a database, file storage and sign-in service provided by Supabase. Sign-in uses Google. Fonts load from Google Fonts and one code library loads from jsDelivr, which may receive your IP address and browser details when the page opens. If you turn on alerts, your browser’s push address (issued by its maker, such as Google, Apple or Mozilla) is saved so we can send them, and it is removed when you turn alerts off or delete your account. Alerts show who wrote or reacted, never message text.'],
      ['Retention', 'We keep your data until you delete your account. Deleting your account removes your profile, photo, posts, comments, likes, follows, saved and completed items. Reports you filed about other content may be kept for safety review without your name attached where possible.'],
      ['Your rights and deletion', 'You can edit your profile at any time and delete your account in Settings, Privacy & data. For any other request, contact ' + em + '.'],
      ['Age', 'Beyond is for people aged ' + age + ' or older. If you are a parent or guardian and believe a younger child has an account, contact ' + em + '.'],
      ['Changes', 'We will update this policy before adding new data uses and tell you about important changes.'], ['Last updated', up]]
      : [
      ['Who we are', 'Beyond is run by ' + who + '. Contact: ' + em + '.'],
      ['What we collect', 'Only what you enter in this preview: optional name, username, photo, bio, quest, interests, posts, comments, likes, follows and saved/completed opportunities, plus the date you confirmed your age and policies.'],
      ['Where it is stored', 'On this device only, in your browser. There is no account and no server in this preview, so we do not receive your data.'],
      ['Third parties', 'Fonts load from Google Fonts, which may receive your IP address and browser details.'],
      ['Retention and deletion', 'Data stays until you delete it in Settings, Privacy & data or clear your browser’s site data.'],
      ['Age', 'Beyond is for people aged ' + age + ' or older.'], ['Last updated', up]]],
    terms: ['Terms of Service', [
      ['Using Beyond', 'Beyond helps you discover opportunities, share what you are doing and meet other students. Use it lawfully and respectfully. You must be at least ' + age + '.'],
      ['Your account', 'You are responsible for your account. Keep your sign-in secure and give accurate information.'],
      ['Your content', 'You own what you post. You give Beyond permission to show it to other users inside the service. Do not post anything you do not have the right to share.'],
      ['Not allowed', 'Harassment, hate, sexual content, threats, spam, scams, sharing other people’s private information, pretending to be someone else, or trying to break or misuse the service. Do not try to meet or contact other users in unsafe ways.'],
      ['Reports and moderation', 'You can report posts and private chats. We may remove content or suspend accounts that break these terms. Never share passwords, addresses or other private details in messages.'],
      ['Opportunities', 'Opportunities link to official pages run by other organizations. Beyond does not control those sites and does not guarantee acceptance, scholarships, admission, jobs or any outcome. Posts and opinions from users are not verified facts.'],
      ['Availability', 'Beyond is provided as is and may change, pause or stop at any time.'],
      ['Liability', 'To the extent the law allows, Beyond is not liable for losses from using it or from third-party opportunities.'],
      ['Contact', em], ['Last updated', up]]],
    cookies: ['Cookies & tracking', [
      ['Cookies', 'Beyond does not set cookies of its own.'],
      ['Storage that is needed', live ? 'To keep you signed in, the sign-in service stores a session token in your browser’s local storage. This is strictly necessary for the site to work, and it is removed when you sign out.' : 'Your preview data is saved in your browser’s local storage so Beyond remembers you. It is removed when you delete your data.'],
      ['Analytics and ads', 'There is no analytics, advertising or tracking tool in Beyond, so there is no tracking consent to ask for.'],
      ['If this changes', 'If analytics or similar tools are added later, we will ask for your choice before they run and let you change it.']]],
    pricing: ['Pricing & refunds', [
      ['Price', 'Beyond is free to use. There are no paid plans, purchases or hidden fees.'],
      ['Refunds', 'Because nothing is sold, there is nothing to refund. If paid features are ever added, the full price and a refund policy will be shown before you buy.']]]
  };
}
function legal(doc) {
  const d = legalDocs()[doc] || legalDocs().privacy;
  return h('div', null, backHeader(d[0]), h('h1', { tabindex: '-1', style: 'font-size:1.6rem' }, d[0]), LANG !== 'en' ? h('div', { class: 'notice' }, 'The full legal text is shown in English so that nothing is lost in translation.') : null, d[1].map(([hd, b]) => [h('h2', null, utext(hd)), h('p', null, utext(b))]), h('p', { class: 'muted small', style: 'margin-top:24px' }, 'This is plain-language information, not legal advice. Have a lawyer review it before publishing.'));
}

/* ---------- ROUTER + RENDER ---------- */
function routeView(r) {
  switch (r.name) {
    case 'detail': return detail(r.id); case 'post': return postView(r.id); case 'user': return userView(r.id); case 'edit': return editProfile();
    case 'notifications': return notificationsView(); case 'people': return peopleView(r); case 'inbox': return inboxView(); case 'chat': return chatView(r);
    case 'path': return pathView(); case 'compose': return composeView(r); case 'settings': return settings(); case 'legal': return legal(r.doc);
    case 'signin': return h('div', null, backHeader('Sign in'), h('h1', { tabindex: '-1' }, 'Join the Beyonders'), consentBlock());
    default: return h('div', null, 'Not found');
  }
}
function render() {
  if (viewObserver) viewObserver.disconnect();
  const app = $('#app'), tabs = $('#tabs'); let view, showTabs = false;
  const top = ui.stack[ui.stack.length - 1];
  if (!S.ready) view = h('div', { class: 'empty' }, 'Loading…');
  else if (S.error) view = h('div', { class: 'empty' }, h('h3', null, 'Could not load Beyond'), h('p', { class: 'muted' }, S.error), btn('Try again', () => location.reload(), 'primary'));
  else if (top) view = routeView(top);
  else if (LIVE ? (!S.me && !ui.guest) : !S.me) view = welcome();
  else if (S.me && !S.me.onboarded) view = onboarding();
  else { view = { home, explore, feed, profile: profileTab }[ui.tab](); showTabs = true; }
  app.replaceChildren(view); document.body.classList.toggle('in-chat', !!(top && top.name === 'chat')); tabs.hidden = !showTabs; tabs.setAttribute('aria-label', t('Main navigation'));
  tabs.replaceChildren(h('div', { class: 'inner' }, [['home', 'Home'], ['explore', 'Explore'], ['feed', 'Feed'], ['profile', 'Profile']].map(([k, l]) => h('button', { type: 'button', 'aria-current': ui.tab === k ? 'page' : null, onclick: () => setTab(k) }, icon(k, 24), l))));
  if (ui.focus) { const hd = app.querySelector('h1'); if (hd) hd.focus({ preventScroll: true }); ui.focus = false; }
  else if (window.__lastKey) { const a = app.querySelector('[data-k="' + window.__lastKey.replace(/"/g, '') + '"]'); if (a) a.focus({ preventScroll: true }); }
}
document.addEventListener('focusin', (e) => { if (e.target && e.target.dataset && e.target.dataset.k) window.__lastKey = e.target.dataset.k; });
