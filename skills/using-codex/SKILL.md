---
name: using-codex
description: Defines when and how to delegate work to Codex (the GPT-5.4-codex peer LLM available via the codex plugin). Aggressive policy — Claude proactively detects delegation opportunities rather than waiting for the user. Use whenever about to execute a sizeable plan, undertake multi-file research, hit a bug for the second time, evaluate a major implementation choice, or when the user says "second opinion", "let Codex try", "another angle", "ask Codex". This skill defines POLICY (when); the codex plugin handles MECHANICS (how).
---

# Using Codex

**Announce:** "I'm using the using-codex skill to evaluate whether this work should go to Codex."

**Type:** Policy — defines delegation rules. Not a step-by-step procedure.

## Why this skill exists

Codex is a peer LLM (GPT-5.4-codex) available as a Claude Code subagent via the codex plugin. It has its own context window, can run in the background, and produces independent reasoning. Properly used, it:
- Saves Claude's context (long executions/research bloat the main thread)
- Provides independent second opinions
- Parallelizes work the user shouldn't have to wait sequentially for

The harness's policy is **aggressive**: detect Codex opportunities proactively, don't wait for the user to remember.

## Five trigger categories

### 1. Plan execution → **DIRECT delegate**

**Trigger:** A written implementation plan exists AND any of:
- 10+ tasks in the plan
- Touches 5+ files
- User explicitly hands off ("ok execute", "go", invokes `/execute-plan` without asking for per-step review)

**Action:** spawn `codex:codex-rescue` subagent with the plan. Do NOT execute in the main thread. The plan author and the plan executor being different agents is a feature.

**Prompt template:**
```
Execute the implementation plan at <repo-path>. Follow it step by step; do not
deviate from the plan. Report any blockers or ambiguity. After execution,
summarize: which tasks shipped, which tests pass, what (if anything) was skipped
or deferred.
```

**Skip this trigger if:** plan explicitly requires per-step user review checkpoints (`executing-plans` skill's review-checkpoint mode). Stay in main thread for those.

### 2. Multi-file research / investigation → **DIRECT delegate, parallel**

**Trigger:** Need to read 5+ unrelated files OR investigate unfamiliar library/framework code OR map cross-cutting behavior across the codebase.

**Action:** spawn `codex:codex-rescue` in the background. Claude does targeted reading in parallel for cross-validation. Merge findings when Codex returns (cite which is which).

This is the pattern used in this session's "investigate ProjectHarness" turn — works well.

### 3. Diagnosis stuck → **SUGGEST**

**Trigger:** Same bug, test failure, or behavioral defect has resisted 2 distinct fix attempts (not 2 retries of the same fix). Or Claude has produced 2 rounds of hypothesis without resolution.

**Action:** tell the user explicitly:
> "We've hit a diagnostic loop — 2 fix attempts haven't held. Recommend handing this to Codex for independent diagnosis. Want me to invoke `/codex:rescue`?"

Wait for user confirmation. **Do not auto-invoke** for diagnosis — debugging is interactive territory, the user often values seeing Claude's reasoning fail before escalating.

### 4. Major implementation choice → **SUGGEST**

**Trigger:** About to implement a critical-path feature or non-trivial refactor AND the design has 2+ viable approaches AND the user has not picked one.

**Action:** tell the user:
> "This is a fork in the road. I can implement approach X. Approach Y is also viable. Want Codex to write Y in parallel so we can compare?"

Wait for confirmation. Don't auto-fork — the user may not want to spend on parallel implementations.

### 5. Explicit delegation → **FORWARDER**

**Trigger:** User says any of: "let Codex try", "second opinion", "another angle", "ask Codex", "have Codex...", "/codex:rescue".

**Action:** spawn `codex:codex-rescue` with the user's request as the prompt. Return Codex's output **verbatim** per the codex plugin's `codex:codex-result-handling` rules. Do not paraphrase, summarize, or add commentary.

## When NOT to invoke Codex

- **Small tasks** (1-2 files, <5 steps). Handoff overhead > benefit.
- **Interactive iteration loops** ("try X" → check → "now try Y"). Codex's batch nature breaks fast feedback.
- **Inside an existing Codex run.** One Codex thread per logical task — don't pile on.
- **Sensitive content.** Never feed user secrets, credentials, or content the user hasn't authorized to share with another LLM provider. Auto-mode's "avoid data exfiltration" rule applies.
- **Codex unavailable.** If `codex:setup` reports auth/availability issues, fall back gracefully and tell the user.

## Mechanics

Use the `Agent` tool with `subagent_type: "codex:codex-rescue"`. Always pass full self-contained context — Codex starts fresh and cannot see the conversation. The codex plugin's `codex:codex-cli-runtime` and `codex:gpt-5-4-prompting` skills cover prompt patterns and runtime details.

Do **not** call `codex-companion.mjs` directly via Bash. That bypasses the routing layer. Always go through the subagent.

## Result handling

| Trigger type | How to present Codex output |
|---|---|
| Plan execution | Codex's summary + spot-check changed files yourself |
| Research | Synthesize with Claude's parallel findings; cite which is which |
| Diagnosis | Present Codex's diagnosis; note agreements/divergences with prior hypotheses |
| Major choice | Both implementations side-by-side; user picks |
| Explicit delegation | Verbatim, per `codex:codex-result-handling` |
