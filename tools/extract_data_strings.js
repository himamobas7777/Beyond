// Extracts every sentence of researched data and opportunities that needs translating (names/titles are skipped).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const load = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/^const /mg, 'var ');
eval(load('data.js')); eval(load('pathdata.js'));
const set = new Set(); const add = (s) => { if (typeof s === 'string' && s.trim() && s !== 'Not stated') set.add(s); };
for (const d of Object.values(PATH_DEST)) {
  add(d.overview); add(d.admission_model);
  (d.tests || []).forEach((x) => { add(x.policy); (x.examples || []).forEach((e) => add(e.statement)); });
  (d.english || []).forEach((x) => add(x.note)); (d.german_language || []).forEach((x) => add(x.note));
  (d.documents || []).forEach((x) => { add(x.name); add(x.note); });
  (d.timeline || []).forEach((x) => { add(x.when); add(x.step); });
  if (d.visa) add(d.visa.summary);
  (d.funding || []).forEach((x) => { add(x.name); add(x.note); });
  (d.egyptian_notes || []).forEach((x) => add(x.note));
  (d.universities || []).forEach((x) => { add(x.why_example); add(x.requirements); });
  (d.key_links || []).forEach((x) => add(x.label)); (d.unverified || []).forEach(add);
}
(PATH_EGYPT.systems || []).forEach((x) => { add(x.summary); add(x.structure); add(x.grading); (x.tracks || []).forEach(add); });
(PATH_EGYPT.paperwork || []).forEach((x) => { add(x.name); add(x.note); });
(PATH_EGYPT.foreign_views || []).forEach((x) => { add(x.body); add(x.statement); });
(PATH_EGYPT.unverified || []).forEach(add);
BUILTIN_OPPS.forEach((o) => { add(o.descr); add(o.grade); add(o.eligibility); add(o.deadline); });
const arr = [...set];
fs.writeFileSync(process.argv[2] || path.join(__dirname, 'data_strings.json'), JSON.stringify(arr, null, 1));
console.log(arr.length, 'strings,', arr.join('').length, 'chars');
