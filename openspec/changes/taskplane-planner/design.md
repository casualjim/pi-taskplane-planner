## Context

This repository currently has:

- a design note at `docs/2026-04-06-taskplane-planner-design.md`
- working Taskplane configuration and packet examples under `taskplane-tasks/`
- reusable OpenSpec prompt/skill content under `.pi/skills/openspec-*` as
  bootstrap reference material
- little to no implementation code yet

The core architectural insight is now settled:

1. Taskplane is the execution/runtime system.
2. A planner must always run before execution, even for small changes.
3. The planner's job is to close the world before staging: no unresolved design
   choices, interface questions, blockers, or known unknowns may cross into
   Taskplane.
4. OpenSpec is useful as bootstrap source material for prompts, planning
   discipline, verify/archive semantics, and delta-spec structure, but the
   finished planner must not require the OpenSpec CLI or OpenSpec skills at
   runtime.

This means the planner must transform research and interview output into a
small set of canonical artifacts:

- proposal
- design
- delta specs
- Taskplane packets
- conformance report
- cumulative specs after archive

Research remains essential, but it is treated as process and working memory.
Its durable lessons are captured in proposal, design, and delta specs rather
than as an additional canonical truth surface.

## Goals / Non-Goals

**Goals:**
- Require planner closure before every Taskplane execution run.
- Produce proposal, design, and delta specs that fully capture intent,
  interface changes, preservation constraints, and proof obligations.
- Compile directly to Taskplane packets instead of relying on a canonical
  planning `tasks.md` layer.
- Use Taskplane review machinery for task-local verification.
- Add a terminal Taskplane conformance task for whole-change verification.
- Promote passing delta specs into cumulative specs only after verified archive.
- Make final review primarily a conformance check rather than a rediscovery
  exercise.

**Non-Goals:**
- Rebuild Taskplane orchestration, runtime, or merge behavior.
- Require OpenSpec CLI or `.pi/skills/openspec-*` as runtime prerequisites for
  the finished planner.
- Allow unresolved questions to be deferred into implementation tasks.
- Treat `tasks.md` as a canonical execution source of truth.
- Lower proof requirements to make changes easier to stage or pass.

## Decisions

### 1. Planner-first is mandatory for every change
All changes, including small multi-file updates, must pass through the planner.
There is no direct path from raw user intent to Taskplane execution.

**Rationale:** even small changes often alter multiple files, affect examples or
recorded specs, and can drift when workers are allowed to infer missing intent.
A small misunderstanding in the earliest phase amplifies through every later
phase.

**Alternatives considered:**
- Direct-to-Taskplane for simple changes → rejected because it preserves the
  exact ambiguity and drift risks this planner exists to eliminate.
- Planner only for large changes → rejected because “small” changes still carry
  spec, docs, and interface implications in this project.

### 2. Canonical pre-execution truth is proposal + design + delta specs
The planner's canonical outputs before execution are:
- `proposal`
- `design`
- `delta specs`

These artifacts are the approved contract. Research informs them, but research
itself is not an additional canonical artifact.

**Rationale:** this keeps the truth surface small while preserving the results
of exploration. The proposal captures why/scope, the design captures how and
what must remain true, and the delta specs capture normative behavior.

**Alternatives considered:**
- Separate canonical research artifact → rejected because it creates another
  truth surface without improving the execution boundary.
- Canonical `tasks.md` as equal planning truth → rejected because execution will
  be driven by Taskplane packets.

### 2a. OpenSpec is bootstrap scaffolding, not a runtime dependency
The current OpenSpec installation and local OpenSpec skills are temporary
scaffolding used to bootstrap this planner's design. The finished planner must
own its prompts, artifact generation behavior, verification logic, and archive
flow within this project/plugin context.

**Rationale:** the goal is to replace the need for OpenSpec in this repository,
not to add a permanent prerequisite. OpenSpec is helping design the replacement
for OpenSpec-in-this-repo.

**Alternatives considered:**
- Keep depending on OpenSpec CLI and skills in normal operation → rejected
  because the finished planner should be self-contained.
- Treat the current OpenSpec skills as a permanent upstream dependency →
  rejected because the prompts and workflow rules will need to evolve locally.

### 2b. Planner has a thin bootstrap and maintenance CLI
The finished planner should expose a small CLI for explicit project bootstrap
and health operations, while keeping everyday planning work inside planner
commands in pi.

Minimum CLI responsibilities:
- `planner init` seeds planner-native directories and any required local
  scaffolding.
- `planner doctor` validates planner structure and repairs safe issues.
- Optional later: `planner migrate` upgrades older planner layouts.

Normal workflow remains in planner commands such as `/plan-explore`,
`/plan-propose`, `/plan-stage`, and `/plan-archive`.

**Rationale:** some planner concerns are repo-owned scaffolding concerns rather
than conversational workflow concerns. Explicit init/doctor behavior is clearer,
more reviewable, and more self-hosting-friendly than invisible lazy creation.

**Alternatives considered:**
- No CLI, only lazy-create filesystem state on first use → rejected because it
  hides project mutation and makes repair/migration harder.
