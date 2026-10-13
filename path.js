/* path.js: "My Path" (طريقي). A guided path to the student's dream university.
   Steps: dream + major -> country -> your school system -> year -> personal plan with a checklist.
   Facts come from pathdata.js (each with a source link and a last-checked date). Progress is saved on this device only. */
const PATH_SYSTEMS = [
  ['thanaweya-amma', 'Thanaweya Amma', 'الثانوية العامة'],
  ['egyptian-bac', 'Egyptian Baccalaureate', 'البكالوريا المصرية'],
  ['other', 'Another system', 'نظام تاني']
];
const PATH_YEARS = ['Grade 10', 'Grade 11', 'Grade 12', 'Already finished school'];
const pathKey = () => 'beyond:path:' + (S.me ? S.me.id : 'guest');
function pathLoad() { try { const v = JSON.parse(lsGet(pathKey()) || 'null'); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } }
function pathSave(p) { lsSet(pathKey(), JSON.stringify(p)); }
const pathDraft = { step: 0, dream: '', major: '', country: null, system: null, year: null };
const str = (v) => (v == null ? '' : String(v));
const srcLink = (url, label) => url ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', class: 'small' }, label || 'Source') : null;

/* flat list of things to do, built from the researched facts for the chosen country */
function pathItems(d) {
  const it = [];
  (d.timeline || []).forEach((x, i) => it.push({ key: 't' + i, kind: 'When', head: x.when, body: x.step, src: x.source }));
  (d.documents || []).forEach((x, i) => it.push({ key: 'd' + i, kind: 'Document', head: x.name, body: x.note, src: x.source }));
  (d.tests || []).forEach((x, i) => it.push({ key: 'x' + i, kind: 'Test', head: x.name, body: x.policy, src: x.source, ex: x.examples }));
  (d.english || []).forEach((x, i) => it.push({ key: 'e' + i, kind: 'English', head: x.test, body: x.note, src: x.source }));
  (d.german_language || []).forEach((x, i) => it.push({ key: 'g' + i, kind: 'Language', head: x.test, body: x.note, src: x.source }));
  if (d.visa && d.visa.summary) it.push({ key: 'v', kind: 'Visa', head: 'Student visa', body: d.visa.summary, src: d.visa.source });
  (d.funding || []).forEach((x, i) => it.push({ key: 'f' + i, kind: 'Money', head: x.name, body: x.note, src: x.url }));
  return it;
}
const KIND_COLOR = { When: '#22D3EE', Document: '#60A5FA', Test: '#FBBF24', English: '#A78BFA', Language: '#A78BFA', Visa: '#F472B6', Money: '#4ADE80' };

