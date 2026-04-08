## 1. Planner foundations

- [x] 1.1 Define the planner-native filesystem layout, shared path helpers, and local scaffold model for `planning/changes`, `planning/specs`, and `planning/archive`
- [x] 1.2 Implement `planner init` so it seeds planner directories and required local scaffolding without depending on OpenSpec
- [x] 1.3 Implement `planner doctor` so it validates planner structure and repairs safe scaffold issues

## 2. Contract generation workflow

- [x] 2.1 Fork the useful OpenSpec explore/propose/verify/archive prompt and process content into planner-owned assets inside this project
- [x] 2.2 Implement proposal, design, and delta-spec template generation under `planning/changes/<change-slug>/`
- [x] 2.3 Implement planner command support for `/plan-explore`, `/plan-propose`, and `/plan-status` around the planner-native artifacts and closure rules

## 3. Taskplane staging compiler

- [x] 3.1 Implement contract validation that enforces required proposal/design/spec sections and blocks staging when blockers, known unknowns, or deferred design choices remain
- [x] 3.2 Implement `/plan-stage` so it compiles approved contracts into implementation Taskplane packets with contract references, exact edit targets, preservation constraints, proof obligations, and review metadata
- [x] 3.3 Implement generation of the terminal conformance Taskplane packet with evaluation scope, findings disposition rules, and `conformance.md` output requirements

## 4. Verify, archive, and repair loops

- [x] 4.1 Implement the conformance report model and findings disposition logic for `LOG_ONLY`, `INLINE_REVISE`, `REMEDIATION_TASK`, `REOPEN_PLANNING`, `ESCALATE_HUMAN`, and `ARCHIVE_READY`
- [x] 4.2 Implement `/plan-archive` so it syncs passing delta specs into `planning/specs/**` and moves completed changes into `planning/archive/YYYY-MM-DD-<change-slug>/`
- [x] 4.3 Implement `/plan-reopen` handling for contract defects discovered during conformance or remediation loops

## 5. Integration hardening

- [x] 5.1 Add automated tests for `planner init`, `planner doctor`, planner artifact generation, and staging validation
- [x] 5.2 Add automated tests for Taskplane packet generation, conformance disposition handling, and archive sync behavior
- [x] 5.3 Update repository documentation and examples to reflect planner-native commands, artifact paths, and Taskplane integration
- [x] 5.4 Add CLI end-to-end integration tests covering `planner init` → `planner doctor` → `planner scaffold-change` → `planner status` → `planner stage` → `planner archive` and `planner reopen`
- [x] 5.5 Add an opt-in Taskplane runtime smoke test that stages a planner-generated implementation packet, executes it through Taskplane, integrates the orch branch, and archives after deterministic conformance checks
