---
name: project-health
description: Check project consistency, spec coverage, architecture drift, and technical debt. Use when the user asks "is everything consistent", "project health", "check for issues", "any problems", "tech debt", "quality check", or periodically after completing several features to catch drift before it compounds.
---

# Project Health

**Announce:** "I'm using the project-health skill to check project consistency."

**Type:** Rigid — run all applicable checks systematically.

## Precondition

`docs/project/roadmap.md` must exist.

## Checks

Run each check that has the required files. Skip checks whose prerequisites don't exist.

### 1. Spec Coverage

**Requires:** `docs/project/roadmap.md` + `docs/project/specs/`

For every work item marked `[x]` (done) with type `feat`:
- Does a corresponding spec file exist in `specs/`?
- If not, flag it.

Report: `Spec coverage: 8/12 completed features have specs (67%)`

### 2. Roadmap ↔ Exec-Plan Consistency

**Requires:** `docs/project/roadmap.md` + `docs/project/exec-plans/`

Cross-check:
- Items marked done in roadmap should be marked done in exec-plan (and vice versa)
- Modules with active exec-plans should be marked `in-progress` in roadmap
- No exec-plan should reference work items that don't exist in roadmap

Flag any mismatches.

### 3. CLAUDE.md Freshness

**Requires:** Root `CLAUDE.md`

Check root CLAUDE.md:
- Does it point to files that actually exist in `docs/project/`?
- Are there files in `docs/project/` that it doesn't point to?

Check subdirectory CLAUDE.md files (if any):
- Do they reference specs that still exist?
- Do they reference architecture sections that still exist?
- Is there a code directory with domain conventions (per architecture.md) that lacks a CLAUDE.md?

### 4. Architecture Drift

**Requires:** `docs/project/architecture.md` + actual code directories

Compare architecture.md's domain model against the actual directory structure:
- Are there code directories that don't map to any domain?
- Are there domains in architecture.md with no corresponding code?
- Are there obvious cross-domain dependencies that violate architecture.md's dependency rules?

This is a heuristic check — look at import statements, file organization, and naming patterns.

### 5. Asset Completeness

**Requires:** `docs/project/assets/manifest.md`

Count:
- Total assets listed
- Assets at each status (○ not started, ◐ placeholder, ● final)
- Assets linked to completed features that are still placeholder

Report: `Assets: 30 total — 12 final, 8 placeholder, 10 not started. 3 placeholders linked to completed features.`

### 6. External Dependency Risk

**Requires:** `docs/project/external-deps.md`

For each dependency:
- When was it last verified?
- Flag any not verified in >30 days
- Flag any with known version updates available (check if feasible)

### 7. Technical Debt Scan

**Requires:** Codebase exists

Scan source files for:
- `TODO`, `FIXME`, `HACK`, `XXX`, `WORKAROUND` comments
- Count and categorize by directory/domain

Report: `Tech debt markers: 23 total — 12 TODO, 7 FIXME, 4 HACK`

### 8. Dependency Integrity

**Requires:** `docs/project/roadmap.md`

Check the work item dependency graph for:
- Circular dependencies (A depends on B depends on A)
- Orphan items (no milestone, nothing depends on them, not in any module)
- Dangling references (depends on an item that doesn't exist)

## Output

Write or update `docs/project/quality.md`:

```markdown
# Project Quality Report

**Generated:** {date}

## Summary
- Spec Coverage: 67% (8/12)
- CLAUDE.md: 2 issues found
- Architecture Drift: 1 warning
- Assets: 3 stale placeholders
- Tech Debt: 23 markers
- Dependencies: OK

## Issues

### High Priority
- [ ] F1.3 Weapon System completed but has no spec
- [ ] scripts/network/ has no CLAUDE.md but has domain conventions in architecture.md

### Medium Priority
- [ ] 3 assets still placeholder for completed features (枪口火焰, 射击音效, 弹壳)
- [ ] architecture.md mentions "Audio" domain but no audio/ directory exists yet

### Low Priority
- [ ] 7 FIXME comments in scripts/combat/
- [ ] external-deps.md: Steam SDK not verified in 45 days

## Metrics History
| Date | Spec Coverage | Tech Debt | Asset Completion |
|------|--------------|-----------|-----------------|
| 2026-04-15 | 67% | 23 | 40% |
| 2026-04-01 | 50% | 18 | 30% |
```

Present the summary to the user. For high-priority issues, suggest specific actions.

## References

- `shared/golden-principles.md` — the invariants being checked
- `shared/claude-md-convention.md` — CLAUDE.md rules
- `shared/file-structure.md` — where files should be
