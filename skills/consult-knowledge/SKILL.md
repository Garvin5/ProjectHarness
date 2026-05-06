---
name: consult-knowledge
description: Walks the harness federation (other registered projects' docs/knowledge/) to surface entries relevant to the current conversation. Quiet read — Claude consults and ANNOUNCES findings inline ("checked B001's KB, found …") rather than asking permission. Triggers (Q class, in-conversation sub-conditions) — when the user's message mentions a registered tool/domain term (cocos / ui / packaging / 鉴权 / 性能 / etc.); before entering writing-plans / executing-plans / systematic-debugging or about to recommend an implementation approach; when a tool result indicates failure (non-zero exit, error keywords); when user language signals recurrence ("again" / "上次" / "再来一次" / "像之前" / "same as last time"). Do NOT use this skill for one-off factual questions Claude can answer from training, casual conversation, or topics with no plausible precedent in any registered harness project.
---

# Consult Knowledge

**Announce:** "Consulting the harness federation for relevant precedents."

**Type:** Flexible — same procedure but query inputs vary by trigger.

**Action style:** Quiet (read is reversible). Announce findings inline; user can interrupt to redirect. Do NOT prompt for confirmation before reading — only before APPLYING what was read.

## What this skill produces

A ranked list of knowledge entries from OTHER registered projects (and optionally local KB), with key fields surfaced:

- project name + entry path
- title + one-line context from frontmatter (freshness · last-validated · tools/domains)
- body content (loaded if project trust = `full` and mode requested it)
- relevance score (tag intersection count + freshness weight)

Returned to Claude as JSON for selective inclusion in the response.

## Procedure

### Step 1 — Identify query

Extract from current conversation:

- **Tools mentioned** — match against vocabulary.yaml `tools` list (e.g. user said "cocos" → query `tools: [cocos-3.x]` after alias resolution)
- **Domains mentioned** — match against vocabulary.yaml `domains` list (e.g. user said "做个 UI" → `domains: [ui]`)
- **Failure signal** — if the trigger was a tool result error, set `domain: debugging` plus any explicit mention

If no tools/domains are extractable, fall back to current project's manifest tags as the query (this is the "what's relevant to me right now" interpretation).

### Step 2 — Run the helper

```bash
node "<HARNESS-ROOT>/skills/consult-knowledge/scripts/consult.mjs" \
  --project-root "<absolute-path>" \
  --tools "cocos-3.x,typescript" \
  --domains "ui,layout" \
  --mode full \
  --limit 5
```

Modes:
- `summary` (default) — titles + frontmatter, no body content
- `full` — includes body content for entries from `trust: full` projects
- `survey` — used by `survey-relevant`; broader matching, no body, top-N per project

### Step 3 — Interpret results

The helper returns JSON like:

```json
{
  "total": 12,
  "returned": 5,
  "queryTools": ["cocos-3.x"],
  "queryDomains": ["ui"],
  "results": [
    {
      "project": "B001-FindDog-Reverse",
      "projectName": "找狗反编译还原",
      "type": "gotchas",
      "relPath": "gotchas/cocos-png-non-square-trimmed.md",
      "title": "Cocos PNG 非方形必须用 TRIMMED",
      "freshness": "living",
      "lastValidated": "2026-04-19",
      "tools": ["cocos-3.8"],
      "domains": ["ui", "rendering"],
      "score": 5,
      "body": "..." // only if --mode full
    }
  ]
}
```

### Step 4 — Categorize per the design's borrow-vs-duplicate rule

Tag each returned entry with one of:

- **direct-reuse** — `freshness: static`, applies-to fully matches query, no environment-dependent fields → tell user "B001 has X, applies as-is"
- **adapt** — `freshness: living` and stack version differs → tell user "B001 has X for cocos-3.8.5; we're on cocos-3.8.8, may need adjustment"
- **predictive-warning** — entry describes a problem that COULD happen but hasn't here yet → tell user "B001 hit Y; if you see symptom Z, jump to that entry"

### Step 5 — Announce findings inline

Single block in the response:

> 联邦里查到 N 条相关：
> - **B001 / cocos-png-non-square-trimmed** (`living`, last-validated 2026-04-19): non-square PNGs need `sizeMode=TRIMMED`. **direct-reuse**.
> - **B001 / popup-absorber-pattern** (`living`, 2026-04-23): popup masks must cover full viewport. **adapt** (stack差异: 我们用 3.8.8).

Then continue with the user's task using these as inputs. **Do not ask "should I read these?"** — that's the wrong action style for Q. Just consult and announce.

### Step 6 — On apply: schedule a U-trigger

If the user accepts and applies a returned entry, log a successful application. This becomes a U1-trigger candidate that can later run `revalidate-entry` to bump `last-validated` on the source entry IN ITS OWN PROJECT (cross-project write — done with explicit user OK only).

If application fails, that's a U2 candidate.

## Constraints

- **Read-only.** Never modify entries in OTHER projects during consultation. Cross-project U-trigger writes happen separately with explicit user OK.
- **Respect trust levels.** `summary-only` projects: return frontmatter+title only, body load requires user OK. `disabled`: skip entirely.
- **No silent loading of huge bodies.** If `mode: full` and the matched entry exceeds 4KB, fall back to summary + offer to load on demand.
- **Self-exclusion.** Do not return entries from the current project; that's plain `Read`/`Grep` on local `docs/knowledge/`.
- **Alias resolution.** Use vocabulary.yaml aliases when intersecting (e.g. bare `cocos` resolves to `cocos-3.x`).

## When NOT to use

- One-off factual questions Claude knows from training (do not consult for "what is JavaScript closure").
- Casual / conversational replies.
- The current project is not registered (no manifest) — consultation needs the project's tags as a default query; suggest `register-project` first.
- The user has explicitly said "skip the federation" or "fresh approach" for this task.
