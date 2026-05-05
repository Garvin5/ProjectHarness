---
name: redact-secrets
description: Scans content for credential / secret patterns before it's written to docs/knowledge/, docs/handoffs/, or any file likely to be committed. Used in two modes — (a) called inline by promote-to-knowledge before drafting an entry, (b) wired as a PreToolUse hook on Write/Edit operations targeting sensitive paths. Action style is ENFORCE (refuse, not propose) — high-confidence matches block the write entirely; medium-confidence matches surface to the user with an OK/redact prompt. Triggers — pre-write to docs/knowledge/**, docs/handoffs/**, or any path the user has marked sensitive in their config; also called by promote-to-knowledge before frontmatter draft. Do NOT use this for general code review or for files that are gitignored.
---

# Redact Secrets

**Announce:** "Scanning for credential patterns before writing."

**Type:** Rigid — same patterns each run. Matches block writes; near-matches prompt.

**Action style:** ENFORCE (not propose). High-confidence matches refuse the write outright; medium-confidence matches stop to ask the user.

## What this skill produces

Either:
- A green-light response (`no findings`) — caller proceeds with the write
- A blocking response (`HIGH: <kind> at offset <N>`) — caller MUST NOT write the content as-is
- A medium-confidence prompt — surface findings to the user with mask, ask "redact / keep / cancel"

It does not modify content itself. Caller is responsible for redaction.

## When this fires

| Mode | Trigger | Action on high-confidence match |
|---|---|---|
| Inline (called by another skill) | `promote-to-knowledge` runs the scanner over its draft body and frontmatter source material before writing | Block the draft; surface findings to user; user redacts; re-scan |
| PreToolUse hook (when wired) | `Write` or `Edit` tool targets a path matching `docs/knowledge/**` or `docs/handoffs/**` | Hook exits with non-zero status; Claude Code aborts the tool call |

## Procedure

### Step 1 — Run the scanner

```bash
node "<HARNESS-ROOT>/skills/redact-secrets/scripts/scan-secrets.mjs" --file <path>
# or
node "<HARNESS-ROOT>/skills/redact-secrets/scripts/scan-secrets.mjs" --stdin < <content>
```

Exit codes:
- `0` — no findings
- `1` — usage error
- `2` — medium-confidence findings (caller should prompt user)
- `3` — high-confidence findings (caller MUST block)

stdout is JSON: `{ findings: [{ kind, confidence, position, snippet_masked }], summary: { high, medium, low } }`.

### Step 2 — Caller acts on result

If exit code is `3`: refuse the write. Tell the user which kind(s) of secret were found and at what approximate position. Do NOT echo the secret value. Ask the user to redact source material before retrying.

If exit code is `2`: present masked snippets to user with single-line prompt:
> Found possible <kind> in draft. Snippet: `<masked>`. redact / keep / cancel?

If exit code is `0`: proceed.

## Detected patterns

High-confidence (block):
- GitHub PAT — `ghp_[A-Za-z0-9]{36}`, `gho_…`, `ghu_…`, `ghs_…`, `ghr_…`
- OpenAI keys — `sk-[A-Za-z0-9]{20,}`
- Anthropic keys — `sk-ant-[A-Za-z0-9-]+`
- AWS access key — `AKIA[0-9A-Z]{16}`
- Stripe live — `(sk|pk|rk)_live_[A-Za-z0-9]{20,}`
- JWT — three base64url segments separated by `.`
- Slack token — `xox[baprs]-[A-Za-z0-9-]{10,}`
- Google API key — `AIza[A-Za-z0-9_-]{35}`
- Private key block — `-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----`

Medium-confidence (prompt):
- Context-tagged secret — assignment with key matching `(secret|password|api[_-]?key|access[_-]?token|auth[_-]?token)` and value `[A-Za-z0-9_-]{12,}`. False-positive risk because real config is sometimes legitimately named "api_key: <placeholder>".
- 32-char hex string adjacent to "secret"/"key"/"token" within 2 lines

Caller may pass `--strict` to upgrade medium-confidence to high (block).

## Constraints

- **Never echo the matched secret** in user-facing output. Always mask middle: `ghp_aaa...zzz` (first 4 + ellipsis + last 3).
- **Side-effect free.** Does not write or modify files. Caller decides what to do.
- **Read-only.** Caller passes the content to scan; scanner does not open arbitrary paths.
- **Tolerant of repeats.** Same pattern matched twice is reported twice; deduplication is the caller's concern.

## When NOT to use

- Project files that are gitignored (the scanner doesn't know what's gitignored; caller should prefilter paths).
- General code review for secrets not headed for git (no protective value).
- Files the user has explicitly marked safe for a session (out of scope for v1).
