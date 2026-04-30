---
name: tracking-upstreams
description: Survey new commits in the Superpowers and OpenSpec upstream repos since the last review and produce a markdown report of "what's worth absorbing". Use when the user says "check upstreams", "what's new upstream", "track upstreams", "weekly upstream review", "what's new in superpowers", "what's new in openspec", or when a scheduled agent fires this skill. Also runs as part of the recurring upstream-watch routine.
---

# Tracking Upstreams

**Announce:** "I'm using the tracking-upstreams skill to review what's new in the upstream repos."

**Type:** Rigid — same procedure each run; output format is stable so reports diff cleanly week to week.

## What this skill produces

A dated markdown report at `docs/upstream-watch/reports/YYYY-MM-DD.md` summarizing new commits in two upstream repos and recommending which changes are worth absorbing.

State (last-reviewed commit per upstream) lives at `docs/upstream-watch/state.json`. Both files are versioned in this repo.

## Upstreams

| Remote | URL | Relationship |
|---|---|---|
| `superpowers` | https://github.com/pcvelz/superpowers.git | **Merge upstream** — fork base. Compatible workflow. Direct `git merge` is occasionally appropriate. |
| `openspec` | https://github.com/Fission-AI/OpenSpec.git | **Idea upstream** — concept source only. Never `git merge`; port concepts manually. |

Both must be configured as git remotes. If either is missing, run:
```bash
git remote add superpowers https://github.com/pcvelz/superpowers.git
git remote add openspec   https://github.com/Fission-AI/OpenSpec.git
```

## Procedure

### Step 1 — Fetch

```bash
git fetch superpowers
git fetch openspec
```

If either fetch fails (network, auth), record the failure in the report and proceed with whichever upstream succeeded. Do not abort the whole run.

### Step 2 — Read state

Open `docs/upstream-watch/state.json`. If it does not exist, treat both `last_reviewed_commit` values as null (first-ever run). On first run, do **not** dump full upstream history into the report — instead, set the baseline to current HEAD of each upstream and write a "baseline established" report.

Schema:
```json
{
  "superpowers": {
    "last_reviewed_commit": "<sha>",
    "last_reviewed_at": "YYYY-MM-DDTHH:MM:SSZ"
  },
  "openspec": {
    "last_reviewed_commit": "<sha>",
    "last_reviewed_at": "YYYY-MM-DDTHH:MM:SSZ"
  }
}
```

### Step 3 — Survey new commits

For each upstream that has a previous baseline:

```bash
git log --oneline <last_reviewed_commit>..<remote>/main
```

(Branch name may not be `main` for every upstream — check `git remote show <remote>` if `main` does not exist; fall back to whatever the upstream's default is.)

Cap at the most recent **40 commits** per upstream to keep reports readable. If more than 40, mention the truncation in the report header.

### Step 4 — Classify each commit

For each commit, determine its **category** and **absorption signal**:

**Categories** (pick one):
- `skill` — adds/modifies a skill (anything under `skills/`)
- `hook` — adds/modifies a hook
- `command` — adds/modifies a slash command
- `test` — testing infrastructure
- `docs` — README / design docs / changelogs
- `chore` — version bumps, formatting, CI
- `fix` — bug fix
- `feat` — new feature, doesn't fit above
- `other`

For OpenSpec commits, prefer reading file paths and commit messages — the directory layout differs from Superpowers.

**Absorption signal** (pick one):
- `absorb` — clearly aligned with this fork's direction; should be evaluated for porting
- `consider` — relevant but not obviously aligned; flag for human judgment
- `skip` — not relevant (e.g., upstream-only naming, tests for upstream-only features)

Use this fork's **vision** (Claude+Codex first, Project Harness, cross-project knowledge base) as the lens. Memory `project_vision.md` has the full rationale; load it if you have not already.

### Step 5 — Write the report

Path: `docs/upstream-watch/reports/YYYY-MM-DD.md` (today's date, UTC).

Format:

```markdown
# Upstream Watch — YYYY-MM-DD

**Window:** since <last_reviewed_at_superpowers> (superpowers) / <last_reviewed_at_openspec> (openspec)

## Summary

- Superpowers: N new commits (X absorb / Y consider / Z skip)
- OpenSpec:    N new commits (X absorb / Y consider / Z skip)

## Superpowers

<remote>/main now at `<sha>` <subject line>

| SHA | Category | Signal | Subject |
|---|---|---|---|
| abc1234 | skill | absorb | feat: ... |
| ... |

### Absorb candidates

For each commit marked `absorb`, write a short paragraph:
- What it changes
- Why it aligns with this fork
- Anything to watch out for when porting (file path conflicts with renamed harness skills, etc.)

### Consider

(Brief one-liner per commit marked `consider`.)

## OpenSpec

(Same structure as Superpowers section, but absorption is conceptual — note the *idea* to port, not the diff to merge.)

## Action items

A short bulleted list of concrete follow-ups, e.g.:
- Port `<superpowers commit>` into `skills/X/` — minor adjustments needed for harness naming
- Open issue tracking the OpenSpec spec-coverage refinement idea
- (or: "No action needed this cycle.")
```

### Step 6 — Update state

Bump `last_reviewed_commit` to the latest `<remote>/main` SHA for each upstream that fetched successfully. Update `last_reviewed_at` to the current UTC timestamp. Save `state.json`.

### Step 7 — Surface the report

End by telling the user the report path and a one-line summary (counts of absorb/consider/skip). Do not paste the full report into chat unless the user asks.

## Constraints

- **Read-only on upstreams.** This skill never `git merge`s anything. Absorption decisions and ports are separate work the user (or another skill) drives.
- **Write-only inside `docs/upstream-watch/`.** Do not modify any other repo file in this skill.
- **Idempotent on no-change runs.** If both upstreams have zero new commits since last run, write a one-line report ("no new commits in window") and still bump `last_reviewed_at` so cadence is visible.
- **First-ever run does not retroactively review history.** Establish a baseline only.

## When NOT to use

- The user is asking *how to absorb* a specific change — that's manual porting, use the relevant skill (`writing-plans` etc.) on the change.
- The user wants to *merge* superpowers/main wholesale — that's a one-off `git merge superpowers/main` decision, not a survey.
