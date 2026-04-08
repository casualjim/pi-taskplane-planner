## ADDED Requirements

### Requirement: Approved contracts compile directly to Taskplane packets
The system SHALL compile approved proposal, design, and delta specs directly
into Taskplane execution packets.

#### Scenario: Canonical execution artifact is a Taskplane packet
- **WHEN** a change is approved for execution
- **THEN** the system emits Taskplane `PROMPT.md` and `STATUS.md` packets as the
  canonical execution artifacts

#### Scenario: Planning tasks do not replace Taskplane packets
- **WHEN** the planner renders a staging preview or task summary
- **THEN** that preview does not become the canonical execution source of truth

### Requirement: Generated packets carry explicit execution criteria
The system SHALL generate Taskplane packets that leave no execution-relevant
ambiguity about what must change, what must remain true, and how success is
proven.

#### Scenario: Task specifies exact execution targets and proof
- **WHEN** a packet is generated for an implementation task
- **THEN** it identifies the intended files or code regions to change,
  acceptance criteria, required tests, documentation/example updates, and
  verification commands

#### Scenario: Task forbids speculative wording
- **WHEN** a packet is generated
- **THEN** its execution steps and completion criteria avoid hypothetical or
  discretionary wording that would force the worker to invent design intent

#### Scenario: Task states interface impact explicitly
- **WHEN** a packet affects a public or cross-module interface
- **THEN** the packet states the approved interface delta explicitly
- **AND** when no such change exists, the packet states that no public interface
  change is permitted

### Requirement: Generated packets follow an explicit packet contract
The system SHALL generate implementation and conformance Taskplane packets with
fixed required sections so execution and verification remain durable across
sessions.

#### Scenario: Implementation packet includes contract and proof sections
- **WHEN** the planner emits an implementation packet
- **THEN** that packet includes contract references, exact edit targets,
  preservation constraints, testing and verification requirements,
  documentation/example obligations, completion criteria, and explicit do-not
  guardrails

#### Scenario: Conformance packet includes report and disposition sections
- **WHEN** the planner emits the terminal conformance packet
- **THEN** that packet includes evaluation scope, findings disposition rules,
  report output requirements, and explicit prohibitions against directly
  implementing fixes

### Requirement: Generated packets preserve review and merge safety
The system SHALL generate Taskplane packets with enough metadata to support
Taskplane review behavior, dependency ordering, and file-scope-safe execution.

#### Scenario: Dependency and file-scope metadata are present
- **WHEN** the planner emits multiple packets for the same change
- **THEN** each packet includes explicit dependencies and file scope suitable
  for Taskplane scheduling and lane affinity

#### Scenario: Review criteria are delivered through Taskplane mechanisms
- **WHEN** a packet requires plan, code, or test scrutiny
- **THEN** it sets an appropriate Taskplane review level and includes the review
  criteria in packet content and reviewer guidance
