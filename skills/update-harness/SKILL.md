---
name: update-harness
description: Update the installed ai-dev-harness plugin in the current project to pick up new/changed skills from ProjectHarness. Detects install mode (local-clone vs GitHub) and runs the right refresh flow. Use when user says "update harness", "refresh harness", "拉一下 harness", "我想用新写的 X skill 但这里看不到", or after authoring/pushing harness changes that consumer projects should pick up.
---

# Update Harness

**Announce:** "I'm using the update-harness skill to refresh the harness plugin in this project."

**Type:** Rigid — detection-first, then mode-specific flow.

## Background

The `ai-dev-harness` plugin can be installed in two modes. Update mechanics differ:

| Mode | Source | Update flow |
|---|---|---|
| **A. Local clone** | `marketplace add <local-path>` or `--plugin-dir <path>` | git pull in the local repo → `/reload-plugins` |
| **B. GitHub** | `marketplace add <user>/<repo>` | push must already be on origin → marketplace cache refresh → `/reload-plugins` |

The federation registry (`~/.claude/harness-projects.json`) and per-project `docs/knowledge/` are **not** affected by this skill — they're path-based and version-free.

## Step 1 — Detect install mode

Inspect the plugin cache and current install:

```bash
# Linux/macOS
ls "$HOME/.claude/plugins/cache/" 2>/dev/null
```

```powershell
# Windows PowerShell
Get-ChildItem "$env:USERPROFILE\.claude\plugins\cache\" -ErrorAction SilentlyContinue
```

- **Sees a GitHub-style directory** (e.g., `Garvin5-ProjectHarness/`) → likely **Mode B**
- **No such directory, or only marketplace metadata** → likely **Mode A**

Cross-check by asking the user to run `/plugin` (Claude can't invoke slash commands itself). Confirm:
- Source field shows a local path (`D:/Repo/ProjectHarness`, `./ProjectHarness`) → **Mode A**
- Source field shows a GitHub identifier or remote URL → **Mode B**

If still ambiguous, ask the user one question: "How did you originally install the harness — from a local clone or from GitHub?"

## Step 2 — Snapshot current state

Before changing anything, record what's installed so the verify step has something to compare against.

If you can locate the plugin's checked-out HEAD (Mode A: the user's clone path; Mode B: `~/.claude/plugins/cache/<id>/`):

```bash
git -C "<plugin-path>" log -1 --format='%h %s' 2>/dev/null
```

Note the SHA. Also note one or two skill names the user **wants** after the update (e.g., `closing-session`) — these are the verification targets.

## Step 3 — Mode A flow (local clone)

The plugin source IS the user's working clone. Updates flow through git on that clone.

1. **Confirm the local harness path** — ask user if not obvious. Common: `D:/Repo/ProjectHarness`.
2. **Pull / verify state:**

   ```bash
   git -C "<harness-path>" fetch origin
   git -C "<harness-path>" status
   git -C "<harness-path>" log --oneline origin/main..HEAD   # local-only commits
   git -C "<harness-path>" log --oneline HEAD..origin/main   # incoming commits
   ```

   - If user's clone has unpushed commits already containing the desired skill → no pull needed; the plugin already has it. Move to Step 5.
   - If `origin/main` has new commits → propose `git -C "<harness-path>" pull --ff-only origin main`. **Ask before pulling** if the user has any uncommitted changes (`git status` shows non-empty).

3. **Tell the user to reload:** they need to type `/reload-plugins` in this session. Claude cannot invoke slash commands.

## Step 4 — Mode B flow (GitHub)

The plugin source is a GitHub repo; updates require the new content to be on origin first.

1. **Verify origin has the desired skill.** Ask the user (or check if you have access): is the change pushed to `Garvin5/ProjectHarness@main`?
   - If not pushed → STOP. Surface: "The change isn't on origin yet. Push from the harness repo first, then re-run update-harness."
2. **Tell the user to refresh the marketplace + reload:**

   ```
   /plugin marketplace update ai-dev-harness-marketplace
   /reload-plugins
   ```

   If `/plugin marketplace update` is unavailable in their Claude Code version, fall back to:

   ```
   /plugin uninstall ai-dev-harness
   /plugin install ai-dev-harness@Garvin5-ProjectHarness
   /reload-plugins
   ```

3. Note: nothing for Claude to do with bash here — entirely user-typed slash commands.

## Step 5 — Verify

After the user reports `/reload-plugins` ran, verify the target skill is visible.

If a target skill name was identified in Step 2 (e.g., `closing-session`):

```bash
# Quickest check: does the file exist in the cache / clone?
test -f "<plugin-path>/skills/<target>/SKILL.md" && echo "OK" || echo "MISSING"
```

Or ask the user to type `/skills` and confirm the target appears in the list.

If still missing:
- Mode A: did the user's clone actually have the skill committed? Run `git -C "<harness-path>" log --oneline -- skills/<target>/`.
- Mode B: did the marketplace cache actually refresh? `~/.claude/plugins/cache/<id>/.git` head SHA should now match origin/main.

## Step 6 — Final report

```
Harness update
- Mode:       A (local clone) | B (GitHub)
- Before:     <SHA> <subject>
- After:      <SHA> <subject>
- New since:  <N commits>  (e.g., "5 commits, including closing-session, ...")
- Reload:     done | pending (waiting on user to type /reload-plugins)
- Verified:   <target skill> visible | not visible
```

Stop after this.

## Recommendation: prefer Mode A on a single dev box

If the user is on one machine and ProjectHarness is their own repo, **Mode A is strictly better** — no GitHub round-trip, edits in the harness repo are visible after `/reload-plugins`. Surface this once if you detect Mode B in a single-user setup, but don't push it.

To migrate from Mode B to Mode A in the current project:

```
/plugin uninstall ai-dev-harness
/plugin marketplace add <absolute-local-path>
/plugin install ai-dev-harness
/reload-plugins
```

## Common Mistakes

**Skipping mode detection** — running Mode B flow on a Mode A install does nothing useful and confuses the user.
**Force-pulling over user's local commits** — `git pull --ff-only` is mandatory; never `--rebase` or `--force` without confirmation.
**Claiming success without verification** — Step 5 must confirm the target skill is actually visible.
**Trying to invoke slash commands** — Claude cannot type `/reload-plugins`. Always tell the user to do it.
**Forgetting the GitHub push gate (Mode B)** — if the change isn't on origin, no amount of marketplace refresh will pull it.

## Red Flags

**Never:**
- `git reset` / `git checkout --` in the harness clone to "fix" state
- Modify `~/.claude/plugins/cache/*` directly
- Edit `~/.claude/harness-projects.json` from this skill (use register-project)

**Always:**
- Detect mode before acting
- Get user OK before `git pull` if working tree is dirty
- Verify the target skill is visible before reporting success

## When NOT to use

- The harness isn't installed in this project at all — direct the user to README "Installation" section instead.
- The user wants to update **this project's KB** (not the harness) — that's `validate-knowledge` / `revalidate-entry`.
- The user wants to track upstream Superpowers/OpenSpec into ProjectHarness itself — that's the `upstream-watch` skill / workflow, not this one.

## References

- README §Installation — initial install paths
- `register-project` — federation registry mechanics (different concern)
- `upstream-watch` — pulling Superpowers / OpenSpec changes INTO ProjectHarness (one level up)
