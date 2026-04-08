export function proposalTemplate(changeSlug) {
  return `## Why

<!-- Explain the motivation for ${changeSlug}. Why now? -->

## Change Summary

<!-- Describe the concrete delta in plain language. -->

## Scope Boundaries

### In Scope

- <!-- Explicitly list what this change will do -->

### Out of Scope

- <!-- Explicitly list tempting adjacent work that is not part of this change -->

## Spec Impact

### New Capabilities

- \`<capability-name>\`: <!-- brief description -->

### Modified Capabilities

- None.

## User / Operator / Interface Impact

<!-- Describe user-visible changes, operator workflow changes, interface changes, or explicitly state none. -->

## Risks / Constraints

- <!-- Record only material risks or constraints -->
`;
}

export function designTemplate(changeSlug) {
  return `## Context

<!-- Current system shape, relevant modules, constraints, and external context for ${changeSlug}. -->

## Goals / Non-Goals

**Goals:**
- <!-- What this design achieves -->

**Non-Goals:**
- <!-- What this design explicitly excludes -->

## Key Decisions

### Decision: <!-- title -->
- **Chosen option:** <!-- exact approach -->
- **Why:** <!-- rationale -->
- **Rejected alternatives:** <!-- alternatives considered -->

## Requested Delta

<!-- Exactly what changes in the system after this work ships. -->

## Preservation Constraints

- <!-- What must remain true: interfaces, architecture, behavior, data, operator flow, QA -->

## Public Interface Deltas

<!-- Describe the approved interface delta, or explicitly state that no public/cross-module interface changes are allowed. -->

## Module Ownership and Edit Surface

- \`path/to/file\` — <!-- owning symbol, section, or reason this path changes -->

## Behavioral Semantics

<!-- Normal behavior, state flow, precedence rules, and invariants. -->

## Failure / Edge Case Semantics

<!-- Exact handling for invalid input, missing data, retries, fallbacks, partial failure, and boundaries. -->

## Proof Obligations

### Acceptance

- <!-- What new or changed behavior must be true -->

### Non-Regression

- <!-- What must remain true and not degrade -->

### Required Tests

- <!-- Required targeted, adversarial, regression, or integration tests -->

### Documentation and Examples

- <!-- Docs and examples that must update -->

### Repo Gates

- \`npm test\`
- \`npm run build\`

## Risks / Trade-offs

- <!-- Material trade-offs and mitigations -->

## Closure Status

- Blockers: TBD
- Known Unknowns: TBD
- Deferred Design Choices: TBD
`;
}

export function conformanceTemplate(changeSlug) {
  return `# Conformance Report: ${changeSlug}

**Status:** Draft
**Verdict:** PENDING

## Summary

<!-- Summarize delta conformance, preservation conformance, and proof conformance. -->

## Findings

### CRITICAL

- None.

### WARNING

- None.

### SUGGESTION

- None.

## Evidence

- <!-- Reference files, tests, and report artifacts -->

## Disposition

- <!-- Use LOG_ONLY, INLINE_REVISE, REMEDIATION_TASK, REOPEN_PLANNING, ESCALATE_HUMAN, or ARCHIVE_READY -->
`;
}

export function deltaSpecTemplate(capabilityName = "<capability-name>") {
  return `## ADDED Requirements

### Requirement: ${capabilityName}
The system SHALL <!-- normative requirement -->.

#### Scenario: Successful path
- **WHEN** <!-- condition -->
- **THEN** <!-- expected outcome -->
`;
}
