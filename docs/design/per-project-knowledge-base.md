# Per-Project Knowledge Base — Federated Design

> **Status:** draft v1 · 2026-05-06 · supersedes earlier "isolated standard" sketch
>
> **Why this exists:** ProjectHarness needs a knowledge-base mechanism that lets Claude in a *new* project consult precedents from other harness-using projects (e.g., a new Cocos project should learn UI/packaging gotchas from B001), without centralized storage, copying, or filesystem auto-scan.
>
> **Source data:** B001_FindDog_Reverse transcripts digest at `docs/research/b001-finddog-transcripts-digest.md` proved that (a) gotchas drown in handoffs, (b) the same problems repeat across sessions, (c) cross-project transfer of lessons would be high-value if Claude could *reach* prior projects' knowledge.

## 0. Scope

ProjectHarness ships:

- **Schema** for a per-project KB (directory layout + frontmatter)
- **Skills** for read/write/consult/validate operations on a KB
- **Registry** format (user-level list of harness projects)

ProjectHarness does NOT ship:

- KB content (every project owns its own)
- Auto-discovery (user explicitly registers projects)
- Cross-project writes (consultation is read-only)

## 1. Three-layer model

```
┌─────────────────────────────────────────────────────────┐
│  Consultation layer — skills (harness-shipped)          │
│    consult-knowledge      survey-relevant               │
│    promote-to-knowledge   validate-knowledge            │
│    register-project       bubble-up-knowledge           │
│    redact-secrets                                       │
├─────────────────────────────────────────────────────────┤
│  Registry layer — user-level (harness-shipped schema)   │
│    ~/.claude/harness-projects.json                      │
├─────────────────────────────────────────────────────────┤
│  Project layer — per-project (harness-shipped schema)   │
│    <project>/docs/knowledge/                            │
│      manifest.yaml                                      │
│      INDEX.md (auto-generated)                          │
│      gotchas/ decisions/ conventions/                   │
│      ground-truth/ references/ patterns/                │
└─────────────────────────────────────────────────────────┘
```

### Layer responsibilities

**Project layer** owns content. Stays inside the project's git repo. No knowledge in the harness itself, by design.

**Registry layer** is just a pointer list — user-curated, opt-in. ProjectHarness shows up here only because the user runs `register-project` inside it. No auto-walk.

**Consultation layer** is a small skill suite that reads across the federation. Skills are stateless; all state lives in project KBs and the registry.

## 2. Knowledge type taxonomy

Five durable types, plus an optional sixth. Each maps to a directory.

| Type | Directory | What it is | Example |
|---|---|---|---|
| `gotcha` | `gotchas/` | An empirical lesson — "X looked right but Y broke" | "Dog PNGs are rectangular; using `sizeMode=CUSTOM` stretches Y" |
| `decision` | `decisions/` | A deliberate choice with rationale (ADR-style) | "Use Vitest over Jest because…" |
| `convention` | `conventions/` | A long-lived workflow / protocol the team follows | Asset-import protocol; commit-message style |
| `ground-truth` | `ground-truth/` | An external invariant the project depends on | H5 origin spec; bundle binary format; level data schema |
| `reference` | `references/` | Pointer to an external resource (URL, internal doc, dashboard) | "Linear project INGEST tracks pipeline bugs" |
| `pattern` | `patterns/` | Cross-entry recipe (composes 2+ atomic facts) — *optional, MVP can skip* | "Cocos popup with absorber + safe-area mask" |

Anything that doesn't fit one of these is probably **not knowledge** — it's session state, work-in-flight, or project config (handle in `docs/handoffs/`, `docs/plans/`, `CLAUDE.md` respectively).

## 3. Frontmatter schema (7 required fields)

Every entry under `docs/knowledge/<type>/` MUST have this frontmatter:

```yaml
---
type: gotcha                    # one of the 6 types above
activation: skill-triggered     # always-on | skill-triggered | on-demand
freshness: living               # static | living | hypothesis
last-validated: 2026-05-05      # ISO date — when last confirmed correct
provenance:                     # list — at least one entry
  - session: 5282f513           #   session uuid (Claude transcript)
  - commit: 9dc360e             #   git commit
  - external: <url>             #   external source
applies-to:                     # cross-project discriminator
  tools: [cocos-3.8]            #   tool / framework / language tags
  domains: [ui]                 #   functional area tags
  project-type: [mini-game]     #   project-type tags (optional)
supersedes: []                  # list of entry IDs this entry replaces
---

# Title in body

(Free-form markdown — schema does not constrain content shape.)
```

