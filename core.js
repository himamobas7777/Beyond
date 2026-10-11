/* core.js: helpers, data layer (local demo OR Supabase live), shared state. */
const CFG = window.BEYOND_CONFIG || {};
const OWNER = CFG.OWNER || {};
const LIVE = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
const todo = (v, label) => (String(v || 'TODO').startsWith('TODO') ? '[Owner: add ' + label + ']' : v);

/* ---------- tiny DOM helper: text is always set as text, never as HTML ---------- */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const k in (attrs || {})) {
    const v = attrs[k];
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) { if (kid == null || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
  return el;
}
const P = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  explore: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  feed: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  heart: '<path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.800-8 11-8 11z"/>',
  comment: '<path d="M21 12a8 8 0 0 1-11.800 7L3 21l2-6A8 8 0 1 1 21 12z"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  more: '<circle cx="5" cy="12" r="1.500"/><circle cx="12" cy="12" r="1.500"/><circle cx="19" cy="12" r="1.500"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.500l3 3 5-6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.500"/>',
  share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 14v6h14v-6"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1"/><path d="M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/>'
};
function icon(name, size, fill) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', 'ic' + (fill ? ' filled' : '')); if (size) { s.style.width = size + 'px'; s.style.height = size + 'px'; }
  s.innerHTML = P[name];
  return s;
}

/* ---------- misc utils ---------- */
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + Math.random().toString(16).slice(2));
const nowIso = () => new Date().toISOString();
function ago(iso) {
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now'; if (s < 3600) return Math.floor(s / 60) + 'm'; if (s < 86400) return Math.floor(s / 3600) + 'h';
  if (s < 604800) return Math.floor(s / 86400) + 'd'; return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
const compact = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n));
const safeUrl = (u) => typeof u === 'string' && (/^https:\/\//i.test(u) || /^data:image\/(jpeg|png|webp);base64,/i.test(u));
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 24);

/* ---------- avatar ---------- */
const AV_COLORS = ['#22D3EE', '#A78BFA', '#FBBF24', '#4ADE80', '#60A5FA', '#F472B6', '#FB923C'];
function avatar(user, size) {
  const name = (user && (user.display_name || user.username)) || '?';
  const box = h('div', { class: 'avatar', style: 'width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.42) + 'px' });
  if (user && safeUrl(user.avatar_url)) box.append(h('img', { src: user.avatar_url, alt: '' }));
  else { let n = 0; for (const c of name) n += c.charCodeAt(0); box.style.background = AV_COLORS[n % AV_COLORS.length]; box.append(name.trim().charAt(0).toUpperCase()); }
  return box;
}
function resizeImage(file, max) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) return reject(new Error('Please choose an image file.'));
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height)); const w = Math.round(img.width * r), hh = Math.round(img.height * r);
      const c = document.createElement('canvas'); c.width = w; c.height = hh; c.getContext('2d').drawImage(img, 0, 0, w, hh); URL.revokeObjectURL(url);
      c.toBlob((blob) => (blob ? resolve({ blob, dataUrl: c.toDataURL('image/jpeg', 0.85) }) : reject(new Error('Could not read that image.'))), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
    img.src = url;
  });
}

