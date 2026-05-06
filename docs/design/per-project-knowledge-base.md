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

Vocabulary lives at `<harness>/skills/shared/per-project-kb/vocabulary.yaml` and is loaded by `consult-knowledge`.

## 7. Skills shipped by the harness

Each skill description encodes (a) its trigger class and sub-conditions from §7a, (b) its action style (quiet vs propose-first), and (c) downstream chains.

| Skill | Class | Action style | What it does |
|---|---|---|---|
| `register-project` | one-shot | propose-first (asks user for tags) | Creates `docs/knowledge/manifest.yaml`, appends to `~/.claude/harness-projects.json` |
| `survey-relevant` | Q (session-start sub-condition) | quiet (titles only, announce) | Reads registry, lists 3–5 likely-relevant entry titles from federation |
| `consult-knowledge` | Q (in-conversation sub-conditions) | quiet (announce findings inline) | Walks registry, intersects manifests, returns ranked entries, loads bodies based on `trust` |
| `promote-to-knowledge` | W (all sub-conditions) | propose-first | Drafts frontmatter, proposes file, on confirm writes file + calls `rebuild-index` |
| `supersede-entry` | U (claim-contradicted sub-condition) | propose-first | On confirm: writes new entry's `supersedes`, mutates old to `freshness: superseded`, moves to `_superseded/`, calls `rebuild-index` |
| `revalidate-entry` | U (applied-and-failed / hypothesis-stable sub-conditions) | propose-first | On confirm: re-checks claims (optionally via Codex), bumps `last-validated`, may upgrade `freshness` |
| `validate-knowledge` | S (all sub-conditions) | propose-first batched | Local QA sweep, surfaces a list of proposed actions in one batch the user steps through |
| `bubble-up-knowledge` | S (workflow-general sub-condition); also called by `validate-knowledge` | propose-first | Identifies project-local entries that should live at harness level |
| `redact-secrets` | hook / inline | enforce (refuse, not propose) | PreToolUse scan for credential patterns on writes into `docs/knowledge/`. High-confidence matches block the write. |
| `rebuild-index` | postcondition | silent | Regenerates `docs/knowledge/INDEX.md` from frontmatter, stable order |

### Trigger chains

Each chain begins with a trigger and ends with `rebuild-index` whenever a write occurred. Confirmation gates are explicit.

- **Handoff distillation (W):** `finishing-a-development-branch` → propose entries → user confirms each → `redact-secrets` → write → `rebuild-index` → `validate-knowledge` for sanity
- **Consult + apply (Q → U):** `consult-knowledge` → user/Claude applies entry → outcome observed → `revalidate-entry` proposes bump or stale → user confirms → `rebuild-index`
- **Supersede (U):** evidence contradicts entry → `supersede-entry` proposes replacement → user confirms → write + move → `rebuild-index`
- **Session start in registered project:** `redact-secrets` (hook, passive) → `survey-relevant` titles (announced quietly)

## 7a. Trigger map (the real entry point)

CRUD framing is wrong for an AI collaborator. Skills are the surface; triggers are the logic that decides *when* each skill activates and what action style it uses. Skill descriptions must encode triggers precisely so Claude lifts the right skill at the right moment — and importantly, **proposes before acting** for any write, update, or archive.

### Four trigger classes

| Class | Action style | What it covers | Skill(s) |
|---|---|---|---|
| **Q — consult** | Quiet read + announce findings | Surfacing prior knowledge that is relevant *now* | `consult-knowledge`, `survey-relevant` |
| **W — promote** | **Propose first**, write only on confirm | Capturing new knowledge that emerged in conversation | `promote-to-knowledge` |
| **U — update** | **Propose first**, mutate only on confirm | Adjusting existing entries' validity / freshness | `revalidate-entry`, `supersede-entry` |
| **S — sweep** | **Propose first**, usually batched | Structural maintenance across the local KB | `validate-knowledge`, `bubble-up-knowledge` |

### Sub-conditions per class

Skill descriptions enumerate these so Claude self-triggers correctly. Each line is a fire condition; multiple conditions in one class trigger the same skill.

**Q sub-conditions** (read is reversible — quiet, announce, no confirm needed):
- Conversation surfaces a registered tool/domain term (cocos / ui / packaging / 鉴权 …)
- About to plan / recommend an approach / enter `writing-plans`-class skill
- Tool result indicates failure (non-zero exit, error keywords)
- User language signals recurrence ("again", "上次", "再来一次", "像之前")
- Session start in a registered project (light variant — `survey-relevant`, titles only)

**W sub-conditions** (always ask first):
- User issues an imperative correction ("不要 X", "记住", "stop doing X") — Claude proposes, user confirms
- Same problem surfaced ≥2 times in this session, OR a bug took ≥3 turns to resolve
- A reasoned decision is articulated in conversation ("用 X 不用 Y 因为 Z")
- User explicitly says "记一下/入库/note this/log this"
- Handoff time (`finishing-a-development-branch` runs) — distillation pass surfaces 0–N candidates

