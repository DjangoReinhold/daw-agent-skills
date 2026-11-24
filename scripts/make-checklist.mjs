#!/usr/bin/env node
// Turn an analysis into one standalone HTML checklist the producer can work through.
// Works with any agent: the agent writes notes.json, this script writes the page. Zero dependencies.
//
//   node scripts/make-checklist.mjs --notes notes.json [--report report.json] [--out checklist.html]
//
// notes.json (see examples/sample-notes.json):
//   { "title": "...", "genre": "...", "stage": "pre-master|streaming master|club master",
//     "verdict": ["short bullet", ...],
//     "moves": [{ "priority": "high|med|low", "area": "low end", "do": "...", "why": "...",
//                 "check": "how to confirm it worked", "claims": ["K-0801"] }],
//     "watch": ["what the report cannot tell you", ...],
//     "questions": ["question for the producer", ...] }
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const get = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const notesPath = get('--notes');
if (!notesPath) {
  console.error('usage: make-checklist.mjs --notes notes.json [--report report.json] [--out checklist.html]');
  process.exit(1);
}
const notes = JSON.parse(fs.readFileSync(notesPath, 'utf8'));
const report = get('--report') ? JSON.parse(fs.readFileSync(get('--report'), 'utf8')) : null;
const out = get('--out') || path.join(path.dirname(notesPath), 'checklist.html');

const claimsFile = path.join(root, 'knowledge', 'claims.jsonl');
const claims = {};
if (fs.existsSync(claimsFile))
  for (const l of fs.readFileSync(claimsFile, 'utf8').split(/\r?\n/).filter(Boolean)) {
    const c = JSON.parse(l);
    claims[c.id] = c;
  }

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = (v, d = 1, unit = '') => (typeof v === 'number' ? v.toFixed(d) + unit : '—');
const warn = [];

// metric strip from report.json (every field optional)
const metrics = [];
if (report) {
  const e = report.loudness?.ebur128 || {};
  const t = report.tempo?.topCandidates?.[0];
  const k = report.key?.topCandidates?.[0];
  metrics.push(
    ['Loudness', num(e.integratedLufs, 1), 'LUFS'],
    ['True peak', num(e.truePeakDbtp, 1), 'dBTP'],
    ['LRA', num(e.lraLu, 1), 'LU'],
    ['Crest', num(report.dynamics?.crestFactorDb, 1), 'dB'],
    ['Stereo corr.', num(report.stereo?.fullBandCorrelation, 2), ''],
    ['Tempo', t ? String(t.bpm) : '—', 'BPM'],
    ['Key', k ? k.key : '—', k ? k.camelot : ''],
  );
}

const used = new Set();
const chip = (id) => {
  if (!claims[id]) { warn.push(`unknown claim ${id}`); return `<span class="chip bad" title="Not in claims.jsonl">${esc(id)}</span>`; }
  used.add(id);
  return `<a class="chip" href="#${esc(id)}" title="${esc(claims[id].source + ', ' + claims[id].where)}">${esc(id)}</a>`;
};

const order = { high: 0, med: 1, low: 2 };
const moves = (notes.moves || []).map((m, i) => ({ ...m, i, priority: order[m.priority] === undefined ? 'med' : m.priority }));
moves.sort((a, b) => order[a.priority] - order[b.priority] || a.i - b.i);
for (const m of moves) if (!m.do) warn.push(`move ${m.i + 1} has no "do"`);

const li = (arr) => (arr || []).map((x) => `<li>${esc(x)}</li>`).join('');
const moveHtml = moves
  .map(
    (m, n) => `<li class="move ${m.priority}">
  <label><input type="checkbox" data-k="m${m.i}"> <span class="do">${esc(m.do)}</span></label>
  <div class="meta"><span class="tag ${m.priority}">${m.priority}</span>${m.area ? `<span class="tag area">${esc(m.area)}</span>` : ''}${(m.claims || []).map(chip).join('')}</div>
  ${m.why ? `<p><b>Why:</b> ${esc(m.why)}</p>` : ''}
  ${m.check ? `<p><b>Check:</b> ${esc(m.check)}</p>` : ''}
</li>`,
  )
  .join('\n');

const sources = [...used]
  .sort()
  .map((id) => `<li id="${id}"><b>${id}</b> · ${esc(claims[id].source)}, ${esc(claims[id].where)}${claims[id].confidence.includes('ocr') ? ' (OCR)' : ''}<br>${esc(claims[id].claim)}</li>`)
  .join('');

