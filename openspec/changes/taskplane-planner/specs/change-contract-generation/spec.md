## ADDED Requirements

### Requirement: Planner bridges OpenSpec planning and Taskplane execution
The system SHALL compile approved OpenSpec change contracts into Taskplane
execution packets without duplicating OpenSpec planning or Taskplane execution
commands.

#### Scenario: Standard OpenSpec artifacts are accepted for staging
- **WHEN** a change is created via `/opsx:propose` with standard proposal,
  design, specs, and tasks artifacts
- **THEN** the planner stages it without requiring planner-specific sections or
  formats

#### Scenario: Planning is not duplicated
- **WHEN** a user needs to explore, propose, or update a change contract
- **THEN** they use OpenSpec commands (`/opsx:explore`, `/opsx:propose`) rather
  than planner commands

#### Scenario: Execution is not duplicated
- **WHEN** a user needs to run, review, or merge Taskplane tasks
- **THEN** they use Taskplane commands (`/orch`) rather than planner commands

### Requirement: Staging refuses unresolved questions
The system MUST refuse to stage Taskplane execution packets while
execution-relevant open questions remain in the design.

#### Scenario: Unresolved open questions block staging
- **WHEN** the design contains open questions that are not explicitly resolved
- **THEN** the system does not emit Taskplane packets and keeps the change in
  planning

#### Scenario: Forbidden speculative phrasing blocks staging
- **WHEN** the design contains speculative phrasing such as "likely", "probably",
  "maybe", "if needed", or "tbd"
- **THEN** staging is blocked until the phrasing is resolved
