#!/usr/bin/env node
// Atomically supersede a knowledge entry with a new one.
// No deps.
//
// Usage:
//   node supersede-entry.mjs --project-root <abs-path> \
//     --old <type>/<old-id> \
//     --new <type>/<new-id> \
//     --new-body-file <tmp-path>
//
// The new-body-file should already contain frontmatter+body for the
// replacement, with `supersedes: [<type>/<old-id>]` set.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--project-root') opts.projectRoot = args[++i];
  else if (a === '--old') opts.old = args[++i];
  else if (a === '--new') opts.new = args[++i];
  else if (a === '--new-body-file') opts.newBodyFile = args[++i];
  else if (a === '--scanner-path') opts.scannerPath = args[++i];
  else if (a === '--rebuild-index-path') opts.rebuildIndexPath = args[++i];
  else if (a === '--no-scan') opts.noScan = true;
  else {
    process.stderr.write(`unknown arg: ${a}\n`);
    process.exit(1);
  }
}

const required = ['projectRoot', 'old', 'new', 'newBodyFile'];
for (const k of required) {
  if (!opts[k]) {
    process.stderr.write(`missing required arg --${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}\n`);
    process.exit(1);
  }
}

const kbRoot = path.join(opts.projectRoot, 'docs', 'knowledge');
if (!fs.existsSync(kbRoot)) {
  process.stderr.write(`KB not found at ${kbRoot}\n`);
  process.exit(2);
}

// ----- resolve paths --------------------------------------------------------

function resolveEntry(id) {
  // id is "<type>/<entry-id>" without trailing .md
  const [type, entryId] = id.split('/');
  if (!type || !entryId) {
    process.stderr.write(`malformed id: ${id} (expected <type>/<entry-id>)\n`);
    process.exit(1);
  }
  return {
    type,
    entryId,
    fullPath: path.join(kbRoot, type, entryId + '.md'),
    supersededDir: path.join(kbRoot, type, '_superseded'),
    supersededPath: path.join(kbRoot, type, '_superseded', entryId + '.md'),
  };
}

const oldRes = resolveEntry(opts.old);
const newRes = resolveEntry(opts.new);

if (!fs.existsSync(oldRes.fullPath)) {
  process.stderr.write(`old entry not found: ${oldRes.fullPath}\n`);
  process.exit(2);
}
if (fs.existsSync(newRes.fullPath)) {
  process.stderr.write(`new entry already exists: ${newRes.fullPath}\n`);
  process.exit(2);
}
if (!fs.existsSync(opts.newBodyFile)) {
  process.stderr.write(`new-body-file not found: ${opts.newBodyFile}\n`);
  process.exit(1);
}

// ----- secret scan on new body ----------------------------------------------

if (!opts.noScan) {
  const scannerPath =
    opts.scannerPath ||
    path.join(
      path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')),
      '..',
      '..',
      'redact-secrets',
      'scripts',
      'scan-secrets.mjs',
    );
  if (!fs.existsSync(scannerPath)) {
    process.stderr.write(`scanner not found at ${scannerPath}; pass --scanner-path or --no-scan\n`);
    process.exit(2);
  }
  try {
    const result = execFileSync('node', [scannerPath, '--file', opts.newBodyFile], {
      encoding: 'utf8',
    });
    // exit 0 from scanner means clean; we do not need to inspect output
    process.stderr.write('secret scan: clean\n');
  } catch (e) {
    if (e.status === 3) {
      process.stderr.write('secret scan: HIGH-CONFIDENCE finding; refusing to write\n');
      process.stderr.write(e.stdout || '');
      process.exit(3);
    } else if (e.status === 2) {
      // medium — let caller decide; emit findings and exit 2
      process.stderr.write('secret scan: medium-confidence findings; caller should prompt user\n');
      process.stdout.write(e.stdout || '');
      process.exit(2);
    } else {
      process.stderr.write(`scanner error: ${e.message}\n`);
      process.exit(2);
    }
  }
}

// ----- mutate old entry: set freshness=superseded + add superseded-by -------

function mutateOldFrontmatter(content, newId) {
  const fmMatch = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!fmMatch) {
    throw new Error('old entry has no frontmatter');
  }
  const [, openMarker, body, closeMarker] = fmMatch;
  let mutated = body;
  // replace freshness line
  if (/^freshness:/m.test(mutated)) {
    mutated = mutated.replace(/^freshness:.*$/m, 'freshness: superseded');
  } else {
    mutated = `freshness: superseded\n${mutated}`;
  }
  // append superseded-by
  if (!/^superseded-by:/m.test(mutated)) {
    mutated = mutated.replace(/\s*$/, '') + `\nsuperseded-by: ${newId}\n`;
  } else {
    mutated = mutated.replace(/^superseded-by:.*$/m, `superseded-by: ${newId}`);
  }
  return content.replace(fmMatch[0], openMarker + mutated.replace(/\s*$/, '') + closeMarker);
}

const oldContent = fs.readFileSync(oldRes.fullPath, 'utf8');
let mutatedOld;
try {
  mutatedOld = mutateOldFrontmatter(oldContent, opts.new);
} catch (e) {
  process.stderr.write(`failed to mutate old entry: ${e.message}\n`);
  process.exit(2);
}

// ----- atomic-ish sequence --------------------------------------------------

// State for rollback
const rollback = [];

function safe(action, undo) {
  try {
    action();
    rollback.push(undo);
  } catch (e) {
    process.stderr.write(`step failed: ${e.message}\n`);
    while (rollback.length) {
      try {
        rollback.pop()();
      } catch (rb) {
        process.stderr.write(`rollback step failed: ${rb.message}\n`);
      }
    }
    process.exit(2);
  }
}

// 1. write new entry
const newContent = fs.readFileSync(opts.newBodyFile, 'utf8');
safe(
  () => fs.writeFileSync(newRes.fullPath, newContent, 'utf8'),
  () => fs.existsSync(newRes.fullPath) && fs.unlinkSync(newRes.fullPath),
);

// 2. write mutated old in-place
safe(
  () => fs.writeFileSync(oldRes.fullPath, mutatedOld, 'utf8'),
  () => fs.writeFileSync(oldRes.fullPath, oldContent, 'utf8'),
);

// 3. ensure _superseded dir
safe(
  () => fs.mkdirSync(oldRes.supersededDir, { recursive: true }),
  () => {
    /* leave dir */
  },
);

// 4. move old entry into _superseded
safe(
  () => fs.renameSync(oldRes.fullPath, oldRes.supersededPath),
  () => {
    if (fs.existsSync(oldRes.supersededPath)) fs.renameSync(oldRes.supersededPath, oldRes.fullPath);
  },
);

// ----- rebuild index --------------------------------------------------------

const rebuildPath =
  opts.rebuildIndexPath ||
  path.join(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '')),
    '..',
    '..',
    'rebuild-index',
    'scripts',
    'rebuild-index.mjs',
  );

if (fs.existsSync(rebuildPath)) {
  try {
    const out = execFileSync('node', [rebuildPath, opts.projectRoot], { encoding: 'utf8' });
    process.stderr.write(out);
  } catch (e) {
    process.stderr.write(`rebuild-index failed: ${e.message}\n`);
    // don't roll back the supersede; just report
  }
} else {
  process.stderr.write(`rebuild-index script not found at ${rebuildPath}; skipped\n`);
}

process.stdout.write(
  JSON.stringify(
    {
      action: 'superseded',
      old: opts.old,
      new: opts.new,
      moved_to: path.relative(opts.projectRoot, oldRes.supersededPath),
    },
    null,
    2,
  ) + '\n',
);
