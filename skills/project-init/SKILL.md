---
name: project-init
description: Initialize a new project from a one-sentence idea or onboard an existing codebase. Use whenever the user wants to start a new project, set up project structure, go from idea to plan, or says things like "I want to build...", "new project", "let's make...", "set up this repo", "help me plan this project". Also triggers for brownfield/legacy contexts like "modernize this codebase", "I have an existing app that needs...", "migrate from X to Y".
---

# Project Init

**Announce:** "I'm using the project-init skill to set up your project."

**Type:** Flexible — adapt the conversation to the project, not the project to a template.

You are initializing a project from the user's intent. Your job is to produce a `docs/project/` directory complete enough that an AI agent can pick up the first work item and start executing without hitting ambiguity.

## Step 0: Detect Mode

Is this a greenfield project (empty or near-empty repo) or brownfield (existing codebase)?

**Check:**
- Count source files in the repo (excluding docs, config, lock files)
- If >20 meaningful source files exist, ask: "I see an existing codebase. Are we building on top of this, modernizing it, or starting fresh alongside it?"
- User's answer determines mode

If the user's initial message already makes it clear ("I have a PHP monolith..."), skip the check.

## Greenfield Mode

### Step 1: Explore Intent

Start a conversation to understand what the user wants to build. You don't have a fixed list of questions — your goal is to uncover everything an agent would need to start working.

**Conversation approach:**
- Start with what the user already told you. Don't re-ask what they've stated.
- Follow threads the user cares about. When they mention something in passing, that's often more important than their direct answers.
- Surface unstated assumptions. If the user says "obviously it'll use React," ask why — make the implicit explicit.
- Ask about boundaries early. What the project is NOT is often more clarifying than what it is.
- Limit yourself to 3-5 rounds of questions. If still uncertain, generate a draft and let the verify step catch gaps.

**What you're trying to discover** (not a checklist — these emerge naturally from conversation depending on project type):
- Core purpose and user experience
- Technical constraints (platform, language, framework, performance requirements)
- Creative direction (visual, audio, interaction style — if applicable to this project type)
- How the AI agent should work with this project (testing approach, automation level, what tools/infrastructure are needed)
- Scale and scope boundaries
- Target audience

The last point — how AI should work with this project — is critical and often unspoken. A user who wants fully autonomous AI development needs headless testing, structured logging, and CI from day one. A user who'll review every PR needs different infrastructure. This shapes architecture decisions.

### Step 2: Generate Draft

From the conversation, generate `vision.md`. Don't force sections that don't apply to this project. Include sections that matter. A game needs art direction; a CLI tool doesn't. An ML project needs experiment infrastructure; a library doesn't.

### Step 3: Verify by Decomposition

This is the core mechanism. Use the draft vision to attempt a Module → Work Item decomposition:

1. Read your vision.md draft
2. Try to break it into 4-8 modules
3. For each module, try to list 3-6 work items with types, priorities, and dependencies
4. For the first work item you'd pick, try to write a `.current-work.md` — description, acceptance criteria, architecture constraints, verification strategy

**At each step, notice where you get stuck:**
- "I don't know which technology to use for X" → ask the user
- "I can't decide if X belongs in module A or B" → the domain boundary is unclear → ask
- "I don't know how to verify this works" → the testing strategy is undefined → ask
- "I can't write acceptance criteria because I don't know what 'good' means here" → the success definition is vague → ask

Each stuck point is an intent gap. Go back to the user, fill it, update the draft, try again.

**The loop terminates when:** You can decompose the full project into modules and work items, and you can write a complete `.current-work.md` for the first work item, without guessing.

### Step 4: Generate Files

Once verification passes, create:

1. **`docs/project/vision.md`** — from your verified draft
2. **`docs/project/roadmap.md`** — modules + work items with types, priorities, deps, milestones
   - Near-term modules: detailed work items with descriptions
   - Far-off modules: one-line descriptions, work items as titles only
   - See `shared/file-structure.md` for format
3. **`docs/project/architecture.md`** — if the project is complex enough to need it (>2 modules with dependency rules). Skip for simple projects.
4. **`docs/project/specs/index.md`** — empty, ready to be populated
5. **`docs/project/exec-plans/`** — create `active/`, `completed/`, `abandoned/` directories
6. **`docs/project/decisions/`** — create directory
7. **`docs/project/assets/manifest.md`** — if the project involves non-code deliverables
8. **`docs/project/external-deps.md`** — if the project depends on external systems
9. **Root `CLAUDE.md`** — navigation table pointing to the above files. See `shared/claude-md-convention.md` for format. If a CLAUDE.md already exists, integrate harness navigation into it rather than overwriting.

### Step 5: Confirm with User

Present a summary:
- Vision (1-2 sentences)
- Module count and milestone structure
- First recommended work item
- Any decisions you noted during the conversation

Ask: "Does this capture your project correctly? Anything to adjust before we start?"

Apply any adjustments, then tell the user they can use `/project-next` to start the first work item.

---

## Brownfield Mode

### Step 1: Audit Existing System

Scan the codebase to understand what exists:
- Directory structure and organization
- Languages and frameworks in use
- Test coverage (any tests? what kind?)
- Database/API/external integrations
- Build and deployment setup
- Documentation (README, existing docs)

Generate `docs/project/.system-map.md` with your findings. This is a factual audit, not a judgment.

### Step 2: Understand Goals

Conversation with the user:
- What's wrong with the current system? What's the pain?
- What's the target state? (Rewrite? Incremental improvement? Feature addition on top?)
- What are the constraints? (Can't break existing users, must maintain API compatibility, etc.)
- What's the risk tolerance? (Zero downtime? Gradual migration? Big bang?)

### Step 3: Generate Draft Vision

For brownfield, `vision.md` describes **where we're going**, not where we are. The current state is in `.system-map.md`.

### Step 4: Verify by Decomposition

Same loop as greenfield, but work items are mostly `migration` and `infra` types:
- Each migration item needs current behavior, target behavior, and rollback plan
- Dependencies are often about "which part can we extract first without breaking the rest"
- Contract tests are the default verification strategy

### Step 5: Generate Files

Same as greenfield, plus:
- `docs/project/.system-map.md` (already generated in Step 1)
- `docs/project/external-deps.md` (the existing system's integrations become external deps)
- More `migration` type work items in roadmap

---

## Anti-patterns

**Don't ask 20 questions before generating anything.** 3-5 rounds max. Generate a draft, verify by decomposition, let gaps reveal themselves.

**Don't force structure.** A 3-file CLI tool doesn't need `architecture.md`, `assets/manifest.md`, or 6 modules. Scale the output to the project.

**Don't over-specify far-off modules.** "M5: Ranking System — competitive ranking, to be designed later" is fine. Don't invent features the user hasn't thought about.

**Don't skip the verify step.** The temptation is to generate vision.md and call it done. The decomposition check is what catches the gaps that lead to confusion later. Always do it.

**Don't assume a testing approach.** Ask how the user wants to verify things work. "Obviously we'll use TDD" is not obvious — it depends on the project type and the user's workflow preferences.

## References

- `shared/file-structure.md` — file structure and format conventions
- `shared/work-item-types.md` — work item type definitions
- `shared/verification-strategies.md` — available verification approaches
- `shared/claude-md-convention.md` — CLAUDE.md derivation rules
- `shared/golden-principles.md` — invariants to check after generating files