/* ---------- entry: wizard or plan ---------- */
function pathView() {
  const p = pathLoad();
  if (p && !ui.pathEdit) return planView(p);
  return wizardView();
}
function wizardView() {
  const D = pathDraft, steps = 5;
  const next = () => { D.step++; render(); window.scrollTo(0, 0); };
  const prev = () => { if (D.step > 0) { D.step--; render(); } else { ui.pathEdit = false; back(); } };
  const head = (title, sub) => [h('div', { class: 'muted small' }, t('Step {n} of {m}', { n: D.step + 1, m: steps })),
    h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': steps, 'aria-valuenow': D.step + 1 }, h('span', { style: 'width:' + Math.round(((D.step + 1) / steps) * 100) + '%' })),
    h('h1', { tabindex: '-1' }, title), sub ? h('p', { class: 'muted' }, sub) : null];
  let body;
  if (D.step === 0) {
    const dream = h('input', { type: 'text', maxlength: '80', value: D.dream, 'aria-label': 'Dream university', placeholder: 'e.g. MIT, Oxford, TU Munich', oninput: (e) => { D.dream = e.target.value; } });
    const major = h('input', { type: 'text', maxlength: '60', value: D.major, 'aria-label': 'Major', placeholder: 'e.g. Computer Science, Medicine', oninput: (e) => { D.major = e.target.value; } });
    body = [head('What is your dream?', 'You can change this any time. Leave it empty if you do not know yet.'),
      h('label', null, 'Dream university'), dream, h('label', null, 'What do you want to study?'), major, btn('Next', next, 'primary')];
  } else if (D.step === 1) {
    body = [head('Where do you want to study?', 'Pick a country. We will show how admission works there.'),
      Object.keys(PATH_DEST).map((id) => { const d = PATH_DEST[id];
        return h('button', { class: 'card', type: 'button', 'data-k': 'c-' + id, 'aria-pressed': String(D.country === id), style: D.country === id ? 'border-color:var(--accent)' : null, onclick: () => { D.country = id; render(); } },
          h('div', { style: 'font-size:1.2rem;font-weight:800' }, d.flag + ' ' + tr(d.name)), h('div', { class: 'muted small' }, utext(str(d.overview).slice(0, 150) + '…'))); }),
      D.country ? btn('Next', next, 'primary') : null];
  } else if (D.step === 2) {
    const d = PATH_DEST[D.country];
    body = [head(t('How admission works: {c}', { c: tr(d.name) })), h('p', null, utext(d.overview)), h('p', null, utext(d.admission_model)),
      srcLink((d.key_links && d.key_links[0] || {}).url, (d.key_links && d.key_links[0] || {}).label), LANG !== 'en' ? h('div', { class: 'notice small' }, 'Facts are shown in English, exactly as the official source states them.') : null, btn('Next', next, 'primary')];
  } else if (D.step === 3) {
    body = [head('Which school system are you in?', 'We use this to show how universities abroad see your certificate.'),
      PATH_SYSTEMS.map(([id, en, ar]) => h('button', { class: 'card', type: 'button', 'data-k': 's-' + id, 'aria-pressed': String(D.system === id), style: D.system === id ? 'border-color:var(--accent)' : null, onclick: () => { D.system = id; render(); } },
        h('div', { style: 'font-weight:800' }, tr(en)), LANG === 'ar' || id !== 'other' ? h('div', { class: 'muted small' }, utext(ar)) : null)),
      D.system ? btn('Next', next, 'primary') : null];
  } else {
    body = [head('Which year are you in?'), PATH_YEARS.map((y) => h('button', { class: 'card', type: 'button', 'data-k': 'y-' + y, 'aria-pressed': String(D.year === y), style: D.year === y ? 'border-color:var(--accent)' : null, onclick: () => { D.year = y; render(); } }, h('div', { style: 'font-weight:800' }, y))),
      D.year ? btn('Build my path', () => { pathSave({ dream: D.dream.trim(), major: D.major.trim(), country: D.country, system: D.system, year: D.year, done: {}, at: nowIso() }); ui.pathEdit = false; D.step = 0; render(); window.scrollTo(0, 0); toast('Your path is ready.'); }, 'primary') : null];
  }
  return h('div', null, h('div', { class: 'header' }, h('button', { class: 'back', type: 'button', onclick: prev }, (LANG === 'ar' ? '› ' : '‹ ') + t('Back')), h('div', { class: 'title' }, 'My Path'), h('div', { class: 'spacer' })), body);
}

