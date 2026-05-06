#!/usr/bin/env node
// Append a project entry to ~/.claude/harness-projects.json atomically.
// No deps. Refuses duplicate IDs.
//
// Usage:
//   node register-project.mjs --project-root <abs-path> --id <kebab-id> [--trust full|summary-only|disabled]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const opts = { trust: 'full' };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--project-root') opts.projectRoot = args[++i];
  else if (a === '--id') opts.id = args[++i];
  else if (a === '--trust') opts.trust = args[++i];
  else if (a === '--force-replace') opts.forceReplace = true;
  else {
    process.stderr.write(`unknown arg: ${a}\n`);
    process.exit(1);
  }
}

if (!opts.projectRoot || !opts.id) {
  process.stderr.write('Usage: register-project.mjs --project-root <abs-path> --id <kebab-id> [--trust ...] [--force-replace]\n');
  process.exit(1);
}

if (!path.isAbsolute(opts.projectRoot)) {
  process.stderr.write(`project-root must be absolute: ${opts.projectRoot}\n`);
  process.exit(1);
}

if (!['full', 'summary-only', 'disabled'].includes(opts.trust)) {
  process.stderr.write(`invalid trust: ${opts.trust}\n`);
  process.exit(1);
}

if (!/^[a-z0-9][a-z0-9-]*$/i.test(opts.id)) {
  process.stderr.write(`id must be kebab-case: ${opts.id}\n`);
  process.exit(1);
}

const registryPath = path.join(os.homedir(), '.claude', 'harness-projects.json');
fs.mkdirSync(path.dirname(registryPath), { recursive: true });

let registry;
if (fs.existsSync(registryPath)) {
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch (e) {
    process.stderr.write(`registry corrupt at ${registryPath}: ${e.message}\n`);
    process.exit(2);
  }
} else {
  registry = { version: 1, projects: [] };
}

if (registry.version !== 1) {
  process.stderr.write(`unsupported registry version: ${registry.version}\n`);
  process.exit(2);
}
if (!Array.isArray(registry.projects)) registry.projects = [];

const existingIdx = registry.projects.findIndex((p) => p.id === opts.id);
if (existingIdx !== -1 && !opts.forceReplace) {
  process.stderr.write(`id already registered: ${opts.id}; pass --force-replace to overwrite\n`);
  process.exit(3);
}

const entry = {
  id: opts.id,
  path: opts.projectRoot.replace(/\\/g, '/'),
  'registered-at': new Date().toISOString(),
  trust: opts.trust,
};

if (existingIdx !== -1) {
  registry.projects[existingIdx] = entry;
} else {
  registry.projects.push(entry);
}

// atomic write
const tmpPath = registryPath + '.tmp';
fs.writeFileSync(tmpPath, JSON.stringify(registry, null, 2) + '\n', 'utf8');
fs.renameSync(tmpPath, registryPath);

process.stdout.write(
  JSON.stringify(
    {
      registered: entry,
      total: registry.projects.length,
      action: existingIdx !== -1 ? 'replaced' : 'appended',
    },
    null,
    2,
  ) + '\n',
);
