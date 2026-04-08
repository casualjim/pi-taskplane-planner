## ADDED Requirements

### Requirement: Every change uses planner-first contract generation
The system SHALL require a planner pass for every change before any Taskplane
execution packets are staged.

#### Scenario: Small change still uses the planner
- **WHEN** a user requests a small multi-file or spec-affecting change
- **THEN** the system creates or updates proposal, design, and delta specs
  before emitting any Taskplane packets

#### Scenario: Raw intent is not executed directly
- **WHEN** a user describes a change in natural language
- **THEN** the system treats that description as planning input rather than as a
  directly executable task

### Requirement: Proposal and design capture the durable lessons of research
The system SHALL use repo research, external research, and user interview to
produce proposal and design artifacts that capture the approved change contract.

#### Scenario: Research is reflected in proposal and design
- **WHEN** exploration discovers relevant modules, constraints, risks, or
  interface implications
- **THEN** those lessons appear in the resulting proposal and design rather than
  remaining only in transient reasoning

#### Scenario: Proposal captures why and scope
- **WHEN** the planner produces a proposal
- **THEN** the proposal states motivation, scope, non-goals, impacts, and the
  capabilities whose behavior is changing

#### Scenario: Design captures how and what must remain true
- **WHEN** the planner produces a design
- **THEN** the design states chosen approach, interface deltas, preservation
  constraints, and proof obligations for the change

### Requirement: Planner operation is self-contained after bootstrap
The system SHALL own its planning prompts, artifact generation behavior,
verification logic, and staging behavior without requiring OpenSpec to be
installed or the OpenSpec skills to remain available at runtime.

#### Scenario: Planner runs without OpenSpec installed
- **WHEN** the planner is used in its intended steady state
- **THEN** users can generate proposal, design, delta specs, and Taskplane
  packets without installing OpenSpec

#### Scenario: Borrowed planning behavior evolves locally
- **WHEN** the planner's prompts, review rules, or archive behavior need to
  evolve
- **THEN** those changes are made in this plugin's own assets rather than by
  depending on external OpenSpec skill files

### Requirement: Planner uses a planner-native artifact namespace
The system SHALL store active planning contracts, conformance reports, archived
changes, and cumulative specs under planner-native paths rather than requiring
an OpenSpec-managed filesystem layout at runtime.

#### Scenario: Active change artifacts live under planning changes
- **WHEN** a new planner change is created in steady-state operation
- **THEN** its proposal, design, conformance report, and delta specs live under
  `planning/changes/<change-slug>/`

#### Scenario: Cumulative truth lives under planning specs
- **WHEN** a change is archived after passing conformance
- **THEN** its captured cumulative requirements live under
  `planning/specs/<capability>/spec.md`

### Requirement: Planner provides a thin bootstrap and maintenance CLI
The system SHALL provide an explicit CLI for project bootstrap and planner
health operations without moving everyday planning workflow out of pi.

#### Scenario: Init seeds planner-native project structure
- **WHEN** a repository enables the planner
- **THEN** `planner init` creates the planner-native directories and required
  local scaffolding for active changes, cumulative specs, and archived changes

#### Scenario: Doctor validates planner health
- **WHEN** planner structure or scaffolding may be missing or stale
- **THEN** `planner doctor` reports the issue and repairs safe problems when
  possible

#### Scenario: Day-to-day work remains in planner commands
- **WHEN** a user is exploring, proposing, staging, or archiving a change
- **THEN** they use planner commands in pi rather than a CLI-first workflow

### Requirement: Proposal and design use explicit section contracts
The system SHALL generate proposal and design artifacts using fixed required
sections so change intent, boundaries, preservation constraints, and closure
status are durable across sessions.

#### Scenario: Proposal includes required change-boundary sections
- **WHEN** the planner generates or updates a proposal
- **THEN** it includes sections for why, change summary, scope boundaries, spec
  impact, interface/operator impact, and risks or constraints

#### Scenario: Design includes closure and proof sections
- **WHEN** the planner generates or updates a design
- **THEN** it includes sections for requested delta, preservation constraints,
  public interface deltas, proof obligations, and closure status

### Requirement: Staging refuses unresolved blockers and known unknowns
The system MUST refuse to stage Taskplane execution packets while
execution-relevant blockers, known unknowns, or unresolved design choices
remain.

#### Scenario: Unresolved public interface question blocks staging
- **WHEN** a change still has an undecided exported interface or caller contract
- **THEN** the system does not emit Taskplane packets and instead keeps the
  change in planning

#### Scenario: Unresolved failure behavior blocks staging
- **WHEN** the design does not define required failure or fallback behavior for a
  relevant scenario
- **THEN** the system refuses staging until the design and specs are explicit
