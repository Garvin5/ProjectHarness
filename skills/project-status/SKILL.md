---
name: project-status
description: Show project progress at a glance. Use when the user asks "how's the project going", "project status", "what's done", "show progress", "where are we", "milestone status", or any question about overall project state and progress.
---

# Project Status

**Announce:** "I'm using the project-status skill to check project progress."

**Type:** Flexible — adapt the output depth to what the user is asking about.

## Precondition

`docs/project/roadmap.md` must exist. If not, tell the user to run `/project-init` first.

## Process

### 1. Read State

Read these files (skip any that don't exist):
- `docs/project/roadmap.md` — work item statuses
- `docs/project/exec-plans/active/` — current work details
- `docs/project/quality.md` — quality scores (if exists)
- `docs/project/assets/manifest.md` — asset completion (if exists)
- `docs/project/.current-work.md` — what's being worked on right now

### 2. Compute Metrics

For each milestone:
- Count total work items (excluding ops)
- Count completed items
- Calculate percentage

For each module:
- Status: done / in-progress / planned / blocked
- Feature count: done/total

Identify:
- **In Progress:** Current work item from .current-work.md or exec-plans
- **Next Ready:** Items where all deps are satisfied and not yet started (top 3)
- **Blocked:** Items waiting on incomplete dependencies (show what blocks them)
- **Stalled:** Modules marked in-progress but with no recent activity in exec-plan

### 3. Present

Format depends on what the user asked:

**Default (full overview):**
```
Project: {Name}

{Milestone 1 name}  ████████░░ 80%
  M1 {Module}     █████ 5/5 ✓
  M2 {Module}     ███░░ 3/5

{Milestone 2 name}  ██░░░░░░░░ 20%
  M3 {Module}     ██░░░ 2/4
  M4 {Module}     ░░░░░ 0/3 (blocked by M3)

🔄 In Progress: {ID} {Name} (branch: {branch})
⏭️ Next Ready:  {list}
⛔ Blocked:     {list with blockers}
```

**If assets exist, add:**
```
📦 Assets: 12/30 final, 8 placeholder, 10 not started
```

**If quality.md exists, add:**
```
📊 Quality: {summary of scores or issues}
```

**If user asks about a specific module:** Show that module's detail view — all work items, their statuses, the exec-plan progress, decision log entries.

**If user asks about a specific milestone:** Show all modules in that milestone, what's left to reach it.

## No Judgment

Report facts, not opinions. Don't say "the project is behind schedule" — you don't know the schedule. Don't say "this is going well" — that's for the user to judge. Present the data clearly and let the user draw conclusions.

## References

- `shared/file-structure.md` — where state files live
- `shared/work-item-types.md` — how different types show completion
