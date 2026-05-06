---
name: bubble-up-knowledge
description: Identifies project-local KB entries whose content is workflow-general (would apply to ANY project, not just this stack) and proposes elevating them to the harness layer. Always proposes — never auto-moves. Triggers (S3 sub-condition) — called by validate-knowledge for entries flagged S3-bubble-up; on user request ("which of our rules should be cross-project?"); when promote-to-knowledge declines a candidate because it looks too generic for project KB. Do NOT use for project-specific lessons (those stay project-local), for entries already at harness layer, or to physically copy content cross-project (that's manual — this skill only IDENTIFIES + recommends).
---

# Bubble Up Knowledge

**Announce:** "Identifying entries that should live at the harness layer."

**Type:** Flexible — identification is mechanical; recommendation requires judgment per entry.

**Action style:** Propose-first. Identifies candidates and proposes target locations; physical promotion is manual (user copies content / writes a feedback memory / edits a skill description). The skill stages the work, does not perform it.

## What this skill produces

For each candidate entry, a single proposal:

> `<entry>` looks workflow-general (score X). Suggested target:
>   `~/.claude/projects/<harness-sanitized>/memory/feedback_<topic>.md`  (most common)
>   OR  inline guidance into existing skill `<skill-name>` description
>   OR  a new harness-level skill `<name>`
>
> **OK / edit target / skip?**

On OK, the skill writes a stub at the chosen target, leaving the user to flesh out the content. The original project-local entry stays in place but gets a note in its provenance: `bubbled-to: <target-path>`.

## Procedure

### Step 1 — Identify candidates

Either:
- Take a candidate from `validate-knowledge` output, or
- Run the helper in scan mode:

```bash
node "<HARNESS-ROOT>/skills/bubble-up-knowledge/scripts/bubble-up.mjs" \
  --project-root "<absolute-path>" \
  --mode scan
```

Returns JSON with all S3 candidates and their scores.

### Step 2 — Choose target by content shape

Match the entry to one of three target patterns:

| Entry shape | Target | Mechanism |
|---|---|---|
| User feedback / preference rule (e.g. "don't summarize at end of replies") | Harness auto-memory `feedback_<topic>.md` | New file in `~/.claude/projects/<harness-sanitized>/memory/`, indexed in `MEMORY.md` |
| Convention about how Claude should work (e.g. "always run validate after handoff") | Inline into a relevant skill's description | Edit the skill's SKILL.md frontmatter `description:` field |
| Pattern that applies to all projects (e.g. "TDD Red-Green-Refactor") | New harness-level skill | New `skills/<name>/SKILL.md` — usually rare; prefer existing skill enhancement |

### Step 3 — Propose to user

Single-line per candidate:

> Bubble-up `<entry>` to `<target>`? **OK / edit target / skip?**

Default to `skip`.

### Step 4 — On confirm: write stub + note provenance

```bash
node "<HARNESS-ROOT>/skills/bubble-up-knowledge/scripts/bubble-up.mjs" \
  --project-root "<absolute-path>" \
  --entry "<type>/<id>" \
  --target-type memory|skill-description|new-skill \
  --target-path "<absolute-path-to-target>"
```

The helper:
1. For `memory`: writes a stub `feedback_<topic>.md` with frontmatter from the harness memory format (name, description, type=feedback) and the entry body copied; appends a line to MEMORY.md
2. For `skill-description`: outputs the proposed description-line addition; the user manually pastes it (no auto-edit of skill descriptions because phrasing matters)
3. For `new-skill`: outputs a SKILL.md scaffold to a path; the user edits and completes it
4. Mutates the original entry's provenance to add `bubbled-to: <target>` for backtrace

In all three cases, a final manual review by the user is expected — the harness layer is opinionated and the user owns the wording.

### Step 5 — Surface result

> Bubbled `<entry>` → `<target>`. Original entry retained with backlink. Edit `<target>` to refine wording.

## Constraints

- **Stage, don't auto-elevate.** Wording at the harness layer is the user's; the helper writes scaffolds, the user writes the content.
- **Default skip.** S3 candidates are advisory; many will stay project-local because the user wants project-specific phrasing.
- **Backlink mandatory.** The original entry's provenance gets `bubbled-to: <target>` so future consult-knowledge runs know not to re-recommend the same content.
- **Never delete the original.** Even after bubble-up, the project-local entry stays — useful for cross-project provenance and historical context.

## When NOT to use

- The entry is project-specific (e.g., a Cocos-3.8.8 viewport-reset gotcha). Keep it project-local.
- The entry is already a clone of an existing harness rule. Use `supersede-entry` to mark it superseded by the harness version, with cross-project backlink.
- Wholesale copying of multiple entries. Bubble-up runs one at a time; batch via `validate-knowledge`'s S3 candidate list.
