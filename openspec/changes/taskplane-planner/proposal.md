## Why

This project needs a planning layer that can take an ambiguous change request,
interview the user, research the repo and outside constraints, close all
execution-relevant ambiguity, and then hand Taskplane an execution-grade task
set. Today Taskplane is the right executor, but it assumes the input work is
already scoped tightly enough that workers will not improvise architecture,
interfaces, or QA trade-offs.

The goal is to front-load strict planning so that implementation and final
review become largely conformance work rather than rediscovery.

## What Changes

- Add a mandatory planner phase for **every** change, including small changes,
  so raw user intent never flows directly into Taskplane execution.
- Fork the useful OpenSpec explore/propose/verify/archive prompt and process
  ideas into planner-owned behavior so the finished plugin does not require
  OpenSpec to be installed or available at runtime.
- Produce a canonical planning contract consisting of **proposal**, **design**,
  and **delta specs**. These documents become the approved pre-execution truth.
- Provide a thin planner CLI for bootstrap and maintenance tasks such as
  seeding planner directories and validating/repairing project scaffolding,
  while keeping normal day-to-day use in planner commands inside pi.
- Compile approved change contracts directly into Taskplane packets
  (`PROMPT.md`/`STATUS.md`) instead of relying on a canonical `tasks.md`
  execution artifact.
- Treat Taskplane task reviews as task-local verification and add a terminal
  change-level conformance task that verifies the assembled implementation
  against the approved proposal, design, and delta specs.
- Archive successful delta specs into cumulative captured specs only after the
  conformance task passes.
- Enforce strict preservation and proof rules: tests, adversarial coverage,
  docs, examples, lint, compile, and test gates must not regress.

## Capabilities

### New Capabilities
- `change-contract-generation`: Create proposal, design, and delta specs from
  research, repo inspection, external research, and user interview before any
  implementation staging occurs.
- `taskplane-packet-generation`: Compile approved contracts directly into
  Taskplane-native execution packets with explicit review, verification,
  documentation, and guardrail criteria.
- `change-conformance-archive`: Run whole-change conformance as a terminal
  Taskplane task, classify findings into revision/remediation/replanning, and
  archive passing delta specs into cumulative truth.

### Modified Capabilities
- None.

## Impact

- Adds a planner workflow in front of Taskplane execution.
- Uses the existing OpenSpec skills in `.pi/skills/` only as bootstrap source
  material, then forks the relevant prompt/process logic into planner-owned
  assets so the finished plugin has no OpenSpec prerequisite.
- Requires planner-side generation of proposal/design/spec artifacts and a
  compiler that emits high-quality Taskplane packets.
- Requires a small project bootstrap/maintenance CLI to seed planner-native
  directories and keep planner scaffolding healthy without depending on
  OpenSpec.
- Requires Taskplane packet content and reviewer/worker guidance to carry
  stricter contract, preservation, and proof criteria.
- Introduces a conformance report and archive flow that promote approved delta
  specs into cumulative captured specs only after verified execution.
