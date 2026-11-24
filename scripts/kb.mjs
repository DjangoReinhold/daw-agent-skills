#!/usr/bin/env node
// Query and maintain knowledge/claims.jsonl. Zero dependencies.
//
//   node scripts/kb.mjs show K-0042
//   node scripts/kb.mjs search sidechain kick [--genre house] [--source Senior] [--topic low-end] [--limit 20]
//   node scripts/kb.mjs topics
//   node scripts/kb.mjs stats
//   node scripts/kb.mjs check          (validate the file and every K-#### cited in skills/)
//   node scripts/kb.mjs add --claim "..." --topic t --source Senior --where "pdf p. 12" [--genre house,techno] [--confidence book-typical]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'knowledge', 'claims.jsonl');
const REQUIRED = ['id', 'topic', 'claim', 'genre', 'source', 'where', 'confidence', 'added'];

const load = () =>
  fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((l, i) => {
        try { return JSON.parse(l); } catch { throw new Error(`claims.jsonl line ${i + 1} is not valid JSON`); }
      })
    : [];

const argv = process.argv.slice(2);
const cmd = argv.shift();
const flags = {};
const words = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[++i];
  else words.push(argv[i]);
}

const fmt = (c) =>
  `${c.id}  [${c.source}, ${c.where}] (${c.genre.join(', ')}) ${c.topic}\n    ${c.claim}${c.confidence !== 'book-typical' ? `\n    confidence: ${c.confidence}` : ''}`;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
}

const claims = load();

if (cmd === 'show') {
  if (!words.length) { console.error('usage: show K-0042 [K-0043 ...]'); process.exit(1); }
  for (const id of words) {
    const c = claims.find((x) => x.id === id.toUpperCase());
    console.log(c ? fmt(c) : `${id}: not found`);
  }
} else if (cmd === 'search') {
  const lim = +(flags.limit || 20);
  const hits = claims
    .filter((c) => !flags.genre || c.genre.some((g) => g.includes(flags.genre.toLowerCase())))
    .filter((c) => !flags.source || c.source.toLowerCase() === flags.source.toLowerCase())
    .filter((c) => !flags.topic || c.topic.includes(flags.topic.toLowerCase()))
    .map((c) => {
      const hay = (c.claim + ' ' + c.topic).toLowerCase();
      return { c, score: words.reduce((s, w) => s + (hay.includes(w.toLowerCase()) ? 1 : 0), 0) };
    })
    .filter((x) => !words.length || x.score === words.length)
    .slice(0, lim);
  hits.forEach((x) => console.log(fmt(x.c)));
  console.log(`\n${hits.length} shown (limit ${lim}).`);
} else if (cmd === 'topics') {
  const n = {};
  for (const c of claims) n[c.topic] = (n[c.topic] || 0) + 1;
  Object.entries(n).sort((a, b) => b[1] - a[1]).forEach(([t, k]) => console.log(String(k).padStart(4), t));
} else if (cmd === 'stats') {
  const by = {};
  for (const c of claims) by[c.source] = (by[c.source] || 0) + 1;
  console.log(`${claims.length} claims`);
  Object.entries(by).forEach(([s, k]) => console.log(`  ${s}: ${k}`));
} else if (cmd === 'check') {
  const errs = [];
  const ids = new Set();
  claims.forEach((c, i) => {
    for (const f of REQUIRED) if (c[f] === undefined || c[f] === '') errs.push(`line ${i + 1}: missing ${f}`);
    if (!/^K-\d{4,}$/.test(c.id || '')) errs.push(`line ${i + 1}: bad id ${c.id}`);
    if (ids.has(c.id)) errs.push(`line ${i + 1}: duplicate id ${c.id}`);
    ids.add(c.id);
    if (!Array.isArray(c.genre) || !c.genre.length) errs.push(`${c.id}: genre must be a non-empty array`);
    if (c.claim && c.claim.length > 400) errs.push(`${c.id}: claim over 400 characters (keep claims short and in your own words)`);
  });
  const cited = new Set();
  const skillsDir = path.join(root, 'skills');
  if (fs.existsSync(skillsDir))
    for (const f of walk(skillsDir)) {
      const t = fs.readFileSync(f, 'utf8');
      for (const m of t.matchAll(/\bK-\d{4,}\b/g)) {
        cited.add(m[0]);
        // skip the example ID used in how-to text
        if (m[0] !== 'K-0042' && !ids.has(m[0])) errs.push(`${path.relative(root, f)}: cites ${m[0]}, which is not in claims.jsonl`);
      }
    }
  console.log(`${claims.length} claims, ${cited.size} distinct IDs cited in skills/.`);
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
  console.log('OK');
} else if (cmd === 'add') {
  for (const f of ['claim', 'topic', 'source', 'where']) if (!flags[f]) { console.error(`--${f} is required`); process.exit(1); }
  const next = claims.reduce((m, c) => Math.max(m, +c.id.slice(2)), 0) + 1;
  const row = {
    id: 'K-' + String(next).padStart(4, '0'),
    topic: flags.topic,
    claim: flags.claim,
    genre: (flags.genre || 'universal').split(',').map((s) => s.trim().toLowerCase()),
    source: flags.source,
    where: flags.where,
    confidence: flags.confidence || 'book-typical',
    added: new Date().toISOString().slice(0, 10),
  };
  fs.appendFileSync(file, JSON.stringify(row) + '\n');
  console.log(`added ${row.id}`);
} else {
  console.log('commands: show <id> | search <words> [--genre g --source s --topic t --limit n] | topics | stats | check | add --claim ... --topic ... --source ... --where ...');
}
