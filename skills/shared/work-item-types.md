# Work Item Types

Not all work is a "feature." Different types of work have different lifecycles, different verification needs, and different completion semantics.

## Types

### feature [feat]
**What:** New functionality or enhancement to existing functionality.
**Lifecycle:** planned → in-progress → done
**Roadmap marker:** `[x]` when done
**Verification:** Declared per-item (TDD, integration-test, playtest, visual-regression, etc.)
**Completion:** Produces code + spec. `/project-done` updates roadmap and generates spec.
**Example:** "Add character controller," "Implement Stripe payment integration"

### infra [infra]
**What:** Development infrastructure, tooling, CI/CD, deployment, dev environment setup.
**Lifecycle:** planned → in-progress → done
**Roadmap marker:** `[x]` when done
**Verification:** Usually manual-checklist or integration-test
**Completion:** Produces configuration/setup. Spec optional (document in architecture.md instead if it affects system-wide conventions).
**Example:** "Set up headless test framework," "Configure CI pipeline," "Set up Docker dev environment"

### spike [spike]
**What:** Time-boxed research to answer a question or make a decision. The deliverable is a decision, not code.
**Lifecycle:** planned → exploring → decision
**Roadmap marker:** `[decision: summary]` when done
**Verification:** manual-checklist (did we answer the question?)
**Completion:** Produces a decision record in `decisions/` or exec-plan Decision Log. May spawn new feature/infra work items.
**Example:** "Evaluate ENet vs WebSocket for networking," "Assess feasibility of headless rendering in Godot"

### migration [migration]
**What:** Moving functionality from one system/architecture to another while maintaining continuity.
**Lifecycle:** audit → in-progress → verified → cutover → decommissioned
**Roadmap marker:** Status tag updates through stages: `[audit]` → `[migrating]` → `[verified]` → `[cutover]` → `[decommissioned]`
**Verification:** contract-test (new implementation satisfies old interface contracts)
**Completion:** Each stage is a checkpoint. Cutover requires human confirmation. Final decommission removes old system.
**Rollback:** Every migration work item must specify a rollback plan.
**Example:** "Migrate user auth from PHP to Go service," "Move from MySQL to PostgreSQL"

### experiment [experiment]
**What:** Hypothesis-driven work where the outcome is uncertain. Common in game feel tuning, ML, performance optimization.
**Lifecycle:** hypothesis → implement → evaluate → decision
**Roadmap marker:** `[result: summary]` when done
**Verification:** experiment-eval (metrics meet threshold) or playtest (subjective human evaluation)
**Completion:** Produces experiment data and a conclusion. Code may or may not be kept. May trigger a redesign via `/project-replan`.
**Example:** "Tune recoil pattern for AK-47," "Test transformer vs RNN for code analysis," "A/B test dashboard layout"

### ops [ops]
**What:** Ongoing operational activities with no "done" state. Recurring maintenance, monitoring, incident response.
**Lifecycle:** Recurring / triggered. No completion state.
**Roadmap marker:** Does not appear in roadmap.md. Lives in `docs/project/ops/`.
**Verification:** Per-activity checklist
**Completion:** Never "done" — tracked as recurring activities.
**Example:** "Weekly dependency updates," "Monitor API latency SLA," "Incident response runbook"

## Usage in Roadmap

```markdown
## M1: Core Engine [status: in-progress] [milestone: v0.1]

- [x] F1.1: Character controller [feat, P0, deps: —]
- [ ] F1.2: Shooting system [feat, P0, deps: F1.1]
- [ ] I1.1: Headless test framework [infra, P0, deps: —]
- [decision: use raycast] S1.1: Raycast vs physics bullets [spike, deps: —]
- [ ] E1.1: Recoil feel tuning [experiment, P1, deps: F1.2]
```

## How /project-next Handles Types

When selecting the next work item, `/project-next` considers type:
- **feat/infra:** Normal selection by priority and dependency
- **spike:** Prioritized when downstream features are blocked by a pending decision
- **experiment:** Scheduled after the feature it depends on, but before features that depend on its outcome
- **migration:** Selected by migration stage, not by priority alone
- **ops:** Not selected by `/project-next` — managed separately