/* ---------- the plan ---------- */
function planView(p) {
  const d = PATH_DEST[p.country]; if (!d) { pathSave(null); return h('div', null, 'Not found'); }
  const items = pathItems(d), done = p.done || {}, n = items.filter((x) => done[x.key]).length;
  const toggle = (k) => { p.done = Object.assign({}, p.done); if (p.done[k]) delete p.done[k]; else p.done[k] = 1; pathSave(p); render(); };
  const sys = PATH_SYSTEMS.find((s) => s[0] === p.system) || PATH_SYSTEMS[2];
  const egSys = (PATH_EGYPT.systems || []).find((s) => s.id === p.system);
  const notes = (d.egyptian_notes || []);
  const itemCard = (x) => h('div', { class: 'card path-item' },
    h('label', { class: 'row', style: 'align-items:flex-start;gap:10px;margin:0' }, h('input', { type: 'checkbox', checked: done[x.key] ? true : null, 'data-k': 'p-' + x.key, onchange: () => toggle(x.key), 'aria-label': tr('Mark as done') + ': ' + str(x.head), style: 'width:24px;height:24px;flex:none;margin-top:2px' }),
      h('div', { style: 'flex:1;min-width:0' }, h('span', { class: 'chip-mini', style: '--chip:' + KIND_COLOR[x.kind] }, tr(x.kind)), h('div', { style: 'font-weight:800;margin-top:4px' + (done[x.key] ? ';text-decoration:line-through;opacity:.7' : '') }, utext(x.head)))),
    h('p', { style: 'margin:8px 0 4px' }, utext(x.body)), (x.ex || []).length ? h('details', null, h('summary', null, t('Examples from universities')), x.ex.map((e) => h('p', { class: 'small' }, h('b', null, utext(e.university + ': ')), utext(e.statement), ' ', srcLink(e.source)))) : null, srcLink(x.src));
  const group = (title, kinds) => { const xs = items.filter((x) => kinds.includes(x.kind)); return xs.length ? h('details', { open: title === 'Steps and dates' ? '' : null }, h('summary', { class: 'path-sum' }, tr(title) + ' (' + xs.filter((x) => done[x.key]).length + '/' + xs.length + ')'), xs.map(itemCard)) : null; };
  const nextStep = items.find((x) => !done[x.key] && x.kind === 'When');
  return h('div', null, backHeader('My Path', h('button', { class: 'btn', type: 'button', onclick: () => { Object.assign(pathDraft, { step: 0, dream: p.dream, major: p.major, country: p.country, system: p.system, year: p.year }); ui.pathEdit = true; render(); } }, 'Edit')),
    h('h1', { tabindex: '-1' }, p.dream ? t('Your path to {u}', { u: p.dream }) : 'Your path'),
    h('p', { class: 'muted' }, [p.major, d.flag + ' ' + tr(d.name), tr(sys[1]), tr(p.year)].filter(Boolean).join(' · ')),
    h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': items.length, 'aria-valuenow': n }, h('span', { style: 'width:' + (items.length ? Math.round((n / items.length) * 100) : 0) + '%' })),
    h('p', { class: 'small muted' }, t('{n} of {m} done', { n, m: items.length })),
    nextStep ? h('div', { class: 'card quest' }, h('div', { class: 'label' }, 'Your next step'), h('div', { style: 'font-weight:800' }, utext(nextStep.head)), h('p', { style: 'margin:6px 0 0' }, utext(nextStep.body))) : null,
    p.country === 'uk' ? h('div', { class: 'notice' }, 'UK deadline: Oxford, Cambridge and medicine applications close on 15 Oct 2026 for 2027 entry (UCAS). Check the UCAS page today.') : null,
    LANG !== 'en' ? h('div', { class: 'notice small' }, 'Facts are shown in English, exactly as the official source states them.') : null,
    h('h2', null, 'Your certificate abroad'),
    egSys ? h('div', { class: 'card' }, h('div', { style: 'font-weight:800' }, utext(egSys.name + ' · ' + egSys.name_ar)), h('p', null, utext(egSys.summary)), (egSys.sources || []).slice(0, 2).map((s) => h('div', null, srcLink(s)))) : null,
    notes.map((x) => h('div', { class: 'card' }, h('p', { style: 'margin:0 0 6px' }, utext(x.note)), srcLink(x.source))),
    notes.length ? null : h('p', { class: 'muted' }, 'No confirmed statement was found. Ask the university directly.'),
    group('Steps and dates', ['When']), group('Documents', ['Document']), group('Tests and languages', ['Test', 'English', 'Language']), group('Visa and money', ['Visa', 'Money']),
    h('h2', null, 'Example universities'),
    (d.universities || []).map((u) => h('div', { class: 'card' }, h('div', { style: 'font-weight:800' }, utext(u.name)), h('p', { class: 'muted small' }, utext(u.why_example)), h('p', null, utext(u.requirements)), srcLink(u.url, 'Official page'))),
    h('h2', null, 'Official links'), (d.key_links || []).map((l) => h('div', { style: 'margin-bottom:6px' }, srcLink(l.url, l.label))),
    h('h2', null, 'Not confirmed yet'), h('p', { class: 'muted' }, 'We could not confirm these from an official page. Please check the official site before you rely on them.'),
    h('details', null, h('summary', null, t('Show {n} open points', { n: (d.unverified || []).length + (PATH_EGYPT.unverified || []).length })), (d.unverified || []).concat(PATH_EGYPT.unverified || []).map((u) => h('p', { class: 'small' }, '• ', utext(u)))),
    h('h2', null, 'Opportunities that help your application'), recommend((S.me && S.me.interests) || [], myDone(), 3).map(oppCard), btn('Explore everything', () => setTab('explore')),
    h('p', { class: 'muted small', style: 'margin-top:20px' }, t('Last checked: {d}. Rules change every year. This is a guide, not official advice.', { d: d.last_checked })),
    btn('Start over', () => { pathSave(null); Object.assign(pathDraft, { step: 0, dream: '', major: '', country: null, system: null, year: null }); render(); }, 'danger'));
}

/* home card: shows the next step, or invites the student to start */
function pathHomeCard() {
  const p = pathLoad(), d = p && PATH_DEST[p.country];
  if (!d) return h('button', { class: 'card quest', type: 'button', onclick: () => go({ name: 'path' }) }, h('div', { class: 'label' }, 'New: My Path'), h('div', { class: 'quest-text' }, 'A step-by-step path to your dream university'), h('p', { class: 'muted', style: 'margin:6px 0 0' }, 'From Egypt to the world.'));
  const items = pathItems(d), n = items.filter((x) => (p.done || {})[x.key]).length, nx = items.find((x) => !(p.done || {})[x.key] && x.kind === 'When') || items.find((x) => !(p.done || {})[x.key]);
  return h('button', { class: 'card quest', type: 'button', onclick: () => go({ name: 'path' }) }, h('div', { class: 'label' }, 'My Path'), h('div', { class: 'quest-text' }, p.dream ? t('Your path to {u}', { u: p.dream }) : 'Your path'), h('div', { class: 'small muted' }, t('{n} of {m} done', { n, m: items.length })), nx ? h('p', { style: 'margin:6px 0 0' }, h('b', null, tr('Your next step') + ': '), utext(str(nx.head).slice(0, 90))) : null);
}
