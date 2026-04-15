import path from "node:path";

export const OPENSPEC_ROOT = "openspec";
export const OPENSPEC_CHANGES_DIR = `${OPENSPEC_ROOT}/changes`;
export const OPENSPEC_SPECS_DIR = `${OPENSPEC_ROOT}/specs`;
export const OPENSPEC_ARCHIVE_DIR = `${OPENSPEC_ROOT}/changes/archive`;

export const DEFAULT_TASK_ROOT = "taskplane-tasks";
export const DEFAULT_TASK_PREFIX = "TP";
export const DEFAULT_TASK_CONTEXT = `${DEFAULT_TASK_ROOT}/CONTEXT.md`;
export const IMPLEMENTATION_PHASE_CONTEXT_FILE = "PHASE-IMPLEMENTATION.md";
export const CONFORMANCE_PHASE_CONTEXT_FILE = "PHASE-CONFORMANCE.md";

export const CONFORMANCE_VERDICTS = [
  "LOG_ONLY",
  "INLINE_REVISE",
  "REMEDIATION_TASK",
  "REOPEN_PLANNING",
  "ESCALATE_HUMAN",
  "ARCHIVE_READY",
  "PENDING",
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
