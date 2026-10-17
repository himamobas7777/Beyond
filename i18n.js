/* i18n.js: language support. English strings are the keys. A missing translation falls back to English.
   Dictionaries live in i18n/<code>.js and are loaded on demand. User-written content is never translated. */
const LANGS = [['en', 'English'], ['ar', 'العربية'], ['fr', 'Français'], ['es', 'Español'], ['de', 'Deutsch'], ['it', 'Italiano'], ['ja', '日本語'], ['zh', '中文']];
const LOCALES = { en: 'en', ar: 'ar', fr: 'fr', es: 'es', de: 'de', it: 'it', ja: 'ja', zh: 'zh-CN' };
let LANG = 'en', DICT = {};
const tr = (s) => (DICT && Object.prototype.hasOwnProperty.call(DICT, s) ? DICT[s] : s);
function t(en, vars) { let s = tr(en); if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)); return s; }
const tn = (one, other, n) => t(n === 1 ? one : other, { n });
/* template with DOM nodes inside, e.g. tpl('I read {privacy} and {terms}.', { privacy: node, terms: node }) */
function tpl(en, nodes) { return tr(en).split(/(\{\w+\})/).map((p) => { const m = /^\{(\w+)\}$/.exec(p); return m && nodes[m[1]] ? nodes[m[1]] : p; }); }
const utext = (s) => document.createTextNode(String(s == null ? '' : s));   /* user content: shown as is */
function applyLangAttrs() { const el = document.documentElement; el.lang = LANG; el.dir = LANG === 'ar' ? 'rtl' : 'ltr'; }
function loadLangFile(code) {
  return new Promise((res) => {
    if (code === 'en') return res({});
    if (window.I18N && window.I18N[code]) return res(window.I18N[code]);
    const s = document.createElement('script'); s.src = 'i18n/' + code + '.js?v=20261017';
    s.onload = () => res((window.I18N && window.I18N[code]) || {}); s.onerror = () => res({}); document.head.appendChild(s);
  });
}
function loadDataFile(code) { /* translated facts (My Path, opportunities): English sentence -> translation */
  return new Promise((res) => {
    if (code === 'en') return res({});
    if (window.I18N_DATA && window.I18N_DATA[code]) return res(window.I18N_DATA[code]);
    const s = document.createElement('script'); s.src = 'i18n/' + code + '.data.js?v=20261017';
    s.onload = () => res((window.I18N_DATA && window.I18N_DATA[code]) || {}); s.onerror = () => res({}); document.head.appendChild(s);
  });
}
async function setLang(code, rerender) {
  if (!LANGS.some((l) => l[0] === code)) code = 'en';
  const [ui, data] = await Promise.all([loadLangFile(code), loadDataFile(code)]);
  DICT = Object.assign({}, data, ui); LANG = code; applyLangAttrs();
  try { localStorage.setItem('beyond:lang', code); } catch (e) {}
  if (rerender && typeof render === 'function') render();
}
async function initLang() {
  let c = null; try { c = localStorage.getItem('beyond:lang'); } catch (e) {}
  if (!c) { const n = ((navigator.language || 'en').toLowerCase()); c = (LANGS.find((l) => n === l[0] || n.startsWith(l[0] + '-')) || ['en'])[0]; }
  await setLang(c, false);
}
