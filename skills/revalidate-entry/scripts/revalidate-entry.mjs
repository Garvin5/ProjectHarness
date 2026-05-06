#!/usr/bin/env node
// Mutate a knowledge entry's frontmatter: bump last-validated,
// optionally upgrade freshness, optionally append an application-log note.
// Then run rebuild-index.
//
// Usage:
//   node revalidate-entry.mjs --project-root <abs-path>
//                              --entry <type>/<id>
//                              [--bump-last-validated YYYY-MM-DD]
//                              [--upgrade-freshness static|living|hypothesis]
//                              [--add-application-note "<text>"]
//                              [--rebuild-index-path <path>]

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--project-root') opts.projectRoot = args[++i];
  else if (a === '--entry') opts.entry = args[++i];
  else if (a === '--bump-last-validated') opts.bumpDate = args[++i];
  else if (a === '--upgrade-freshness') opts.freshness = args[++i];
  else if (a === '--add-application-note') opts.note = args[++i];
  else if (a === '--rebuild-index-path') opts.rebuildPath = args[++i];
  else {
    process.stderr.write(`unknown arg: ${a}\n`);
    process.exit(1);
  }
}

if (!opts.projectRoot || !opts.entry) {
  process.stderr.write('Usage: revalidate-entry.mjs --project-root <abs> --entry <type>/<id> [...]\n');
  process.exit(1);
}

if (opts.freshness && !['static', 'living', 'hypothesis'].includes(opts.freshness)) {
  process.stderr.write(`invalid --upgrade-freshness: ${opts.freshness}\n`);
  process.exit(1);
}

if (opts.bumpDate && !/^\d{4}-\d{2}-\d{2}$/.test(opts.bumpDate)) {
  process.stderr.write(`invalid --bump-last-validated date: ${opts.bumpDate} (expected YYYY-MM-DD)\n`);
  process.exit(1);
}

const [type, entryId] = opts.entry.split('/');
if (!type || !entryId) {
  process.stderr.write(`malformed --entry: ${opts.entry}\n`);
  process.exit(1);
}

const entryPath = path.join(opts.projectRoot, 'docs', 'knowledge', type, entryId + '.md');
if (!fs.existsSync(entryPath)) {
  process.stderr.write(`entry not found: ${entryPath}\n`);
  process.exit(2);
}

const original = fs.readFileSync(entryPath, 'utf8');

// ----- frontmatter mutation -------------------------------------------------

const fmMatch = original.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
if (!fmMatch) {
  process.stderr.write('entry has no frontmatter\n');
  process.exit(2);
}
const [, openMarker, fmBody, closeMarker] = fmMatch;

// refuse if superseded
if (/^freshness:\s*superseded\b/m.test(fmBody)) {
  process.stderr.write('entry is freshness: superseded; refusing to revalidate\n');
  process.exit(3);
}

let newFm = fmBody;

if (opts.bumpDate) {
  if (/^last-validated:/m.test(newFm)) {
    newFm = newFm.replace(/^last-validated:.*$/m, `last-validated: ${opts.bumpDate}`);
  } else {
    newFm = newFm.replace(/\s*$/, '') + `\nlast-validated: ${opts.bumpDate}`;
  }
}

if (opts.freshness) {
  if (/^freshness:/m.test(newFm)) {
    newFm = newFm.replace(/^freshness:.*$/m, `freshness: ${opts.freshness}`);
  } else {
    newFm = newFm.replace(/\s*$/, '') + `\nfreshness: ${opts.freshness}`;
  }
}

let newContent = original.replace(fmMatch[0], openMarker + newFm + closeMarker);

// ----- application-log append ----------------------------------------------

if (opts.note) {
  const today = opts.bumpDate || new Date().toISOString().slice(0, 10);
  const logLine = `- ${today} — ${opts.note}`;
  if (/^## Application log\s*$/m.test(newContent)) {
    // append to existing section — insert after the heading
    newContent = newContent.replace(/^## Application log\s*$/m, `## Application log\n\n${logLine}`);
    // de-duplicate the blank line we just doubled
    newContent = newContent.replace(/(## Application log\n\n)\n+/, '$1');
  } else {
    // add a new section at end of body
    if (!/\n$/.test(newContent)) newContent += '\n';
    newContent += `\n## Application log\n\n${logLine}\n`;
  }
}

if (newContent === original) {
  process.stderr.write('no changes requested\n');
  process.exit(0);
}

// ----- write + rebuild ------------------------------------------------------

fs.writeFileSync(entryPath, newContent, 'utf8');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rebuildPath = opts.rebuildPath || path.resolve(scriptDir, '..', '..', 'rebuild-index', 'scripts', 'rebuild-index.mjs');
if (fs.existsSync(rebuildPath)) {
  try {
    const out = execFileSync('node', [rebuildPath, opts.projectRoot], { encoding: 'utf8' });
    process.stderr.write(out);
  } catch (e) {
    process.stderr.write(`rebuild-index failed: ${e.message}\n`);
  }
}

process.stdout.write(
  JSON.stringify(
    {
      action: 'revalidated',
      entry: opts.entry,
      changes: {
        bumpedLastValidated: opts.bumpDate || null,
        upgradedFreshness: opts.freshness || null,
        applicationNote: opts.note || null,
      },
    },
    null,
    2,
  ) + '\n',
);