const key = 'daw-checklist:' + (notes.title || 'untitled');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(notes.title || 'Mix checklist')}</title>
<style>
:root{--bg:#fafaf8;--fg:#1d1d1b;--mut:#6b6b66;--card:#fff;--line:#e2e2dc;--hi:#c0392b;--med:#b9770e;--lo:#2e7d5b;--acc:#2d5da8}
@media(prefers-color-scheme:dark){:root{--bg:#161615;--fg:#ececE6;--mut:#9a9a92;--card:#1f1f1d;--line:#34342f;--hi:#ef7b6e;--med:#e0a94a;--lo:#6cc19a;--acc:#7aa7ec}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif}
main{max-width:760px;margin:0 auto;padding:24px 16px 64px}h1{font-size:1.5rem;margin:0}h2{font-size:1.05rem;margin:28px 0 8px;text-transform:uppercase;letter-spacing:.04em;color:var(--mut)}
.sub{color:var(--mut);margin:4px 0 16px}.strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:8px}
.m{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 10px}.m small{display:block;color:var(--mut);font-size:.72rem}.m b{font-size:1.1rem}.m i{font-style:normal;color:var(--mut);font-size:.8rem;margin-left:3px}
ul{padding-left:20px}.moves{list-style:none;padding:0;margin:0}.move{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--med);border-radius:8px;padding:10px 12px;margin:8px 0}
.move.high{border-left-color:var(--hi)}.move.low{border-left-color:var(--lo)}.move label{display:flex;gap:8px;align-items:flex-start;cursor:pointer}.move input{margin-top:5px;width:18px;height:18px}
.move.done{opacity:.55}.move.done .do{text-decoration:line-through}.do{font-weight:600}.meta{margin:6px 0 0 26px;display:flex;gap:6px;flex-wrap:wrap}.move p{margin:6px 0 0 26px;font-size:.92rem}
.tag,.chip{font-size:.72rem;border-radius:99px;padding:1px 8px;border:1px solid var(--line);color:var(--mut);text-decoration:none}.tag.high{color:var(--hi);border-color:var(--hi)}.tag.med{color:var(--med);border-color:var(--med)}.tag.low{color:var(--lo);border-color:var(--lo)}
.chip{color:var(--acc);border-color:var(--acc)}.chip.bad{color:var(--hi);border-color:var(--hi)}
textarea{width:100%;min-height:90px;background:var(--card);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:8px;font:inherit}
#prog{color:var(--mut);font-size:.9rem}.src{font-size:.85rem;color:var(--mut)}.src li{margin:6px 0}footer{margin-top:32px;color:var(--mut);font-size:.8rem}
@media print{body{background:#fff;color:#000}.move{break-inside:avoid}textarea{border:1px solid #999}}
</style></head><body><main>
<h1>${esc(notes.title || 'Mix checklist')}</h1>
<p class="sub">${[notes.genre && 'Genre: ' + notes.genre, notes.stage && 'Stage: ' + notes.stage].filter(Boolean).map(esc).join(' · ')}</p>
${metrics.length ? `<div class="strip">${metrics.map(([a, b, c]) => `<div class="m"><small>${esc(a)}</small><b>${esc(b)}</b><i>${esc(c)}</i></div>`).join('')}</div>` : ''}
${notes.verdict?.length ? `<h2>Verdict</h2><ul>${li(notes.verdict)}</ul>` : ''}
<h2>Do these <span id="prog"></span></h2>
<ol class="moves">${moveHtml}</ol>
${notes.watch?.length ? `<h2>The report cannot tell you</h2><ul>${li(notes.watch)}</ul>` : ''}
${notes.questions?.length ? `<h2>Questions for you</h2><ul>${li(notes.questions)}</ul>` : ''}
<h2>Your notes</h2><textarea id="notes" placeholder="What did you hear? What changed?"></textarea>
${sources ? `<h2>Where the numbers come from</h2><ul class="src">${sources}</ul>` : ''}
<footer>Book numbers are typical values, not rules. Trust your ears. Made by scripts/make-checklist.mjs from daw-agent-skills.</footer>
</main>
<script>
const K=${JSON.stringify(key)};let s={};try{s=JSON.parse(localStorage.getItem(K)||'{}')}catch(e){}
const boxes=[...document.querySelectorAll('input[data-k]')],prog=document.getElementById('prog'),ta=document.getElementById('notes');
function upd(){const n=boxes.filter(b=>b.checked).length;prog.textContent=boxes.length?'('+n+' of '+boxes.length+' done)':'';boxes.forEach(b=>b.closest('.move').classList.toggle('done',b.checked))}
function save(){try{localStorage.setItem(K,JSON.stringify(s))}catch(e){}}
boxes.forEach(b=>{b.checked=!!s[b.dataset.k];b.onchange=()=>{s[b.dataset.k]=b.checked;save();upd()}});
ta.value=s.notes||'';ta.oninput=()=>{s.notes=ta.value;save()};upd();
</script></body></html>
`;
fs.writeFileSync(out, html);
console.log(`wrote ${out} (${moves.length} moves, ${used.size} claims cited)`);
if (warn.length) console.error('warnings:\n  ' + warn.join('\n  '));