/* ---------- LOCAL DEMO data layer (this device only) ---------- */
const LKEY = 'beyond:v2';
let memoryOnly = false;
const DEMO_ID = 'beyond-demo';
function demoSeed() {
  const t = Date.now();
  return {
    meId: null,
    profiles: [{ id: DEMO_ID, username: 'beyond_demo', display_name: 'Beyond (demo)', bio: 'A demo account that shows how posts look. Not a real person.', avatar_url: null, quest: '', stage: '', interests: [], is_public: true, is_demo: true }],
    posts: [
      { id: 'demo-p1', author_id: DEMO_ID, type: 'Discovery', opp_id: 'rsi', created_at: new Date(t - 3600e3).toISOString(), body: 'Worth a look: the Research Science Institute describes itself as cost-free to students, and the page says RSI 2027 applications close Dec 11, 2026. Check the official page for the full rules.' },
      { id: 'demo-p2', author_id: DEMO_ID, type: 'Question', opp_id: null, created_at: new Date(t - 7200e3).toISOString(), body: 'What are you building or learning this month? Share it as a Project post.' },
      { id: 'demo-p3', author_id: DEMO_ID, type: 'Discussion', opp_id: 'cs50x', created_at: new Date(t - 86400e3).toISOString(), body: 'Starting from zero in coding? CS50x says it is for people with or without prior programming experience. What did you start with?' }
    ],
    post_likes: [], comments: [], follows: [], post_saves: [], saved_opportunities: [], completed_opportunities: [], reports: []
  };
}
const LocalAPI = {
  mode: 'local', db: null,
  save() { try { localStorage.setItem(LKEY, JSON.stringify(this.db)); } catch (e) { memoryOnly = true; } },
  async init() {
    try { const raw = localStorage.getItem(LKEY); if (raw) this.db = Object.assign(demoSeed(), JSON.parse(raw)); } catch (e) { memoryOnly = true; }
    if (!this.db) this.db = demoSeed();
  },
  async session() { return this.db.meId ? { id: this.db.meId } : null; },
  async createLocalUser() {
    const id = 'local-me'; this.db.meId = id;
    if (!this.db.profiles.find((p) => p.id === id)) this.db.profiles.push({ id, username: 'beyonder', display_name: '', bio: '', avatar_url: null, quest: '', stage: '', interests: [], is_public: true, onboarded: false, consent_at: nowIso(), min_age: OWNER.minAge });
    this.save();
  },
  async loadAll() { const d = this.db; return { profiles: d.profiles.slice(), posts: d.posts.slice(), post_likes: d.post_likes.slice(), comments: d.comments.slice(), follows: d.follows.slice(), post_saves: d.post_saves.slice(), saved_opportunities: d.saved_opportunities.slice(), completed_opportunities: d.completed_opportunities.slice(), opportunities: null }; },
  async insert(t, row) { const r = Object.assign({ id: uid(), created_at: nowIso() }, row); this.db[t].push(r); this.save(); return r; },
  async remove(t, m) { this.db[t] = this.db[t].filter((r) => !Object.keys(m).every((k) => r[k] === m[k])); this.save(); },
  async update(t, m, patch) { this.db[t].forEach((r) => { if (Object.keys(m).every((k) => r[k] === m[k])) Object.assign(r, patch); }); this.save(); },
  async uploadAvatar(blob, id, dataUrl) { return dataUrl; },
  async signOut() {},
  async deleteAccount() { try { localStorage.removeItem(LKEY); localStorage.removeItem('beyond:hidden'); } catch (e) {} this.db = demoSeed(); }
};

