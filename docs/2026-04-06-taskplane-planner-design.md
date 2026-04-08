# Taskplane Planner Design

## Decision Summary

Build a **Taskplane-native planning layer** that borrows the **process** from
OpenSpec-style spec-driven planning without requiring strict OpenSpec
compatibility.

The goal is **not** "OpenSpec integration" as an end in itself.

The real goal is:

> take an ambiguous feature/change request, drive it through exploration,
> research, clarification, design, critique, and decomposition, then emit
> **Taskplane-native** task packets that can run cleanly under `/orch`.

Taskplane remains the **execution system**.
The planner becomes the **upstream planning and staging system**.

---

## Problem

Taskplane is strong at execution once work is already well-scoped:

- `PROMPT.md` / `STATUS.md`
- dependency handling
- lane affinity and file scope
- review and merge orchestration
- supervisor + batch runtime

But Taskplane does **not** solve the earlier problem:

- a human starts with an ambiguous prompt
- the system must inspect the repo and relevant docs
- sometimes it must research external constraints
- it must turn that ambiguity into a concrete design
- then split the design into Taskplane-sized execution tasks

Today there are multiple partial answers:

- **OpenSpec** has a strong process and change-centric artifact model
- **Gigaplan** has critique/gates, but feels opaque and state-machine-heavy
- **pi-project-workflows** has typed workflow/state ideas, but is not a
  Taskplane-native execution model
- **Taskplane** is the best executor, but not the upstream planner

We want the process strengths of these systems without inheriting their worst UX
or creating duplicate sources of truth.

---

## Core Product Thesis

The right model is:

1. **Plan like OpenSpec**
   - change-centric
   - durable artifacts
   - explicit research / design / task decomposition
2. **Validate like pi-project-workflows**
   - typed planner metadata
   - validation/doctor checks
   - optional monitors and gates
3. **Critique like Gigaplan**
   - second-pass review
   - explicit human approval points
4. **Execute like Taskplane**
   - native Taskplane task packets
   - `/orch` remains the runtime system

This means the planner should be judged by one criterion above all others:

> **Does it produce Taskplane tasks that are ready to run without human
> reinterpretation?**

---

## Non-Goals

This design does **not** aim to:

- replace Taskplane execution with a separate workflow engine
- preserve full OpenSpec CLI compatibility
- make OpenSpec `tasks.md` or planner tasks the runtime execution truth
- replace human review with fully autonomous planning
- adopt all of `pi-project-workflows` wholesale
- force a large, ceremony-heavy planning workflow on trivial changes

---

## Comparison of Existing Systems

| System | Best at | Weakness for our use case | Keep / Steal |
|---|---|---|---|
| **Taskplane** | Native execution, batch orchestration, reviews, merges, worktrees | Weak upstream planning model | Keep as executor |
| **OpenSpec** | Proposal/spec/design/task process, durable change artifacts | Output is not Taskplane-native by default | Steal process and artifact ideas |
| **Gigaplan** | Cross-model critique, gates, iterative planning | Opaque, state-machine-heavy, intervention feels indirect | Steal critique/gate ideas only |
| **pi-project-workflows** | Typed planner state, workflow DSL, validation, monitors | Not a good replacement for Taskplane execution | Steal typed state, validation, monitors |

---

## Desired Properties

The planner should be:

- **Taskplane-native at the output boundary**
- **human-steerable** at every important decision point
- **research-backed**, not just a fancy todo generator
- **file-based** and durable, not chat-history-only
- **small-team friendly**, without enterprise process ceremony
- **incremental**, so a small bug does not trigger a huge planning ritual
- **module-aware**, matching this repo's vertical feature-module style
- **resistant to dual truth**, especially between planning tasks and runtime status

---

## Proposed Workflow

## Stage 0 — Intake

Input:
- ambiguous user prompt
- optional issue/goal reference
- optional repo context or changed files

Output:
- create or select a planner change folder
- record original intent and current status

### Example prompt
- "Add governed address-label ingestion and use it as fallback enrichment"

---

## Stage 1 — Exploration

Goal:
- inspect the codebase and identify relevant modules, files, patterns,
  constraints, and adjacent docs

Questions answered:
- what already exists?
- what feature/module owns the relevant behavior?
- what files are likely to change?
- what tests/checks already exist?
- what unknowns remain?

Output:
- local-repo findings written to `RESEARCH.md`
- candidate impacted modules and file scope seeds

This stage should feel like a structured version of "repo reconnaissance," not
full planning yet.

---

## Stage 2 — External Research

Optional.

Use only when needed:
- APIs, tools, governance constraints, protocol behavior, upstream docs,
  competitor/reference workflows

Output:
- external findings added to `RESEARCH.md`
- citations/links captured so planning is auditable

This is the part that makes the system **research-backed** rather than merely
prompt-backed.

---

## Stage 3 — Change Framing

Turn the intake + research into a concrete change description.

