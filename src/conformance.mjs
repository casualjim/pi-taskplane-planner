export const CONFORMANCE_DISPOSITIONS = [
  "LOG_ONLY",
  "INLINE_REVISE",
  "REMEDIATION_TASK",
  "REOPEN_PLANNING",
  "ESCALATE_HUMAN",
  "ARCHIVE_READY",
  "PENDING",
];

const BLOCKING_DISPOSITIONS = new Set([
  "INLINE_REVISE",
  "REMEDIATION_TASK",
  "REOPEN_PLANNING",
  "ESCALATE_HUMAN",
]);

export function createConformanceReportTemplate(changeSlug) {
  return `# Conformance Report: ${changeSlug}

**Status:** Complete
**Verdict:** ARCHIVE_READY

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

- <!-- file.ts:123 -->

## Disposition

- ARCHIVE_READY
`;
}

export function normalizeDisposition(value) {
  const normalized = value?.trim().toUpperCase();
  if (!CONFORMANCE_DISPOSITIONS.includes(normalized)) {
    throw new Error(`Unknown conformance disposition: ${value}`);
  }
  return normalized;
}

export function isBlockingDisposition(value) {
  return BLOCKING_DISPOSITIONS.has(normalizeDisposition(value));
}

export function createFinding({ title, severity = "WARNING", disposition, evidence = [], recommendation = "" }) {
  return {
    title,
    severity,
    disposition: normalizeDisposition(disposition),
    evidence,
    recommendation,
    blocking: isBlockingDisposition(disposition),
  };
}

export function summarizeFindings(findings = []) {
  const normalized = findings.map((finding) => normalizeDisposition(finding.disposition));
  if (normalized.includes("REOPEN_PLANNING")) return "REOPEN_PLANNING";
  if (normalized.includes("ESCALATE_HUMAN")) return "ESCALATE_HUMAN";
  if (normalized.includes("REMEDIATION_TASK")) return "REMEDIATION_TASK";
  if (normalized.includes("INLINE_REVISE")) return "INLINE_REVISE";
  if (normalized.every((value) => value === "LOG_ONLY")) return "ARCHIVE_READY";
  return normalized.includes("ARCHIVE_READY") ? "ARCHIVE_READY" : "PENDING";
}

export function parseConformanceVerdict(markdown) {
  const match = markdown.match(/\*\*Verdict:\*\*\s*([A-Z_]+)/);
  if (!match) return { ok: false, verdict: null, reason: "Missing **Verdict:** line" };
  const verdict = match[1].trim();
  if (!CONFORMANCE_DISPOSITIONS.includes(verdict)) {
    return { ok: false, verdict, reason: `Unknown conformance verdict: ${verdict}` };
  }
  return { ok: verdict === "ARCHIVE_READY", verdict, reason: verdict === "ARCHIVE_READY" ? null : `Verdict is ${verdict}` };
}
