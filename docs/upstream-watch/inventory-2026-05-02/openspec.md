# OpenSpec Inventory - 2026-05-02

## 1. Top-level architecture

OpenSpec is a TypeScript CLI product that dogfoods its own methodology. The repo has three layers: human docs in `docs/`, normative product specs and explorations in `openspec/`, and the actual implementation in `src/`. What a Claude Code user would "find" is not a checked-in skill library but a generator: schemas, templates, and adapter logic that produce tool-specific skills and slash-command files during `openspec init` and `openspec update`.

```text
.
|-- .changeset/
|   |-- README.md
|   |-- clarify-bun-node-runtime.md
|   |-- config.json
|   `-- sync-default-core.md
|-- .devcontainer/
|   |-- devcontainer.json
|   `-- README.md
|-- .github/
|   |-- CODEOWNERS
|   `-- workflows/
|-- assets/
|   |-- openspec_bg.png
|   |-- openspec_dashboard.png
|   |-- openspec_pixel_dark.svg
|   `-- openspec_pixel_light.svg
|-- bin/
|   `-- openspec.js
|-- docs/
|   |-- cli.md
|   |-- commands.md
|   |-- concepts.md
|   |-- customization.md
|   |-- getting-started.md
|   |-- installation.md
|   |-- migration-guide.md
|   |-- multi-language.md
|   |-- opsx.md
|   |-- supported-tools.md
|   `-- workflows.md
|-- openspec/
|   |-- changes/
|   |-- config.yaml
|   |-- explorations/
|   `-- specs/
|-- schemas/
|   `-- spec-driven/
|-- scripts/
|   |-- README.md
|   |-- pack-version-check.mjs
|   |-- postinstall.js
|   |-- test-postinstall.sh
|   `-- update-flake.sh
|-- src/
|   |-- cli/
|   |-- commands/
|   |-- core/
|   |-- prompts/
|   |-- telemetry/
|   |-- ui/
|   `-- utils/
|-- test/
|   |-- cli-e2e/
|   |-- commands/
|   |-- core/
|   |-- fixtures/
|   |-- helpers/
|   |-- prompts/
|   |-- specs/
|   |-- telemetry/
|   `-- utils/
|-- README.md
|-- WORKSPACE_REIMPLEMENTATION_DIRECTION.md
`-- WORKSPACE_REIMPLEMENTATION_START_HERE.md
```

## 2. Skills inventory

None found - section not applicable. There is no checked-in `skills/` directory in the repo snapshot. Instead, OpenSpec generates tool-specific skill files during `openspec init` / `openspec update` from schema templates and workflow metadata.

## 3. Hooks

None found - section not applicable. OpenSpec does not ship checked-in Claude/Cursor runtime hook configs in this repo; its integration surface is generated skills, generated slash-command files, and the `openspec` CLI.

## 4. Commands / slash commands

| Name | One-line purpose | Type | Absorption signal |
|---|---|---|---|
| `/opsx:propose` | Creates a change and all planning artifacts needed for the default quick path. | `slash command` | `consider` - strong entrypoint if we adopt structured change folders, but not useful without the wider artifact model. |
| `/opsx:explore` | Investigates ideas and code before committing to a formal change. | `slash command` | `consider` - good interaction pattern, though lighter brainstorming may fit ProjectHarness better. |
| `/opsx:apply` | Implements tasks from a change and checks off `tasks.md`. | `slash command` | `consider` - relevant only if we import the artifact workflow itself. |
| `/opsx:sync` | Reconciles delta specs from a change into main specs. | `slash command` | `absorb` - the underlying delta-merge idea is one of OpenSpec's most portable concepts. |
| `/opsx:archive` | Finalizes a change and moves it into dated archive history. | `slash command` | `consider` - useful if we keep a durable planning record, otherwise too much ceremony. |
| `/opsx:new`, `/opsx:continue`, `/opsx:ff` | Expanded workflow commands for scaffold-first, stepwise, or all-at-once artifact creation. | `slash command family` | `consider` - good ergonomic variants, but only after committing to schemas/templates. |
| `/opsx:verify` | Verifies implementation against tasks, specs, and design. | `slash command` | `absorb` - best direct fit for Claude+Codex collaborator loops. |
| `/opsx:bulk-archive` | Archives multiple completed changes with conflict-aware spec merging. | `slash command` | `skip` - interesting product feature, but far beyond a personal skill-library minimum. |
| `/opsx:onboard` | Runs a guided tutorial using the user's real codebase. | `slash command` | `consider` - useful teaching pattern, but not core to an always-available personal harness. |
| `openspec` CLI (`init`, `update`, `status`, `instructions`, `templates`, `schema`, `config`, `view`, `validate`) | Installs tool integrations and exposes the workflow engine to humans and agents. | `cli` | `absorb` - not to vendor wholesale, but the `status` / `instructions` / `schema` substrate is highly relevant. |

