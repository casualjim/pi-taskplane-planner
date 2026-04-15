## 1. OpenSpec-to-Taskplane compilation

- [x] 1.1 Implement `planner stage` to compile approved OpenSpec contracts into Taskplane packets
- [x] 1.2 Accept standard OpenSpec output (proposal, design, specs, tasks) without requiring planner-only headings
- [x] 1.3 Generate coarse-grained end-to-end implementation packets that fold tests, docs, and repo gates into the same step
- [x] 1.4 Generate the terminal conformance Taskplane packet with findings disposition rules and report output

## 2. Validation and guardrails

- [x] 2.1 Implement staging validation that blocks when open questions remain in the design
- [x] 2.2 Block staging when forbidden speculative phrasing is present in the design
- [x] 2.3 Require at least one delta spec before staging

## 3. Conformance and archive

- [x] 3.1 Implement the conformance report model and findings disposition logic
- [x] 3.2 Implement `planner archive` to sync passing delta specs into cumulative truth and archive the change
- [x] 3.3 Implement `planner reopen` for contract defects discovered during conformance

## 4. Extension and CLI surface

- [x] 4.1 Register `/plan-stage`, `/plan-archive`, `/plan-reopen` as pi extension commands
- [x] 4.2 Expose `planner status`, `planner stage`, `planner archive`, `planner reopen` as CLI commands

## 5. Testing

- [x] 5.1 Unit tests for packet generation, validation, conformance, and archive
- [x] 5.2 CLI end-to-end tests for the stage → archive → reopen cycle
- [x] 5.3 Standard OpenSpec acceptance test proving `/opsx:propose`-style artifacts stage without planner-only headings
- [x] 5.4 Opt-in Taskplane runtime E2E smoke test
