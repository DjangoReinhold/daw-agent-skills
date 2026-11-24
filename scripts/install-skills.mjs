#!/usr/bin/env node
// Link the three skills in skills/ into a skills folder, so Claude Code (or Antigravity) can find them.
// Not needed for a plugin install. Zero dependencies.
//
//   node scripts/install-skills.mjs                       -> ~/.claude/skills
//   node scripts/install-skills.mjs --dest ~/.gemini/config/skills
//   node scripts/install-skills.mjs --copy                -> copy instead of link
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const get = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : undefined);
const dest = path.resolve((get('--dest') || path.join(os.homedir(), '.claude', 'skills')).replace(/^~/, os.homedir()));
const copy = args.includes('--copy');

fs.mkdirSync(dest, { recursive: true });
for (const name of fs.readdirSync(path.join(root, 'skills'))) {
  const src = path.join(root, 'skills', name);
  if (!fs.statSync(src).isDirectory()) continue;
  const target = path.join(dest, name);
  if (fs.existsSync(target) || fs.lstatSync(target, { throwIfNoEntry: false })) {
    console.log(`skip  ${name}: ${target} already exists`);
    continue;
  }
  if (copy) fs.cpSync(src, target, { recursive: true });
  else fs.symlinkSync(src, target, process.platform === 'win32' ? 'junction' : 'dir');
  console.log(`${copy ? 'copy' : 'link'}  ${name} -> ${target}`);
}
console.log(`\nThe analyzer stays in ${path.join(root, 'scripts')}. Keep this repo where it is.`);