### Field semantics

- **`type`** decides directory placement and consult-time filtering.
- **`activation`** is *advisory for Claude*, not enforced by infra:
  - `always-on` — `session-start` hook injects this entry into context
  - `skill-triggered` — relevant skill's preamble queries for it
  - `on-demand` — Claude only reads when explicitly relevant
- **`freshness`**:
  - `static` — won't change unless external invariant breaks (e.g., "PNG format")
  - `living` — depends on tool/library version; needs revalidation
  - `hypothesis` — believed but not yet confirmed; should be promoted or removed
- **`last-validated`** is a date Claude can compare against. `validate-knowledge` skill flags entries where (today − last-validated > threshold && freshness == living).
- **`provenance`** is mandatory and at least one item — every entry must trace back to a verifiable source.
- **`applies-to`** is the **federation discriminator**. Tags here decide whether a new project can consult this entry. Vocabulary is a controlled list (see §6).
- **`supersedes`** prevents stale entries from misleading new projects. When entry B replaces A, A stays in the repo for history but `consult-knowledge` skips it.

## 4. Project manifest

Every harness-using project has `docs/knowledge/manifest.yaml`:

```yaml
project:
  id: B001-FindDog-Reverse           # unique identifier (kebab-case)
  name: 找狗反编译还原                # human-friendly display name
  type: cocos-mini-game-reverse      # broad category
  description: |
    反编译微信小游戏"全民找狗狗" (Cocos 2.4.14) → Cocos 3.8.8 重建。

  # All tags below come from the controlled vocabulary in §6.
  tools: [cocos-3.8.8, wechat-mini-game, typescript]
  domains: [ui, gameplay, asset-import, reverse-engineering, packaging]

  # Optional — supports cross-project precedent linking
  related-projects: []
```

Manifest plus the 7-field per-entry frontmatter is the entire schema. Everything else is convention.

## 5. Registry format

`~/.claude/harness-projects.json`:

```json
{
  "version": 1,
  "projects": [
    {
      "id": "B001-FindDog-Reverse",
      "path": "D:/Repo/WenHaoEntertainment/B-Serials/B001_FindDog_Reverse",
      "registered-at": "2026-05-06T10:00:00Z",
      "trust": "full"
    }
  ]
}
```

