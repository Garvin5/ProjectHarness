---
name: validate-knowledge
description: Local QA sweep across docs/knowledge/. Detects missing/orphan/stale conditions and proposes batched actions for the user to step through. Always proposes — does not auto-fix anything. Triggers (S class, all sub-conditions) — runs as a postcondition of finishing-a-development-branch; on user request ("validate KB" / "check knowledge"); periodically when handoffs accumulate. Detects schema errors (missing required frontmatter fields, malformed YAML), staleness (last-validated > 90 days for living entries, > 30 days for hypothesis), orphan tags (used in entries but absent from vocabulary.yaml), broken supersedes chains (referenced old entries don't exist or aren't in _superseded/), S1 merge candidates (overlapping applies-to + similar titles), S2 archive prompts (entries tagged with tools no longer in current manifest), and S3 bubble-up flags (entries that look workflow-general). Do NOT use for cross-project validation (each project validates locally), for content review of body text (that's manual), or as a CI gate without user-in-loop confirmation (auto-fix is out of scope).
---

# Validate Knowledge

**Announce:** "Running local KB validation sweep."

**Type:** Rigid — same checks each run. Output shape is stable for diff-friendly comparison run-to-run.

**Action style:** Propose-first, batched. Renders a numbered finding list; user accepts in batch (`fix all` / `1,3 / skip 2 / ...`).

## What this skill produces

A categorized findings report:

- **Errors** (must-fix): missing required frontmatter, broken supersedes chain, malformed YAML
- **Warnings** (should-fix): stale entries, orphan tags
- **Candidates** (advisory): S1 merge, S2 archive, S3 bubble-up

Plus a single proposal block at the end:

> Found 12 findings (3 errors, 4 warnings, 5 candidates). Step through? `1` / `errors-only` / `all` / `skip`

The user accepts/edits/skips per-finding or in batch. Each accepted action invokes the appropriate write skill (`revalidate-entry` for stale, `supersede-entry` for refresh, `bubble-up-knowledge` for S3, plain `Edit` for missing fields, etc.).

## Procedure

### Step 1 — Run the helper

```bash
node "<HARNESS-ROOT>/skills/validate-knowledge/scripts/validate-knowledge.mjs" \
  --project-root "<absolute-path>" \
  --vocabulary "<HARNESS-ROOT>/skills/shared/per-project-kb/vocabulary.yaml"
```

Returns JSON with all findings. The helper does not modify any files.

### Step 2 — Render summary to user

Group findings by severity. Each finding gets a one-line description plus a recommended action. Number them so the user can reference by number.

Example:

> ## Errors (3)
> 1. `gotchas/foo.md` — missing `applies-to.tools`. Recommend: edit and add tools.
> 2. `decisions/bar.md` — `supersedes: [gotchas/qux]` but `gotchas/qux.md` not found. Recommend: fix path or remove supersedes link.
> 3. ...
>
> ## Warnings (4)
> 4. `gotchas/baz.md` — `last-validated: 2026-01-12` (>90 days) for `living`. Recommend: `revalidate-entry`.
> 5. `conventions/quux.md` — uses `tag-foo` not in vocabulary.yaml. Recommend: add tag or rename.
> ...
>
> ## Candidates (5)
> 8. S1 merge: `gotchas/png-trim.md` and `gotchas/non-square-png.md` have overlapping applies-to and similar titles.
> 9. S3 bubble-up: `conventions/always-tdd.md` looks workflow-general — recommend evaluation for harness layer.
> ...
>
> Step through? `1,2,3` / `errors-only` / `all` / `skip`

### Step 3 — On user selection: dispatch per-finding

For each accepted finding, invoke the right action:

| Finding kind | Action to invoke |
|---|---|
| Missing field | `Edit` — guide user through adding the field |
| Orphan tag | Either `Edit` vocabulary.yaml to add the tag, or `Edit` the entry to use a vocabulary tag |
| Broken supersedes | `Edit` the entry's frontmatter to fix or remove the link |
| Stale (living, >90d) | `revalidate-entry` |
| Stale (hypothesis, >30d) | `revalidate-entry` (likely reset to inconclusive) or `supersede-entry` if claim no longer holds |
| S1 merge candidate | Surface to user; if user agrees, do `Edit` of one to combine + `supersede-entry` for the other |
| S2 archive | `supersede-entry` with `freshness: superseded` flag, no replacement |
| S3 bubble-up | `bubble-up-knowledge` for the candidate |

### Step 4 — Final pass

After all accepted actions complete, run `rebuild-index` once. (Each action triggers its own rebuild, but one final pass guarantees consistency.)

## Constraints

- **No auto-fix.** Every finding requires user confirmation.
- **Batched proposals only.** Don't open a separate prompt per finding — render the full list, let user select.
- **Errors before warnings before candidates.** The numbered list groups by severity.
- **Idempotent.** Running validate twice should produce the same output (modulo finding fixes between runs).

## Detection criteria

### Errors

| Check | Detail |
|---|---|
| Missing required field | type, activation, freshness, last-validated, provenance, applies-to, supersedes — must all be present |
| Provenance empty | `provenance: []` is invalid; need at least one entry |
| Broken supersedes | Each id in `supersedes` must resolve to an existing file in `<type>/_superseded/` |
| Malformed YAML | Frontmatter regex doesn't extract — entry can't be parsed |

### Warnings

| Check | Threshold |
|---|---|
| Stale living | `last-validated` > 90 days ago |
| Stale hypothesis | `last-validated` > 30 days ago |
| Orphan tag (tools) | tag not in `vocabulary.yaml.tools` and not in `aliases` |
| Orphan tag (domains) | tag not in `vocabulary.yaml.domains` |
| Orphan tag (project-type) | tag not in `vocabulary.yaml.project-type` |

### Candidates

| Check | Detail |
|---|---|
| S1 merge | Pair of entries with applies-to ≥80% overlap and title word overlap ≥50% |
| S2 archive | Entry's `applies-to.tools` includes a tool absent from current manifest |
| S3 bubble-up | applies-to.tools empty OR only meta-tools (claude-code, codex, git, bash); domains include workflow-general (debugging, testing, prompt-engineering); body has no project-specific paths |

## When NOT to use

- CI gate (no user-in-loop). Out of scope for v1; might come later as a non-blocking advisory step.
- Cross-project validation (each project owns its own KB; no central authority).
- Content review of body text. That's manual reading, not schema validation.
