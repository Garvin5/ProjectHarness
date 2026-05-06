---
name: survey-relevant
description: Light variant of consult-knowledge that runs at session start in a registered project. Lists 3–5 federation entry titles likely relevant to this project (based on manifest tag overlap), without loading bodies. Quiet — Claude announces the list inline so the user knows what precedents exist; the user / Claude can drill into any entry by invoking consult-knowledge or plain Read. Trigger (Q1, single sub-condition) — session start in a project that has docs/knowledge/manifest.yaml AND the user-level registry contains ≥1 OTHER registered project. Do NOT use this skill mid-conversation (use consult-knowledge for in-session queries), in unregistered projects, or when the registry is empty (announce "federation has no other projects yet" once and skip).
---

# Survey Relevant

**Announce:** "Surveying federation for related precedents."

**Type:** Rigid — same procedure each session start.

**Action style:** Quiet. List titles inline; do not prompt for permission. The user can ignore or drill in.

## What this skill produces

A single inline summary block:

> Federation has N relevant precedents from M sibling project(s):
> - **B001 / cocos-png-non-square-trimmed** (cocos-3.8 · ui)
> - **B001 / popup-absorber-pattern** (cocos-3.8 · ui)
> - **W002 / asset-pipeline-trimmed-flow** (cocos-3.x · asset-pipeline)
> Use `consult-knowledge` to drill into any of these.

That's the entire output. No body load, no scoring detail, no prompts.

## Procedure

### Step 1 — Sanity check

```bash
test -f docs/knowledge/manifest.yaml || echo "NOT_REGISTERED"
test -f "$HOME/.claude/harness-projects.json" || echo "EMPTY_REGISTRY"
```

If either is missing, exit silently (do not announce anything).

### Step 2 — Run the helper in survey mode

```bash
node "<HARNESS-ROOT>/skills/consult-knowledge/scripts/consult.mjs" \
  --project-root "<absolute-path>" \
  --mode survey \
  --limit 5
```

In `--mode survey`:
- No explicit `--tools` / `--domains` — the helper falls back to current project's manifest tags
- Lower scoring threshold (any tag overlap counts)
- No body load

### Step 3 — Render the summary

If `total === 0`: announce nothing. (Don't say "no precedents found" every session — that's noise.)

If `total > 0`: render the single block from §"What this skill produces" above. Compact one-line per entry. The user reads it once and moves on.

## Constraints

- **One-shot.** Run once at session start; do not re-run mid-session (that's `consult-knowledge`'s job).
- **Quiet.** No questions. No drilling. No body content. Just titles + tags.
- **No noise on empty.** Suppress output entirely when total is 0.
- **Cap at 5.** Even if 50 are relevant, show 5 highest-scoring. The user can ask for more.

## When NOT to use

- Mid-conversation. Use `consult-knowledge` instead — it accepts an explicit query.
- Unregistered project. `register-project` first.
- Empty registry (only the current project registered). No siblings to survey.
- The user has explicitly said "no federation" or "fresh project" for this session.
