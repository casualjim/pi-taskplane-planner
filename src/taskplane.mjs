import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { createConformanceReportTemplate } from "./conformance.mjs";
import {
  extractBacktickedPaths,
  extractChecklistItems,
  extractLikelyPaths,
  extractRequirementNames,
  extractScenarioNames,
  firstNonEmpty,
  getSection,
  uniqueNonEmpty,
} from "./markdown.mjs";

export function buildImplementationPrompt({
  taskId,
  folderPath,
  changeSlug,
  capabilityName,
  proposalPath,
  designPath,
  tasksPath,
  specPath,
  proposal,
  design,
  tasks,
  spec,
  areaContextPath,
  phaseContextPath,
}) {
  const whatChanges = getSection(proposal, "What Changes", 2);
  const impact = getSection(proposal, "Impact", 2);
  const scopeBoundaries = getSection(proposal, "Scope Boundaries", 2);
  const outOfScope = getSection(scopeBoundaries, "Out of Scope", 3);
  const goalsAndNonGoals = getSection(design, "Goals / Non-Goals", 2);
  const decisions = firstNonEmpty(getSection(design, "Key Decisions", 2), getSection(design, "Decisions", 2));
  const risks = getSection(design, "Risks / Trade-offs", 2);
  const openQuestions = getSection(design, "Open Questions", 2);
  const proof = getSection(design, "Proof Obligations", 2);
  const proposalSummary = firstNonEmpty(getSection(proposal, "Change Summary", 2), whatChanges, `Implement approved change ${changeSlug}.`);
  const requestedDelta = firstNonEmpty(
    getSection(design, "Requested Delta", 2),
    whatChanges,
    formatBulletList(extractChecklistItems(tasks), ""),
    `Implement the approved change contract exactly as written.`,
  );
  const preservation = firstNonEmpty(
    getSection(design, "Preservation Constraints", 2),
    outOfScope,
    goalsAndNonGoals,
    "Stay within the approved proposal, design, and delta spec. If implementation requires a contract change, stop and reopen planning.",
  );
  const interfaceDelta = firstNonEmpty(
    getSection(design, "Public Interface Deltas", 2),
    impact,
    "No explicit public or cross-module interface delta was recorded; preserve existing interfaces unless the approved specs require a change.",
  );
  const editSurface = getSection(design, "Module Ownership and Edit Surface", 2);
  const behavior = firstNonEmpty(
    getSection(design, "Behavioral Semantics", 2),
    decisions,
    formatBulletList(extractRequirementNames(spec).map((name) => `Satisfy requirement: ${name}`), ""),
    "Follow the approved behavior described in the delta spec.",
  );
  const failureSemantics = firstNonEmpty(
    getSection(design, "Failure / Edge Case Semantics", 2),
    risks,
    openQuestions,
    formatBulletList(extractScenarioNames(spec).map((name) => `Cover scenario: ${name}`), ""),
    "Preserve current failure behavior unless the approved contract explicitly changes it.",
  );
  const acceptance = firstNonEmpty(
    getSection(proof, "Acceptance", 3),
    formatBulletList(extractScenarioNames(spec).map((name) => `Scenario passes: ${name}`), ""),
  );
  const nonRegression = firstNonEmpty(
    getSection(proof, "Non-Regression", 3),
    outOfScope,
    "Preserve behavior outside the approved change contract.",
  );
  const requiredTests = firstNonEmpty(
    getSection(proof, "Required Tests", 3),
    formatBulletList(extractScenarioNames(spec).map((name) => `Add or update coverage for scenario: ${name}`), ""),
    "Add or update tests that prove the approved delta spec scenarios.",
  );
  const docsExamples = firstNonEmpty(
    getSection(proof, "Documentation and Examples", 3),
    formatDocExampleFallback(interfaceDelta, impact),
  );
  const repoGates = firstNonEmpty(
    getSection(proof, "Repo Gates", 3),
    "Run the repository's standard validation commands that cover the touched files before finishing.",
  );
  const requirements = extractRequirementNames(spec);
  const fileScope = inferFileScope({
    proposalPath,
    designPath,
    tasksPath,
    specPath,
    editSurface,
    interfaceDelta,
    docsExamples,
    impact,
    tasks,
  });
  const exactEditTargets = firstNonEmpty(
    editSurface,
    fileScope.length > 0 ? formatPathList(fileScope) : "",
    formatBulletList(extractChecklistItems(tasks), ""),
    "Infer the smallest edit surface from the approved OpenSpec artifacts before editing. If execution reveals broader scope, record it in STATUS.md before proceeding.",
  );

  return `# Task: ${taskId} — ${changeSlug} / ${capabilityName}

**Created:** ${today()}
**Change:** ${changeSlug}
**Size:** L

## Review Level: 2 (Plan + Code)

**Assessment:** Capability implementation packet generated from the approved change contract.
**Score:** 4/8 — Blast radius: 1, Pattern novelty: 1, Security: 0, Reversibility: 2

## Canonical Task Folder

${renderCanonicalTaskFolder(folderPath)}

## Mission

Implement the approved capability \`${capabilityName}\` for change \`${changeSlug}\`. This task realizes one approved contract slice from the proposal, design, delta spec, and any generated OpenSpec implementation checklist without inventing new behavior or broadening scope.

**Change summary:**
${cleanBlock(proposalSummary)}

**Requested delta for this task:**
${cleanBlock(requestedDelta, "Implement the approved change contract exactly as written.")}

**Capability requirements:**
${formatBulletList(requirements, "- No explicit requirement titles were extracted from the delta spec.")}

**Behavioral semantics:**
${cleanBlock(behavior, "Follow the approved behavior described in the design and spec.")}

**Failure / edge-case semantics:**
${cleanBlock(failureSemantics, "Follow the approved failure and edge-case handling described in the design and spec.")}

## Contract References

- \`${proposalPath}\` — approved change intent, scope, and impact
- \`${designPath}\` — approved design decisions and implementation constraints
${tasksPath ? `- \`${tasksPath}\` — OpenSpec implementation checklist and sequencing context\n` : ""}- \`${specPath}\` — capability requirements and scenarios

## Dependencies

- **None**

## Context to Read First

**Tier 2 (area context):**
- \`${areaContextPath}\`
- \`${phaseContextPath}\` — implementation-phase guidance for planner-compiled packets

**Tier 3 (load only if needed):**
- \`${proposalPath}\` — approved change intent and scope boundaries
- \`${designPath}\` — approved design decisions and constraints
${tasksPath ? `- \`${tasksPath}\` — approved implementation checklist context\n` : ""}- \`${specPath}\` — capability requirements and scenarios

## Environment

- **Workspace:** Project root
- **Services required:** None

## File Scope

${formatFileScope(fileScope)}

## Exact Edit Targets

${cleanBlock(exactEditTargets, "Use the approved module ownership and edit surface from the contract.")}

## Public Interface Delta

${cleanBlock(interfaceDelta, "No public or cross-module interface changes are allowed in this change.")}

## Preservation Constraints

${cleanBlock(preservation, "Preserve the approved interfaces, tests, and operator workflow.")}

## Steps

### Step 0: Preflight

- [ ] Read the contract references and confirm the task remains within the approved change contract
- [ ] Confirm the current code snapshot still matches the approved edit surface before modifying files

### Step 1: Complete the capability slice end to end

- [ ] Apply the requested delta for \`${capabilityName}\` inside the approved edit surface and preserve all stated constraints
- [ ] Finish the slice completely before closing the step: include required code changes, tests, docs/examples, and interface-preservation work together
- [ ] Run targeted validation while iterating, then run the required repo gates and leave the repository in a fully passing state

**Artifacts:**
${formatFileScope(fileScope)}

## Testing & Verification

### Required Tests
${formatBulletBlock(requiredTests, "- No additional targeted tests were specified beyond the approved contract.")}

### Repo Gates
${formatBulletBlock(repoGates, "- No repo gates were listed in the approved contract.")}

## Documentation Requirements

**Must Update:**
${formatBulletBlock(docsExamples, "- None required by the approved contract.")}

**Check If Affected:**
- \`${proposalPath}\` — keep approved change summary aligned if documentation wording or scope evidence changes
- \`${designPath}\` — keep implementation constraints aligned if execution reveals a contract discrepancy
${tasksPath ? `- \`${tasksPath}\` — keep sequencing aligned if implementation evidence shows the checklist was incomplete\n` : ""}

