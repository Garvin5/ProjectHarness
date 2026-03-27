---
name: project-done
description: Complete a work item and flow results back to the project. Use when a feature is finished, a spike has reached a decision, an experiment has results, a migration step is complete, or the user says "done with this feature", "feature complete", "finished X", "this is done". Also triggered automatically by the finishing-a-development-branch skill.
---

# Project Done

**Announce:** "I'm using the project-done skill to close out this work item and update the project."

**Type:** Rigid — follow the completion flow exactly to maintain project consistency.

## Precondition

`docs/project/roadmap.md` must exist. Ideally `docs/project/.current-work.md` also exists to identify what's being completed. If not, ask the user which work item is done.

## Step 1: Identify Completed Work Item

Read `.current-work.md` to determine:
- Work item ID and name
- Type (feat, infra, spike, migration, experiment)
- Module it belongs to

If `.current-work.md` doesn't exist, ask the user to specify which work item was completed.

## Step 2: Type-Specific Completion

### Feature / Infra

1. **Update roadmap.md:** Mark item as `[x]`
2. **Update exec-plan:** Mark feature as done, record completion date and branch name (from git)
3. **Generate spec:** Create or update `docs/project/specs/{domain}/{name}.md`
   - Describe what was ACTUALLY built (behavior, interfaces, constraints)
   - Not what was planned — what IS
   - Read the implementation code to write an accurate spec
   - If a spec already exists for this domain, update it rather than creating a duplicate
4. **Update asset manifest:** If `.current-work.md` had an asset section, update `assets/manifest.md` statuses
5. **Refresh CLAUDE.md:** If this work introduced new conventions or interfaces in a code directory, update or create the subdirectory CLAUDE.md per `shared/claude-md-convention.md`

### Spike

1. **Update roadmap.md:** Mark as `[decision: {one-line summary}]`
2. **Write decision record:** Create `docs/project/decisions/{date}-{topic}.md`:
   ```markdown
   # Decision: {Topic}

   **Date:** {date}
   **Context:** {what prompted this spike}
   **Options Considered:** {list with pros/cons}
   **Decision:** {what we chose}
   **Rationale:** {why}
   **Consequences:** {what this means for the project}
   ```
3. **Spawn follow-up items:** If the decision leads to new work items, add them to roadmap.md (or inform the user and suggest `/project-replan`)

### Experiment

1. **Update roadmap.md:** Mark as `[result: {one-line summary}]`
2. **Record results in exec-plan:** Add experiment data, metrics, conclusion to the exec-plan's section for this item
3. **If results change the plan:** Inform the user and suggest `/project-replan`. E.g., "The recoil experiment showed pattern-based recoil feels better. This might affect F1.3 weapon system design. Want to adjust the plan?"

### Migration

1. **Update roadmap.md:** Advance to next stage marker
   - `[audit]` → `[migrating]` → `[verified]` → `[cutover]` → `[decommissioned]`
2. **Stage-specific actions:**
   - After `verified`: Ask user to confirm cutover readiness
   - After `cutover`: Verify rollback plan is still valid
   - After `decommissioned`: Remove old system references from `.system-map.md` and `external-deps.md`

## Step 3: Module/Milestone Check

1. **Module complete?** Are all work items in this module done?
   - Yes → Move exec-plan from `active/` to `completed/`. Update module status to `[status: done]` in roadmap.
2. **Milestone reached?** Are all modules in this milestone done?
   - Yes → Notify the user: "Milestone {name} reached! All modules complete. Consider tagging a release."

## Step 4: Clean Up

1. Delete `docs/project/.current-work.md`
2. Verify roadmap consistency (roadmap markers match exec-plan state)

## Step 5: Recommend Next

Run the same analysis as `/project-next` Step 1-2 (find ready items, prioritize) and present recommendations:

```
✅ Completed: F1.2 Shooting System
📝 Spec written: specs/combat/shooting-mechanics.md
📊 M1 Core Engine: 2/5 complete

Next ready:
1. F1.3 Weapon System [feat, P0] — unblocked by F1.2
2. F1.4 Damage & Health [feat, P0] — unblocked by F1.2

Use /project-next to start one, or /project-status for full overview.
```

## References

- `shared/golden-principles.md` — invariants to maintain
- `shared/work-item-types.md` — type-specific completion semantics
- `shared/claude-md-convention.md` — when to refresh CLAUDE.md
- `shared/file-structure.md` — where files go
