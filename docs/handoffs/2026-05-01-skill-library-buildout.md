# Handoff — Skill Library Buildout (2026-05-01)

> Picking this up on another machine? Read this end-to-end before doing anything. It's verbose on purpose — the goal is "land in the same conversation, not just the same repo."

## What this handoff is

A snapshot of an ongoing multi-turn conversation between the user and Claude Code about specializing this fork of Superpowers into a personal Claude+Codex skill library. The work is mid-flight — two of four planned "战线" (work fronts) are done, one is paused on a design question, one is queued.

Written to a file (and committed) so the user can `git pull` on a different machine and continue without rebuilding context.

## Reader (the next Claude session): first 3 things to do

1. **Recreate project memory on this new machine.** The user's auto-memory lives at `~/.claude/projects/<sanitized-path>/memory/` and is machine-local — it didn't travel. The exact files to recreate are in section ["Project memory to recreate"](#project-memory-to-recreate) below. Write them verbatim before doing anything else.
2. **Verify the repo state matches what's described in [Repo state at handoff time](#repo-state-at-handoff-time).** If commits diverged or got pushed/rebased, reconcile before proceeding.
3. **Respond to the user picking up where the previous Claude paused** — see [Where we paused](#where-we-paused-the-question-the-user-needs-to-answer). Do NOT silently re-explain everything — the user already knows. Just confirm orientation in 2-3 lines and ask what they want next.

## Project vision (must-have context)

The user is specializing this fork into:

1. **Claude Code as the primary harness** — all skills, hooks, commands target Claude Code first.
2. **Codex as collaborator** — second-opinion / rescue / parallel investigation via the `codex` plugin (already installed, ChatGPT-authenticated as `bingolovelinger@gmail.com`).
3. **Project Harness philosophy** — `docs/project/` markdown state, 6 work-item types, pluggable verification, file-system-is-state, derived CLAUDE.md.
4. **Cross-project knowledge base** — *deployable* to other projects (not auto-loaded everywhere). User installs the harness plugin into a project when wanted; other projects stay clean. Local-scope install is fine and even preferred.
5. **Continuous upstream absorption** — actively track and selectively merge changes from two upstreams:
   - `https://github.com/Fission-AI/OpenSpec.git` (idea upstream — concept source only, never `git merge`)
   - `https://github.com/pcvelz/superpowers.git` (merge upstream — fork base)

Half-finished rebrand (Cursor/Gemini/OpenCode adapters still say `superpowers-extended-cc`) is acceptable to leave or delete since those adapters are not the user's focus.

## Strategic plan & progress (the four 战线)

The user agreed to this ordering: **A → C → B → D**.

| 战线 | Goal | Status |
|---|---|---|
| **A. Upstream tracking** | Build infrastructure to selectively absorb changes from Superpowers + OpenSpec | ✅ shipped — commit `5509791` |
| **C. Codex collaboration mode** | Define when Claude should proactively delegate to Codex | ✅ shipped — commit `3378162` |
| **B. Cross-project knowledge base** | Design how reusable patterns/postmortems/decisions/snippets are stored and consulted across projects | 🟡 paused on design Qs (see below) |
| **D. Cleanup** | Resolve `using-superpowers` vs `using-harness` duplicate, README mojibake, half-rebrand artifacts, dangling pre-commit script | ⬜ queued |

## Repo state at handoff time

```
branch:    main
HEAD:      3378162 feat: add using-codex skill defining Codex collaboration policy
ahead of origin/main by 3 commits (the third is the commit of this handoff itself)
working tree: clean (after handoff commit)
```

Recent commits, oldest to newest:

```
440e29e fix: remove PreToolUse:Bash hook to avoid Windows hook errors        (pre-existing)
5509791 feat: add upstream-watch skill for tracking Superpowers and OpenSpec (战线 A)
3378162 feat: add using-codex skill defining Codex collaboration policy      (战线 C)
<handoff commit will appear here>                                            (this doc)
```

**Origin not pushed.** The user wants to push before switching machines — either manually or by asking the next Claude.

### Git remotes

```
origin       https://github.com/Garvin5/ProjectHarness.git
superpowers  https://github.com/pcvelz/superpowers.git   (fetch upstream — merge target)
openspec     https://github.com/Fission-AI/OpenSpec.git  (fetch upstream — idea source)
```

Both upstream remotes were added during 战线 A. They are read-only in spirit — the `tracking-upstreams` skill never merges from them.

### Plugin state

| Plugin | Source | Scope | Where |
|---|---|---|---|
| `codex@openai-codex` | github: openai/codex-plugin-cc | local | installed for this project |
| `ai-dev-harness@ai-dev-harness-marketplace` | this repo (`./`) | local | installed for this project |

Local scope is **intentional** — the user only wants the harness loaded in projects where they explicitly install it. Don't recommend switching to user scope; that was rejected.

On the new machine, install with:

```
/plugin marketplace add F:/GameProjs/ProjectHarness   # or your local path
/plugin install ai-dev-harness@ai-dev-harness-marketplace
/reload-plugins
```

Codex plugin install steps are in `docs/README.codex.md` (or just rerun `/codex:setup` to verify auth).

## Files added during this conversation

```
.claude/commands/upstream-watch.md           project-scope slash command (only loads in this repo)
.claude/skills/tracking-upstreams/SKILL.md   project-scope skill for upstream tracking
docs/upstream-watch/state.json               last-reviewed commit per upstream
docs/upstream-watch/reports/2026-04-30.md    baseline + verification runs
skills/using-codex/SKILL.md                  cross-project skill (in plugin) — Codex policy
.gitignore                                    modified to un-ignore .claude/skills + .claude/commands
```

A few things deliberately NOT in the repo (machine-local on the original machine, must be recreated separately):

- `~/.claude/statusline.mjs` — Node script that renders the Claude Code statusLine. Not committed because it's a personal cosmetic. Content is in section [Statusline (machine-local)](#statusline-machine-local) below if the user wants it on the new machine.
- `~/.claude/settings.json` — has a `"statusLine"` field pointing at the script above. Also machine-local.
- `~/.claude/projects/<path>/memory/*.md` — auto-memory. See ["Project memory to recreate"](#project-memory-to-recreate).

## Project memory to recreate

These three files MUST be recreated at `~/.claude/projects/F--GameProjs-ProjectHarness/memory/` (sanitized project path will differ on the new machine — substitute the matching directory) before the next Claude does anything.

### `MEMORY.md` (the index)

```markdown
- [ProjectHarness vision and positioning](project_vision.md) — personal skill library, Claude+Codex+Harness+cross-project knowledge base, continuously absorbs from OpenSpec and Superpowers
- [Upstream repositories to track](reference_upstreams.md) — Superpowers is a merge upstream, OpenSpec is an idea upstream
```

### `project_vision.md`

```markdown
---
name: ProjectHarness vision and positioning
description: Strategic direction — this repo is a personal skill library, not a generic public plugin
type: project
---

ProjectHarness is being specialized into a personal skill library with these explicit pillars:

1. **Claude Code as the primary harness** — all skills, hooks, commands target Claude Code first.
2. **Codex as collaborator** — second-opinion / rescue / parallel investigation via the `codex` plugin (already installed, ChatGPT-authenticated as bingolovelinger@gmail.com).
3. **Project Harness philosophy** — `docs/project/` markdown state, 6 work-item types, pluggable verification, file-system-is-state, derived CLAUDE.md.
4. **Cross-project knowledge base** — beyond per-project `docs/project/`, the repo accumulates reusable learnings/skills *deployable* to other projects. **On-demand, not auto-loaded.** User installs the harness plugin into a project when they want it there; other projects stay clean. Local-scope install is fine and even preferred — the harness should not be a global skill dump.
5. **Continuous upstream absorption** — actively track and selectively merge changes from two upstreams:
   - https://github.com/Fission-AI/OpenSpec.git (spec-driven development concepts)
   - https://github.com/pcvelz/superpowers.git (fork base, session-level execution discipline)

**Why:** User wants a personal, opinionated, evolving toolkit — not a generic distribution. Public-plugin concerns (broad audience, naming neutrality, conservative defaults) take a back seat to the user's own workflow. Half-finished rebrand (Cursor/Gemini/OpenCode adapters still say `superpowers-extended-cc`) is acceptable to leave or delete since those adapters are not the user's focus.

**How to apply:**
- When suggesting changes, optimize for *this user's* Claude+Codex workflow, not for hypothetical external users.
- Treat OpenSpec and Superpowers as ideas-to-mine, not contracts to mirror — selective absorption, not blind merge.
- Cross-project = *deployable* to any project the user picks, not auto-loaded everywhere. Skills must work standalone (no implicit dependency on a global "harness home"), but it's fine for them to be opinionated.
- Skills that are about maintaining the harness itself (e.g. `tracking-upstreams`) belong at the **project level** under `<harness>/.claude/skills/`, NOT in the cross-project plugin. Workspace-level skills won't show up in other projects even if the plugin is enabled there.
- For "tracking" upstreams: prefer scheduled recurring agents (review diffs, propose absorptions) over manual git fetches.
- Non-Claude adapters (Cursor/Gemini/OpenCode) are deprioritized — don't gate work on cleaning them up unless the user asks.
```

### `reference_upstreams.md`

```markdown
---
name: Upstream repositories to track
description: The two external repos ProjectHarness continuously absorbs from
type: reference
---

ProjectHarness selectively absorbs from two upstreams. Check these when:
- The user says "sync upstream", "what's new upstream", "absorb from OpenSpec", etc.
- Designing features that overlap with concepts in either repo (avoid reinventing).
- Reviewing whether a recent skill/hook conflicts with upstream evolution.

| Repo | Role | URL |
|---|---|---|
| `pcvelz/superpowers` | Fork base — session-level execution discipline (TDD, brainstorming, plans, subagents, finishing-a-branch). Direct git remote candidate for `git fetch`. | https://github.com/pcvelz/superpowers.git |
| `Fission-AI/OpenSpec` | Inspiration — spec-driven development concepts (project orchestration, spec coverage, milestones). Concept source, not a git remote to merge. | https://github.com/Fission-AI/OpenSpec.git |

**Important distinction:** Superpowers is a *merge upstream* (compatible workflow, periodic `git merge upstream/main`). OpenSpec is an *idea upstream* (read their docs/specs, port concepts manually).
```

## Architectural decisions made (don't relitigate without good reason)

1. **Plugin scope = local, not user.** The harness loads only in projects where it's installed. The "cross-project skill library" concept = "deployable", not "auto-loaded". User explicitly affirmed this.
2. **Workspace-only skills live at `<repo>/.claude/skills/`.** Skills that are specifically about maintaining this fork (e.g., `tracking-upstreams`) belong here, not in the plugin's `skills/` directory. Verified that Claude Code auto-loads `<project>/.claude/skills/` when cwd is in that project — the `/skills` dialog labels them as `· project · ✔ on` (vs plugin skills which are `· plugin · 🔒 on`).
3. **`.gitignore` allows `.claude/skills/` and `.claude/commands/` to be versioned.** Achieved with: `.claude/*` to ignore everything in `.claude/`, then `!.claude/skills/`, `!.claude/skills/**`, `!.claude/commands/`, `!.claude/commands/**` to re-include the workspace-skill subtrees. `.claude/settings.local.json` stays user-local (still ignored).
4. **`docs/upstream-watch/state.json` and reports ARE versioned.** They're in `docs/`, not `.claude/`. Versioning lets the cadence survive across machines.
5. **`tracking-upstreams` is read-only.** Never `git merge`s anything. Absorption decisions are separate work driven by another (yet-to-be-built) skill.
6. **First-ever upstream-watch run establishes baseline only.** Doesn't dump full history. Both baselines were set on 2026-04-30 — `superpowers/main = 04bad33`, `openspec/main = cb9641a`.
7. **`using-codex` is "aggressive" policy.** 5 trigger categories — plan execution / multi-file research / explicit delegation are direct invokes; diagnosis-stuck and major-design-choice are suggest-only.

## Where we paused (the question the user needs to answer)

战线 A and C are merged and verified working. The next planned 战线 is **B: Cross-project knowledge base**. The previous Claude proposed three design questions and gave a recommendation; the user has not yet answered.

### Q1 — What does the knowledge base store?

| Type | Example | Value |
|---|---|---|
| Patterns | "Unity ScriptableObject singleton recipe", "accessible React modal pattern" | Reusable design/implementation templates |
| Postmortems | "the 3-day chase that turned out to be uninitialized git submodules", "why X library's Y API can't be trusted" | Lessons learned, ground covered |
| Decisions | "Vitest over Jest because…", "my commit message style" | Personal preferences crystallized |
| Snippets | Frequently-pasted scripts, shell functions, code templates | Pure reuse |

Previous Claude's recommendation: **all four**.

### Q2 — Where do these files live physically?

| Option | Pros | Cons |
|---|---|---|
| A. `~/.claude/knowledge/` (user-level) | Cross-project natural | Not version-controlled, lost if machine dies |
| B. ProjectHarness's `knowledge/` | Versioned, GitHub-pushable | Other projects need path config to find |
| C. Separate `personal-knowledge` git repo + symlinks | Independent versioning | Extra layer to manage |
| D. **Two-tier** — seed library in harness, working copy at user-level, sync mechanism | Best of both | Sync logic to write |

Previous Claude's recommendation: **simplified B** (just `knowledge/` in this repo for now; defer the sync question until needed).

### Q3 — How do skills consume the knowledge?

- **Passive** — pure documentation, only read when explicitly asked.
- **Semi-active** — existing skills (e.g., `systematic-debugging`) get a "first, check knowledge for relevant postmortems" preamble.
- **Active** — a new `consulting-knowledge` skill auto-fires.

Previous Claude's recommendation: **semi-active**.

### Pending offer

After 战线 A landed and verified, previous Claude offered to set up a `/schedule` for `/upstream-watch` (e.g., weekly Monday 09:00 UTC). User has not answered. Reasonable offer to repeat once 战线 B is settled.

## Statusline (machine-local)

The user has a Node script at `~/.claude/statusline.mjs` that renders a custom statusLine showing `user@host | cwd | model | ctx %`. Not in the repo. If the user wants it on the new machine, here's the script verbatim:

```javascript
#!/usr/bin/env node
import os from 'os';
import fs from 'fs';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  let data = {};
  try { data = JSON.parse(input || '{}'); } catch {}

  const c = {
    reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
    green: '\x1b[32m', cyan: '\x1b[36m', yellow: '\x1b[33m',
    magenta: '\x1b[35m', blue: '\x1b[34m', red: '\x1b[31m',
  };

  const user = os.userInfo().username || process.env.USERNAME || 'user';
  const host = os.hostname().split('.')[0];
  const home = os.homedir();
  const rawCwd = data.workspace?.current_dir || data.cwd || process.cwd();
  const cwd = rawCwd.startsWith(home)
    ? '~' + rawCwd.slice(home.length).replace(/\\/g, '/')
    : rawCwd.replace(/\\/g, '/');

  const modelId = data.model?.id || '';
  const modelName = data.model?.display_name || modelId || 'claude';
  const is1M = /1m|1000k|\[1m\]/i.test(modelId) || /1M/.test(modelName);
  const maxCtx = is1M ? 1_000_000 : 200_000;

  let ctxTokens = null;
  const tp = data.transcript_path;
  if (tp && fs.existsSync(tp)) {
    try {
      const buf = fs.readFileSync(tp, 'utf8');
      const lines = buf.split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        const ln = lines[i].trim();
        if (!ln) continue;
        try {
          const obj = JSON.parse(ln);
          const u = obj?.message?.usage;
          if (u && (typeof u.input_tokens === 'number' || typeof u.cache_read_input_tokens === 'number')) {
            ctxTokens =
              (u.input_tokens || 0) +
              (u.cache_read_input_tokens || 0) +
              (u.cache_creation_input_tokens || 0);
            break;
          }
        } catch {}
      }
    } catch {}
  }

  const parts = [];
  parts.push(`${c.green}${user}@${host}${c.reset}`);
  parts.push(`${c.cyan}${cwd}${c.reset}`);
  parts.push(`${c.magenta}${modelName}${c.reset}`);

  if (ctxTokens != null) {
    const pct = Math.round((ctxTokens / maxCtx) * 100);
    const color = pct >= 85 ? c.red : pct >= 60 ? c.yellow : c.dim;
    const k = ctxTokens >= 1000 ? `${(ctxTokens / 1000).toFixed(1)}k` : `${ctxTokens}`;
    parts.push(`${color}ctx ${k}/${(maxCtx / 1000) | 0}k (${pct}%)${c.reset}`);
  }

  const cost = data.cost?.total_cost_usd;
  if (typeof cost === 'number' && cost > 0) {
    parts.push(`${c.dim}$${cost.toFixed(2)}${c.reset}`);
  }

  process.stdout.write(parts.join(` ${c.dim}|${c.reset} `));
});
```

Plus, in `~/.claude/settings.json`, add:

```json
"statusLine": {
  "type": "command",
  "command": "node \"<absolute-path-to-statusline.mjs>\"",
  "padding": 0
}
```

(Adjust path for the new machine. Forward slashes work on Windows in this context.)

## How to push & resume on the new machine

On this machine:
```
git push origin main
```

On the new machine:
```
git clone https://github.com/Garvin5/ProjectHarness.git    # if not yet cloned
git pull
```

Then start a Claude Code session in that directory and feed the new Claude something like:

> "Read `docs/handoffs/2026-05-01-skill-library-buildout.md` and follow its 'first 3 things to do' section."

The next Claude will: (1) recreate memory, (2) verify state, (3) ask which 战线 B answer the user wants to commit to.

## Decision log of the conversation (skim if you want flavor)

- User installed the codex plugin and ran `/codex:setup`. Codex available, ChatGPT-auth verified.
- User asked what the codex skills do; previous Claude explained.
- User ran `/statusline` to configure the Claude Code statusline; agent couldn't find PS1; user said they use nushell and chose default. Previous Claude wrote a Node-based statusline script that reads transcript usage to display ctx %. Configured in `~/.claude/settings.json`.
- User asked previous Claude to investigate this project to understand it. Previous Claude delegated to Codex (via codex:codex-rescue subagent) AND investigated independently. Merged findings — confirmed two upstreams as fork base + idea source, half-finished rebrand, etc.
- User stated the strategic vision (specialize as Claude+Codex personal skill library + cross-project knowledge base + upstream tracking). Previous Claude saved as project memory.
- Previous Claude proposed 4 战线 with ordering A→C→B→D; user accepted.
- 战线 A: Built `tracking-upstreams` skill + `/upstream-watch` command + state/reports + git remotes. Initially placed in plugin's `skills/`. User course-corrected: this skill is harness-internal, doesn't belong in cross-project plugin. Moved to `.claude/skills/`. Tweaked `.gitignore` to allow versioning. Verified `/skills` dialog distinguishes plugin vs project skills. Committed as `5509791`.
- Plugin install: discovered installed at local scope, which user confirmed is correct (they only want harness in projects where they explicitly install it). Reinforced "deployable, not auto-loaded".
- 战线 C: Designed `using-codex` skill with 5 trigger categories. User chose: (Q1) plugin location = harness plugin; (Q2) automate research/plan-execution/explicit-delegation, suggest for diagnosis/major-choice; (Q3) aggressive triggers (Claude proactively detects). User added "execute-plan" as a 5th category previous Claude had missed. Committed as `3378162`.
- 战线 B: paused on Q1/Q2/Q3 above. User has not yet answered.
- User requested this handoff so they can resume on another machine.

---

End of handoff. The next Claude should print "Handoff received. Memory recreated. State verified. Ready to resume on 战线 B — which answers do you want to lock in for Q1, Q2, Q3?" or equivalent terse reorientation.
