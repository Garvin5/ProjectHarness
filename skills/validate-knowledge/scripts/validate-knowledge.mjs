#!/usr/bin/env node
// Local QA sweep across docs/knowledge/.
// Returns JSON: { errors, warnings, candidates, summary }.
// Does NOT modify anything.
//
// Usage:
//   node validate-knowledge.mjs --project-root <abs-path>
//                                [--vocabulary <path>]
//                                [--stale-living-days N]      default 90
//                                [--stale-hypothesis-days N]  default 30

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opts = { staleLivingDays: 90, staleHypothesisDays: 30 };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--project-root') opts.projectRoot = args[++i];
  else if (a === '--vocabulary') opts.vocabularyPath = args[++i];
  else if (a === '--stale-living-days') opts.staleLivingDays = parseInt(args[++i], 10);
  else if (a === '--stale-hypothesis-days') opts.staleHypothesisDays = parseInt(args[++i], 10);
  else {
    process.stderr.write(`unknown arg: ${a}\n`);
    process.exit(1);
  }
}

if (!opts.projectRoot || !path.isAbsolute(opts.projectRoot)) {
  process.stderr.write('--project-root must be absolute\n');
  process.exit(1);
}

const kbRoot = path.join(opts.projectRoot, 'docs', 'knowledge');
if (!fs.existsSync(kbRoot)) {
  process.stdout.write(JSON.stringify({ note: 'no KB found', errors: [], warnings: [], candidates: [] }) + '\n');
  process.exit(0);
}

// ----- frontmatter parsers (shared with consult.mjs) -----------------------

function extractFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : null;
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
  if (!m) return null; // distinguish "missing" from "empty"
  const block = m[1];
  return listField(block.replace(/^[ \t]+/gm, ''), sub);
}

function appliesToHasField(fm) {
  return /^applies-to:/m.test(fm);
}

function provenanceList(fm) {
  const block = fm.match(/^provenance:\s*\n((?:\s+-\s+.+\n?)+)/m);
  if (!block) {
    // also catch inline `provenance: []`
    if (/^provenance:\s*\[\s*\]\s*$/m.test(fm)) return [];
    return null;
  }
  return block[1]
    .split(/\r?\n/)
    .filter((l) => /^\s+-/.test(l));
}

function extractTitle(content) {
  const body = content.replace(/^---[\s\S]*?\n---\s*\n?/, '');
  const m = body.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : '<untitled>';
}

// ----- vocabulary -----------------------------------------------------------

function loadVocabulary() {
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
      return {
        tools: extractTopLevelList(c, 'tools'),
        domains: extractTopLevelList(c, 'domains'),
        projectTypes: extractTopLevelList(c, 'project-type'),
        aliases: extractAliases(c),
      };
    }
  }
  return { tools: [], domains: [], projectTypes: [], aliases: {} };
}

function extractTopLevelList(yaml, key) {
  // Match `<key>:\n` followed by indented `- value` or `  - value` lines, stopping at next top-level key
  const m = yaml.match(new RegExp(`^${key}:\\s*\\n((?:\\s+-\\s+.+\\n?|\\s*#.*\\n)+)`, 'm'));
  if (!m) return [];
  return m[1]
    .split(/\r?\n/)
    .map((line) => line.match(/^\s+-\s+(.+?)\s*$/)?.[1])
    .filter(Boolean);
}

function extractAliases(yaml) {
  const m = yaml.match(/^aliases:\s*\n((?:\s+\S.*\n?)+)/m);
  if (!m) return {};
  const aliases = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^\s+(\S+):\s*(\S+)/);
    if (mm) aliases[mm[1]] = mm[2];
  }
  return aliases;
}

// ----- manifest tags --------------------------------------------------------

function readManifestTags() {
  const f = path.join(kbRoot, 'manifest.yaml');
  if (!fs.existsSync(f)) return { tools: [], domains: [] };
  const c = fs.readFileSync(f, 'utf8');
  const projectBlock = c.match(/^project:\s*\n([\s\S]*)/m);
  if (!projectBlock) return { tools: [], domains: [] };
  const unindented = projectBlock[1]
    .split(/\r?\n/)
    .map((line) => line.replace(/^  /, ''))
    .join('\n');
  return {
    tools: listField(unindented, 'tools'),
    domains: listField(unindented, 'domains'),
  };
}

