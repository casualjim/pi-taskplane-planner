## Context

Taskplane is the execution/runtime system. OpenSpec is the planning system.
This package bridges the two by compiling approved OpenSpec change contracts
into Taskplane packets and managing post-execution conformance and archival.

## Goals / Non-Goals

**Goals:**
- Compile approved OpenSpec contracts directly into Taskplane packets.
- Validate that an OpenSpec change is stage-ready (resolved questions, specs
  exist, no speculative phrasing).
- Generate coarse-grained end-to-end packets that fold tests, docs, and repo
  gates into the same step.
- Run whole-change conformance as a terminal Taskplane task.
- Archive verified delta specs into cumulative truth.
- Keep the package as thin glue — no planning, no execution.

**Non-Goals:**
- Duplicate OpenSpec planning commands (explore, propose, verify, sync).
- Duplicate Taskplane execution commands (orch, review, merge).
- Require a planner-specific artifact format — accept standard OpenSpec output.
- Treat `tasks.md` as a canonical execution source of truth.

## Decisions

### 1. OpenSpec is the planning system, not this package
OpenSpec handles exploration, proposal, design, and spec generation. This
package reads the approved OpenSpec artifacts and compiles them. It does not
re-implement any planning behavior.

### 2. Taskplane packets are the canonical execution artifacts
Approved contracts compile into Taskplane `PROMPT.md` and `STATUS.md`. If a
`tasks.md` exists, it is sequencing context only — not a canonical execution
source.

### 3. Packet generation accepts standard OpenSpec output
The compiler falls back gracefully when planner-only headings (e.g.,
`Requested Delta`, `Preservation Constraints`, `Proof Obligations`) are absent.
It derives file scope, edit targets, test requirements, and docs from standard
OpenSpec sections (`What Changes`, `Impact`, `Decisions`, `Goals / Non-Goals`,
spec scenarios, `tasks.md` checklist items).

### 4. Packets use coarse-grained end-to-end steps
Implementation packets should have as few steps as practical. Tests,
documentation, and repo gates are folded into the end-to-end capability step
instead of becoming separate medium-sized steps. This keeps Taskplane runtime
fast.

### 5. Conformance is a terminal Taskplane task
A single Taskplane task verifies the assembled implementation against the
approved contract and writes the conformance report. It does not implement
fixes directly.

### 6. Findings use a strict disposition model
- `LOG_ONLY` — non-blocking suggestion
- `INLINE_REVISE` — fix in place
- `REMEDIATION_TASK` — fix within contract
- `REOPEN_PLANNING` — contract change required
- `ESCALATE_HUMAN` — human decision needed
- `ARCHIVE_READY` — no blocking findings

### 7. Quality may not regress to achieve green
Tests, adversarial cases, docs, examples, and verification gates must be
preserved or improved, never silently weakened.

### 8. Archive promotes only verified truth
Delta specs sync into cumulative specs only after conformance passes with no
blocking findings.

## Command Surface

Pi extension commands (thin orchestration glue):
- `/plan-stage <change>` — validate and compile into Taskplane packets
- `/plan-archive <change>` — promote passing delta specs and archive
- `/plan-reopen <change>` — reopen after a contract defect

CLI (status and packet operations):
- `planner status [change]` — inspect staging and conformance state
- `planner stage <change>` — compile into Taskplane packets
- `planner archive <change>` — archive a verified change
- `planner reopen <change> [reason]` — reopen after a contract defect

## Artifact Paths

OpenSpec owns the change contract:
- `openspec/changes/<change-slug>/proposal.md`
- `openspec/changes/<change-slug>/design.md`
- `openspec/changes/<change-slug>/specs/<capability>/spec.md`
- `openspec/changes/<change-slug>/conformance.md` (written by conformance task)
- `openspec/changes/<change-slug>/tasks.md` (optional sequencing context)

Cumulative truth:
- `openspec/specs/<capability>/spec.md`

Archive:
- `openspec/changes/archive/YYYY-MM-DD-<change-slug>/`

Taskplane packets remain under `taskplane-tasks/`.

## Generated Implementation Packet

Required sections:
- task header metadata (task ID, change slug, size `L`, review level)
- `## Mission`
- `## Contract References`
- `## Dependencies`
- `## Context to Read First`
- `## Environment`
- `## File Scope`
- `## Exact Edit Targets`
- `## Public Interface Delta`
- `## Preservation Constraints`
- `## Steps` (coarse-grained: preflight + end-to-end capability slice)
- `## Testing & Verification`
- `## Documentation Requirements`
- `## Completion Criteria`
- `## Git Commit Convention`
- `## Do NOT`
- `## Amendments`

Rules:
- No speculative wording (`likely`, `probably`, `maybe`, `if needed`).
- Reference the approved proposal/design/spec.
- Bias toward a small number of large end-to-end steps.
- Fold tests, docs, and repo gates into the implementation step.

## Generated Conformance Packet

Required sections:
- task header metadata
- `## Mission`
- `## Contract References`
- `## Dependencies`
- `## Context to Read First`
- `## Environment`
- `## File Scope`
- `## Findings Disposition Rules`
- `## Steps` (coarse-grained: load contract + verify whole change)
- `## Report Output`
- `## Completion Criteria`
- `## Git Commit Convention`
- `## Do NOT`
- `## Amendments`

Rules:
- Verify the assembled change against the approved contract.
- Do not implement fixes directly.
- Write `openspec/changes/<change-slug>/conformance.md`.
- Use the approved disposition model.

## Risks / Trade-offs

- **Higher upfront planning cost** → Mitigation: keep the canonical artifact set
  minimal and generate as much content as possible from guided research.
- **Overly rigid plans could waste time** → Mitigation: require closure on
  architectural decisions while allowing workers local expression choices.
- **Duplicate truth between planning and execution** → Mitigation: OpenSpec
  artifacts are planning truth; Taskplane packets are execution truth.
- **Verify loops could thrash** → Mitigation: strict disposition model and
  escalation to replanning.

## Open Questions

None.