## 5. Other notable concepts

- `Specs as source of truth`: `openspec/specs/` is the canonical description of current behavior. This is not a notes folder; it is intended to become the durable contract the next change builds on.
- `Changes as self-contained planning bundles`: every active change lives under `openspec/changes/<name>/` with `proposal.md`, `design.md`, `tasks.md`, optional `.openspec.yaml`, and delta specs. The repo treats change folders as the unit of review, implementation, and archival history.
- `Delta specs`: instead of rewriting whole specs, changes use `ADDED`, `MODIFIED`, `REMOVED`, and `RENAMED` requirement sections. This is the core brownfield idea and the main reason `/opsx:sync` and `/opsx:archive` exist.
- `Schemas and templates`: `schemas/spec-driven/schema.yaml` defines artifact IDs, dependencies, templates, and apply requirements. This is the real engine behind OPSX. The default workflow is not hardcoded prose; it is a graph of artifacts plus prompt templates.
- `OPSX profile split`: the product distinguishes a default `core` profile (`propose`, `explore`, `apply`, `sync`, `archive`) from an expanded workflow set (`new`, `continue`, `ff`, `verify`, `bulk-archive`, `onboard`). That keeps the default smaller while preserving power-user depth.
- `Instruction loader and artifact graph`: the CLI's `status`, `instructions`, and `templates` surfaces treat workflow state as structured data. Agents are supposed to query what is ready, what is blocked, and what context files exist, not guess.
- `Generated integration layer`: OpenSpec does not hand-author per-tool skills and commands. `src/core/shared/skill-generation.ts` and the command-generation adapters produce them from shared workflow definitions, then place them into each tool's expected directory.
- `Project config as instruction layering`: `openspec/config.yaml` adds project context and per-artifact rules, injected into generated instructions with `<context>` and `<rules>` tags. This is a clean model for a deployable knowledge base that is not auto-loaded globally.
- `Verify and sync as first-class workflow pieces`: unlike many spec systems, OpenSpec formalizes "does implementation match the plan?" and "merge the delta back into the durable spec" as explicit commands/specs, not side advice.
- `Workspace / initiative direction`: the repo is actively designing a coordination model for multi-repo and monorepo planning. The emerging shape is "initiative-level planning in a coordination workspace, repo-local changes for execution," with stable project identifiers and informational cross-repo references.
- `Tool-agnostic distribution`: much of the repository is about shipping the same workflow into 25+ assistants. Under the ProjectHarness lens this is mostly noise, but it explains why the repo is generator-heavy rather than Claude-native by default.

## 6. Themes / opinions

OpenSpec is trying to make AI-assisted development more predictable by making planning artifacts durable, structured, and updateable. Its philosophy is explicit: fluid not rigid, iterative not waterfall, easy not complex, brownfield-first. The key move is to separate "current truth" (`openspec/specs/`) from "proposed change" (`openspec/changes/`) and then give both humans and agents a standard path for moving work from one to the other.

At the same time, this upstream is much more productized and multi-tool than ProjectHarness wants to be. It spends serious effort on adapters, generated command files, install/update flows, and cross-tool delivery. The most relevant pieces for our fork are therefore the underlying concepts: schema-driven workflows, context/rules injection, verification against specs, and the emerging cross-project planning model. The adapter sprawl itself is mostly something to filter out.

## 7. Top 5 absorption candidates

| Rank | Upstream path | What it does | Why it fits our fork |
|---|---|---|---|
| 1 | `schemas/spec-driven/schema.yaml` | Defines the default artifact graph: proposal -> specs -> design -> tasks -> apply. | Best portable core in the repo; it gives us a structured but still editable planning substrate for Claude-first work. |
| 2 | `openspec/specs/context-injection/spec.md` | Specifies how project context is layered into generated instructions via `<context>` tags. | Strong fit for a deployable, not-auto-loaded personal knowledge base that still adapts per project. |
| 3 | `openspec/specs/rules-injection/spec.md` | Specifies per-artifact rule injection via `<rules>` tags, additive to schema guidance. | Lets a personal skill library stay opinionated while still expressing project-local constraints cleanly. |
| 4 | `openspec/specs/opsx-verify-skill/spec.md` | Defines a structured implementation-vs-artifacts verification pass across completeness, correctness, and coherence. | Directly aligned with Claude as harness and Codex as collaborator; high-signal lift candidate. |
| 5 | `openspec/specs/specs-sync-skill/spec.md` | Formalizes delta-spec reconciliation back into main specs. | If we adopt change folders at all, this is the missing loop that turns planning into durable cross-project knowledge. |
