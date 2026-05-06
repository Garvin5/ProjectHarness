#!/usr/bin/env node
// Identify or stage S3 bubble-up candidates.
//
// Two modes:
//   --mode scan       — list all S3 candidates with scores (no writes)
//   --mode stage      — write a stub at the chosen target for one candidate
//
// Usage:
//   node bubble-up.mjs --project-root <abs-path> --mode scan
//
//   node bubble-up.mjs --project-root <abs-path> --mode stage
//                       --entry <type>/<id>
//                       --target-type memory|skill-description|new-skill
//                       --target-path <abs-path>

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opts = { mode: 'scan' };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--project-root') opts.projectRoot = args[++i];
  else if (a === '--mode') opts.mode = args[++i];
  else if (a === '--entry') opts.entry = args[++i];
  else if (a === '--target-type') opts.targetType = args[++i];
  else if (a === '--target-path') opts.targetPath = args[++i];
  else {
    process.stderr.write(`unknown arg: ${a}\n`);
    process.exit(1);
  }
}

if (!opts.projectRoot || !path.isAbsolute(opts.projectRoot)) {
  process.stderr.write('--project-root must be absolute\n');
  process.exit(1);
}

// ----- shared parsers (copied from consult.mjs) -----------------------------

function extractFrontmatter(content) {
  const m = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  return m ? { full: m[0], open: m[1], body: m[2], close: m[3] } : null;
}