## Completion Criteria

- [ ] All steps complete
- [ ] All tests passing
- [ ] Documentation updated as required by the approved contract

### Acceptance
${formatBulletBlock(acceptance, "- Approved acceptance criteria were not listed explicitly.")}

### Non-Regression
${formatBulletBlock(nonRegression, "- No additional non-regression bullets were listed beyond the approved contract.")}

## Git Commit Convention

- **Step completion:** \`feat(${taskId}): complete Step N — description\`
- **Bug fixes:** \`fix(${taskId}): description\`
- **Tests:** \`test(${taskId}): description\`
- **Hydration:** \`hydrate: ${taskId} expand Step N checkboxes\`

## Do NOT

- Do not broaden this task into an architectural rewrite
- Do not alter public or cross-module interfaces beyond the approved delta
- Do not weaken tests, adversarial coverage, docs, or examples to make the task pass
- Do not split implementation, tests, documentation, and repo gates into separate phases when the slice can be completed end to end
- Do not skip repo gates
- Escalate instead of guessing if the code snapshot no longer matches the approved edit surface

---

## Amendments (Added During Execution)

<!-- Workers add amendments here if execution discovers contradictions in the approved task packet. -->
`;
}

export function buildImplementationStatus({ taskId, changeSlug, capabilityName }) {
  return `# ${taskId}: ${changeSlug} / ${capabilityName} — Status

**Current Step:** Not Started
**Status:** 🔵 Ready for Execution
**Last Updated:** ${today()}
**Review Level:** 2
**Review Counter:** 0
**Iteration:** 0
**Size:** L

> **Hydration:** Checkboxes represent meaningful outcomes, not individual code changes. Expand them only when runtime discovery or review feedback requires it.

---

### Step 0: Preflight
**Status:** ⬜ Not Started

- [ ] Read the contract references and confirm the task remains within the approved change contract
- [ ] Confirm the current code snapshot still matches the approved edit surface before modifying files

---

### Step 1: Complete the capability slice end to end
**Status:** ⬜ Not Started

- [ ] Apply the requested delta for this capability inside the approved edit surface and preserve all stated constraints
- [ ] Finish the slice completely before closing the step: include required code changes, tests, docs/examples, and interface-preservation work together
- [ ] Run targeted validation while iterating, then run the required repo gates and leave the repository in a fully passing state

---

## Reviews

| # | Type | Step | Verdict | File |
|---|------|------|---------|------|

---

## Discoveries

| Discovery | Disposition | Location |
|-----------|-------------|----------|

---

## Execution Log

| Timestamp | Action | Outcome |
|-----------|--------|---------|
| ${today()} | Task staged | PROMPT.md and STATUS.md created |

---

## Blockers

*None*

---

## Notes

*Reserved for execution notes*
`;
}