// ----- entry walk -----------------------------------------------------------

const TYPES = ['gotchas', 'decisions', 'conventions', 'ground-truth', 'references', 'patterns'];
const REQUIRED_FIELDS = ['type', 'activation', 'freshness', 'last-validated'];
const META_TOOLS = new Set(['claude-code', 'codex', 'git', 'bash', 'powershell']);
const WORKFLOW_GENERAL_DOMAINS = new Set(['debugging', 'testing', 'prompt-engineering']);

function walkEntries() {
  const entries = [];
  for (const type of TYPES) {
    const dir = path.join(kbRoot, type);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
      const filePath = path.join(dir, f);
      const content = fs.readFileSync(filePath, 'utf8');
      entries.push({
        type,
        relPath: `${type}/${f}`,
        filePath,
        content,
      });
    }
  }
  return entries;
}

// ----- validation -----------------------------------------------------------

function daysSince(isoDate) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return Infinity;
  const then = new Date(isoDate + 'T00:00:00Z').getTime();
  return Math.floor((Date.now() - then) / 86400000);
}

function jaccard(a, b) {
  if (a.length === 0 && b.length === 0) return 1;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  return inter / (sa.size + sb.size - inter);
}

function titleWordOverlap(t1, t2) {
  const w1 = t1.toLowerCase().split(/[^a-z0-9一-鿿]+/).filter((w) => w.length > 2);
  const w2 = t2.toLowerCase().split(/[^a-z0-9一-鿿]+/).filter((w) => w.length > 2);
  return jaccard(w1, w2);
}

