#!/usr/bin/env node
// Secret / credential pattern scanner.
// Reads content from --file <path> or --stdin and reports findings.
//
// Exit codes:
//   0 — no findings
//   1 — usage error
//   2 — medium-confidence findings (caller should prompt user)
//   3 — high-confidence findings (caller MUST block the write)
//
// stdout is JSON.

import fs from 'node:fs';
import process from 'node:process';

// ----- patterns -------------------------------------------------------------

// Each pattern: name, regex (with /g), confidence ('high' | 'medium').
// Whitespace boundaries (\b or lookarounds) help avoid embedded false hits.
const PATTERNS = [
  // GitHub
  { name: 'github-pat', regex: /\bghp_[A-Za-z0-9]{36}\b/g, confidence: 'high' },
  { name: 'github-oauth', regex: /\bgho_[A-Za-z0-9]{36}\b/g, confidence: 'high' },
  { name: 'github-user-token', regex: /\bghu_[A-Za-z0-9]{36}\b/g, confidence: 'high' },
  { name: 'github-server-token', regex: /\bghs_[A-Za-z0-9]{36}\b/g, confidence: 'high' },
  { name: 'github-refresh-token', regex: /\bghr_[A-Za-z0-9]{36}\b/g, confidence: 'high' },

  // OpenAI / Anthropic
  // sk-ant-... must come before sk-... so ordering in PATTERNS list is OK
  // but both run independently; we'll dedupe overlapping ranges later.
  { name: 'anthropic-key', regex: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g, confidence: 'high' },
  { name: 'openai-key', regex: /\bsk-[A-Za-z0-9]{20,}\b/g, confidence: 'high' },

  // AWS
  { name: 'aws-access-key', regex: /\bAKIA[0-9A-Z]{16}\b/g, confidence: 'high' },

  // Stripe
  { name: 'stripe-live-secret', regex: /\bsk_live_[A-Za-z0-9]{20,}\b/g, confidence: 'high' },
  { name: 'stripe-live-publishable', regex: /\bpk_live_[A-Za-z0-9]{20,}\b/g, confidence: 'high' },
  { name: 'stripe-live-restricted', regex: /\brk_live_[A-Za-z0-9]{20,}\b/g, confidence: 'high' },

  // JWT — three base64url segments
  {
    name: 'jwt',
    regex: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{10,}\b/g,
    confidence: 'high',
  },

  // Slack
  { name: 'slack-token', regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, confidence: 'high' },

  // Google API key
  { name: 'google-api-key', regex: /\bAIza[A-Za-z0-9_-]{35}\b/g, confidence: 'high' },

  // PEM private key block
  {
    name: 'private-key-block',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
    confidence: 'high',
  },

  // Medium-confidence: context-tagged assignment
  // Matches `secret = "abc123..."`, `apiKey: "xyz..."`, etc.
  {
    name: 'context-tagged-secret',
    regex:
      /\b(?:secret|password|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret)\s*[:=]\s*['"]([A-Za-z0-9_-]{12,})['"]/gi,
    confidence: 'medium',
  },
];

// ----- arg parsing ----------------------------------------------------------

const args = process.argv.slice(2);
let mode = null;
let pathArg = null;
let strict = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--file') {
    mode = 'file';
    pathArg = args[++i];
  } else if (a === '--stdin') {
    mode = 'stdin';
  } else if (a === '--strict') {
    strict = true;
  } else {
    process.stderr.write(`unknown arg: ${a}\n`);
    process.exit(1);
  }
}

if (!mode) {
  process.stderr.write('Usage: scan-secrets.mjs (--file <path> | --stdin) [--strict]\n');
  process.exit(1);
}

// ----- read content ---------------------------------------------------------

async function readStdin() {
  let buf = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) buf += chunk;
  return buf;
}

const content = mode === 'file' ? fs.readFileSync(pathArg, 'utf8') : await readStdin();

// ----- scan -----------------------------------------------------------------

function maskSecret(s) {
  if (s.length <= 8) return '*'.repeat(s.length);
  return `${s.slice(0, 4)}...${s.slice(-3)}`;
}

function lineColForOffset(text, offset) {
  let line = 1;
  let col = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, col };
}

const findings = [];
const seenSpans = new Set();

for (const pat of PATTERNS) {
  pat.regex.lastIndex = 0;
  let m;
  while ((m = pat.regex.exec(content)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    const spanKey = `${start}:${end}`;
    // skip if a higher-confidence pattern already covered this exact span
    if (seenSpans.has(spanKey)) continue;
    seenSpans.add(spanKey);
    const { line, col } = lineColForOffset(content, start);
    findings.push({
      kind: pat.name,
      confidence: strict && pat.confidence === 'medium' ? 'high' : pat.confidence,
      position: { offset: start, line, col },
      snippet_masked: maskSecret(m[0]),
    });
  }
}

const summary = {
  high: findings.filter((f) => f.confidence === 'high').length,
  medium: findings.filter((f) => f.confidence === 'medium').length,
  total: findings.length,
};

process.stdout.write(JSON.stringify({ findings, summary }, null, 2) + '\n');

if (summary.high > 0) process.exit(3);
if (summary.medium > 0) process.exit(2);
process.exit(0);
