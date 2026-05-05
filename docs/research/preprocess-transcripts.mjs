#!/usr/bin/env node
// Distill Claude Code session JSONLs into a small corpus suitable for LLM mining.
// Strategy: keep user-visible signal, drop tool result bodies (the bulk of bytes).
//
// Per session, emit one markdown file with:
//   - session metadata (file, date, message count)
//   - chronological log of: user messages (full text), assistant text deltas,
//     tool-call summaries (name + first 200 chars of input), tool result *previews*
//     (first 200 chars only, plus byte size).
//
// Usage: node preprocess-transcripts.mjs <input-dir> <output-dir>

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const [, , inputDir, outputDir] = process.argv;
if (!inputDir || !outputDir) {
  console.error('Usage: preprocess-transcripts.mjs <input-dir> <output-dir>');
  process.exit(1);
}
fs.mkdirSync(outputDir, { recursive: true });

const PREVIEW_LEN = 200;
const truncate = (s, n = PREVIEW_LEN) =>
  typeof s !== 'string' ? '' : s.length > n ? s.slice(0, n) + ` …[+${s.length - n}b]` : s;

const sessionFiles = fs.readdirSync(inputDir).filter((f) => f.endsWith('.jsonl'));
const indexRows = [];
let totalIn = 0,
  totalOut = 0;

for (const file of sessionFiles) {
  const inPath = path.join(inputDir, file);
  const stat = fs.statSync(inPath);
  totalIn += stat.size;

  const out = [];
  let firstTimestamp = null,
    lastTimestamp = null,
    msgCount = 0,
    userMsgCount = 0,
    toolUseCount = 0;

  const lines = readline.createInterface({
    input: fs.createReadStream(inPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const line of lines) {
    if (!line.trim()) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    msgCount++;
    const ts = obj.timestamp || obj.message?.timestamp;
    if (ts) {
      firstTimestamp ??= ts;
      lastTimestamp = ts;
    }

    const role = obj.message?.role || obj.role || obj.type;
    const content = obj.message?.content;

    // user message (string)
    if (role === 'user' && typeof content === 'string') {
      userMsgCount++;
      out.push(`\n### USER\n${content.trim()}\n`);
      continue;
    }
    // user message (array — usually tool_result)
    if (role === 'user' && Array.isArray(content)) {
      for (const block of content) {
        if (block?.type === 'tool_result') {
          const txt =
            typeof block.content === 'string'
              ? block.content
              : Array.isArray(block.content)
                ? block.content.map((b) => b.text || '').join('')
                : '';
          out.push(
            `[tool_result ${block.is_error ? 'ERROR ' : ''}${block.tool_use_id?.slice(-8) || ''}: ${truncate(txt)}]`,
          );
        } else if (block?.type === 'text') {
          out.push(`\n### USER\n${block.text.trim()}\n`);
        }
      }
      continue;
    }
    // assistant message
    if (role === 'assistant' && Array.isArray(content)) {
      const fragments = [];
      for (const block of content) {
        if (block?.type === 'text') fragments.push(block.text);
        else if (block?.type === 'tool_use') {
          toolUseCount++;
          const inputPreview = truncate(
            typeof block.input === 'string' ? block.input : JSON.stringify(block.input ?? {}),
          );
          fragments.push(`[tool_use ${block.name}(${inputPreview})]`);
        } else if (block?.type === 'thinking') {
          fragments.push(`[thinking: ${truncate(block.thinking, 300)}]`);
        }
      }
      if (fragments.length) out.push(`\n### ASSISTANT\n${fragments.join('\n').trim()}\n`);
      continue;
    }
    // summary or other top-level events — skip silently
  }

  if (out.length === 0) continue;

  const header = [
    `# Session ${file.replace(/\.jsonl$/, '')}`,
    `- file: ${file}`,
    `- first: ${firstTimestamp || 'n/a'}`,
    `- last:  ${lastTimestamp || 'n/a'}`,
    `- messages: ${msgCount} (user: ${userMsgCount}, tool_uses: ${toolUseCount})`,
    `- bytes-in: ${stat.size}`,
    '',
    '---',
    '',
  ].join('\n');
  const body = out.join('\n');
  const outPath = path.join(outputDir, file.replace(/\.jsonl$/, '.md'));
  fs.writeFileSync(outPath, header + body, 'utf8');
  const outSize = fs.statSync(outPath).size;
  totalOut += outSize;
  indexRows.push({
    file,
    first: firstTimestamp,
    last: lastTimestamp,
    msgs: msgCount,
    userMsgs: userMsgCount,
    toolUses: toolUseCount,
    bytesIn: stat.size,
    bytesOut: outSize,
  });
}

indexRows.sort((a, b) => (a.first || '').localeCompare(b.first || ''));
const indexMd = [
  '# Transcript Preprocess Index',
  '',
  `- input dir: ${inputDir}`,
  `- output dir: ${outputDir}`,
  `- sessions: ${indexRows.length}`,
  `- bytes in:  ${(totalIn / 1024 / 1024).toFixed(1)} MB`,
  `- bytes out: ${(totalOut / 1024 / 1024).toFixed(1)} MB`,
  `- compression: ${((1 - totalOut / totalIn) * 100).toFixed(1)}%`,
  '',
  '| session | first | last | msgs | user | tools | in | out |',
  '|---|---|---|---|---|---|---|---|',
  ...indexRows.map(
    (r) =>
      `| ${r.file.replace(/\.jsonl$/, '').slice(0, 8)} | ${(r.first || '').slice(0, 19)} | ${(r.last || '').slice(0, 19)} | ${r.msgs} | ${r.userMsgs} | ${r.toolUses} | ${(r.bytesIn / 1024).toFixed(0)}k | ${(r.bytesOut / 1024).toFixed(0)}k |`,
  ),
].join('\n');
fs.writeFileSync(path.join(outputDir, 'INDEX.md'), indexMd, 'utf8');

console.log(`Wrote ${indexRows.length} session digests`);
console.log(`In:  ${(totalIn / 1024 / 1024).toFixed(1)} MB`);
console.log(`Out: ${(totalOut / 1024 / 1024).toFixed(1)} MB`);
console.log(`Compression: ${((1 - totalOut / totalIn) * 100).toFixed(1)}%`);