export function buildConformancePrompt({
  taskId,
  folderPath,
  changeSlug,
  proposalPath,
  designPath,
  tasksPath,
  specPaths,
  implementationTaskIds,
  conformanceReportPath,
  areaContextPath,
  phaseContextPath,
}) {
  const fileScope = uniqueNonEmpty([conformanceReportPath]);

  return `# Task: ${taskId} — Verify ${changeSlug}

**Created:** ${today()}
**Change:** ${changeSlug}
**Size:** L

## Review Level: 3 (Full)

**Assessment:** Terminal whole-change conformance packet generated from the approved change contract.
**Score:** 6/8 — Blast radius: 2, Pattern novelty: 1, Security: 1, Reversibility: 2

## Canonical Task Folder

${renderCanonicalTaskFolder(folderPath)}

## Mission

Verify the assembled implementation for \`${changeSlug}\` against the approved proposal, design, and delta specs. This task evaluates whole-change conformance and writes the canonical conformance report. It MUST NOT directly implement fixes.

## Contract References

- \`${proposalPath}\` — approved change intent, scope, and impact
- \`${designPath}\` — approved design decisions and constraints
${tasksPath ? `- \`${tasksPath}\` — OpenSpec implementation checklist used during staging\n` : ""}${specPaths.map((specPath) => `- \`${specPath}\` — delta requirements and scenarios`).join("\n")}

