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

| Skill | When | What it does |
|---|---|---|
| `register-project` | First time using harness in a project | Creates `docs/knowledge/manifest.yaml`, asks user for tags from controlled vocabulary, appends entry to `~/.claude/harness-projects.json` |
| `consult-knowledge` | Skill-triggered or on-demand | Reads current project's manifest tags. Walks registry. For each registered project (excluding self), reads its `manifest.yaml`. Computes intersection on `tools` ∪ `domains`. For matches, walks their `INDEX.md`, filters entries whose `applies-to` overlaps. Returns ranked list. Loads bodies based on `trust` level. |
| `survey-relevant` | At session start in a registered project | Light version of `consult-knowledge`: lists 3-5 most likely-relevant entry titles from federation, without loading bodies. User/Claude can drill in. |
| `promote-to-knowledge` | At handoff time, on user request, or after a notable bug fix | Asks Claude/user "what did we learn that should outlive this session?" → drafts new entry under appropriate `<type>/`, fills 7-field frontmatter, writes content. Updates INDEX. |
| `validate-knowledge` | Periodic (cron or commit hook) | Scans local KB. Flags: stale `last-validated`, unconfirmed `hypothesis`, missing fields, orphan tags not in controlled vocabulary, `supersedes` chains pointing at non-existent entries. |
| `bubble-up-knowledge` | Run by `validate-knowledge` | Detects entries with `applies-to.domains` that are workflow-general (TDD, debugging discipline, prompting style). Prompts user "this looks like it should live at the harness level, not project level." |
| `redact-secrets` | Always (hook), or on KB write | Scans transcript / handoff / KB / manifest for credential patterns. Flags `[redacted: <kind>]` and refuses to commit if matched against a high-confidence pattern (e.g., `ghp_*`, `sk-*`, AWS keys). |
| `revalidate-entry` | On entry maintenance, or run by `validate-knowledge` for stale items | Walks an entry's claims, optionally dispatches Codex to verify against current code/external state, bumps `last-validated`, optionally upgrades `freshness: hypothesis → living`. |
| `supersede-entry` | When an entry is replaced by a better one | Writes `supersedes` link on new entry, sets old entry's `freshness: superseded`, moves old to `<type>/_superseded/`, rebuilds INDEX. |
| `rebuild-index` | Called by every write/delete/supersede skill | Regenerates `docs/knowledge/INDEX.md` from frontmatter, stable order. |

### Skill ordering

At session start in a registered project:

1. `redact-secrets` (hook) — passive
2. `survey-relevant` — list precedents from federation
3. `consult-knowledge` activated when Claude or user signals topic match

At handoff:

1. `promote-to-knowledge` — distill session into KB candidates
2. `redact-secrets` — final pass on KB write
3. `validate-knowledge` — sanity check

## 7a. CRUD operations

Different operations have different needs — some warrant a skill (because they require non-trivial logic), others are plain file ops.

| Op | Method | Why |
|---|---|---|
| **Create** | `promote-to-knowledge` skill | Frontmatter authoring is non-trivial (tags, applies-to, freshness). Skill asks the right questions and drafts. |
| **Read (local)** | Plain `Read` / `Grep` / `Glob` against `docs/knowledge/` | No skill needed. `INDEX.md` is the navigation aid; tag queries are grep over frontmatter. |
| **Read (federation)** | `consult-knowledge` / `survey-relevant` | Non-trivial: walks registry, reads remote manifests, computes intersection. |
| **Search** | Plain `Grep` over frontmatter and bodies | Same as read-local. |
| **Update — content edit** | Plain `Edit` + `rebuild-index` skill | Editing markdown is just editing. INDEX must regenerate after. |
| **Update — revalidate (bump `last-validated`)** | `revalidate-entry` skill | Skill walks the entry's assumptions, optionally invokes Codex to verify against current code/external state, then bumps date. Not just a date change — a re-confirmation gesture. |
| **Update — retag** | Plain `Edit` + `validate-knowledge` runs after | Schema check confirms tags exist in controlled vocabulary. INDEX rebuilds. |
| **Update — promote `hypothesis` → `living`** | `revalidate-entry` skill | Same machinery as revalidate; sets freshness too. |
| **Delete — hard** | `git rm` + `rebuild-index` skill | Rare. Use only when an entry is wrong (not superseded). Git history retains. |
| **Delete — supersede (preferred)** | `supersede-entry <old-id> <new-id>` skill | Writes `supersedes: [<old-id>]` on new entry. Sets `freshness: superseded` on old entry. Moves old to `<type>/_superseded/<id>.md` for history. INDEX rebuilds. New entry is now what consultation surfaces. |
| **Cross-cutting — INDEX rebuild** | `rebuild-index` skill (called by every write skill) | Scans all `<type>/` dirs, regenerates `docs/knowledge/INDEX.md` grouped by type with one-line hooks. Stable order so diffs are clean. |

