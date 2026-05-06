---
name: promote-to-knowledge
description: Captures a lesson, decision, convention, or fact that emerged in this session into the project's docs/knowledge/. Always proposes the entry first with a single-line confirm prompt — never writes without explicit OK from the user. Triggers (W class, all sub-conditions) — when the user issues an imperative correction ("不要 X" / "stop doing X" / "记住" / "remember"); when the same problem surfaced ≥2 times in this session, or a bug took ≥3 turns to resolve; when a reasoned decision was articulated ("用 X 不用 Y 因为 Z"); when the user explicitly says "记一下/入库/note this/log this"; at handoff time as part of finishing-a-development-branch (distillation pass over the whole session); when content shape clearly fits one of the 6 entry types. Do NOT use this skill for one-off project-specific in-flight work (that goes in handoffs/), for ephemeral debugging notes, when docs/knowledge/ is missing (use register-project first), or when the lesson is workflow-general — flag it for bubble-up-knowledge to the harness layer instead.
---

# Promote to Knowledge

**Announce:** "Drafting a knowledge entry from this session's work."

**Type:** Flexible — same procedure but each promotion shapes its own frontmatter and body.

**Action style:** Propose-first. Default answer is "skip" — don't write unless user confirms.

## Procedure

### Step 1 — Confirm KB exists

```bash
test -f docs/knowledge/manifest.yaml || echo "NO_KB"
```

If no manifest, abort with: "This project isn't registered for KB. Run `register-project` first."

### Step 2 — Identify the lesson

State to the user, in 1–2 sentences, what you noticed:

- What the trigger was (which W sub-condition fired)
- What the candidate lesson is

Example: "你已经第 3 次更正我'不要自己生成 .meta'。这看起来是一条 convention。"

### Step 3 — Choose the type

Pick the type whose body shape best fits. If unsure between two, ask the user.

| Trigger pattern | Default type |
|---|---|
| Imperative correction repeatedly | `convention` |
| Bug taking ≥3 turns | `gotcha` |
| Same problem ≥2× | `gotcha` |
| Reasoned decision | `decision` |
| User says "记住/入库" | depends on content |
| External invariant articulated | `ground-truth` |
| External resource referenced | `reference` |
| Recipe across multiple existing entries | `pattern` |

### Step 4 — Read the entry template

```bash
cat "<HARNESS-ROOT>/skills/shared/per-project-kb/entry-template.md"
```

Use the body shape stub for the chosen type. Discard the others when drafting.

### Step 5 — Draft the entry

Fill all 7 frontmatter fields:

| Field | How to fill |
|---|---|
| `type` | from Step 3 |
| `activation` | default `skill-triggered`; use `always-on` only for must-read project rules; use `on-demand` for niche reference content |
| `freshness` | `living` if depends on tools/version/team-state; `static` for invariants like file formats; `hypothesis` if you only have one piece of evidence |
| `last-validated` | today's ISO date |
| `provenance` | minimum: current session UUID; add commit SHA if a fix is involved; add `external-project` + `external-entry` if borrowed from another harness project |
| `applies-to` | tools/domains MUST be subsets of the project's manifest tags (read manifest if unsure) |
| `supersedes` | list of entry IDs being replaced; usually `[]` |

Pick a kebab-case filename matching the lesson, e.g. `cocos-png-non-square-trimmed.md`.

### Step 6 — Scan for secrets

```bash
node "<HARNESS-ROOT>/skills/redact-secrets/scripts/scan-secrets.mjs" --stdin <<<"<frontmatter + body draft>"
```

- Exit 3 (high): refuse the draft. Tell user which kind of secret was found at which position. Do NOT echo the secret. Ask user to redact source material; redraft.
- Exit 2 (medium): show user the masked findings; ask redact / keep / cancel.
- Exit 0: continue.

### Step 7 — Propose to user

Render this single-line shape:

> 建议入 KB：`<type>` at `docs/knowledge/<type>/<kebab-id>.md`. tags `[<tools>] / [<domains>]`. freshness `<freshness>`. **OK / 改字段 / skip?**

Default to `skip`. Only proceed on explicit OK.

### Step 8 — On confirm: write + rebuild

1. Write the entry file via the `Write` tool to `docs/knowledge/<type>/<filename>.md`. The `<type>` must match the directory naming in vocabulary (gotchas / decisions / conventions / ground-truth / references / patterns) — note plural form for some.
2. Rebuild the index:

```bash
node "<HARNESS-ROOT>/skills/rebuild-index/scripts/rebuild-index.mjs" "<project-root>"
```

3. Surface to user: `Wrote docs/knowledge/<type>/<filename>.md and rebuilt INDEX.`

### Step 9 — At handoff time (W4 only)

If invoked as part of `finishing-a-development-branch`, the procedure changes shape:

1. Skim the session for ≥2 candidates: each meeting one of W1/W2/W3/W6
2. List candidates as numbered single-liners — title, type, why
3. Ask user: `Promote which? (1,2,5 / all / none / edit)`
4. For each accepted candidate, run Steps 3–8 in turn
5. After all writes, single rebuild-index pass

## Type-directory mapping

The directory names use the plural form for some types. Use these exact paths:

| `type:` value | Directory path |
|---|---|
| `gotcha` | `docs/knowledge/gotchas/` |
| `decision` | `docs/knowledge/decisions/` |
| `convention` | `docs/knowledge/conventions/` |
| `ground-truth` | `docs/knowledge/ground-truth/` |
| `reference` | `docs/knowledge/references/` |
| `pattern` | `docs/knowledge/patterns/` |

## Constraints

- **Default skip.** No write without user OK.
- **Tags from manifest.** `applies-to` must be a subset of the project's manifest tags. Adding new tags is a separate manifest update.
- **Always scan-secrets.** Even if the draft looks clean.
- **Always rebuild-index after write.**
- **Never edit an existing entry under the guise of promotion.** If the lesson is a refinement of an existing entry, use `revalidate-entry` (refresh) or `supersede-entry` (replace).

## When NOT to use

- The user is mid-task and busy. Defer to handoff time unless the trigger is an imperative correction (W1) or explicit request (W5).
- The lesson is workflow-general (applies to any project, not specific to the current stack). Flag for `bubble-up-knowledge` to the harness layer instead.
- The lesson is project-specific scratch / debugging. That belongs in `docs/handoffs/`, not `docs/knowledge/`.