## Dependencies

${formatDependencyList(
  implementationTaskIds.map((id) => `**Task:** ${id} (implementation packet must complete before conformance runs)`),
  "- **None**",
)}

## Context to Read First

**Tier 2 (area context):**
- \`${areaContextPath}\`
- \`${phaseContextPath}\` — conformance-phase guidance for planner-compiled packets

**Tier 3 (load only if needed):**
- \`${proposalPath}\` — approved change intent and scope boundaries
- \`${designPath}\` — approved design decisions, interface rules, and proof obligations
${tasksPath ? `- \`${tasksPath}\` — approved implementation checklist context\n` : ""}${specPaths.map((specPath) => `- \`${specPath}\` — delta requirements and scenarios`).join("\n")}

## Environment

- **Workspace:** Project root
- **Services required:** None

## File Scope

${formatPathList(fileScope)}

## Findings Disposition Rules

- **LOG_ONLY** — non-blocking suggestion; record only
- **INLINE_REVISE** — active task can revise in place
- **REMEDIATION_TASK** — fix is inside the approved contract; generate remediation work
- **REOPEN_PLANNING** — fixing the issue would change the approved contract
- **ESCALATE_HUMAN** — human decision required because the contract or trade-off changed materially
- **ARCHIVE_READY** — no blocking findings remain

## Steps

### Step 0: Load the approved contract and evidence

- [ ] Read proposal, design, delta specs, and relevant Taskplane artifacts
- [ ] Confirm the implementation packets listed in Dependencies are complete before evaluating the assembled change

### Step 1: Verify the whole change and write the report

- [ ] Evaluate the requested delta, interface rules, preservation constraints, tests, docs/examples, and repo-gate evidence as one whole-change pass
- [ ] Write \`${conformanceReportPath}\` with findings, evidence, and an explicit verdict using the approved disposition model

**Artifacts:**
${formatPathList(fileScope)}

## Documentation Requirements

**Must Update:**
- \`${conformanceReportPath}\` — canonical conformance report for this change

**Check If Affected:**
- \`${proposalPath}\` — revisit only if conformance proves the approved scope summary is wrong
- \`${designPath}\` — revisit only if conformance proves the approved contract is wrong and planning must reopen

## Report Output

Write the final report to \`${conformanceReportPath}\` using this template:

\`\`\`markdown
${createConformanceReportTemplate(changeSlug)}
\`\`\`

## Completion Criteria

- [ ] The report exists at \`${conformanceReportPath}\`
- [ ] The report contains an explicit verdict
- [ ] Blocking findings, if any, use the approved disposition model
- [ ] No code was modified directly by this verify task

## Git Commit Convention

- **Step completion:** \`feat(${taskId}): complete Step N — description\`
- **Bug fixes:** \`fix(${taskId}): description\`
- **Tests:** \`test(${taskId}): description\`
- **Hydration:** \`hydrate: ${taskId} expand Step N checkboxes\`

## Do NOT

- Do not implement fixes directly in this task
- Do not weaken proof obligations or rewrite the contract to match the implementation
- Do not archive while blocking findings remain

---

## Amendments (Added During Execution)

<!-- Workers add amendments here if execution discovers contradictions in the approved task packet. -->
`;
}