### Why no `read-local` or `search-local` skill

The harness should not gate plain file access behind a skill — that's friction with no payoff. Claude already has Read/Glob/Grep; `INDEX.md` is the entry point. A skill becomes worth its weight only when there's logic the user shouldn't have to remember (frontmatter rules, federation walk, supersede plumbing).

### Why supersede is a skill but delete isn't

Delete is a single op — `git rm` + INDEX rebuild. Supersede is multi-step: write the new entry, mutate the old entry's freshness, move to `_superseded/`, update INDEX, and any future `consult-knowledge` walking the old entry must follow the chain to the new one. That logic deserves a skill so users don't half-do it.

### `_superseded/` archive convention

Per type directory has an optional `_superseded/` subdir. Superseded entries live there, retain their original frontmatter, plus a `superseded-by: <new-id>` field. `consult-knowledge` skips them by default but can opt in via flag (e.g., for archaeology / "why was this changed?" questions).

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

## 11. Open questions

1. **Vocabulary governance.** Who curates `vocabulary.yaml`? Probably a `validate-knowledge` warning when a new tag is introduced, prompting the user to add it to the controlled list.
2. **Cross-project provenance.** When B001's lesson is borrowed into a new project, should the new project's entry's `provenance` include `external-project: B001-FindDog-Reverse#path-or-id`? Recommended yes — improves backtrace.
3. **Registry portability across machines.** `~/.claude/harness-projects.json` is machine-local. Should it be backed up to a private gist, synced via dotfiles, or simply rebuilt on each new machine? MVP: rebuild on demand.
4. **Embedding handoffs.** Should handoff documents be allowed to *link to* KB entries (yes), or be auto-mined for promotions (yes, by `promote-to-knowledge`)? But handoffs themselves stay out of `docs/knowledge/`.
5. **`patterns/` MVP scope.** Punt or include? Punt — patterns can emerge in v2 once we see if cross-entry recipes accumulate naturally.

## 12. MVP scope (what to build first)

Order:

1. Schema files: this doc + `<harness>/skills/per-project-kb/vocabulary.yaml`
2. `register-project` skill — bootstraps manifest + registry entry
3. `rebuild-index` skill — needed by every write op below; small, build first
4. `promote-to-knowledge` skill — the C in CRUD
5. `consult-knowledge` skill — the federation core (R-federation)
6. `supersede-entry` skill — the structured D
7. `redact-secrets` hook — runs on every KB write
8. Bootstrap B001 — run `register-project` against it, hand-author 4 promoted entries from the transcripts digest, validate end-to-end
9. Defer: `survey-relevant`, `validate-knowledge`, `revalidate-entry`, `bubble-up-knowledge`, `patterns/`

R-local and search-local are plain Read/Glob/Grep — no skill, no MVP work.
U (content edits) is plain Edit + `rebuild-index` — no dedicated skill in MVP.
Hard delete is `git rm` + `rebuild-index` — no skill.

After step 6 we will know if the design holds up under one real federation member. Iterate from there.
