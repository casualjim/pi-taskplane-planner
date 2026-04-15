## Why

Taskplane assumes input work is already scoped tightly enough that workers will
not improvise architecture, interfaces, or QA trade-offs. OpenSpec handles the
planning side (exploration, proposal, design, specs). Taskplane handles the
execution side (worker orchestration, review, merge). The gap between them is a
compilation and conformance layer that this package fills.

## What Changes

- Compile approved OpenSpec change contracts directly into Taskplane packets
  (`PROMPT.md`/`STATUS.md`).
- Validate that an OpenSpec change is ready for staging (resolved open
  questions, at least one delta spec, no speculative phrasing).
- Generate coarse-grained end-to-end Taskplane packets that fold tests,
  documentation, and repo gates into the same implementation step.
- Add a terminal Taskplane conformance task that verifies the assembled
  implementation against the approved contract and writes a conformance report.
- Archive verified delta specs into cumulative captured truth after conformance
  passes.
- Provide thin pi extension commands (`/plan-stage`, `/plan-archive`,
  `/plan-reopen`) and a CLI (`planner status`, `planner stage`, `planner archive`,
  `planner reopen`) as glue between OpenSpec and Taskplane.

## Capabilities

### New Capabilities
- `taskplane-packet-generation`: Compile approved OpenSpec contracts into
  Taskplane-native execution packets with contract references, exact edit
  targets, preservation constraints, proof obligations, and coarse-grained
  end-to-end steps.
- `change-conformance-archive`: Run whole-change conformance as a terminal
  Taskplane task, classify findings into revision/remediation/replanning, and
  archive passing delta specs into cumulative truth.

### Modified Capabilities
- None.

## Impact

- Adds a compilation and conformance layer between OpenSpec and Taskplane.
- Does not duplicate OpenSpec planning commands (`/opsx:explore`, `/opsx:propose`).
- Does not duplicate Taskplane execution commands (`/orch`).
- Requires Taskplane packet content to carry contract references, preservation
  constraints, proof obligations, and do-not guardrails.
- Introduces a conformance report and archive flow that promote approved delta
  specs into cumulative captured specs only after verified execution.