/* ---------- LIVE data layer (Supabase) ---------- */
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load a required script.')); document.head.append(s); }); }
const SupaAPI = {
  mode: 'live', sb: null,
  async init() {
    await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js');
    this.sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, detectSessionInUrl: true } });
  },
  async session() { const { data } = await this.sb.auth.getSession(); return data.session ? data.session.user : null; },
  async signInGoogle() {
    const { error } = await this.sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
    if (error) throw error;
  },
  async signOut() { await this.sb.auth.signOut(); },
  async loadAll(userId) {
    const sel = (t, f) => { let q = this.sb.from(t).select('*'); if (f) q = f(q); return q.then(({ data, error }) => { if (error) throw error; return data || []; }); };
    const [profiles, posts, post_likes, comments, follows, post_saves, saved_opportunities, completed_opportunities, opportunities] = await Promise.all([
      sel('profiles'), userId ? sel('posts', (q) => q.order('created_at', { ascending: false }).limit(200)) : [],
      userId ? sel('post_likes', (q) => q.limit(5000)) : [], userId ? sel('comments', (q) => q.order('created_at', { ascending: true }).limit(3000)) : [],
      userId ? sel('follows') : [], userId ? sel('post_saves') : [], userId ? sel('saved_opportunities') : [], userId ? sel('completed_opportunities') : [],
      sel('opportunities', (q) => q.eq('published', true))
    ]);
    return { profiles, posts, post_likes, comments, follows, post_saves, saved_opportunities, completed_opportunities, opportunities };
  },
  async insert(t, row, want) {
    if (!want) { const { error } = await this.sb.from(t).insert(row); if (error) throw error; return row; }
    const { data, error } = await this.sb.from(t).insert(row).select().single(); if (error) throw error; return data;
  },
  async remove(t, m) { const { error } = await this.sb.from(t).delete().match(m); if (error) throw error; },
  async update(t, m, patch) { const { error } = await this.sb.from(t).update(patch).match(m); if (error) throw error; },
  async uploadAvatar(blob, id) {
    const path = id + '/avatar.jpg';
    const { error } = await this.sb.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' }); if (error) throw error;
    return this.sb.storage.from('avatars').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
  },
  async deleteAccount() { const { error } = await this.sb.rpc('delete_my_account'); if (error) throw error; await this.sb.auth.signOut(); }
};
const API = LIVE ? SupaAPI : LocalAPI;

/* ---------- shared state + derived helpers ---------- */
const S = { ready: false, me: null, user: null, profiles: [], posts: [], post_likes: [], comments: [], follows: [], post_saves: [], saved_opportunities: [], completed_opportunities: [], opps: BUILTIN_OPPS };
let hidden = new Set(); try { hidden = new Set(JSON.parse(localStorage.getItem('beyond:hidden') || '[]')); } catch (e) {}
const getOpp = (id) => S.opps.find((o) => o.id === id);
const getUser = (id) => S.profiles.find((p) => p.id === id);
const myId = () => (S.me ? S.me.id : null);
const likeCount = (pid) => S.post_likes.filter((l) => l.post_id === pid).length;
const iLiked = (pid) => S.post_likes.some((l) => l.post_id === pid && l.user_id === myId());
const iSavedPost = (pid) => S.post_saves.some((l) => l.post_id === pid && l.user_id === myId());
const commentsOf = (pid) => S.comments.filter((c) => c.post_id === pid);
const followingOf = (id) => S.follows.filter((f) => f.follower_id === id);
const followersOf = (id) => S.follows.filter((f) => f.following_id === id);
const isFollowing = (id) => S.follows.some((f) => f.follower_id === myId() && f.following_id === id);
const postsBy = (id) => S.posts.filter((p) => p.author_id === id);
const likesReceived = (id) => postsBy(id).reduce((n, p) => n + likeCount(p.id), 0);
const mySaved = () => S.saved_opportunities.filter((r) => r.user_id === myId()).map((r) => r.opp_id);
const myDone = () => S.completed_opportunities.filter((r) => r.user_id === myId()).map((r) => r.opp_id);

async function refresh() {
  const user = await API.session(); S.user = user;
  const raw = await API.loadAll(user ? user.id : null);
  Object.assign(S, raw, { opps: raw.opportunities && raw.opportunities.length ? raw.opportunities.map((o) => Object.assign({ tags: [], mode: NS, cost: NS, grade: NS, eligibility: NS }, o, { lastVerified: o.last_verified || o.lastVerified || null })) : BUILTIN_OPPS });
  S.me = user ? S.profiles.find((p) => p.id === user.id) || null : null;
}
function recommend(interests, doneIds, limit) {
  const want = (interests || []).map((i) => i.toLowerCase());
  return S.opps.filter((o) => o.published !== false && !doneIds.includes(o.id))
    .map((o) => ({ o, s: (o.tags || []).filter((t) => want.includes(t)).length * 2 + (want.includes(String(o.category).toLowerCase()) ? 1 : 0) + (o.featured ? 0.5 : 0) }))
    .sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.o);
}
