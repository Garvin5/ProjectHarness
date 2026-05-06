---
name: register-project
description: One-shot bootstrap for a harness-using project. Creates docs/knowledge/manifest.yaml from the manifest template and appends the project to ~/.claude/harness-projects.json so it's visible to consult-knowledge / survey-relevant in OTHER registered projects. Use when (a) the user is starting to use ProjectHarness skills in a fresh project for the first time; (b) the user explicitly says "register/注册 this project"; (c) you notice docs/knowledge/manifest.yaml is missing in a project where the user is invoking KB skills. Action style is propose-first — gather inputs from user one prompt at a time before writing anything. Do NOT use this skill when manifest.yaml already exists (use validate-knowledge to update tags instead) or in projects that are not under git (the registry tracks git roots).
---

# Register Project

**Announce:** "Registering this project for the harness federation."

**Type:** Rigid — same procedure each run; output schema is fixed.

**Action style:** Propose-first. Each manifest field is asked for explicitly. Default to NO writes until all answers are collected and the user confirms the final manifest summary.

## What this skill produces

Two artifacts:

1. `<project-root>/docs/knowledge/manifest.yaml` — project identity for federation (id, name, type, tools, domains, related-projects)
2. An appended entry in `~/.claude/harness-projects.json` — registry path + trust level + registered-at timestamp

## Procedure

### Step 1 — Sanity check

```bash
test -f docs/knowledge/manifest.yaml && echo "ALREADY REGISTERED" || echo "OK"
```

If already registered, abort and tell the user to use `validate-knowledge` for updates. Do NOT overwrite an existing manifest.

### Step 2 — Read the vocabulary

```bash
cat "<HARNESS-ROOT>/skills/shared/per-project-kb/vocabulary.yaml"
```

Hold the controlled tag list in memory for steps 3–4. All user-supplied tags MUST be from this list.

### Step 3 — Gather inputs (one prompt per field)

Ask the user in this order. Each prompt should suggest a default if obvious from the project (folder name, README, language detection).

| Field | Prompt shape |
|---|---|
| `id` | "Project ID (kebab-case, stable; suggested: `<basename>`)" |
| `name` | "Display name? (suggested: `<readable basename>`)" |
| `type` | "Project type — pick one from: mini-game / full-game / web-app / cli-tool / library / service / mobile-app / desktop-app / playable-ad. Plus optional work-mode tag (reverse / greenfield / maintenance)." |
| `description` | "1–3 sentence summary of what this project is." |
| `tools` | "Tools / frameworks / languages / runtimes / platforms in use? Pick from vocabulary; tag generously." |
| `domains` | "Functional domains? Pick from vocabulary; entries' applies-to.domains will be subsets of this." |
| `related-projects` | "Other registered projects worth treating as direct precedents? (Optional; usually empty for first registration.)" |

Validate each tag against the vocabulary in memory. If a user-suggested tag is absent, ask whether to add it to vocabulary.yaml (a separate edit) or rephrase.

### Step 4 — Show summary, ask for final OK

Render the full manifest as a single block:

```yaml
project:
  id: <id>
  name: <name>
  type: <type>
  description: |
    <description>
  tools: [<list>]
  domains: [<list>]
  related-projects: [<list>]
```

Single-line prompt: `OK / edit / cancel?`

### Step 5 — On confirm: scan + write

```bash
# Scan summary text for secrets
node "<HARNESS-ROOT>/skills/redact-secrets/scripts/scan-secrets.mjs" --file <draft-path>
```

If exit 3: refuse. If exit 2: prompt user redact/keep/cancel. If exit 0 or user accepted: continue.

Write `docs/knowledge/manifest.yaml`. Then:

```bash
node "<HARNESS-ROOT>/skills/register-project/scripts/register-project.mjs" \
  --project-root "<absolute-path>" \
  --id "<id>" \
  --trust full
```

The registry helper:
- Reads `~/.claude/harness-projects.json` (creates it if absent)
- Refuses to add if `id` already exists in registry (asks user to choose: replace / new-id / abort)
- Appends `{ id, path, registered-at, trust }`
- Writes atomically (write-temp + rename)

### Step 6 — Surface result

One-line confirmation: `Registered "<name>" (<id>). Federation now contains N project(s).`

## Constraints

- **Never write without user OK** on the final manifest summary.
- **Never replace an existing manifest** silently — abort and instruct the user to use `validate-knowledge`.
- **All tags from vocabulary.** If user wants a new tag, that's a separate edit on `skills/shared/per-project-kb/vocabulary.yaml` first.
- **Atomic registry write** — the helper script handles this; do not edit `~/.claude/harness-projects.json` directly via `Edit`.
- **Path is absolute.** Registry tracks absolute paths so consult-knowledge can resolve them from any working directory.

## When NOT to use

- A project already has `docs/knowledge/manifest.yaml`. Use `validate-knowledge` or plain edits.
- The user wants to remove a project from the federation. That's a separate manual edit on the registry plus a `git rm -r docs/knowledge/` if desired.
- The current directory is not a git repository. The registry tracks git roots; non-git projects can technically register but cross-project provenance breaks down.
