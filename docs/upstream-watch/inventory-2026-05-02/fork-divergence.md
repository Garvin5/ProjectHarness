# Fork ↔ Superpowers Divergence — 2026-05-02

> Companion to `superpowers.md` and `openspec.md` (Codex inventories of upstream contents). This file is the *fork-side* view: what has ProjectHarness actually changed, added, or deleted relative to its merge upstream `superpowers/main`?

OpenSpec is **not** a merge upstream so it does not appear here.

## Tree-level summary

| | Count |
|---|---|
| Files in `superpowers/main` | 136 |
| Files in fork `HEAD` | 154 |
| Files shared (same path) | 129 |
| Fork-only files | 25 |
| Superpowers-only files (we removed or never had) | 7 |

## Files in superpowers/main that are NOT in our fork

| Path | Likely reason |
|---|---|
| `.version-bump.json` | Tooling for version bumping — we removed when we stopped tracking upstream version semantics |
| `AGENTS.md` | Upstream-specific repo metadata for AI agents |
| `CLAUDE.md` | Project-level CLAUDE.md — ours diverged enough that it lives elsewhere or was deleted |
| `hooks/examples/stop-deflection-guard.sh` | Hook example we don't ship |
| `scripts/bump-version.sh` | Companion to `.version-bump.json` |
| `scripts/sync-to-codex-plugin.sh` | Upstream's own codex-sync — we use the official `codex` plugin instead |
| `skills/using-superpowers/references/copilot-tools.md` | Adapter doc for Copilot — non-Claude adapter, deprioritized |

None of these look load-bearing for our direction. Several (sync-to-codex-plugin, copilot-tools) are explicitly *replaced* by our own approach.

## Files in our fork that are NOT in superpowers/main

Grouped by intent:

### Project orchestration layer (战线 added by fork — commit `61fd555`)
- `skills/project-done/SKILL.md`
- `skills/project-health/SKILL.md`
- `skills/project-init/SKILL.md`
- `skills/project-next/SKILL.md`
- `skills/project-replan/SKILL.md`
- `skills/project-status/SKILL.md`
- `skills/shared/claude-md-convention.md`
- `skills/shared/file-structure.md`
- `skills/shared/golden-principles.md`
- `skills/shared/verification-strategies.md`
- `skills/shared/work-item-types.md`
- `docs/design/project-orchestrator.md`
- `docs/superpowers/plans/2026-03-23-codex-app-compatibility.md`
- `docs/superpowers/specs/2026-03-23-codex-app-compatibility-design.md`

### Codex collaboration (战线 C — commit `3378162`)
- `skills/using-codex/SKILL.md`

### Harness identity / cross-project framing (pre-conversation)
- `skills/using-harness/SKILL.md`
- `skills/using-harness/references/codex-tools.md`
- `skills/using-harness/references/gemini-tools.md`

### Upstream tracking infrastructure (战线 A — commit `5509791`)
- `.claude/commands/upstream-watch.md`
- `.claude/skills/tracking-upstreams/SKILL.md`
- `docs/upstream-watch/state.json`
- `docs/upstream-watch/reports/2026-04-30.md`

### Process / housekeeping
- `CHANGELOG.md`
- `docs/handoffs/2026-05-01-skill-library-buildout.md`
- `hooks/pre-commit-check-tasks` (Windows-friendly variant of upstream's `.sh` example)

## Skills count

| | Skills |
|---|---|
| Superpowers `skills/` | 14 |
| Fork `skills/` | 22 (14 inherited + 8 added) |
| Fork-only project-* skills | 6 |
| Fork-only Codex/Harness skills | 2 |

## Shared-file modifications

Of the 129 files that exist in both trees, **32 are modified** by the fork (`git diff --stat superpowers/main..HEAD -- <shared>`). High-signal ones:

| File | Lines changed | What we did |
|---|---|---|
| `README.md` | +/-336 | Mostly cleanup of upstream-specific framing |
| `hooks/session-start` | ±54 | Rebrand + Windows path safety |
| `tests/claude-code/test-helpers.sh` | ±39 | Test-runner adjustments |
| `tests/opencode/test-priority.sh` | ±12 | OpenCode adapter still tracked but stale |
| `skills/writing-plans/SKILL.md` | ±47 | Plan format tweaks |
| `skills/test-driven-development/SKILL.md` | ±36 | TDD policy edits |
| `skills/finishing-a-development-branch/SKILL.md` | +30 | Added rules (likely Codex-aware) |
| `skills/brainstorming/SKILL.md` | ±26 | Brainstorm policy tweaks |
| `commands/{brainstorm,execute-plan,write-plan}.md` | ±2 each | Cosmetic — likely path or naming |
| `.gitignore` | ±6 | Allow `.claude/skills/` to be versioned |

The ±2-line changes on multiple commands suggest a single rebrand-style sweep, not real divergence. The bigger churn is in `README.md`, `session-start`, `writing-plans`, and `test-driven-development`.

## What this implies for upstream absorption

- Our **session-level execution skills** (brainstorming, plans, TDD, code review) are still ~95% upstream — divergence is small enough that future `git merge superpowers/main` is mechanically feasible if we want it. We don't have to manually port every commit.
- Our **own additions** (project-* + using-codex + using-harness + tracking-upstreams) live in non-overlapping paths — they are insulated from upstream changes.
- The 7 superpowers-only files we don't have are mostly tooling we replaced or adapter material we don't care about. None of them block a merge.
- The half-finished rebrand (Cursor/Gemini/OpenCode adapters still saying `superpowers-extended-cc`) is visible in `tests/opencode/`, `gemini-extension.json`, `.cursor-plugin/plugin.json`. Confirms the handoff's note: "deprioritized, leave or delete."

## Open question

Should we **delete the test files for OpenCode** (`tests/opencode/*`) since we're not maintaining that adapter? Same question for `gemini-extension.json` and `.cursor-plugin/`. That's part of 战线 D (cleanup), not this inventory — flagged for the queue.