function validate() {
  const vocab = loadVocabulary();
  const aliases = vocab.aliases;
  const knownTools = new Set([...vocab.tools, ...Object.keys(aliases), ...Object.values(aliases)]);
  const knownDomains = new Set(vocab.domains);
  const knownProjectTypes = new Set(vocab.projectTypes);
  const manifestTags = readManifestTags();

  const errors = [];
  const warnings = [];
  const candidates = [];

  const allEntries = walkEntries();
  const parsed = [];
  const supersededIds = new Set();

  // Index entries in _superseded/ for supersedes-chain validation
  for (const type of TYPES) {
    const dir = path.join(kbRoot, type, '_superseded');
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
      supersededIds.add(`${type}/${f.replace(/\.md$/, '')}`);
    }
  }

  for (const e of allEntries) {
    const fm = extractFrontmatter(e.content);
    if (!fm) {
      errors.push({ kind: 'malformed-frontmatter', entry: e.relPath, detail: 'no frontmatter block found' });
      continue;
    }

    // required fields
    for (const field of REQUIRED_FIELDS) {
      if (!new RegExp(`^${field}:`, 'm').test(fm)) {
        errors.push({ kind: 'missing-field', entry: e.relPath, field });
      }
    }
    if (!appliesToHasField(fm)) {
      errors.push({ kind: 'missing-field', entry: e.relPath, field: 'applies-to' });
    }
    if (!/^supersedes:/m.test(fm)) {
      errors.push({ kind: 'missing-field', entry: e.relPath, field: 'supersedes' });
    }

    // provenance non-empty
    const prov = provenanceList(fm);
    if (prov === null) {
      errors.push({ kind: 'missing-field', entry: e.relPath, field: 'provenance' });
    } else if (prov.length === 0) {
      errors.push({ kind: 'empty-provenance', entry: e.relPath });
    }

    // freshness validity
    const freshness = scalarField(fm, 'freshness');
    if (freshness && !['static', 'living', 'hypothesis', 'superseded'].includes(freshness)) {
      errors.push({ kind: 'invalid-freshness', entry: e.relPath, value: freshness });
    }

    // staleness
    const lv = scalarField(fm, 'last-validated');
    const days = daysSince(lv);
    if (freshness === 'living' && days > opts.staleLivingDays) {
      warnings.push({
        kind: 'stale',
        entry: e.relPath,
        freshness: 'living',
        lastValidated: lv,
        daysAgo: days,
        recommend: 'revalidate-entry',
      });
    }
    if (freshness === 'hypothesis' && days > opts.staleHypothesisDays) {
      warnings.push({
        kind: 'stale',
        entry: e.relPath,
        freshness: 'hypothesis',
        lastValidated: lv,
        daysAgo: days,
        recommend: 'revalidate-entry-or-supersede',
      });
    }

    // orphan tags
    const tools = appliesTo(fm, 'tools') || [];
    const domains = appliesTo(fm, 'domains') || [];
    const projectTypes = appliesTo(fm, 'project-type') || [];
    for (const t of tools) {
      if (!knownTools.has(t)) {
        warnings.push({ kind: 'orphan-tag', entry: e.relPath, axis: 'tools', tag: t });
      }
    }
    for (const d of domains) {
      if (!knownDomains.has(d)) {
        warnings.push({ kind: 'orphan-tag', entry: e.relPath, axis: 'domains', tag: d });
      }
    }
    for (const p of projectTypes) {
      if (!knownProjectTypes.has(p)) {
        warnings.push({ kind: 'orphan-tag', entry: e.relPath, axis: 'project-type', tag: p });
      }
    }

    // supersedes chain
    const supersedes = listField(fm, 'supersedes');
    for (const ref of supersedes) {
      if (!supersededIds.has(ref)) {
        // Also accept the case where the old entry might still exist (mid-migration)
        const refPath = path.join(kbRoot, ref + '.md');
        const refSupersededPath = path.join(kbRoot, ref.replace('/', '/_superseded/') + '.md');
        if (!fs.existsSync(refPath) && !fs.existsSync(refSupersededPath)) {
          errors.push({ kind: 'broken-supersedes', entry: e.relPath, ref, expected: refSupersededPath });
        }
      }
    }

    parsed.push({
      relPath: e.relPath,
      title: extractTitle(e.content),
      tools,
      domains,
      freshness,
      content: e.content,
    });
  }

  // S1 merge candidates — pairs with high applies-to + title overlap
  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const a = parsed[i];
      const b = parsed[j];
      // same type only
      if (a.relPath.split('/')[0] !== b.relPath.split('/')[0]) continue;
      const toolJ = jaccard(a.tools, b.tools);
      const domainJ = jaccard(a.domains, b.domains);
      const titleJ = titleWordOverlap(a.title, b.title);
      if (toolJ >= 0.8 && domainJ >= 0.8 && titleJ >= 0.5) {
        candidates.push({
          kind: 'S1-merge',
          entries: [a.relPath, b.relPath],
          metrics: { toolJaccard: toolJ.toFixed(2), domainJaccard: domainJ.toFixed(2), titleOverlap: titleJ.toFixed(2) },
          recommend: 'review and merge or supersede',
        });
      }
    }
  }

  // S2 archive candidates — entries tagging tools not in current manifest
  if (manifestTags.tools.length > 0) {
    const currentToolSet = new Set(manifestTags.tools.map((t) => aliases[t] || t));
    for (const p of parsed) {
      const orphanTools = p.tools.filter((t) => !currentToolSet.has(aliases[t] || t));
      if (orphanTools.length > 0 && orphanTools.length === p.tools.length && p.tools.length > 0) {
        candidates.push({
          kind: 'S2-archive',
          entry: p.relPath,
          orphanTools,
          recommend: 'project no longer uses these tools — consider supersede with no replacement (archive)',
        });
      }
    }
  }

  // S3 bubble-up candidates — workflow-general entries
  for (const p of parsed) {
    let score = 0;
    if (p.tools.length === 0) score += 1;
    else if (p.tools.every((t) => META_TOOLS.has(t))) score += 2;
    if (p.domains.some((d) => WORKFLOW_GENERAL_DOMAINS.has(d))) score += 1;
    // body project-specificity heuristic — lots of forward-slash paths or `assets/` references
    const projectFileHints = (p.content.match(/`[^`]*\/[^`]*\.(?:ts|js|md|yaml|json|sh)`/g) || []).length;
    if (projectFileHints === 0) score += 1;
    if (score >= 3) {
      candidates.push({
        kind: 'S3-bubble-up',
        entry: p.relPath,
        score,
        recommend: 'looks workflow-general — evaluate for harness layer via bubble-up-knowledge',
      });
    }
  }

  return {
    summary: {
      errors: errors.length,
      warnings: warnings.length,
      candidates: candidates.length,
      totalEntries: allEntries.length,
    },
    errors,
    warnings,
    candidates,
  };
}

const result = validate();
process.stdout.write(JSON.stringify(result, null, 2) + '\n');

if (result.summary.errors > 0) process.exit(2);
process.exit(0);