Questions answered:
- what problem are we solving?
- why now?
- what are the goals and non-goals?
- what acceptance criteria matter?
- what risks or unknowns still need explicit handling?

Output:
- `CHANGE.md`

This is the planner's equivalent of OpenSpec's proposal/spec framing, but kept
practical and repo-specific.

---

## Stage 4 — Solution Plan

Turn the change framing into an implementation plan.

Questions answered:
- what modules/files need to change?
- what shape should the solution take?
- what order of operations makes sense?
- where are the boundaries and invariants?
- what docs, tests, or manifests need updating?

Output:
- `PLAN.md`

This is where the planner must align with the repo's actual style:
- vertical feature modules
- low ceremony
- explicit but lightweight boundaries
- no artificial architecture theater

---

## Stage 5 — Critique and Gate

Run a deliberate critique pass before staging tasks.

Questions answered:
- is the plan missing major work?
- are tasks too large?
- are dependencies wrong or underspecified?
- is file overlap likely to cause merge conflicts?
- is the verification story weak?
- are docs updates missing?

Output:
- `REVIEW.md`
- planner state updated to either:
  - `needs-revision`
  - `approved-for-staging`

This is where we steal from Gigaplan:
- independent critique
- explicit gate
- optional escalation

But we do **not** copy Gigaplan's opaque orchestration model.

---

## Stage 6 — Taskplane Decomposition

Convert the approved plan into execution tasks.

Questions answered:
- what are the M-sized execution packets?
- which tasks depend on which?
- what file scopes should be declared?
- what review level is appropriate for each task?
- what context docs should each task load?

Output:
- `TASKS.md`
- optional typed planner metadata in `STATE.json`

This is the most important stage. The planner should produce task definitions
that map cleanly onto Taskplane packets with minimal human rewriting.

---

## Stage 7 — Staging to Taskplane

Compile planner tasks into real Taskplane task folders:

- `taskplane-tasks/TP-xxx-slug/PROMPT.md`
- `taskplane-tasks/TP-xxx-slug/STATUS.md`

At this point the work becomes Taskplane-native and can be run with:
- `/orch-plan all`
- `/orch all`

This is the handoff point.

---

## Stage 8 — Execution and Archive

Taskplane is the execution truth from here onward.

The planner may sync summary metadata back, but it must **not** compete with
Taskplane's runtime state.

Optional outputs:
- `MAPPING.json` updated with staged task IDs and completion summary
- planner change marked complete
- durable spec updates or archive notes written if desired

---

## Artifact Model

Proposed planner folder:

```text
planning/
  changes/
    <change-slug>/
      CHANGE.md
      RESEARCH.md
      PLAN.md
      TASKS.md
      REVIEW.md
      STATE.json
      MAPPING.json
```

### `CHANGE.md`
Purpose:
- problem statement
- goals / non-goals
- acceptance criteria
- risks / assumptions
- impacted modules

### `RESEARCH.md`
Purpose:
- local codebase findings
- external references
- architectural constraints
- open questions and answers

### `PLAN.md`
Purpose:
- implementation shape
- file/module ownership
- sequencing
- verification approach
- docs/update implications

### `TASKS.md`
Purpose:
- approved decomposition into Taskplane-sized execution tasks
- human-readable staging source

### `REVIEW.md`
Purpose:
- critique findings
- requested revisions
- gate decision and approval notes

### `STATE.json`
Purpose:
- machine-readable planner state
- current stage
- timestamps
- approval state
- validation results
- optional normalized task metadata

### `MAPPING.json`
Purpose:
- map planner task IDs to staged Taskplane task IDs
- record batch/execution linkage
- avoid losing the relationship between planning and execution

---

## Why These Artifacts Instead of Strict OpenSpec Artifacts

We want the **process** more than the brand/format.

OpenSpec's core strengths are:
- proposal/spec/design/tasks flow
- durable change folders
- explicit planning before implementation

But we do not need to mirror its exact command names or folder format if that
creates friction with Taskplane.

So the design keeps the spirit of OpenSpec while optimizing for:
- Taskplane-native output
- simpler operator UX
- lower ceremony
- explicit research and critique stages

---

## Task Representation in `TASKS.md`

Each planner task should be explicit enough to compile into Taskplane without
manual reinterpretation.

Suggested shape:

