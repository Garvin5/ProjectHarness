---
name: project-replan
description: Modify the project roadmap dynamically. Use when the user wants to change plans, add features, remove features, reprioritize, adjust milestones, change dependencies, split or merge work items, record decisions, or says things like "let's change the plan", "drop this feature", "add X to the roadmap", "reprioritize", "this is more important now", "we need to pivot".
---

# Project Replan

**Announce:** "I'm using the project-replan skill to adjust the roadmap."

**Type:** Flexible — the user might want a quick tweak or a major restructure.

## Precondition

`docs/project/roadmap.md` must exist.

## Process

### 1. Understand the Change

Listen to what the user wants. Common operations:

| Operation | Example |
|-----------|---------|
| Add work item | "Add a skin system to M5" |
| Remove work item | "Drop F5.3, we're not doing skills" |
| Add module | "We need an audio module" |
| Remove module | "Cut M6 entirely for v1" |
| Change priority | "F6.1 HUD should be P0" |
| Change dependency | "F3.4 doesn't need F3.1 anymore" |
| Split work item | "F3.2 is too big, split into sync and lag compensation" |
| Merge work items | "Combine F2.3 and F2.4 into one" |
| Change type | "F1.5 should be an experiment, not a feature" |
| Adjust milestone | "Move F3.2 from v0.2 to v1.0" |
| Record decision | "We decided to use WebSocket instead of ENet" |
| Switch project mode | "We're entering maintenance mode" |

### 2. Analyze Impact

Before making changes, analyze and present the impact:

- **Dependency chains affected:** If removing F1.2, what depends on it? Those become orphaned or need new deps.
- **Milestone impact:** Does this change push a milestone? Pull one forward?
- **In-progress work:** Is anyone currently working on something affected? (Check .current-work.md and exec-plans/active/)
- **Blocking chains:** Does this unblock anything? Block anything new?

Present the impact clearly:
```
Impact of dropping F5.3 (Skill System):
- Nothing depends on F5.3 — safe to remove
- M5 reduces from 3 to 2 work items
- v1.0 milestone unaffected (F5.3 was P2)

Proceed?
```

### 3. Apply Changes

On user confirmation:

1. Update `docs/project/roadmap.md`
2. If architecture changed → update `docs/project/architecture.md`
3. If a decision was made → write to `docs/project/decisions/{date}-{topic}.md` or to the relevant exec-plan's Decision Log
4. If a module was added → create placeholder entry in roadmap (one-line description, work items as titles only — detail comes when development starts)
5. If a module was removed → if it had an exec-plan, move to `exec-plans/abandoned/` with a note about why
6. If `.current-work.md` is affected → update or clear it

### 4. Check Golden Principles

After applying changes, per `shared/golden-principles.md`:
- Is CLAUDE.md still accurate? (If architecture changed, refresh affected CLAUDE.md files)
- Is roadmap consistent with exec-plans?
- Any new decisions that should be recorded?

### 5. Confirm

Show the user a summary of what changed and the current state of the affected area.

## Spike → Feature Conversion

A common pattern: a spike completes and the decision leads to new feature work.

```
S1.1 spike completed: [decision: use WebSocket]
→ Add F3.1: WebSocket networking layer [feat, P0, deps: —]
→ Update roadmap
→ Record decision in decisions/
```

This is a single `/project-replan` operation, not multiple steps.

## Mode Switching

The user can switch between build mode and ops mode:

**To ops mode:** "We're in maintenance now"
- Create `docs/project/ops/` if it doesn't exist
- `/project-status` shifts to show ops metrics
- `/project-next` draws from ops activities + any remaining roadmap items

**Back to build mode:** "We're adding a new feature set"
- Resume roadmap-driven workflow
- Ops activities continue in parallel

## References

- `shared/golden-principles.md` — invariants to check after changes
- `shared/work-item-types.md` — type definitions for adding/converting items
- `shared/file-structure.md` — file locations and formats