function listField(fm, key) {
  const inline = fm.match(new RegExp(`^${key}:\\s*\\[(.*?)\\]\\s*$`, 'm'));
  if (inline)
    return inline[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  const block = fm.match(new RegExp(`^${key}:\\s*\\n((?:\\s+-\\s+.+\\n?)+)`, 'm'));
  if (block)
    return block[1]
      .split(/\r?\n/)
      .map((line) => line.match(/^\s+-\s+(.+?)\s*$/)?.[1])
      .filter(Boolean)
      .map((s) => s.replace(/^['"]|['"]$/g, ''));
  return [];
}

function appliesTo(fm, sub) {
  const m = fm.match(/^applies-to:\s*\n((?:[ \t]+\S.*\n?)+)/m);
  if (!m) return [];
  return listField(m[1].replace(/^[ \t]+/gm, ''), sub);
}

function extractTitle(content) {
  const body = content.replace(/^---[\s\S]*?\n---\s*\n?/, '');
  const m = body.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : '<untitled>';
}

const TYPES = ['gotchas', 'decisions', 'conventions', 'ground-truth', 'references', 'patterns'];
const META_TOOLS = new Set(['claude-code', 'codex', 'git', 'bash', 'powershell']);
const WORKFLOW_GENERAL_DOMAINS = new Set(['debugging', 'testing', 'prompt-engineering']);

function scoreCandidate(content, tools, domains) {
  let score = 0;
  if (tools.length === 0) score += 1;
  else if (tools.every((t) => META_TOOLS.has(t))) score += 2;
  if (domains.some((d) => WORKFLOW_GENERAL_DOMAINS.has(d))) score += 1;
  const projectFileHints = (content.match(/`[^`]*\/[^`]*\.(?:ts|js|md|yaml|json|sh)`/g) || []).length;
  if (projectFileHints === 0) score += 1;
  return score;
}

// ----- scan mode ------------------------------------------------------------

function scan() {
  const kbRoot = path.join(opts.projectRoot, 'docs', 'knowledge');
  if (!fs.existsSync(kbRoot)) {
    process.stdout.write(JSON.stringify({ candidates: [], note: 'no KB' }) + '\n');
    return;
  }
  const candidates = [];
  for (const type of TYPES) {
    const dir = path.join(kbRoot, type);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
      const filePath = path.join(dir, f);
      const content = fs.readFileSync(filePath, 'utf8');
      const fm = extractFrontmatter(content);
      if (!fm) continue;
      const tools = appliesTo(fm.body, 'tools');
      const domains = appliesTo(fm.body, 'domains');
      const score = scoreCandidate(content, tools, domains);
      if (score >= 3) {
        candidates.push({
          entry: `${type}/${f.replace(/\.md$/, '')}`,
          title: extractTitle(content),
          tools,
          domains,
          score,
          recommend: tools.length === 0 ? 'memory (feedback rule)' : domains.includes('debugging') ? 'skill-description (debugging-class)' : 'memory or skill-description',
        });
      }
    }
  }
  process.stdout.write(JSON.stringify({ mode: 'scan', candidates }, null, 2) + '\n');
}

// ----- stage mode -----------------------------------------------------------

function stage() {
  if (!opts.entry || !opts.targetType || !opts.targetPath) {
    process.stderr.write('stage mode requires --entry --target-type --target-path\n');
    process.exit(1);
  }
  if (!['memory', 'skill-description', 'new-skill'].includes(opts.targetType)) {
    process.stderr.write(`invalid --target-type: ${opts.targetType}\n`);
    process.exit(1);
  }

  const [type, entryId] = opts.entry.split('/');
  const entryPath = path.join(opts.projectRoot, 'docs', 'knowledge', type, entryId + '.md');
  if (!fs.existsSync(entryPath)) {
    process.stderr.write(`entry not found: ${entryPath}\n`);
    process.exit(2);
  }

  const content = fs.readFileSync(entryPath, 'utf8');
  const fm = extractFrontmatter(content);
  if (!fm) {
    process.stderr.write('entry has no frontmatter\n');
    process.exit(2);
  }
  const title = extractTitle(content);
  const body = content.slice(fm.full.length).replace(/^\s+/, '');

  // 1. Write stub at target
  if (opts.targetType === 'memory') {
    if (fs.existsSync(opts.targetPath)) {
      process.stderr.write(`target already exists: ${opts.targetPath}\n`);
      process.exit(3);
    }
    const memoryStub =
      `---\n` +
      `name: ${title}\n` +
      `description: <one-line description — edit me>\n` +
      `type: feedback\n` +
      `---\n\n` +
      `${body}\n\n` +
      `**Bubbled from:** \`${opts.entry}\` in project at \`${opts.projectRoot}\`\n`;
    fs.mkdirSync(path.dirname(opts.targetPath), { recursive: true });
    fs.writeFileSync(opts.targetPath, memoryStub, 'utf8');
  } else if (opts.targetType === 'skill-description') {
    // Don't auto-edit a skill — just emit the proposed line for the user to paste
    const proposal = `# Proposed addition to skill description:\n\n  - ${title} — see ${opts.entry}\n\n# Append manually to: ${opts.targetPath}\n`;
    process.stdout.write(proposal);
  } else if (opts.targetType === 'new-skill') {
    if (fs.existsSync(opts.targetPath)) {
      process.stderr.write(`target already exists: ${opts.targetPath}\n`);
      process.exit(3);
    }
    const skillStub =
      `---\n` +
      `name: <skill-name>\n` +
      `description: <triggers + action style — edit me>\n` +
      `---\n\n` +
      `# ${title}\n\n` +
      `${body}\n\n` +
      `**Bubbled from:** \`${opts.entry}\` in project at \`${opts.projectRoot}\`\n`;
    fs.mkdirSync(path.dirname(opts.targetPath), { recursive: true });
    fs.writeFileSync(opts.targetPath, skillStub, 'utf8');
  }

  // 2. Add bubbled-to to original entry's provenance
  let mutatedFm = fm.body;
  if (/^bubbled-to:/m.test(mutatedFm)) {
    mutatedFm = mutatedFm.replace(/^bubbled-to:.*$/m, `bubbled-to: ${opts.targetPath.replace(/\\/g, '/')}`);
  } else {
    mutatedFm = mutatedFm.replace(/\s*$/, '') + `\nbubbled-to: ${opts.targetPath.replace(/\\/g, '/')}`;
  }
  const newContent = content.replace(fm.full, fm.open + mutatedFm + fm.close);
  fs.writeFileSync(entryPath, newContent, 'utf8');

  process.stdout.write(
    JSON.stringify(
      {
        action: 'staged',
        entry: opts.entry,
        targetType: opts.targetType,
        targetPath: opts.targetPath,
        note: 'review the stub and refine wording manually',
      },
      null,
      2,
    ) + '\n',
  );
}

// ----- dispatch -------------------------------------------------------------

if (opts.mode === 'scan') scan();
else if (opts.mode === 'stage') stage();
else {
  process.stderr.write(`invalid --mode: ${opts.mode}\n`);
  process.exit(1);
}
