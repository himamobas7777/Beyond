// Collects every English UI string the app may pass through tr()/t(). Output: tools/i18n_keys.json
// Run: node tools/extract_i18n.js   (then check the "review" list printed at the end)
const fs = require('fs');
const src = (f) => fs.readFileSync(__dirname + '/../' + f, 'utf8');
let screens = src('screens.js');
// legal documents are intentionally shown in English only: cut them out
const a = screens.indexOf('function legalDocs()'), b = screens.indexOf('function legal(doc)');
screens = screens.slice(0, a) + screens.slice(b);
const files = { 'screens.js': screens, 'core.js': src('core.js'), 'main.js': src('main.js'), 'i18n.js': '' };
const out = new Set();
const lit = /'((?:[^'\\\n]|\\.)+)'/g;
const skip = /^(#|\.|--|var\(|data-|aria-|http|https:|<|\/|[a-z]+(-[a-z0-9]+)*$|[a-z]+:[a-z]|beyond:|\d)/;
for (const [f, s] of Object.entries(files)) {
  let m; while ((m = lit.exec(s))) {
    let v = m[1].replace(/\\'/g, "'").replace(/\\u2019/g, '’');
    if (!/[A-Za-z]{3,}/.test(v)) continue;
    if (skip.test(v)) continue;
    if (/^[a-z_]+$/.test(v)) continue;            // identifiers
    out.add(v.trim());
  }
}
// data.js lists
const ctx = {}; require('vm').createContext(ctx);
require('vm').runInContext(src('data.js') + '\nthis.X={CATEGORIES,INTERESTS,STAGES,NS};', ctx);
[...ctx.X.CATEGORIES, ...ctx.X.INTERESTS, ...ctx.X.STAGES, ctx.X.NS].forEach((v) => out.add(v));
['Free', 'Funded', 'Varies', 'Online', 'In person', 'Hybrid', 'Featured', 'Deadline', 'Done', 'Saved', 'Discovery', 'Experience', 'Question', 'Project', 'Milestone', 'Discussion', 'Not stated', 'Arab region'].forEach((v) => out.add(v));
// static text in index.html
const html = src('index.html'); let m;
const tag = />([^<>{}]*[A-Za-z]{3,}[^<>{}]*)</g;
const body = html.slice(html.indexOf('<body'));
while ((m = tag.exec(body))) out.add(m[1].trim().replace(/\s+/g, ' '));
const arr = [...out].filter(Boolean).sort();
fs.writeFileSync(__dirname + '/i18n_keys.json', JSON.stringify(arr, null, 1));
console.log(arr.length + ' keys');
console.log(arr.join('\n'));