```markdown
## T01 — Build address-label ingestion pipeline

- **Why:** Create the governed ingestion path that populates the local DuckDB label database.
- **Size:** M
- **Review Level:** 2
- **Depends On:** None
- **File Scope:**
  - `scripts/import-labels.ts`
  - `scripts/labels/**`
  - `docs/address-label-sources.md`
- **Context to Read First:**
  - `AGENTS.md`
  - `docs/address-label-sources.md`
- **Implementation Outcomes:**
  - ingest approved sources into observations table
  - materialize canonical address_labels table
  - log counts by source and chain
- **Verification:**
  - `bun run check`
  - targeted script/test execution if present
- **Docs:**
  - update docs if source governance or workflow expectations change
```

This is intentionally close to Taskplane's required fields.

---

## Mapping to Taskplane Packets

| Planner Field | Taskplane Destination |
|---|---|
| task title | Task title + folder slug |
| why | `## Mission` |
| depends on | `## Dependencies` |
| context to read first | `## Context to Read First` |
| file scope | `## File Scope` |
| implementation outcomes | `## Steps` + completion criteria |
| verification | testing / verification step |
| docs | documentation requirements |
| size | Task header metadata |
| review level | Task header metadata |

The staging compiler should reject planner tasks that do not provide the minimum
fields needed to generate a valid Taskplane packet.

---

## Source of Truth Rules

These rules are critical.

### Planning truth
Lives in:
- `CHANGE.md`
- `RESEARCH.md`
- `PLAN.md`
- `TASKS.md`
- `STATE.json`

### Execution truth
Lives in:
- Taskplane `STATUS.md`
- Taskplane batch state
- Taskplane review/merge outputs

### Important constraint
Do **not** make planner tasks and Taskplane status both act as live execution
state.

Planner artifacts describe and stage the work.
Taskplane tracks execution of the work.

---

## Ideas to Steal from `pi-project-workflows`

## 1. Typed planner metadata
Use `STATE.json` / `MAPPING.json` for structured planner state.

Good uses:
- planner status
- approval state
- normalized task metadata
- staged task id mapping
- validation reports

## 2. Validation / doctor concept
Provide checks like:
- missing dependencies
- circular dependencies
- oversized tasks
- overlapping file scopes
- missing docs/checks
- missing Taskplane-required fields

## 3. Workflow/gate pipeline
The planning system can internally use workflow-like stages:
- explore
- research
- plan
- critique
- stage

But this should remain a transparent file-driven UX, not a black-box state
machine.

## 4. Monitors
Later, monitors can catch planner problems such as:
- task output not Taskplane-native
- vague task wording
- poor verification steps
- duplicated tasks
- stale mappings

---

## Ideas to Steal from Gigaplan

## 1. Independent critique
A second planning pass or model should challenge the proposed plan.

## 2. Explicit gates
Important transitions should require approval:
- draft → approved for staging
- staged → ready for execution

## 3. Escalation points
The planner should surface unresolved questions instead of silently guessing.

What we do **not** want from Gigaplan:
- opaque plan lifecycle
- hidden state machine behavior
- intervention as an afterthought

---

## Human Intervention Model

Intervention should be first-class, not exceptional.

Required review surfaces:

### After planning
The operator should be able to inspect:
- goals/non-goals
- identified modules/files
- open questions
- proposed design shape

### Before staging
The operator should be able to inspect and edit:
- task titles
- task sizes
- review levels
- dependencies
- file scopes
- verification steps

The planner should support merging, splitting, or rewriting tasks before they
become Taskplane packets.

---

## Suggested Command Surface

Names are provisional.

- `/tp-plan <idea>`
  - create or update planner artifacts from ambiguous intent
- `/tp-research <change>`
  - refresh or deepen research
- `/tp-critique <change>`
  - run critique and update `REVIEW.md`
- `/tp-stage <change>`
  - compile planner tasks into Taskplane packets
- `/tp-sync <change>`
  - read Taskplane state and update planner mappings
- `/tp-archive <change>`
  - mark planner change complete and write summary/archive notes

A tighter prefix can be chosen later, but the functional shape matters more than
exact names.

---

## MVP Scope

## Phase 1 — Planner docs + manual staging assist
- create planner change folder
- draft `CHANGE.md`, `RESEARCH.md`, `PLAN.md`, `TASKS.md`
- lightweight critique
- generate a staging preview

## Phase 2 — Taskplane packet compiler
- write `PROMPT.md` / `STATUS.md`
- enforce Taskplane-native structure
- record mappings

## Phase 3 — Validation / doctor
- detect malformed or low-quality planner tasks
- detect dependency/file-scope issues

## Phase 4 — Sync and archive
- reflect Taskplane completion state back into planner metadata
- optional durable archive/spec updates

---

## Success Criteria

The planner is successful if it can reliably:

1. start from an ambiguous prompt
2. produce repo-aware, research-backed planning artifacts
3. decompose work into realistic M-sized execution tasks
4. emit Taskplane-native task packets without manual rewriting
5. preserve a clean boundary between planning truth and execution truth
6. keep the operator in control at planning and staging gates

---

## Recommendation

Proceed with a **Taskplane Planner** design that is:

- **OpenSpec-inspired**, not OpenSpec-bound
- **Taskplane-native** at the output boundary
- **file-driven and human-steerable**
- **typed and validated** where it helps
- **small-team practical**, not ceremony-heavy

The guiding principle is:

> **Use the OpenSpec-style process to create better Taskplane tasks.**

Not:

> **Force Taskplane to become OpenSpec, or force OpenSpec to become the executor.**
