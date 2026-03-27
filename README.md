# AI Development Harness

From a one-sentence idea to a deliverable product. A complete AI-driven development framework that covers the full lifecycle: project planning, feature execution, quality assurance, and continuous evolution.

Built on [pcvelz/superpowers](https://github.com/pcvelz/superpowers) (session-level execution discipline), extended with project-level orchestration inspired by [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) (spec management) and [OpenAI's Harness engineering](https://openai.com/index/harness-engineering/) (agent-first development practices).

## What It Does

```
"Build a 4v4 multiplayer shooter"
        |
        v
  /project-init     --> vision.md + roadmap.md + architecture.md
        |
        v
  /project-next     --> pick feature, prepare context
        |
        v
  brainstorming      --> design the feature
  writing-plans      --> create implementation plan
  verification       --> TDD / playtest / experiment / contract-test / ...
  finish-branch      --> merge + auto flow-back to project state
        |
        v
  /project-done      --> update roadmap, generate spec, recommend next
        |
        v
  repeat until milestone reached
```

## Two Layers

**Project Orchestration** (new) -- decides WHAT to work on:
- `/project-init` -- from one sentence to structured project (greenfield + brownfield)
- `/project-next` -- select next work item, prepare execution context
- `/project-status` -- milestone/module/feature progress at a glance
- `/project-replan` -- add/remove/reprioritize features dynamically
- `/project-health` -- consistency checks, spec coverage, architecture drift
- `/project-done` -- completion flow-back, spec generation, CLAUDE.md refresh

**Execution Discipline** (from Superpowers, adapted) -- decides HOW to build it:
- `brainstorming` -- collaborative design with harness context awareness
- `writing-plans` -- implementation plans with pluggable verification strategies
- `verification` -- TDD by default, 8 strategies total (playtest, experiment-eval, contract-test, ...)
- `finishing-a-development-branch` -- merge/PR + automatic project state update
- `subagent-driven-development`, `executing-plans`, `systematic-debugging`, `code-review`, `git-worktrees`

## Key Design Decisions

**6 work item types** -- not everything is a feature: `feat`, `infra`, `spike`, `migration`, `experiment`, `ops`. Each has its own lifecycle.

**Pluggable verification** -- TDD is great for libraries and backends. Games need playtesting. ML needs experiment evaluation. Embedded needs hardware-in-loop. The harness adapts.

**File system is state** -- all project state lives in `docs/project/` as markdown. Git-friendly, human-readable, human-editable. No database.

**CLAUDE.md is derived** -- never hand-written. Root CLAUDE.md is a navigation table. Subdirectory CLAUDE.md files are derived from architecture + specs.

**Backward compatible** -- if `docs/project/` doesn't exist, the harness behaves identically to original Superpowers.

## Installation

This is a Claude Code plugin. Skills and hooks are automatically discovered -- no manual symlinks or settings.json edits needed.

### From GitHub

```bash
/plugin marketplace add Garvin5/ProjectHarness
/plugin install ai-dev-harness@Garvin5-ProjectHarness
```

### From a Local Clone

```bash
git clone https://github.com/Garvin5/ProjectHarness.git

# Load for current session (development/testing)
claude --plugin-dir ./ProjectHarness

# Or install persistently
/plugin marketplace add ./ProjectHarness
/plugin install ai-dev-harness
```

### Installation Scope

```bash
/plugin install ai-dev-harness --scope user      # Personal use across projects (default)
/plugin install ai-dev-harness --scope project   # Shared with team via .claude/settings.json
/plugin install ai-dev-harness --scope local     # Project-only, gitignored
```

### Verify

```bash
/plugin              # Check installed plugins
/reload-plugins      # Reload and see loaded skills/hooks count
```

## Quick Start

Start a new session in your project and say what you want to build. `/project-init` will take it from there.

## Project Structure

```
harness/
├── .claude-plugin/           # Plugin manifest
├── skills/
│   ├── project-init/          # Project orchestration
│   ├── project-next/
│   ├── project-status/
│   ├── project-replan/
│   ├── project-health/
│   ├── project-done/
│   ├── brainstorming/         # Modified: harness context awareness
│   ├── writing-plans/         # Modified: verification strategy awareness
│   ├── test-driven-development/  # Modified: expanded to pluggable verification
│   ├── finishing-a-development-branch/  # Modified: auto flow-back
│   ├── using-harness/         # Renamed from using-superpowers
│   ├── shared/                # Cross-skill conventions
│   │   ├── golden-principles.md
│   │   ├── work-item-types.md
│   │   ├── verification-strategies.md
│   │   ├── claude-md-convention.md
│   │   └── file-structure.md
│   └── ... (other skills from Superpowers, unchanged)
├── hooks/
│   ├── session-start          # Modified: injects harness context
│   └── pre-commit-check-tasks # Modified: harness invariant warnings
├── docs/design/
│   └── project-orchestrator.md  # Design document
├── agents/
└── tests/                     # From upstream Superpowers
```

## Upstream Tracking

This fork tracks [pcvelz/superpowers](https://github.com/pcvelz/superpowers) main branch. Harness-specific changes are additive -- the core Superpowers workflow remains compatible. To sync with upstream:

```bash
git fetch upstream
git merge upstream/main
```

## Credits

- [pcvelz/superpowers](https://github.com/pcvelz/superpowers) -- session-level execution discipline (fork base)
- [obra/superpowers](https://github.com/obra/superpowers) -- original Superpowers
- [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) -- spec-driven development concepts
- [OpenAI Harness Engineering](https://openai.com/index/harness-engineering/) -- agent-first development practices

## License

MIT (inherited from Superpowers)
