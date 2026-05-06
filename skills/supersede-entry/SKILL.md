---
name: supersede-entry
description: Replaces an existing knowledge entry with a new one when its claim has been contradicted, superseded by a better understanding, or a refactor invalidates it. Atomically writes the new entry, sets the old entry's freshness to "superseded", moves the old to <type>/_superseded/, links the supersedes chain on the new entry, and rebuilds INDEX. Always proposes the replacement first — never mutates without explicit OK. Triggers (U class, claim-contradicted sub-condition) — when current work proves an existing entry's recommendation no longer holds; when a tool/library update obsoletes a gotcha; when a decision is reversed with new rationale; when revalidate-entry has flagged an entry stale and the user wants to replace rather than refresh. Do NOT use this skill when (a) the entry is just stale-but-still-correct (use revalidate-entry to bump last-validated); (b) the entry should be deleted outright (rare — use git rm + rebuild-index instead); (c) the new content would be a separate entry, not a replacement.
---

# Supersede Entry

**Announce:** "Replacing an existing KB entry."

**Type:** Rigid — same atomic sequence each run.

**Action style:** Propose-first. Default skip. The mutation is multi-file (writes new, mutates old, moves old, rebuilds index) so a helper script handles atomicity.

## What this skill produces

Three artifacts, atomically:

1. New entry at `docs/knowledge/<type>/<new-id>.md` with `supersedes: [<old-id>]`
2. Old entry mutated to `freshness: superseded` + `superseded-by: <new-id>` field, then moved to `docs/knowledge/<type>/_superseded/<old-id>.md`
3. Regenerated `docs/knowledge/INDEX.md` (old entry removed from listing, counted in superseded tally)

## Procedure

### Step 1 — Identify the old entry

Confirm with the user which entry is being superseded. Phrase as: "Supersede `<type>/<old-id>.md` ('<old-title>')?"

If unclear, do `Grep` for the topic in `docs/knowledge/` to confirm a single match before proceeding.

### Step 2 — Draft the new entry

Same as `promote-to-knowledge` Steps 4–6 (read template, fill frontmatter, scan-secrets), with these additions:

- `supersedes: [<type>/<old-id>]` MUST be set
- `provenance` should include the reason: a session UUID, optionally a commit SHA pointing at code that disproves the old claim, plus `previously: <type>/<old-id>` for backtrace

### Step 3 — Propose to user

Render single-line:

> Supersede `<type>/<old-id>.md` ('<old-title>') with `<type>/<new-id>.md` ('<new-title>'). New `freshness: <fresh>`. Old will be moved to `_superseded/`. **OK / edit / cancel?**

Default to `cancel`.

### Step 4 — On confirm: run the helper

```bash
node "<HARNESS-ROOT>/skills/supersede-entry/scripts/supersede-entry.mjs" \
  --project-root "<absolute-path>" \
  --old "<type>/<old-id>" \
  --new "<type>/<new-id>" \
  --new-body-file "<temp-file-with-new-content>"
```

The helper:

1. Validates that `<old>` exists and `<new>` does not
2. Reads new body from file (frontmatter + body, prepared by Claude in advance)
3. Runs `scan-secrets.mjs --file <new-body-file>` — refuses on exit 3, propagates exit 2 to caller
4. Writes new entry
5. Mutates old entry's frontmatter (`freshness: superseded`, adds `superseded-by: <type>/<new-id>`)
6. Creates `<type>/_superseded/` directory if absent
7. Moves old entry into it (`fs.renameSync`)
8. Runs `rebuild-index.mjs`

If any step fails, rolls back as much as possible and reports.

### Step 5 — Surface result

One-line: `Superseded <old-id> → <new-id>. <type>/_superseded/ now contains N entries. INDEX rebuilt.`

## Constraints

- **No silent mutation.** User must confirm.
- **Atomic.** Either all 3 artifacts change together, or nothing changes.
- **Forward link only.** New entry's `supersedes` lists old; old entry's `superseded-by` lists new. Both directions for backtrace.
- **Old is not deleted.** It moves to `_superseded/` with full content + frontmatter intact. `consult-knowledge` skips it by default but archaeology is possible.

## When NOT to use

- Entry is stale-but-true: use `revalidate-entry` to bump `last-validated`.
- Hard delete: use `git rm <path>` + manual `rebuild-index`. Used only when the entry is definitively wrong, not when it's been refined.
- The new content is a separate concern: write it as its own promotion, do not link supersedes.
- More than one entry needs replacing: run this skill once per pair, in dependency order.
