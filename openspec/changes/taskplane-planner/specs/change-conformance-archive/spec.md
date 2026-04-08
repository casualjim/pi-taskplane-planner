## ADDED Requirements

### Requirement: Whole-change conformance runs as a terminal Taskplane task
The system SHALL run whole-change conformance as a terminal Taskplane task after
implementation tasks finish.

#### Scenario: Verify waits for implementation completion
- **WHEN** a change has multiple implementation packets
- **THEN** the conformance packet depends on all required implementation packets
  completing first

#### Scenario: Verify produces a conformance report
- **WHEN** the conformance packet runs
- **THEN** it evaluates the assembled implementation against the approved
  proposal, design, and delta specs
- **AND** it writes a conformance report recording pass/fail findings and their
  evidence

### Requirement: Conformance findings follow a strict disposition model
The system SHALL classify review and verify findings into explicit dispositions
that preserve the contract boundary.

#### Scenario: In-contract defect becomes remediation work
- **WHEN** conformance finds an implementation or integration defect that can be
  fixed within the approved contract
- **THEN** the system generates remediation Taskplane work with the same or
  stricter guardrails

#### Scenario: Contract defect reopens planning
- **WHEN** conformance finds a defect whose resolution would change approved
  intent, interface semantics, preservation constraints, or proof obligations
- **THEN** the system reopens planning instead of generating direct code-fix
  tasks

#### Scenario: Non-blocking suggestion does not create blocking work
- **WHEN** conformance finds a non-blocking improvement suggestion
- **THEN** the system records it without treating it as required remediation

### Requirement: Proof strength may not regress
The system MUST preserve or improve proof strength across implementation,
verification, and archive.

#### Scenario: Tests cannot be weakened to obtain a pass
- **WHEN** a change updates tests or verification artifacts
- **THEN** it does not lower adversarial coverage or weaken assertions merely to
  make the implementation pass

#### Scenario: Docs and examples remain aligned with the verified system
- **WHEN** a change alters behavior or interfaces
- **THEN** the required docs and examples are updated and included in
  conformance evaluation

### Requirement: Archive promotes only verified truth
The system SHALL promote delta specs into cumulative specs only after
conformance passes.

#### Scenario: Passing change archives into cumulative specs
- **WHEN** the conformance report has no blocking findings
- **THEN** archive sync applies the delta specs into cumulative captured specs

#### Scenario: Failing change cannot update cumulative specs
- **WHEN** blocking conformance findings remain
- **THEN** the system does not archive the delta specs into cumulative truth
