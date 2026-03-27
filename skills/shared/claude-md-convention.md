# CLAUDE.md Convention

CLAUDE.md files are derived artifacts — their content comes from the project's source of truth, never from manual authoring.

## Root CLAUDE.md

A navigation table, ~100 lines. Points to `docs/project/` files. Tells the agent where to find information, not what the information is.

**Created by:** `/project-init`
**Updated when:** `docs/project/` file structure changes (rare — it's just pointers)
**Content:** List of available project docs with one-line descriptions + list of available harness skills

Example:
```markdown
# Project Name

## Project Navigation
- [Vision & Constraints](docs/project/vision.md) — what this project is and isn't
- [Roadmap](docs/project/roadmap.md) — modules, features, priorities, progress
- [Architecture](docs/project/architecture.md) — domain boundaries and technical conventions
- [Specs](docs/project/specs/) — current system behavior (source of truth)
- [Active Plans](docs/project/exec-plans/active/) — what's currently being worked on
- [Quality](docs/project/quality.md) — quality scores and tech debt

## Current Work
If `docs/project/.current-work.md` exists, read it first.

## Available Skills
/project-init, /project-next, /project-status, /project-replan, /project-health, /project-done
```

## Subdirectory CLAUDE.md

Local conventions for a code directory, derived from two sources:
1. **architecture.md** — the domain this directory belongs to, its conventions, dependency rules
2. **specs/** — current behavior of features in this domain (interfaces, signals, constraints)

**Created by:** `/project-next` when starting work in a new domain directory
**Updated by:** `/project-done` when a feature in this domain is completed (new interfaces, conventions)
**Verified by:** PreToolUse hook (commit gate) + `/project-health`

Example for `scripts/combat/CLAUDE.md`:
```markdown
# Combat Domain

Part of the Combat layer. See [architecture](../../docs/project/architecture.md#combat).

## Conventions
- Signals: weapon_fired, hit_registered, damage_applied
- All damage flows through DamageSystem — do not apply damage directly
- Weapon stats in res://data/weapons/ (JSON), not hardcoded

## Current Specs
- [Shooting Mechanics](../../docs/project/specs/combat/shooting-mechanics.md)
- [Damage System](../../docs/project/specs/combat/damage-system.md)
```

## Derivation Rules

1. **Never copy-paste** from architecture.md or specs into CLAUDE.md. Link to them. If the source changes, the link stays valid.
2. **Only include conventions that an agent working in this directory needs.** Don't include project-wide information — that's in root CLAUDE.md.
3. **Keep it short.** A subdirectory CLAUDE.md should be under 30 lines. If it's growing, the information belongs in specs/ or architecture.md instead.

## When NOT to Create a Subdirectory CLAUDE.md

Don't create one for:
- Directories that are just file groupings with no domain conventions
- Test directories (conventions come from the verification strategy)
- Asset directories (conventions come from the asset pipeline in vision.md)
- `docs/` itself (it IS the source of truth, doesn't need a pointer to itself)

## Three-Layer Guarantee

1. **Skill refresh:** Every skill that modifies architecture.md or specs/ checks affected CLAUDE.md files
2. **Hook gate:** PreToolUse hook on commit verifies root CLAUDE.md navigation matches actual docs/project/ structure
3. **Health check:** `/project-health` scans all CLAUDE.md files for staleness and broken links
