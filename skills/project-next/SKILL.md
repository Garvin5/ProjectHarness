---
name: project-next
description: Select and prepare the next work item for execution. Use when the user wants to start working on something, asks "what's next", "what should I work on", "pick the next feature", "start the next task", or after completing a feature and wanting to continue. Also use when the user names a specific feature they want to work on.
---

# Project Next

**Announce:** "I'm using the project-next skill to select the next work item."

**Type:** Rigid — follow the selection and handoff process exactly.

## Precondition

`docs/project/roadmap.md` must exist. If it doesn't, tell the user to run `/project-init` first.

## Step 1: Analyze Roadmap

Read `docs/project/roadmap.md`. Build a picture of:
- All work items and their statuses
- Dependency graph (which items are blocked by what)
- Priority ordering within each module

Identify **ready items**: not done AND all dependencies satisfied.

## Step 2: Recommend

If the user named a specific work item, verify it's ready (deps satisfied). If blocked, explain what blocks it and suggest alternatives.

If no specific item requested, recommend top 1-3 ready items. Prioritize by:

1. **Priority:** P0 > P1 > P2 > P3
2. **Type urgency:** Spikes that block downstream features first (unblock the critical path)
3. **Module coherence:** Prefer items in the same module as recent work (context locality)
4. **Milestone proximity:** Prefer items that advance the nearest milestone

Present recommendations with brief rationale:
```
Ready to work on:
1. F1.2 Shooting System [feat, P0] — next in M1, unblocks F1.3 and F1.4
2. I1.1 Headless Test Framework [infra, P0] — independent, can parallel with M1
3. F2.1 Map Framework [feat, P0] — starts M2, no deps

Which one? (or name a different item)
```

## Step 3: Prepare Execution Context

Once the user confirms, generate `docs/project/.current-work.md`.

The content adapts to work item type (see `shared/work-item-types.md`):

**For feature/infra:**
```markdown
# Current Work: {ID} {Name}

## Type: feat
## Verification: {strategy — read from roadmap notes, or ask user if not specified}

## Description
{Expanded from roadmap entry. Include enough context that a fresh agent understands the goal.}

## Acceptance Criteria
{Concrete, verifiable. What "done" looks like.}

## Related Specs
{Links to specs/ files that this work item interacts with. If none exist yet, say so.}

## Architecture Constraints
{From architecture.md: which domain/layer, dependency rules, interface conventions.
If architecture.md doesn't exist, skip this section.}

## Asset Manifest
{If this feature needs non-code assets. Otherwise omit.}
| Asset | Type | Status | Notes |
|-------|------|--------|-------|

## Execution Plan
{Link to exec-plans/active/{module}.md}
```

**For spike:** Replace Acceptance Criteria with "Questions to Answer" and "Decision Criteria."

**For experiment:** Replace Acceptance Criteria with "Hypothesis," "Evaluation Metrics," and "Success Threshold."

**For migration:** Add "Current Behavior," "Target Behavior," and "Rollback Plan" sections.

## Step 4: Ensure Exec-Plan Exists

Check if `docs/project/exec-plans/active/{module-id}.md` exists for this work item's module.

If not, create it:
```markdown
# Execution Plan: {Module Name}

**Status:** in-progress
**Started:** {today}
**Current Work Item:** {ID} {Name}

## Progress

| Work Item | Type | Status | Branch | Notes |
|-----------|------|--------|--------|-------|
| {current} | {type} | 🔄 in-progress | — | — |
| {other items in module} | {type} | ⏳ {blocked/planned} | — | — |

## Decision Log

{Empty — decisions will be added as work progresses}
```

If it exists, update "Current Work Item" and the progress table.

## Step 5: Update Roadmap Status

Update the module status in `roadmap.md` to `[status: in-progress]` if it was `planned`.

## Step 6: Create/Update Subdirectory CLAUDE.md

If this work item will create code in a new directory that doesn't have a CLAUDE.md yet, and the directory has domain conventions in architecture.md, generate the subdirectory CLAUDE.md per `shared/claude-md-convention.md`.

## Step 7: Handoff

Tell the user:
```
Ready to start: {ID} {Name}
Verification strategy: {strategy}
Context written to docs/project/.current-work.md

You can now start a brainstorming session, or if this is straightforward,
go directly to writing a plan.
```

## References

- `shared/file-structure.md` — .current-work.md format
- `shared/work-item-types.md` — type-specific sections
- `shared/verification-strategies.md` — strategy options
- `shared/claude-md-convention.md` — when to create subdirectory CLAUDE.md
