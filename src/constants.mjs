export const PLANNING_ROOT = "planning";
export const CHANGES_DIR = `${PLANNING_ROOT}/changes`;
export const SPECS_DIR = `${PLANNING_ROOT}/specs`;
export const ARCHIVE_DIR = `${PLANNING_ROOT}/archive`;

export const DEFAULT_TASK_ROOT = "taskplane-tasks";
export const DEFAULT_TASK_PREFIX = "TP";
export const DEFAULT_TASK_CONTEXT = `${DEFAULT_TASK_ROOT}/CONTEXT.md`;
export const IMPLEMENTATION_PHASE_CONTEXT_FILE = "PHASE-IMPLEMENTATION.md";
export const CONFORMANCE_PHASE_CONTEXT_FILE = "PHASE-CONFORMANCE.md";

export const REQUIRED_PROPOSAL_SECTIONS = [
  "Why",
  "Change Summary",
  "Scope Boundaries",
  "Spec Impact",
  "User / Operator / Interface Impact",
  "Risks / Constraints",
];

export const REQUIRED_PROPOSAL_SUBSECTIONS = {
  "Scope Boundaries": ["In Scope", "Out of Scope"],
  "Spec Impact": ["New Capabilities", "Modified Capabilities"],
};

export const REQUIRED_DESIGN_SECTIONS = [
  "Context",
  "Goals / Non-Goals",
  "Key Decisions",
  "Requested Delta",
  "Preservation Constraints",
  "Public Interface Deltas",
  "Module Ownership and Edit Surface",
  "Behavioral Semantics",
  "Failure / Edge Case Semantics",
  "Proof Obligations",
  "Risks / Trade-offs",
  "Closure Status",
];

export const REQUIRED_DESIGN_SUBSECTIONS = {
  "Proof Obligations": [
    "Acceptance",
    "Non-Regression",
    "Required Tests",
    "Documentation and Examples",
    "Repo Gates",
  ],
};

export const REQUIRED_CLOSURE_STATUS = [
  "Blockers",
  "Known Unknowns",
  "Deferred Design Choices",
];

export const FORBIDDEN_STAGE_PHRASES = [
  "likely",
  "probably",
  "maybe",
  "perhaps",
  "possibly",
  "if needed",
  "as needed",
  "where appropriate",
  "use judgment",
  "update accordingly",
  "handle gracefully",
  "tbd",
  "todo",
  "fixme",
];

export const CONFORMANCE_VERDICTS = [
  "LOG_ONLY",
  "INLINE_REVISE",
  "REMEDIATION_TASK",
  "REOPEN_PLANNING",
  "ESCALATE_HUMAN",
  "ARCHIVE_READY",
  "PENDING",
];
