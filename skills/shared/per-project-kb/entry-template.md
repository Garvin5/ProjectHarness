---
# All 7 fields below are REQUIRED. validate-knowledge enforces.
# See docs/design/per-project-knowledge-base.md §3 for full semantics.

# Directory placement under docs/knowledge/<type>/.
# One of: gotcha | decision | convention | ground-truth | reference | pattern
type: <type>

# How Claude consults this entry:
#   always-on        — injected by session-start (rare; reserve for must-read)
#   skill-triggered  — a related skill's preamble loads this when the skill fires
#   on-demand        — only loaded when consult-knowledge surfaces a match
activation: skill-triggered

# Stability of the underlying claim:
#   static      — invariant under expected change (PNG format, immutable spec)
#   living      — depends on tool/library/version/team-state; revalidate on stack changes
#   hypothesis  — believed but not yet confirmed; promote to living after ≥3 successful applications
freshness: living

# ISO date when last confirmed correct.
# revalidate-entry skill bumps this on successful re-check.
last-validated: <YYYY-MM-DD>

# At least ONE entry required. Multiple welcome.
# Every claim must trace back to a verifiable source.
provenance:
  - session: <claude-session-uuid>      # transcript proving the lesson
  - commit: <git-sha>                    # commit that fixed/created the issue
  - external: <url>                      # external doc / spec / dashboard
  # When borrowing a lesson from another harness project, MANDATORY:
  - external-project: <other-project-id>
  - external-entry: <relative-path-in-other-project-kb>

# Cross-project federation discriminator. ALL tags MUST be in
# vocabulary.yaml. consult-knowledge intersects this with the
# consulting project's manifest tags to compute relevance.
# An entry's applies-to is a subset of its project's manifest tags.
applies-to:
  tools: [<tag>]
  domains: [<tag>]
  project-type: [<tag>]   # optional — narrows further when relevant

# Entry IDs (relative paths under docs/knowledge/, no .md) that
# this entry replaces. Empty list if not superseding.
# When set, supersede-entry skill ensures the old entries are
# moved to <type>/_superseded/ with freshness: superseded.
supersedes: []
---

# <Title>

<!--
Body shape varies by type. Pick the structure for your `type` value.
The frontmatter is what schema enforces; bodies are convention.
-->

<!-- ===== gotcha ===== -->

## Symptom

<what looks wrong; the surface failure or confusion>

## Root cause

<what's actually happening underneath>

## Fix

<what to do instead, with code/config/path-level specifics>

## Evidence

<concrete trace — log lines, commit, before/after diff>

## When this might break again

<list known stack-change risks that would invalidate the lesson>

<!-- ===== decision ===== -->

## Context

<the situation that forced a choice>

## Options considered

- **A — <name>**: <pros> · <cons>
- **B — <name>**: <pros> · <cons>

## Choice

<which option was picked>

## Rationale

<why; the dimension that decided it>

## Consequences

<what this commits the project to; downstream constraints>

<!-- ===== convention ===== -->

## Rule

<the rule, stated as an imperative>

## Why

<the principle / past incident / explicit user preference>

## How to apply

<when this fires, what you do, what counts as compliant>

## Anti-examples

<concrete cases where the rule does NOT apply, to prevent over-firing>

<!-- ===== ground-truth ===== -->

## Statement

<the invariant>

## Source

<authoritative origin — spec doc URL, file path, vendor docs, original artifact>

## Why immutable

<reason this fact won't change under expected project lifetime>

## How to verify

<commands / queries that prove the statement currently holds>

<!-- ===== reference ===== -->

## What it is

<short description of the external resource>

## Where

<URL / path / dashboard handle>

## When to consult

<concrete trigger — what kind of question this answers>

## How to read it

<navigation hints; what's authoritative vs. supplementary in the resource>

<!-- ===== pattern ===== -->

## Pattern

<the recurring shape, in 1–2 sentences>

## Composing entries

<which atomic gotchas / decisions / conventions this pattern aggregates>
- [<entry-id>] — <one-line role in the pattern>
- [<entry-id>] — <one-line role in the pattern>

## Application steps

1. <step>
2. <step>

## Caveats

<known cases where the pattern doesn't fit; what to do instead>
