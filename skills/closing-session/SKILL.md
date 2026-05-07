---
name: closing-session
description: Wrap up the current conversation cleanly — propose handoff if work is in flight, bubble up KB candidates, surface memory-worthy feedback. Use when user signals end ("差不多了", "要走了", "收工", "wrap up", "/closing-session") or context is filling up and there's accumulated state worth preserving.
---

# Closing Session

**Announce:** "I'm using the closing-session skill to wrap up."

**Type:** Flexible — execute the relevant subset; skip steps that don't apply.

## When to invoke

**On user signal:**
- "差不多了" / "要走了" / "收工" / "结束 session" / "wrap up" / "let's stop here"
- Direct invocation: `/closing-session`

**Proactively (announce intent first, give user a chance to defer):**
- Context window is visibly filling up AND the session has accumulated state (edits, decisions, learnings) that would be lost
- Long autonomous batch just hit a natural checkpoint and the user is likely to step away

**Do NOT invoke for:**
- Short Q&A sessions (<5 turns, no edits, no learnings) — just answer normally
- Mid-task moments — finish the current step first

## Step 1: Snapshot state

Write a short snapshot (≤150 words). Three buckets:

- **Done** — what shipped this session (commits, files written, decisions made)
- **In-flight** — uncommitted edits, half-finished tasks, open tool calls
- **Pending** — blocked items, decisions awaiting user, queued next steps

Use `git status` + `git log <branch> ^origin/<branch>` if a repo is involved. This snapshot drives the rest of the steps.

## Step 2: Handoff decision

**Write a handoff if any of:**
- Uncommitted edits or partial implementation
- Multi-step plan with steps remaining
- Context-heavy decisions the next session would need to recover
- User explicitly asks for one

**Skip handoff if:**
- All work committed/pushed and no open items
- Trivial session

If writing one, follow `feedback_distinctive-handoff-names.md`:
- Path: `docs/handoff-YYYY-MM-DD-<slot>-<topic>.md` (slot: `morning` / `afternoon` / `evening` / `late`)
- Outline: state snapshot · in-flight files (with paths) · next concrete actions · blockers / open questions · references (commits, related docs)
- **Propose path + outline first → wait for OK → then write.** Do NOT silently create the file.

## Step 3: Bubble up KB candidates

If the working project has a `docs/knowledge/` directory:

```
node "<HARNESS_ROOT>/skills/bubble-up-knowledge/scripts/bubble-up.mjs" --project-root "<project-root>"
```

(`<HARNESS_ROOT>` = the ProjectHarness checkout. On the user's box: `D:/Repo/ProjectHarness`.)

- Surface S3 candidates (workflow-general feedback that should land in **harness** memory)
- Surface project-local entry candidates that emerged this session
- Propose for confirmation; do NOT silently promote or write

Skip this step if the project has no KB.

## Step 4: Memory reflection

Scan the session for:

- **Corrections** — user pushed back on an approach ("不", "stop", "你又理解错了", "不对")
- **Validated calls** — user accepted a non-obvious choice without re-debate ("对", "好继续", silence after a Recommended option)

For each pattern that's **workflow-general** (not specific to this one task):

1. Propose a `feedback_*.md` memory entry: rule (one line) · **Why:** · **How to apply:**
2. Cite the originating exchange (one sentence — what happened)
3. Wait for OK before writing to `~/.claude/projects/<sanitized>/memory/`

Skip task-specific corrections (they belong in the project KB via Step 3, not harness memory).

## Step 5: Final report

One block, no filler:

```
Session wrap-up
- Done:       <bullet(s)>
- Open:       <bullet(s) or "none">
- Handoff:    <path> | skipped | proposed (awaiting OK)
- KB bubble:  <count promoted> | <count proposed> | none
- Memory:     <count proposed> | none
- Next:       <one line — what the next session should pick up>
```

Stop after this. Don't re-narrate the session.

## Common Mistakes

**Writing handoff for trivial sessions** — clean state needs no handoff. Skip.
**Silent memory or KB writes** — always propose first; user approves or rejects.
**Re-narrating the whole session** — the snapshot is short; user already lived it.
**Triggering on a 3-message Q&A** — invoke only when there's accumulated state worth preserving.
**Forgetting handoff filename discipline** — distinctive `<slot>-<topic>` suffix per `feedback_distinctive-handoff-names.md`.
**Mixing harness-memory and project-KB destinations** — workflow-general → harness memory; tool/project-specific → project `docs/knowledge/`.

## Red Flags

**Never:**
- Write a handoff or memory entry without confirmation
- Auto-promote KB candidates (always propose)
- Pad the wrap-up with summary prose

**Always:**
- Snapshot first — drives everything else
- Use `git status` to ground "in-flight" claims
- Cite the exchange when proposing a memory entry
- Stop cleanly after the final report

## References

- `feedback_distinctive-handoff-names.md` — handoff filename convention
- `feedback_autonomous-checkpoint.md` — natural-checkpoint trigger principle
- `bubble-up-knowledge` — Step 3 mechanics
- `MEMORY.md` (auto-memory) — Step 4 destination
