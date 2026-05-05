# Superpowers Inventory - 2026-05-02

## 1. Top-level architecture

This upstream is a Claude Code workflow plugin first, not a general notes repo. The center of gravity is `skills/`: a tightly opinionated library for design, planning, TDD, debugging, review, and branch-completion workflows. Around that it has thin slash-command shims in `commands/`, hook bootstrap and examples in `hooks/`, small harness-install surfaces for Claude/Cursor/OpenCode/Codex, and a test suite that pressure-tests whether the skills actually trigger and hold up under agent rationalization.

```text
.
|-- .claude-plugin/
|   |-- marketplace.json
|   `-- plugin.json
|-- .codex/
|   `-- INSTALL.md
|-- .cursor-plugin/
|   `-- plugin.json
|-- .github/
|   |-- FUNDING.yml
|   |-- ISSUE_TEMPLATE/
|   `-- PULL_REQUEST_TEMPLATE.md
|-- .opencode/
|   |-- INSTALL.md
|   `-- plugins/
|-- agents/
|   `-- code-reviewer.md
|-- commands/
|   |-- brainstorm.md
|   |-- execute-plan.md
|   `-- write-plan.md
|-- docs/
|   |-- README.codex.md
|   |-- README.opencode.md
|   |-- screenshots/
|   |-- testing.md
|   `-- windows/
|-- hooks/
|   |-- examples/
|   |-- hooks-cursor.json
|   |-- hooks.json
|   |-- run-hook.cmd
|   `-- session-start
|-- scripts/
|   |-- bump-version.sh
|   `-- sync-to-codex-plugin.sh
|-- skills/
|   |-- brainstorming/
|   |-- dispatching-parallel-agents/
|   |-- executing-plans/
|   |-- finishing-a-development-branch/
|   |-- receiving-code-review/
|   |-- requesting-code-review/
|   |-- shared/
|   |-- subagent-driven-development/
|   |-- systematic-debugging/
|   |-- test-driven-development/
|   |-- using-git-worktrees/
|   |-- using-superpowers/
|   |-- verification-before-completion/
|   |-- writing-plans/
|   `-- writing-skills/
|-- tests/
|   |-- brainstorm-server/
|   |-- claude-code/
|   |-- explicit-skill-requests/
|   |-- opencode/
|   |-- skill-triggering/
|   `-- subagent-driven-dev/
|-- AGENTS.md
|-- CLAUDE.md
|-- GEMINI.md
|-- README.md
`-- package.json
```

## 2. Skills inventory

Note: upstream only documents the rigid/flexible convention explicitly in `skills/using-superpowers/SKILL.md`; the type calls below are inferred from how each skill is written.

| Name | One-line purpose | Type | Absorption signal |
|---|---|---|---|
| `brainstorming` | Forces design exploration and written spec approval before implementation. | rigid | `consider` - strong discipline, but tightly coupled to their spec-doc and native-task workflow. |
| `dispatching-parallel-agents` | Shows how to split independent failures or tasks across parallel agents. | flexible | `consider` - useful pattern for Claude+Codex collaboration, but not a drop-in library skill by itself. |
| `executing-plans` | Runs an already-written implementation plan in normal mode with checkpoints. | rigid | `consider` - relevant if we keep plan-doc execution as a first-class harness pattern. |
| `finishing-a-development-branch` | Decides merge/PR/cleanup next steps after implementation is complete. | flexible | `consider` - good branch hygiene, but less central than debugging/verification skills. |
| `receiving-code-review` | Forces technical verification before accepting review feedback. | rigid | `absorb` - directly aligned with a high-rigor personal collaborator workflow. |
| `requesting-code-review` | Dispatches a focused reviewer before work cascades further. | flexible | `absorb` - good reusable review gate for Claude+Codex sessions. |
| `subagent-driven-development` | Executes plan tasks with fresh subagents and staged reviews between tasks. | rigid | `consider` - powerful, but bound to their task JSON, plan shape, and reviewer prompts. |
| `systematic-debugging` | Imposes a root-cause-first debugging process before proposing fixes. | rigid | `absorb` - broadly reusable and already matches ProjectHarness quality bar. |
| `test-driven-development` | Enforces RED-GREEN-REFACTOR before writing implementation code. | rigid | `absorb` - one of the clearest reusable cores in the repo. |
| `using-git-worktrees` | Creates isolated worktrees safely before feature work or plan execution. | flexible | `consider` - relevant to harness isolation, but not always needed in a personal skill library. |
| `using-superpowers` | Teaches the agent to always discover and invoke relevant skills first. | rigid | `consider` - valuable bootstrap logic, but specific to the Superpowers ecosystem. |
| `verification-before-completion` | Requires running evidence-producing checks before claiming success. | rigid | `absorb` - highly aligned with Claude primary / Codex collaborator verification discipline. |
| `writing-plans` | Produces detailed, stepwise implementation plans from a spec or requirements. | rigid | `consider` - useful, but heavy and repo-writing by default rather than lightweight personal guidance. |
| `writing-skills` | Treats skill authoring as TDD, with pressure tests before publishing changes. | rigid | `absorb` - directly supports continuous absorption into a personal skill library. |

## 3. Hooks

| Name | One-line purpose | Type | Absorption signal |
|---|---|---|---|
| `SessionStart bootstrap` (`hooks/hooks.json`, `hooks/session-start`, `hooks/run-hook.cmd`) | Injects the full `using-superpowers` skill at session start so skill discovery rules are always present. | `session-start` | `absorb` - this is the backbone that makes a deployable skill library self-activating. |
| `Cursor sessionStart bootstrap` (`hooks/hooks-cursor.json`) | Cursor-flavored variant of the same startup injection. | `session-start` | `skip` - adapter surface for Cursor, outside the Claude+Codex-first fork vision. |
| `pre-commit-check-tasks.sh` | Example `PreToolUse` hook that blocks `git commit` while a native task is still `in_progress`. | `pre-tool-use` | `absorb` - already aligned with our harness direction and a strong guard for task-driven sessions. |
| `stop-deflection-guard.sh` | Example `Stop` hook that blocks low-context "fresh session later" excuses. | `stop` | `consider` - interesting as an opt-in discipline guard, but opinionated enough to need human judgment. |

## 4. Commands / slash commands

| Name | One-line purpose | Type | Absorption signal |
|---|---|---|---|
| `/superpowers-extended-cc:brainstorming` | Thin shim that invokes the `brainstorming` skill. | `slash command` | `consider` - useful if we want a dedicated entrypoint, but the skill matters more than the shim. |
| `/superpowers-extended-cc:writing-plans` | Thin shim that invokes the `writing-plans` skill. | `slash command` | `consider` - same pattern; worthwhile only if we keep the full plan workflow. |
| `/superpowers-extended-cc:executing-plans` | Thin shim that invokes the `executing-plans` skill. | `slash command` | `consider` - useful only alongside the upstream planning stack. |

## 5. Other notable concepts

- `Native task metadata`: the repo leans hard on Claude Code native tasks, embedding `json:metadata` inside task descriptions so later skills can recover files, verify commands, and acceptance criteria even when the task API omits structured metadata.
- `Visual companion`: `skills/brainstorming/visual-companion.md` plus the local browser server under `skills/brainstorming/scripts/` turn brainstorming into an optional diagram/mockup flow, not just text Q&A.
- `Prompt assets as code`: reviewer, implementer, and spec-review prompts live as checked-in files under `skills/requesting-code-review/` and `skills/subagent-driven-development/`, so workflow behavior is explicit and versioned.
- `Pressure-tested skill QA`: the tests are not generic unit tests only; many are adversarial prompt suites under `tests/explicit-skill-requests/` and `tests/skill-triggering/` to prove skills trigger under pressure.
- `Contributor gatekeeping as product philosophy`: `CLAUDE.md` is unusually blunt about "slop" PRs, duplicate work, evidence requirements, and the repo's low tolerance for speculative contributions. That strictness is part of the system design, not an afterthought.

## 6. Themes / opinions

Superpowers is trying to make disciplined development behavior non-optional. The repo treats skills as executable process code, not friendly guidance. The center of the philosophy is that agents rationalize under pressure, so the solution is hard gates, explicit anti-loophole wording, and repeatable workflows: design before code, tests before code, debugging before fixes, verification before claims.

The Claude Code fork adds another opinion on top: if Claude has native features such as tasks and hooks, use them aggressively. The result is not a grab bag of independent skills. It is a tightly integrated operating model with bootstrap hooks, native-task structure, and prompt assets all reinforcing the same behavioral discipline.

## 7. Top 5 absorption candidates

| Rank | Upstream path | What it does | Why it fits our fork |
|---|---|---|---|
| 1 | `hooks/session-start` | Injects the full skill-bootstrap context on every session start. | Best match for a deployable personal library that should be available immediately without manual loading. |
| 2 | `skills/systematic-debugging/SKILL.md` | Enforces a root-cause-first debugging workflow. | Already matches ProjectHarness rigor and is broadly portable across repos and tasks. |
| 3 | `skills/verification-before-completion/SKILL.md` | Forces real verification before any "done" claim. | Directly supports Claude as primary harness and Codex as a collaborator that must prove outcomes. |
| 4 | `hooks/examples/pre-commit-check-tasks.sh` | Prevents commits while native task state shows unfinished in-progress work. | Strong fit for task-driven harness sessions; our fork already trends in this direction. |
| 5 | `skills/writing-skills/SKILL.md` | Applies TDD-style discipline to creating and evolving skills themselves. | Supports continuous absorption and quality control for a personal, opinionated skill library. |
