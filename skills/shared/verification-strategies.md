# Verification Strategies

Each work item declares its verification strategy in `.current-work.md`. The execution layer adapts its workflow accordingly. TDD is the default when no strategy is specified.

## Strategies

### TDD (Test-Driven Development)
**When:** Pure logic, libraries, backend services, CLI tools, data transformations — anything with deterministic, programmatically verifiable behavior.
**Workflow:** Red → Green → Refactor. Write failing test first, implement minimum code to pass, refactor.
**Acceptance:** All tests green. Coverage meets project standard.
**Skill:** Uses the full `verification` skill in TDD mode. All TDD discipline (Iron Law, no skipping red) applies.

### integration-test
**When:** Database operations, API integrations, data pipelines, multi-service interactions — anything that depends on external systems.
**Workflow:** Set up test environment (containers, test DB) → write integration tests against real services → implement → verify.
**Acceptance:** Integration tests pass against real (or containerized) dependencies.
**Difference from TDD:** Tests hit real infrastructure, not mocks. Slower but catches real integration issues.

### playtest
**When:** Game feel, UX flows, interactive experiences, visual design — anything where "correct" is a subjective human judgment.
**Workflow:** Implement → build playable version → human plays/uses it → capture feedback → iterate.
**Acceptance:** Human confirms the experience meets the intended feel. Evidence: screenshots, recordings, written feedback.
**Note:** Can be combined with TDD for the deterministic parts (physics calculations, state machines) while using playtest for the subjective parts (does it feel good?).

### experiment-eval
**When:** ML models, A/B tests, performance optimization, algorithm comparison — anything with measurable metrics and uncertain outcomes.
**Workflow:** State hypothesis → define metrics and thresholds → implement → run evaluation → compare against baseline → decide.
**Acceptance:** Metrics meet pre-defined thresholds. Or: experiment produces clear enough data to make a decision (even if the decision is "this approach doesn't work").
**Output:** Experiment report with data, not just pass/fail.

### hardware-in-loop
**When:** Embedded systems, IoT, sensor/actuator code — anything that interacts with physical hardware.
**Workflow:** Implement → flash to target hardware → verify physical behavior → capture measurements.
**Acceptance:** Hardware behaves as specified. Timing constraints met. Physical measurements within tolerance.
**Note:** Unit tests can cover pure logic. HIL covers the hardware interaction layer.

### visual-regression
**When:** UI components, PDF rendering, chart generation, any visual output where pixel-level consistency matters.
**Workflow:** Implement → capture screenshots → compare against baseline → flag differences → human reviews diffs.
**Acceptance:** No unintended visual differences. Intentional changes update the baseline.

### contract-test
**When:** Brownfield migration, microservice interfaces, API compatibility — anything where new code must satisfy existing contracts.
**Workflow:** Write tests that encode the existing system's behavior → implement new system → verify contract tests pass.
**Acceptance:** All contract tests pass. The new implementation is a drop-in replacement for the old one.
**Note:** The contract tests are the spec. They define "correct" as "behaves like the old system."

### manual-checklist
**When:** One-time setup, deployment configuration, research spikes, infrastructure provisioning — anything where automated verification isn't practical.
**Workflow:** Define checklist items → execute each → mark as verified.
**Acceptance:** All checklist items confirmed by human.
**Use sparingly:** If you find yourself using this for features, consider whether a more automated strategy exists.

## Declaring in .current-work.md

```markdown
## Type: feature
## Verification: TDD
```

Or for mixed strategies:

```markdown
## Type: feature
## Verification: TDD + playtest
## Verification Notes: TDD for physics calculations and state machine. Playtest for movement feel and camera responsiveness.
```

## How the Execution Layer Uses This

The `verification` skill (evolved from `test-driven-development`) reads the Verification field:

1. **TDD** → Full TDD discipline, unchanged from original
2. **Other strategies** → Adapted workflow per strategy definition above
3. **Mixed** → TDD for the deterministic parts, other strategy for the rest
4. **Not specified** → Default to TDD (backward compatible)
5. **No `.current-work.md`** → Default to TDD (backward compatible)
