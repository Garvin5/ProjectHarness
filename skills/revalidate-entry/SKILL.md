---
name: revalidate-entry
description: Re-confirms an existing knowledge entry's claims and bumps last-validated, optionally upgrading freshness from hypothesis → living after enough successful applications. Always proposes the changes first — never mutates without explicit OK. Triggers (U class, two sub-conditions) — (U2) a previously-consulted entry was applied unsuccessfully (mark hypothesis or refresh investigation); (U4) a hypothesis entry has been applied successfully ≥3 times so it should graduate to living. Also called by validate-knowledge for entries flagged stale (last-validated > 90 days for living, > 30 days for hypothesis). Do NOT use this skill for content edits (use plain Edit + rebuild-index), for replacing an entry (use supersede-entry), or for entries marked freshness: superseded (revalidating those is a no-op).
---

# Revalidate Entry

**Announce:** "Re-confirming an existing KB entry."

**Type:** Flexible — same procedure shape but verification strategy varies by entry type.

**Action style:** Propose-first. Default skip.

## What this skill produces

A mutation of an existing entry's frontmatter:

- Bump `last-validated` to today (always, on confirmation)
- Optionally upgrade `freshness: hypothesis → living` (when stable application count crosses threshold)
- Optionally downgrade `freshness: living → hypothesis` (when applied unsuccessfully)
- Optionally append a one-line successful-application or failed-application note to the body's `## Application log` section (created if absent)

Then `rebuild-index` runs.

## Procedure

### Step 1 — Identify the entry

Confirm with the user which entry: `<type>/<id>`. If ambiguous, list candidates from local KB or use `consult-knowledge` to find by topic.

### Step 2 — Choose verification strategy by type

| Entry type | Verification approach |
|---|---|
| `gotcha` | Re-create the symptom in current code; verify the documented fix still works. If too expensive, ask user to confirm based on recent experience. |
| `decision` | Re-state the rationale; ask user whether the constraints that drove the decision still hold. |
| `convention` | Search recent commits / handoffs for compliance — does the team / Claude still follow this? |
| `ground-truth` | Re-fetch from the source URL/file. If unchanged, confirm. If changed, propose supersede instead of revalidate. |
| `reference` | Check URL/dashboard responds. If broken, propose supersede or hard delete. |
| `pattern` | Verify all composing entries still exist and are non-superseded. |

**Codex offload (recommended for gotchas + ground-truth):** if verification requires reading code or external sources, dispatch a `codex:rescue` subagent to do the legwork. Saves Claude tokens.

### Step 3 — Determine outcome

Three outcomes:

- **Confirmed** — bump `last-validated`. If `freshness: hypothesis` and the body has ≥3 successful application notes, propose upgrade to `living`.
- **Contradicted** — entry's claim no longer holds. Recommend `supersede-entry` instead. Do NOT silently flip `freshness` to `hypothesis` — that masks a real refactor opportunity.
- **Inconclusive** — verification couldn't prove or disprove. Leave entry alone; do not bump. Surface to user as "needs human eye".

### Step 4 — Propose to user

Single-line shape:

> Revalidate `<type>/<id>` ('<title>'): outcome `<confirmed|contradicted|inconclusive>`. Proposed changes: bump `last-validated` → 2026-05-06[, upgrade freshness `hypothesis → living`][, append application log: "<one-line>"]. **OK / edit / skip?**

Default to `skip`.

### Step 5 — On confirm: run helper

```bash
node "<HARNESS-ROOT>/skills/revalidate-entry/scripts/revalidate-entry.mjs" \
  --project-root "<absolute-path>" \
  --entry "<type>/<id>" \
  --bump-last-validated 2026-05-06 \
  [--upgrade-freshness living] \
  [--add-application-note "applied 2026-05-06 against cocos-3.8.8 — succeeded"]
```

The helper:
1. Validates the entry exists and isn't `freshness: superseded`
2. Mutates frontmatter (last-validated, freshness if requested)
3. If `--add-application-note` given: appends to a `## Application log` section in body (creates the section if absent)
4. Invokes `rebuild-index`

### Step 6 — On contradicted outcome

Tell the user: "This entry's claim seems contradicted — recommend `supersede-entry` rather than mutate. Run that next?" Do NOT proceed with revalidation.

## Constraints

- **No silent freshness downgrade.** Contradicted = recommend supersede, not auto-flip to hypothesis.
- **No silent date bump.** Always confirm with the user.
- **Hypothesis upgrade requires evidence.** Need ≥3 successful application notes in body before proposing `hypothesis → living`.
- **No revalidate on superseded.** Helper exits non-zero if entry has `freshness: superseded`.

## When NOT to use

- Content edits to body (use `Edit` + `rebuild-index`).
- Replacing an entry with new content (use `supersede-entry`).
- Routine date-bump without verification — always run the verification step, even if it's just "user confirms by recall".
