#!/usr/bin/env node
// Walk the harness federation and return matching KB entries.
// Used by both `consult-knowledge` (with explicit query tags) and
// `survey-relevant` (with --mode survey, broader matching).
//
// Usage:
//   node consult.mjs --project-root <abs-path>
//                    [--tools <csv>] [--domains <csv>]
//                    [--mode summary|full|survey]
//                    [--limit <N>]
//                    [--vocabulary <path>]
//
// Output: JSON to stdout with { total, returned, queryTools, queryDomains, results }.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ----- arg parsing ----------------------------------------------------------

const args = process.argv.slice(2);
const opts = { mode: 'summary', limit: 5 };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--project-root') opts.projectRoot = args[++i];
  else if (a === '--tools') opts.tools = args[++i].split(',').map((s) => s.trim()).filter(Boolean);
  else if (a === '--domains') opts.domains = args[++i].split(',').map((s) => s.trim()).filter(Boolean);
  else if (a === '--mode') opts.mode = args[++i];
  else if (a === '--limit') opts.limit = parseInt(args[++i], 10);
  else if (a === '--vocabulary') opts.vocabularyPath = args[++i];
  else {
    process.stderr.write(`unknown arg: ${a}\n`);
    process.exit(1);
  }
}

if (!opts.projectRoot || !path.isAbsolute(opts.projectRoot)) {
  process.stderr.write('--project-root must be absolute\n');
  process.exit(1);
}
if (!['summary', 'full', 'survey'].includes(opts.mode)) {
  process.stderr.write(`invalid --mode: ${opts.mode}\n`);
  process.exit(1);
}

// ----- frontmatter parsers (same shape as rebuild-index) -------------------

function extractFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : '';
}