- Put the entire planner workflow behind a CLI → rejected because day-to-day use
  should remain inside pi and Taskplane-oriented agent workflows.

### 3. Design must carry delta, preservation, and proof obligations
The design document is not a loose architecture memo. It is an execution-grade
contract that must explicitly state:

- chosen approach and module ownership
- public interface deltas
- preservation constraints (what must remain true)
- proof obligations (tests, adversarial coverage, docs, examples, quality gates)
- refusal rule: unresolved blockers or known unknowns prevent staging

**Rationale:** workers are junior-like executors. If design leaves meaningful
room for interpretation, implementation will improvise in damaging ways.

**Alternatives considered:**
- Keep design high-level and defer specifics into tasks → rejected because that
  pushes architecture and QA decisions into execution.

### 4. Taskplane packets are the canonical execution artifacts
Approved contracts compile directly into Taskplane packets:
- `PROMPT.md`
- `STATUS.md`

If a `tasks.md` exists at all, it is only a derived preview/index and not a
canonical source of execution truth.

**Rationale:** Taskplane already has a good runtime packet shape, review levels,
dependency handling, file-scope affinity, and worker/reviewer loops. The system
should improve Taskplane's input, not create a parallel execution artifact.

**Alternatives considered:**
- OpenSpec-style `tasks.md` as the execution handoff → rejected because it
  duplicates execution truth and weakens the Taskplane boundary.
- Rebuild Taskplane packet format → rejected because Taskplane already provides
  the right container and runtime semantics.

### 5. Task-level review and change-level verify are separate layers
Taskplane review is the task-local form of verification. A separate terminal
Taskplane task performs whole-change conformance verification after the
implementation tasks complete.

Task-level review checks whether each task achieved its assigned contract slice.
Whole-change verify checks whether the assembled implementation matches the
approved proposal, design, and delta specs.

**Rationale:** some failures only appear after multiple tasks compose together.
A full-change verify step must exist before archive.

**Alternatives considered:**
- Rely on task reviews alone → rejected because cross-task integration and spec
  conformance can still fail.
- Implement verify outside Taskplane entirely → rejected because a terminal
  Taskplane task preserves uniform orchestration and guardrails.

### 6. Verify findings use a strict disposition model
Findings are classified into:
- `LOG_ONLY`
- `INLINE_REVISE`
- `REMEDIATION_TASK`
- `REOPEN_PLANNING`
- `ESCALATE_HUMAN`
- `ARCHIVE_READY`

Rules:
- Current-task issues revise inline.
- Whole-change issues that can be fixed within the approved contract become new
  remediation Taskplane tasks.
- Issues that require changing the approved contract reopen planning and may
  require renewed human signoff.

**Rationale:** repair work should stay in Taskplane only when it preserves the
approved contract. If the contract itself is wrong or incomplete, planning must
reopen.

### 7. Quality may not regress to achieve green
The planner and verifier must treat proof strength as part of the contract.
Tests, adversarial cases, docs, examples, lint, compile, and verification gates
must be preserved or improved, never silently weakened.

**Rationale:** otherwise the system can obtain a “green” result by lowering the
standard of proof instead of meeting the contract.

**Alternatives considered:**
- Treat passing tests as sufficient without checking proof strength → rejected.

### 8. Archive promotes delta specs into cumulative captured truth
Delta specs are pre-archive truth. After whole-change conformance passes, the
archive flow syncs delta specs into cumulative specs. Future planning reads the
cumulative specs as captured truth.

**Rationale:** this keeps proposed truth, execution truth, and captured truth
separate and prevents the main specs from being updated before implementation is
actually verified.

## Planner-Native Namespace and Command Surface

### Canonical Paths
- Active changes live under `planning/changes/<change-slug>/`.
- Canonical active-change artifacts are:
  - `planning/changes/<change-slug>/proposal.md`
  - `planning/changes/<change-slug>/design.md`
  - `planning/changes/<change-slug>/conformance.md`
  - `planning/changes/<change-slug>/specs/<capability>/spec.md`
- Cumulative captured truth lives under `planning/specs/<capability>/spec.md`.
- Archived changes live under `planning/archive/YYYY-MM-DD-<change-slug>/`.
- Execution packets remain under `taskplane-tasks/` because Taskplane owns the
  runtime boundary.

### Command Surface
Day-to-day workflow commands:
- `/plan-explore <idea|change>` → repo/web research, interview, ambiguity
  reduction
- `/plan-propose <idea|change>` → create or update proposal, design, and delta
  specs
- `/plan-stage <change>` → validate closure and compile to Taskplane packets
- `/plan-status [change]` → inspect planning, staging, verify, and archive
  state
- `/plan-archive <change>` → promote passing delta specs into cumulative truth
- Optional: `/plan-reopen <change>` when verify reveals a contract defect

Bootstrap and maintenance CLI:
- `planner init` → seed planner-native directories and local scaffolding
- `planner doctor` → validate planner structure and repair safe issues
- Optional later: `planner migrate` → upgrade older planner layouts