**U sub-conditions** (always ask first):
- A consulted entry was applied → propose bump or stale flag based on outcome
- New evidence contradicts an entry → propose supersede chain

**S sub-conditions** (always ask first, batched):
- Two entries' `applies-to` overlap heavily and content rhymes → propose merge
- An entry's `applies-to` references a tool the project no longer uses → propose archive
- An entry's content is workflow-general (would apply to any project) → propose bubble-up to harness level

### Action style: ask, don't do

KB pollution is hard to reverse. A wrong entry confuses every future session across the federation. One confirmation per write is cheap; self-firing wrong writes accumulate.

| Op | Action style |
|---|---|
| Q (read) | Quiet, announce inline ("checked B001's KB — found X about non-square PNGs"). User can interrupt to redirect. |
| W / U / S | One-line proposal: state what was noticed, propose the action with key fields, single confirm prompt. Default to NO. |

**Phrasing convention** for proposals:
1. Trigger summary — what Claude noticed
2. Proposed action — type, tags, freshness, target file
3. One-line prompt: `OK / 改字段 / skip`

Example:
> 你这条"不要自己生成 .meta"的纠正这是第 3 次了。建议入 KB 作为 `convention`，tags `[cocos, asset-import]`，freshness `static`，写到 `docs/knowledge/conventions/no-self-generate-meta.md`。OK / 改字段 / skip?

### How triggers are encoded

Triggers are NOT implemented as runtime hooks (hooks have no semantic view of conversation). Claude's skill loop is the enforcement mechanism: every turn Claude scans available skill descriptions and decides whether one applies. So encoding reduces to **skill description engineering**:

1. The description concretely lists Q/W/U/S sub-conditions (Chinese + English phrasing both)
2. Anti-trigger language prevents noise activation ("do NOT use for one-off questions, casual chat, …")
3. Each skill description states the action style (quiet / propose-first)
4. Skills declare downstream chains (e.g., `promote-to-knowledge` calls `rebuild-index` on confirm)

### CRUD as consequence

CRUD ops still happen — but as outcomes of confirmed proposals, not as direct user invocation. Manual CRUD (user types "edit this entry" or "remove this") remains a fallback path — Claude uses plain Read/Edit/Write/Glob — but it is not the design center.

### Cross-cutting plumbing

| Concern | How it works |
|---|---|
| INDEX consistency | `rebuild-index` runs as postcondition of every confirmed C/U/D op. Skill chains list it explicitly. |
| `_superseded/` archive | Per-type subdir holds retired entries. `consult-knowledge` skips by default; opt-in flag for archaeology. |
| Secret prevention | `redact-secrets` runs (a) as PreToolUse hook on writes into `docs/knowledge/`, (b) inside `promote-to-knowledge` before drafting frontmatter. |
| Vocabulary integrity | `validate-knowledge` warns on tags absent from `vocabulary.yaml`; user accepts → vocabulary appended. |

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

### Phase 0 — schema artifacts ✅

- [x] `<harness>/skills/shared/per-project-kb/vocabulary.yaml` — controlled tag list
- [x] `<harness>/skills/shared/per-project-kb/manifest-template.yaml` — manifest scaffold
- [x] `<harness>/skills/shared/per-project-kb/entry-template.md` — frontmatter + per-type body shapes
- [x] This design doc — committed

### Phase 1 — primitives ✅

- [x] `rebuild-index` skill (`skills/rebuild-index/`) — Node script + SKILL.md. Idempotent, stable order, graceful with malformed entries. Tested against synthetic 1-entry and 2-entry KBs including a missing-field case.
- [x] `redact-secrets` skill (`skills/redact-secrets/`) — Node scanner + SKILL.md. Patterns: GitHub/OpenAI/Anthropic/AWS/Stripe/JWT/Slack/Google API keys + PEM private keys (high-confidence, exit 3), plus context-tagged assignments (medium, exit 2). Tested against clean text, ghp_-prefixed PAT, and the B001 `secret = "..."` shape from transcript 2d897ac6 — all classified correctly.

### Phase 2 — write path ✅

- [x] `register-project` skill — SKILL.md drives the propose-first input gathering; helper `scripts/register-project.mjs` writes manifest + atomically appends to `~/.claude/harness-projects.json` (refuses duplicate ids, supports `--force-replace`).
- [x] `promote-to-knowledge` skill — SKILL.md only (no helper); fully encodes W class sub-conditions in description, mandates secret scan + rebuild-index in procedure, includes type→directory mapping.
- [x] `supersede-entry` skill — SKILL.md + `scripts/supersede-entry.mjs`. Helper does atomic 4-step mutation (write new → mutate old frontmatter in place → move old to `_superseded/` → rebuild-index) with rollback on failure. Verified end-to-end with synthetic project; old entry shows `freshness: superseded` + `superseded-by` backlink, INDEX hides it but tallies. Bug fixed mid-Phase: rebuild-index `applies-to` parser was using `\Z` (not a JS regex anchor) — replaced with positive-indented-block regex.

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