- `path` — absolute path to the project root (the project's git repo, not its `docs/knowledge/`).
- `trust`:
  - `full` — entries can be loaded inline by Claude during consultation
  - `summary-only` — only INDEX summaries are read; bodies require user confirmation
  - `disabled` — listed but skipped during consultation
- `registered-at` — drives "stale registry" warnings if a path no longer exists.

The registry is **only** populated by the `register-project` skill. No auto-scan.

## 6. Controlled tag vocabulary

To keep federation queries meaningful, harness ships a controlled vocabulary. Projects can extend with `tools.local: […]` etc., but cross-project consultation only matches on the controlled list.

**v1 vocabulary (incomplete; expand as needed):**

```yaml
tools:
  - cocos-2.x | cocos-3.x | cocos-3.8           # version-tagged
  - typescript | javascript | python | go | rust
  - react | vue | svelte
  - unity | godot | unreal
  - wechat-mini-game | h5 | electron
  - tauri | flutter
  - claude-code | codex
  - openspec | superpowers

domains:
  - ui | layout | animation | viewport
  - gameplay | level-design | input-handling
  - audio | rendering | networking
  - asset-import | asset-pipeline | packaging | bundle-format
  - persistence | save-system | migration
  - testing | debugging | observability
  - i18n | accessibility
  - security | secrets | auth
  - reverse-engineering | decompilation
  - performance | memory

project-type:
  - mini-game | full-game | playable-ad
  - cli-tool | library | service
  - reverse | greenfield | maintenance
  - personal | team | open-source
```

Vocabulary lives at `<harness>/skills/per-project-kb/vocabulary.yaml` and is loaded by `consult-knowledge`.

## 7. Skills shipped by the harness

Each skill description must encode its triggers (see §7a) so Claude lifts it autonomously. The "triggers" column below is canonical — descriptions written for these skills should mirror it precisely.

| Skill | Triggers | What it does |
|---|---|---|
| `register-project` | First-run in a new project; user says "register/注册 this project" | Creates `docs/knowledge/manifest.yaml`, asks user for tags, appends to `~/.claude/harness-projects.json` |
| `survey-relevant` | Q1 (session start in registered project) | Reads registry, lists 3–5 likely-relevant entry titles from federation; no body load |
| `consult-knowledge` | Q2 (tool/domain mention), Q3 (entering core skill), Q4 (about to recommend), Q6 (recurrence language) | Walks registry, intersects manifests, returns ranked entries, loads bodies based on `trust` |
| `promote-to-knowledge` | W1 (imperative correction), W2 (≥3-turn bug), W3 (intra-session repeat), W4 (handoff distillation), W5 (explicit user request), W6 (reasoned decision) | Drafts frontmatter, asks user to confirm tags / freshness, writes file, calls `rebuild-index` |
| `supersede-entry` | U3 (claim contradicted) | Writes new entry's `supersedes`, mutates old entry to `freshness: superseded`, moves old to `_superseded/`, calls `rebuild-index` |
| `revalidate-entry` | U2 (failed application), U4 (hypothesis applied ≥3×); also `validate-knowledge` calls it | Re-confirms an entry's claims (optionally via Codex), bumps `last-validated`, may upgrade `freshness` |
| `validate-knowledge` | Cron / `finishing-a-development-branch` postcondition | Local QA pass: stale entries, missing fields, orphan tags, broken supersedes, S1 merge candidates, S2 archive, S3 bubble-up |
| `bubble-up-knowledge` | S3 (workflow-general entry detected); also called by `validate-knowledge` | Surfaces project-local entries that should be at harness level |
| `redact-secrets` | PreToolUse hook on writes into `docs/knowledge/` or `docs/handoffs/`; also called inside `promote-to-knowledge` before draft | Scans for credential patterns; refuses high-confidence matches |
| `rebuild-index` | Postcondition of `promote-to-knowledge`, `supersede-entry`, `revalidate-entry`; also called by Claude after plain-Edit content changes | Regenerates `docs/knowledge/INDEX.md` from frontmatter, stable order |

### Trigger chains

Some triggers fire skill chains. The following are canonical chains:

- **W4 chain (handoff distillation):** `finishing-a-development-branch` → `promote-to-knowledge` (per candidate) → `redact-secrets` → `rebuild-index` → `validate-knowledge`
- **Q-then-U1 chain (consult and confirm):** `consult-knowledge` → entry applied successfully → inline `last-validated` bump → `rebuild-index`
- **U3 chain (supersede):** `supersede-entry` → `rebuild-index`
- **Session-start chain (registered project):** `redact-secrets` (hook, passive) → `survey-relevant` (Q1, optional based on registry depth)

## 7a. Trigger map (the real entry point)

CRUD framing is wrong for an AI collaborator. The user does not regularly *invoke* KB operations — Claude does, autonomously, when conversational/state events match a trigger. Skills are the surface; triggers are the logic of when each skill activates. Skill descriptions must encode these triggers precisely so Claude lifts the right skill at the right moment.

### Q-triggers — proactive consultation

Claude reaches into the KB without being asked.

| ID | When | Skill that fires | Result |
|---|---|---|---|
| Q1 | Session-start in a registered project | `survey-relevant` | List 3–5 likely-relevant entry titles from federation, no body load |
| Q2 | User message contains a registered tool/domain term (cocos / ui / packaging / auth / …) | `consult-knowledge` | Walk federation, return ranked entries (R) |
| Q3 | About to enter a core skill (`writing-plans` / `executing-plans` / `systematic-debugging`) | `consult-knowledge` filtered by skill type | Surface prior-art for that skill type (R) |
| Q4 | About to recommend an approach | quick local-KB sniff | Check if same approach already documented (R) |
| Q5 | Tool result indicates failure (non-zero exit, error keywords) | local `gotchas/` lookup | Match against known failure modes (R) |
| Q6 | User language signals recurrence ("again" / "same as last time" / "上次" / "再来一次" / "像之前") | `consult-knowledge` plus local | Find the prior occurrence (R) |

### W-triggers — proactive write

Claude promotes content into the KB without being asked.

| ID | When | Skill that fires | Result |
|---|---|---|---|
| W1 | User issues an imperative correction ("不要 X" / "stop doing X" / "记住" / "remember") | `promote-to-knowledge` (type=`convention` or local feedback rule) | Create entry capturing the rule (C) |
| W2 | A bug took ≥3 turn cycles to resolve | `promote-to-knowledge` (type=`gotcha`) | Create gotcha with provenance from the failure trace (C) |
| W3 | The same problem surfaced twice in this session | `promote-to-knowledge` | Create with two-source provenance, mark `freshness: living` (C) |
| W4 | Entering `finishing-a-development-branch` / handoff time | distillation pass over the session | Suggest 0–N entries; user accepts/edits/rejects (C) |
| W5 | User explicitly says "记一下/记住/log this/入库/note this" | `promote-to-knowledge` immediately | Create with quoted rationale (C) |
| W6 | A reasoned decision was articulated ("用 X 不用 Y 因为 Z") | `promote-to-knowledge` (type=`decision`) | Create decision entry (C) |

### U-triggers — proactive update

| ID | When | Skill that fires | Result |
|---|---|---|---|
| U1 | A consulted entry was applied successfully | inline last-validated bump | Update `last-validated` to today, append a successful-application note (U) |
| U2 | A consulted entry was applied unsuccessfully | mark stale | Set `freshness: hypothesis`, flag for `revalidate-entry` (U) |
| U3 | New evidence contradicts an entry's claim | `supersede-entry` chain | Author replacement, link supersedes (D + C) |
| U4 | A `hypothesis` entry has been applied successfully ≥3 times | auto-promotion suggestion | Prompt user to confirm `freshness: living` (U) |

### S-triggers — proactive structural maintenance

| ID | When | Skill that fires | Result |
|---|---|---|---|
| S1 | Two entries' `applies-to` fully overlap and content is similar | merge candidate flag in `validate-knowledge` | Suggest merge or supersede (advisory) |
| S2 | An entry's `applies-to.tools` includes a tool the project no longer uses | archive prompt | Suggest move to `_superseded/` |
| S3 | An entry has `applies-to` matching workflow-general patterns (TDD, debugging, prompting) | `bubble-up-knowledge` | Suggest the entry belongs at the harness level, not project-local |

### How triggers are encoded

Triggers are **not implemented as runtime hooks**. Hooks fire on tool boundaries (PreToolUse, Stop, SessionStart) and have no semantic view of conversation content. Claude's skill loop *is* the enforcement mechanism: every turn Claude scans available skill descriptions and decides whether one applies. So encoding triggers reduces to **skill description engineering**:

1. The description must concretely list the trigger phrases / state conditions, in both English and Chinese where relevant
2. Anti-trigger language ("do NOT use this skill when …") prevents noise activation
3. Each skill must declare which triggers it owns and what other skills it might chain into (e.g., `promote-to-knowledge` always calls `rebuild-index` after)

Example partial description for `consult-knowledge`:

> Use when (Q2) the user's message mentions a registered tool/domain term — cocos, ui, packaging, asset, auth, etc.; (Q3) before entering writing-plans / executing-plans / systematic-debugging; (Q4) before recommending an implementation approach; (Q6) when user language signals recurrence ("again", "same as last time", "上次", "再来一次").
> Do NOT use this skill for one-off factual questions, casual chat, or when the topic obviously has no precedent in any registered project.

### CRUD as consequence, not entry point

CRUD operations are still real — they're just not what gets invoked. They emerge as outcomes of triggers:

| Trigger class | Outcome |
|---|---|
| W1–W6 | Create |
| Q1–Q6 | Read (federation or local) |
| U1, U4 | Update (in place) |
| U2, S1, S2 | Update (mark stale / flag merge) |
| U3 | Delete-via-supersede + Create |

Manual CRUD (user explicitly says "edit this entry" or "remove this") remains available as a fallback — Claude can do it with plain Read/Edit/Write/Glob — but it is not the design center.

### Cross-cutting plumbing

| Concern | How it works |
|---|---|
| INDEX consistency | `rebuild-index` runs after every C/U/D-creating skill. Skill chains list it as a postcondition so Claude doesn't forget. |
| `_superseded/` archive | Per-type subdir holds retired entries. `consult-knowledge` skips by default; opt-in flag for archaeology. |
| Secret prevention | `redact-secrets` runs in two places: (a) PreToolUse hook scanning content about to be written to disk, (b) inside `promote-to-knowledge` before frontmatter draft. |
| Vocabulary integrity | `validate-knowledge` warns when a tag absent from `vocabulary.yaml` is introduced; user accepts → vocabulary updated. |

## 8. Consultation use-cases (concrete)

### Case A: New Cocos project, "做个登录 UI"

1. New project's manifest: `tools:[cocos-3.8.8], domains:[ui]`
2. User asks Claude to build login UI
3. `consult-knowledge` runs with hint `domain: ui`
4. Walks registry → finds B001 has `tools:[cocos-3.8.8], domains:[ui, …]` — match
5. Reads B001's `docs/knowledge/INDEX.md`
6. Filters entries where `applies-to.domains` includes `ui` and `applies-to.tools` overlaps cocos
7. Returns ranked list, e.g.:
   - `gotchas/png-non-square-trimmed.md` (relevance 0.9)
   - `patterns/popup-with-absorber.md` (relevance 0.7)
8. Claude reads inline, applies lessons, **does not write to B001**
9. If new lesson learned in current project → `promote-to-knowledge` writes to current project's KB only

### Case B: Packaging failure

1. User: "打包错了"
2. Claude infers `domain: packaging`, runs `consult-knowledge`
3. Match: B001's `gotchas/cocos-asset-pitfalls.md`
4. Entry's `freshness: living`, `last-validated: 2026-04-19`
5. `consult-knowledge` adds caveat: "validated 17 days ago against Cocos 3.8.8 — confirm version match"
6. Claude reads, applies, then `promote-to-knowledge` if a new packaging gotcha emerges

### Case C: Borrow vs. duplicate

`consult-knowledge` returns three buckets per match:

- **direct-reuse** — `freshness: static`, no environment-dependent fields. Apply as-is.
- **adapt** — `freshness: living` and current project's stack differs slightly. Read for guidance; write a new local entry citing source via `provenance.related-knowledge`.
- **predictive-warning** — entry describes a problem that *might* happen. Don't apply yet, but Claude is now primed; if symptoms appear, jumps straight to that entry.

## 9. Lifecycle

```
emerging-issue (in conversation)
        ↓ promote-to-knowledge (with frontmatter)
hypothesis (freshness: hypothesis)
        ↓ confirmed by user / validation run
living (freshness: living, last-validated set)
        ↓ tool/api/library evolves
revalidate (validate-knowledge flags it)
        ↓ user reconfirms / updates / supersedes
living-updated  OR  superseded
```

`hypothesis` exists so newly-promoted lessons aren't trusted as gospel until confirmed.

## 10. Anti-goals

- **No global knowledge store.** ProjectHarness has zero KB content of its own.
- **No auto-discovery.** Registry is opt-in; filesystem is not scanned.
- **No cross-project writes.** Consulting B001 cannot mutate B001.
- **No content schema.** Markdown body is free-form; only frontmatter is constrained.
- **No syncing.** Two projects with similar gotchas keep separate entries; the user decides if/when to bubble up to harness or merge.
- **No skill auto-load of high-volume content.** `survey-relevant` returns titles, not bodies. Bodies load on demand.

## 11. Decisions and open questions

### Decisions made

- **Vocabulary governance** — `vocabulary.yaml` lives in the harness; `validate-knowledge` flags new tags introduced by projects; user-confirmed additions append to the controlled list. No external curator.
- **Cross-project provenance** — when one project's entry borrows from another, `provenance` MUST include `external-project: <project-id>` and `external-entry: <relative-path>`. Backtrace is mandatory.
- **`patterns/` is in scope** — not deferred. Patterns are cross-entry recipes that emerge when 2+ atomic entries with the same `applies-to` complement each other. `validate-knowledge` proposes pattern creation when it detects clusters; user accepts or rejects.
- **Handoffs stay outside `docs/knowledge/`** — handoffs are session state. They MAY link to KB entries; they MUST be input to `promote-to-knowledge` (W4 trigger). They are not knowledge themselves.

### Genuine open questions

1. **Registry portability across machines.** `~/.claude/harness-projects.json` is machine-local. Sync via dotfiles or rebuild on demand? Default: rebuild on demand (each machine's harness is independent), since cross-machine work is rare and the registry is small.
2. **Federation across multiple users.** A team scenario where two developers both use ProjectHarness on overlapping projects — whose registry wins? Out of scope for v1 (this is a personal toolkit per the project memory).
3. **Trigger sensitivity calibration.** How aggressive should Q-triggers be? Too eager and Claude becomes consult-happy; too conservative and KB is underused. Will likely need iteration after first 2–3 sessions of real use.

## 12. Complete buildout

This is a personal toolkit, not an iteratively-shipped product. Build everything, then exercise on B001 end-to-end. Order is logical (downstream depends on upstream), not staged-by-priority.

### Phase 0 — schema artifacts

- [ ] `<harness>/skills/per-project-kb/vocabulary.yaml` — controlled tag list
- [ ] `<harness>/skills/per-project-kb/manifest-template.yaml` — manifest scaffold
- [ ] `<harness>/skills/per-project-kb/entry-template.md` — frontmatter scaffold per type
- [ ] This design doc (already drafted) — committed alongside

### Phase 1 — primitives

- [ ] `rebuild-index` skill — invoked by every other write skill; standalone first because it has no dependencies
- [ ] `redact-secrets` hook — implements the PreToolUse scan of content about to land in `docs/knowledge/`. Plus an in-skill secondary scan inside `promote-to-knowledge`.

### Phase 2 — write path

- [ ] `register-project` skill — manifest bootstrap + registry append. Asks user for tags from controlled vocabulary.
- [ ] `promote-to-knowledge` skill — full C path. Encodes W1–W6 triggers in description. Drafts frontmatter, asks user to confirm tags / freshness, writes file, calls `rebuild-index`.
- [ ] `supersede-entry` skill — full D-via-supersede. Mutates old entry's freshness, moves to `_superseded/`, writes new entry's `supersedes` link, calls `rebuild-index`.

### Phase 3 — read path

- [ ] `consult-knowledge` skill — federation walk. Encodes Q2–Q6 triggers. Reads registry, intersects manifests, ranks by tag overlap + recency + successful-application count. Returns ranked summary; loads bodies based on `trust` level.
- [ ] `survey-relevant` skill — light Q1 trigger. Lists candidate titles at session-start in registered projects without loading bodies.

### Phase 4 — maintenance

- [ ] `revalidate-entry` skill — U2 / U4 triggers. Walks an entry, optionally dispatches Codex to verify claims, bumps `last-validated`, optionally upgrades `freshness`.
- [ ] `validate-knowledge` skill — periodic local QA. Stale entries, missing fields, orphan tags, broken supersedes chains, S1 merge candidates, S2 archive prompts, S3 bubble-up flags.
- [ ] `bubble-up-knowledge` skill — S3 trigger detector. Surfaces project-local entries that should live at the harness level.

### Phase 5 — end-to-end on B001

- [ ] Run `register-project` against B001
- [ ] Hand-author 4 promoted entries from the transcripts digest (the 4 Cat-3 gotchas: ViewportCtrl reset, miss-flash z-order, prop badge USER_DATA_CHANGED refresh, gameplay HUD non-square TRIMMED)
- [ ] Hand-author 1–2 conventions from the digest (the asset-import protocol verbatim, plus the 6 Cat-2 user feedback rules — possibly bubbling these up to the harness immediately via S3 trigger)
- [ ] Bootstrap a NEW dummy Cocos project, register it, ask Claude to do "登录 UI", verify `consult-knowledge` surfaces B001's relevant entries
- [ ] Trigger an artificial failure to verify Q5 / U3 paths

### Phase 6 — bubble-up the workflow-general rules

- [ ] Move the 6 Cat-2 user pushback patterns and 6 Cat-5 collaboration-mode signals from B001's KB up to ProjectHarness as feedback memories (these are not project-specific)

### Plain file ops not in the buildout

R-local, search-local, content edits, retag, hard delete — all use plain `Read` / `Glob` / `Grep` / `Edit` / `git rm` plus a final `rebuild-index` invocation. No skill is needed; the friction of a wrapper would outweigh value.