function scalarField(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

function listField(fm, key) {
  const inline = fm.match(new RegExp(`^${key}:\\s*\\[(.*?)\\]\\s*$`, 'm'));
  if (inline) {
    return inline[1]
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }
  const block = fm.match(new RegExp(`^${key}:\\s*\\n((?:\\s+-\\s+.+\\n?)+)`, 'm'));
  if (block) {
    return block[1]
      .split(/\r?\n/)
      .map((line) => line.match(/^\s+-\s+(.+?)\s*$/)?.[1])
      .filter(Boolean)
      .map((s) => s.replace(/^['"]|['"]$/g, ''));
  }
  return [];
}

function appliesTo(fm, sub) {
  const m = fm.match(/^applies-to:\s*\n((?:[ \t]+\S.*\n?)+)/m);
  if (!m) return [];
  const block = m[1];
  return listField(block.replace(/^[ \t]+/gm, ''), sub);
}

function extractTitle(content) {
  const body = content.replace(/^---[\s\S]*?\n---\s*\n?/, '');
  const m = body.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : '<untitled>';
}

// ----- vocabulary aliases ---------------------------------------------------

function loadAliases() {
  const candidates = [
    opts.vocabularyPath,
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      '..',
      'shared',
      'per-project-kb',
      'vocabulary.yaml',
    ),
  ].filter(Boolean);
  for (const f of candidates) {
    if (fs.existsSync(f)) {
      const c = fs.readFileSync(f, 'utf8');
      const aliasBlock = c.match(/^aliases:\s*\n((?:\s+\S.*\n?)+)/m);
      if (!aliasBlock) return {};
      const aliases = {};
      for (const line of aliasBlock[1].split(/\r?\n/)) {
        const m = line.match(/^\s+(\S+):\s*(\S+)/);
        if (m) aliases[m[1]] = m[2];
      }
      return aliases;
    }
  }
  return {};
}

const aliases = loadAliases();
function resolveTag(tag) {
  return aliases[tag] || tag;
}

function normalizeList(list) {
  return [...new Set((list || []).map(resolveTag))];
}

// ----- registry / manifest --------------------------------------------------

function readRegistry() {
  const f = path.join(os.homedir(), '.claude', 'harness-projects.json');
  if (!fs.existsSync(f)) return { version: 1, projects: [] };
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return { version: 1, projects: [] };
  }
}

function readManifest(projectRoot) {
  const f = path.join(projectRoot, 'docs', 'knowledge', 'manifest.yaml');
  if (!fs.existsSync(f)) return null;
  const c = fs.readFileSync(f, 'utf8');
  // The manifest has a top-level `project:` block. Parse the indented sub-fields.
  const projectBlock = c.match(/^project:\s*\n([\s\S]*)/m);
  if (!projectBlock) return null;
  const block = projectBlock[1];
  const unindented = block
    .split(/\r?\n/)
    .map((line) => line.replace(/^  /, ''))
    .join('\n');
  return {
    id: scalarField(unindented, 'id'),
    name: scalarField(unindented, 'name'),
    type: scalarField(unindented, 'type'),
    tools: normalizeList(listField(unindented, 'tools')),
    domains: normalizeList(listField(unindented, 'domains')),
  };
}

// ----- entry walk -----------------------------------------------------------

const TYPES = ['gotchas', 'decisions', 'conventions', 'ground-truth', 'references', 'patterns'];

function readEntries(projectRoot, includeBody = false) {
  const kbRoot = path.join(projectRoot, 'docs', 'knowledge');
  if (!fs.existsSync(kbRoot)) return [];
  const out = [];
  for (const type of TYPES) {
    const dir = path.join(kbRoot, type);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
      const filePath = path.join(dir, f);
      const content = fs.readFileSync(filePath, 'utf8');
      const fm = extractFrontmatter(content);
      const freshness = scalarField(fm, 'freshness');
      if (freshness === 'superseded') continue;
      out.push({
        type,
        relPath: `${type}/${f}`,
        title: extractTitle(content),
        freshness: freshness || '<missing>',
        lastValidated: scalarField(fm, 'last-validated') || '<missing>',
        tools: normalizeList(appliesTo(fm, 'tools')),
        domains: normalizeList(appliesTo(fm, 'domains')),
        body: includeBody ? content : undefined,
        bodySize: content.length,
      });
    }
  }
  return out;
}

// ----- scoring --------------------------------------------------------------

function scoreEntry(entry, queryTools, queryDomains) {
  const toolHits = entry.tools.filter((t) => queryTools.includes(t)).length;
  const domainHits = entry.domains.filter((d) => queryDomains.includes(d)).length;
  let score = toolHits * 2 + domainHits * 3;
  if (entry.freshness === 'static') score += 1;
  else if (entry.freshness === 'living') score += 0.5;
  else if (entry.freshness === 'hypothesis') score -= 0.5;
  return score;
}

// ----- main -----------------------------------------------------------------

const currentManifest = readManifest(opts.projectRoot);
const queryTools = normalizeList(opts.tools && opts.tools.length ? opts.tools : currentManifest?.tools || []);
const queryDomains = normalizeList(opts.domains && opts.domains.length ? opts.domains : currentManifest?.domains || []);

if (queryTools.length === 0 && queryDomains.length === 0) {
  process.stdout.write(
    JSON.stringify(
      {
        total: 0,
        returned: 0,
        queryTools,
        queryDomains,
        results: [],
        note: 'No query tags. Either pass --tools/--domains or register the current project.',
      },
      null,
      2,
    ) + '\n',
  );
  process.exit(0);
}

const registry = readRegistry();
const currentRootResolved = path.resolve(opts.projectRoot);
const minScore = opts.mode === 'survey' ? 0.5 : 2;
const includeBodyRequested = opts.mode === 'full';

const all = [];
for (const proj of registry.projects) {
  if (proj.trust === 'disabled') continue;
  if (path.resolve(proj.path) === currentRootResolved) continue;

  const mf = readManifest(proj.path);
  if (!mf) continue;

  // Manifest-level filter — if the project shares zero tags with the query,
  // skip it entirely (saves entry-walk time).
  const projHasTool = mf.tools.some((t) => queryTools.includes(t));
  const projHasDomain = mf.domains.some((d) => queryDomains.includes(d));
  if (!projHasTool && !projHasDomain) continue;

  const includeBody = includeBodyRequested && proj.trust === 'full';
  const entries = readEntries(proj.path, includeBody);
  for (const entry of entries) {
    const score = scoreEntry(entry, queryTools, queryDomains);
    if (score < minScore) continue;
    // body size guard — survey/summary modes always strip; full mode strips bodies > 4KB
    if (entry.body && entry.body.length > 4096) {
      entry.body = undefined;
      entry.bodyTooLargeForInline = true;
    }
    all.push({
      project: proj.id,
      projectName: mf.name || proj.id,
      projectPath: proj.path,
      ...entry,
      score,
    });
  }
}

all.sort((a, b) => b.score - a.score || (b.lastValidated || '').localeCompare(a.lastValidated || ''));

const limit = opts.mode === 'survey' ? opts.limit : opts.limit;
const limited = all.slice(0, limit);

process.stdout.write(
  JSON.stringify(
    {
      total: all.length,
      returned: limited.length,
      queryTools,
      queryDomains,
      mode: opts.mode,
      results: limited,
    },
    null,
    2,
  ) + '\n',
);