## Artifact Contracts

### `proposal.md`
Required sections:
- `## Why`
- `## Change Summary`
- `## Scope Boundaries`
  - `### In Scope`
  - `### Out of Scope`
- `## Spec Impact`
  - `### New Capabilities`
  - `### Modified Capabilities`
- `## User / Operator / Interface Impact`
- `## Risks / Constraints`

Rules:
- Proposal is concise and human-facing.
- It captures intent and boundaries, not implementation detail.
- It must explicitly state spec impact and interface/operator impact.
- It is invalid if obvious alternative interpretations remain open.

### `design.md`
Required sections:
- `## Context`
- `## Goals / Non-Goals`
- `## Key Decisions`
- `## Requested Delta`
- `## Preservation Constraints`
- `## Public Interface Deltas`
- `## Module Ownership and Edit Surface`
- `## Behavioral Semantics`
- `## Failure / Edge Case Semantics`
- `## Proof Obligations`
  - `### Acceptance`
  - `### Non-Regression`
  - `### Required Tests`
  - `### Documentation and Examples`
  - `### Repo Gates`
- `## Risks / Trade-offs`
- `## Closure Status`

Rules:
- Design is the execution-grade contract.
- It must close architectural how, behavioral how, interface deltas,
  preservation constraints, and proof obligations.
- `## Closure Status` must explicitly record:
  - `Blockers: None`
  - `Known Unknowns: None`
  - `Deferred Design Choices: None`
- If any of those values are not `None`, staging is blocked.

### Generated implementation Taskplane packet (`PROMPT.md`)
Required sections:
- task header metadata (task ID, change slug, size, review level)
- `## Mission`
- `## Contract References`
- `## Dependencies`
- `## Context to Read First`
- `## Environment`
- `## File Scope`
- `## Exact Edit Targets`
- `## Public Interface Delta`
- `## Preservation Constraints`
- `## Steps`
- `## Testing & Verification`
- `## Documentation and Examples`
- `## Completion Criteria`
  - `### Acceptance`
  - `### Non-Regression`
- `## Do NOT`
- `## Amendments (Added During Execution)`

Rules:
- Packets must not contain speculative wording such as `likely`, `probably`,
  `maybe`, `if needed`, `as needed`, or `where appropriate`.
- Packets must reference the approved proposal/design/spec sections they
  implement.
- Packets must name exact edit targets, interface impact, tests,
  documentation/example obligations, and repo gates.
- If a worker would still have to do original design work, the packet is not
  ready.

### Generated terminal conformance packet
Required sections:
- task header metadata
- `## Mission`
- `## Contract References`
- `## Dependencies`
- `## Context to Read First`
- `## Evaluation Scope`
- `## Findings Disposition Rules`
- `## Verification Steps`
- `## Report Output`
- `## Completion Criteria`
- `## Do NOT`
- `## Amendments (Added During Execution)`

Rules:
- The conformance packet verifies the whole assembled change against the
  approved contract.
- It must not directly implement fixes.
- It must write `planning/changes/<change-slug>/conformance.md`.
- Its findings must use the approved disposition model.

## Risks / Trade-offs

- **Higher upfront planning cost** → Mitigation: keep the canonical artifact set
  minimal and generate as much content as possible from guided research and
  critique rather than manual authoring.
- **Overly rigid plans could waste time on local code-expression details** →
  Mitigation: require closure on architectural/behavioral decisions while still
  allowing workers local expression choices that do not alter meaning.
- **Duplicate truth between planning and execution** → Mitigation: make
  proposal/design/delta specs the only canonical planning truth and Taskplane
  packets the only canonical execution truth.
- **Verify loops could thrash** → Mitigation: use a strict disposition model and
  escalate to replanning/human review when the same class of issue recurs.
- **Taskplane reviewer defaults may be too permissive for this workflow** →
  Mitigation: encode stricter criteria in generated Taskplane packets and
  project-specific worker/reviewer prompt guidance instead of rewriting the
  Taskplane engine.

## Migration Plan

1. Use the existing OpenSpec explore/propose/verify/sync/archive skill content
   only as bootstrap reference material while defining planner-owned prompts,
   artifact templates, and archive/conformance behavior.
2. Fork the useful prompt/process logic into this plugin so normal operation no
   longer depends on OpenSpec CLI or `.pi/skills/openspec-*`.
3. Define the planner artifact templates for proposal, design, and delta specs.
4. Define the compiler contract from approved artifacts to Taskplane packets.
5. Define the terminal conformance Taskplane task format and report output.
6. Implement archive sync from delta specs to cumulative specs only after
   conformance passes.
7. Add project-specific Taskplane worker/reviewer guidance so execution and
   review apply the approved preservation and proof rules consistently.

## Open Questions

None at the product-contract level for this change.

Operational or implementation details may still need engineering work, but they
must not weaken the closure rules above. If implementation uncovers a question
that changes approved intent, interfaces, preservation constraints, or proof
obligations, the change must reopen planning rather than improvising inside
Taskplane execution.
