# Phase 5 — Federation Verification (B001 Mirror) — 2026-05-06

End-to-end exercise of the per-project KB stack. Verifies that a fresh
project's Claude session can consult precedents from a sibling registered
project via the federation, with sensible relevance ranking.

## Setup

Two synthetic projects under `C:/Users/bingo/AppData/Local/Temp/`:

1. **b001-mirror** — manifest tagged like B001 (`tools: cocos-3.8, typescript, wechat-mini-game`; `domains: ui, hud, asset-import, rendering, reverse-engineering`)
2. **kb-phase5-new-cocos** — fresh project (`tools: cocos-3.8, typescript`; `domains: ui, hud, layout`)

Both registered via `register-project` against `~/.claude/harness-projects.json`.

## Entries hand-authored into b001-mirror

Translated from `docs/research/b001-finddog-transcripts-digest.md`'s 4 Cat-3 gotchas plus 1 Cat-2 convention. Each entry has a full 7-field frontmatter and body following the type's body-shape stub.

| File | Type | Tools | Domains | Provenance |
|---|---|---|---|---|
| `gotchas/viewportctrl-reset-clobber.md` | gotcha | cocos-3.8 | ui, viewport, layout | session 5282f513 |
| `gotchas/miss-flash-z-order.md` | gotcha | cocos-3.8 | ui, hud, rendering | sessions bd9679ea + 5282f513 |
| `gotchas/prop-badge-userdata-changed.md` | gotcha | cocos-3.8, typescript | hud, persistence | session 5282f513 |
| `gotchas/gameplay-hud-non-square-trimmed.md` | gotcha | cocos-3.8 | ui, hud, rendering | session 5282f513 |
| `conventions/no-self-generate-meta.md` | convention | cocos-3.x, cocos-3.8 | asset-import, asset-pipeline | sessions 2d564847 + 7ac92c29 |

`validate-knowledge` after authoring: `0 errors, 0 warnings, 0 candidates`. Schema-clean.

## Federation queries from new-cocos

### Scenario A — "做个登录 UI" (Q2 trigger)

Query: `tools=cocos-3.8, domains=ui`. Returns:

| Rank | Entry | Score | Why |
|---|---|---|---|
| 1 | `viewportctrl-reset-clobber` | 5.5 | tool+domain hits + living bonus |
| 2 | `gameplay-hud-non-square-trimmed` | 5.5 | tool+domain hits + living bonus |
| 3 | `miss-flash-z-order` | 5.5 | tool+domain hits + living bonus |
| 4 | `no-self-generate-meta` | 3 | tool match + static bonus |
| 5 | `prop-badge-userdata-changed` | 2.5 | tool match (typescript shared) + living bonus |

The 3 ui-tagged gotchas tie at the top. `.meta` convention surfaces despite no domain match because static freshness adds bonus and the alias-resolved tool intersection counts. `prop-badge` gotcha has `domains: [hud, persistence]` which doesn't include `ui` → drops to bottom but still surfaces via tool match.

### Scenario B — "asset import failed" (Q5 trigger)

Query: `tools=cocos-3.8, domains=asset-import`. Returns:

| Rank | Entry | Score | Why |
|---|---|---|---|
| 1 | `no-self-generate-meta` | 6 | tool×2 + domain×3 + static bonus |
| 2-5 | gotchas | 2.5 | tool match only |

Convention dominates as expected — it's the only entry with `domains: [asset-import]`. Other entries surface via tool match alone.

### Scenario C — survey-relevant at session start (Q1 trigger)

Query falls back to project's manifest tags: `tools=cocos-3.8, typescript`; `domains=ui, hud, layout`. Mode `survey`. Returns all 5 entries ranked by cumulative overlap:

| Rank | Entry | Score |
|---|---|---|
| 1-3 | `viewportctrl-reset-clobber`, `gameplay-hud-non-square-trimmed`, `miss-flash-z-order` | 8.5 each (multi-domain hits) |
| 4 | `prop-badge-userdata-changed` | 7.5 (tool×2 + hud match + typescript match) |
| 5 | `no-self-generate-meta` | 3 (tool match + static) |

Survey mode's lower threshold (`0.5`) catches all entries. Order is a clean priority list for an inline summary block per `survey-relevant`'s SKILL.md.

## What this proves

- Cross-project consultation works: a new project's Claude finds B001's lessons by tag overlap
- Scoring distinguishes signal (multi-axis matches surface first) from noise (tool-only matches go last but are still visible when relevant)
- Static freshness gives long-lived rules (e.g., `.meta` convention) appropriate boost without overwhelming current gotchas
- `survey-relevant` produces a usable session-start digest without loading bodies
- Schema validation passes — author-by-hand workflow doesn't drift from the template

## What this does NOT prove

- Real B001 bootstrap (the user must run `register-project` against `D:/Repo/WenHaoEntertainment/B-Serials/B001_FindDog_Reverse/` and either copy these entries or hand-author equivalents)
- Trigger encoding — Claude recognizing Q2/Q5/Q1 from conversation phrasing isn't tested by helper scripts; only real session behavior validates that
- `cocos-3.8` ⊂ `cocos-3.x` hierarchical matching (deferred vocabulary refinement; current behavior is exact match plus aliases)
- Promote-to-knowledge interactive flow — entries here were written directly via `Write`, simulating the post-confirm step

## Real B001 bootstrap (one-liner for the user)

```bash
cd D:/Repo/WenHaoEntertainment/B-Serials/B001_FindDog_Reverse
node D:/Repo/ProjectHarness/skills/register-project/scripts/register-project.mjs \
  --project-root "$(pwd)" --id b001-finddog-reverse
```

Then the user (or Claude in B001's session) runs `promote-to-knowledge` per the SKILL.md procedure for each Cat-3 gotcha and the convention. Recommended starting set is the same 5 entries from `b001-mirror`, but B001 may add finer-grained gotchas the digest didn't capture.

## Cleanup

The mirror and new-cocos projects are in temp; both are removed after this verification. The registry entries (`b001-finddog-reverse`, `kb-phase5-new-cocos`) are also removed so the user's real registry isn't polluted.