export function buildConformanceStatus({ taskId, changeSlug }) {
  return `# ${taskId}: Verify ${changeSlug} — Status

**Current Step:** Not Started
**Status:** 🔵 Ready for Execution
**Last Updated:** ${today()}
**Review Level:** 3
**Review Counter:** 0
**Iteration:** 0
**Size:** L

> **Hydration:** Checkboxes represent meaningful verification outcomes, not every individual inspection step. Expand them only when review feedback or runtime discovery requires it.

---

### Step 0: Load the approved contract and evidence
**Status:** ⬜ Not Started

- [ ] Read proposal, design, delta specs, and relevant Taskplane artifacts
- [ ] Confirm the implementation packets listed in Dependencies are complete before evaluating the assembled change

---

### Step 1: Verify the whole change and write the report
**Status:** ⬜ Not Started

- [ ] Evaluate the requested delta, interface rules, preservation constraints, tests, docs/examples, and repo-gate evidence as one whole-change pass
- [ ] Write the conformance report with findings, evidence, and an explicit verdict using the approved disposition model

---

## Reviews

| # | Type | Step | Verdict | File |
|---|------|------|---------|------|

---

## Discoveries

| Discovery | Disposition | Location |
|-----------|-------------|----------|

---

## Execution Log

| Timestamp | Action | Outcome |
|-----------|--------|---------|
| ${today()} | Task staged | PROMPT.md and STATUS.md created |

---

## Blockers

*None*

---

## Notes

*Reserved for execution notes*
`;
}

export async function writeTaskPacket({ folder, prompt, status }) {
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, "PROMPT.md"), prompt, "utf8");
  await writeFile(path.join(folder, "STATUS.md"), status, "utf8");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function renderCanonicalTaskFolder(folderPath) {
  return "```text\n" +
    `${folderPath}/\n` +
    "├── PROMPT.md   ← This file (immutable above --- divider)\n" +
    "├── STATUS.md   ← Execution state (worker updates this)\n" +
    "├── .reviews/   ← Reviewer output (created by the orchestrator runtime)\n" +
    "└── .DONE       ← Created when complete\n" +
    "```";
}

function cleanBlock(value, fallback = "None.") {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function formatBulletList(items = [], fallback = "- None.") {
  const filtered = items.map((item) => item?.trim()).filter(Boolean);
  return filtered.length > 0 ? filtered.map((item) => `- ${item}`).join("\n") : fallback;
}

function formatDependencyList(items = [], fallback = "- **None**") {
  const filtered = items.map((item) => item?.trim()).filter(Boolean);
  return filtered.length > 0 ? filtered.map((item) => `- ${item}`).join("\n") : fallback;
}

function formatPathList(paths = []) {
  return formatBulletList(paths.map((entry) => `\`${entry}\``));
}

function formatFileScope(paths = []) {
  if (paths.length === 0) {
    return "- Narrow to the minimal implementation files implied by the approved change before editing, and record any scope expansion in STATUS.md.";
  }
  return formatPathList(paths);
}

function formatDocExampleFallback(...sources) {
  const docPaths = inferPaths(...sources).filter((value) => /(^|\/)(README|docs?)\b|\.md$/i.test(value));
  return docPaths.length > 0 ? formatPathList(docPaths) : "";
}

function inferFileScope({ proposalPath, designPath, tasksPath, specPath, ...sources }) {
  const excluded = new Set([proposalPath, designPath, specPath, tasksPath].filter(Boolean));
  return inferPaths(...Object.values(sources)).filter((value) => !excluded.has(value));
}

function inferPaths(...sources) {
  return uniqueNonEmpty(
    sources.flatMap((source) => [
      ...extractBacktickedPaths(source ?? ""),
      ...extractLikelyPaths(source ?? ""),
    ]),
  );
}

function formatBulletBlock(value, fallback = "- None.") {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const normalized = lines.map((line) => {
    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) return line;
    return `- ${line}`;
  });
  return normalized.join("\n");
}
