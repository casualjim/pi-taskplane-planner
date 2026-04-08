import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { createConformanceReportTemplate } from "./conformance.mjs";
import { extractBacktickedPaths, extractRequirementNames, getSection, uniqueNonEmpty } from "./markdown.mjs";

export function buildImplementationPrompt({
  taskId,
  folderPath,
  changeSlug,
  capabilityName,
  proposalPath,
  designPath,
  specPath,
  proposal,
  design,
  spec,
  areaContextPath,
  phaseContextPath,
}) {
  const proposalSummary = getSection(proposal, "Change Summary", 2) || `Implement approved change ${changeSlug}.`;
  const requestedDelta = getSection(design, "Requested Delta", 2);
  const preservation = getSection(design, "Preservation Constraints", 2);
  const interfaceDelta = getSection(design, "Public Interface Deltas", 2);
  const editSurface = getSection(design, "Module Ownership and Edit Surface", 2);
  const behavior = getSection(design, "Behavioral Semantics", 2);
  const failureSemantics = getSection(design, "Failure / Edge Case Semantics", 2);
  const proof = getSection(design, "Proof Obligations", 2);
  const acceptance = getSection(proof, "Acceptance", 3);
  const nonRegression = getSection(proof, "Non-Regression", 3);
  const requiredTests = getSection(proof, "Required Tests", 3);
  const docsExamples = getSection(proof, "Documentation and Examples", 3);
  const repoGates = getSection(proof, "Repo Gates", 3);
  const requirements = extractRequirementNames(spec);
  const fileScope = uniqueNonEmpty([
    ...extractBacktickedPaths(editSurface),
    ...extractBacktickedPaths(interfaceDelta),
    ...extractBacktickedPaths(docsExamples),
  ]);

  if (fileScope.length === 0) {
    throw new Error(`No file-scope paths could be inferred for ${changeSlug}; add backticked paths to 'Module Ownership and Edit Surface' or related sections before staging.`);
  }

  return `# Task: ${taskId} — ${changeSlug} / ${capabilityName}

**Created:** ${today()}
**Change:** ${changeSlug}
**Size:** M

## Review Level: 2 (Plan + Code)

**Assessment:** Capability implementation packet generated from the approved planner contract.
**Score:** 4/8 — Blast radius: 1, Pattern novelty: 1, Security: 0, Reversibility: 2

## Canonical Task Folder

${renderCanonicalTaskFolder(folderPath)}

## Mission

Implement the approved capability \`${capabilityName}\` for change \`${changeSlug}\`. This task realizes one approved contract slice from the planner proposal, design, and delta spec without inventing new behavior or broadening scope.

**Change summary:**
${cleanBlock(proposalSummary)}

**Requested delta for this task:**
${cleanBlock(requestedDelta, "Implement the approved change contract exactly as written.")}

**Capability requirements:**
${formatBulletList(requirements, "- No explicit requirement titles were extracted from the delta spec.")}

**Behavioral semantics:**
${cleanBlock(behavior, "Follow the approved behavior described in the design and spec.")}

**Failure / edge-case semantics:**
${cleanBlock(failureSemantics, "Follow the approved failure and edge-case handling described in the design.")}

## Dependencies

- **None**

## Context to Read First

**Tier 2 (area context):**
- \`${areaContextPath}\`
- \`${phaseContextPath}\` — implementation-phase guidance for planner-compiled packets

**Tier 3 (load only if needed):**
- \`${proposalPath}\` — approved change intent and scope boundaries
- \`${designPath}\` — requested delta, preservation constraints, and proof obligations
- \`${specPath}\` — capability requirements and scenarios

## Environment

- **Workspace:** Project root
- **Services required:** None

## File Scope

${formatPathList(fileScope)}

## Exact Edit Targets

${cleanBlock(editSurface, "Use the approved module ownership and edit surface from the design.")}

## Public Interface Delta

${cleanBlock(interfaceDelta, "No public or cross-module interface changes are allowed in this change.")}

## Preservation Constraints

${cleanBlock(preservation, "Preserve the approved interfaces, tests, and operator workflow.")}

## Steps

### Step 0: Preflight

- [ ] Read the contract references and confirm the task remains within the approved change contract
- [ ] Confirm the current code snapshot still matches the approved edit surface before modifying files

### Step 1: Implement the approved capability slice

- [ ] Apply the requested delta for \`${capabilityName}\` inside the approved module ownership and edit surface
- [ ] Implement the approved behavioral semantics and exact failure or edge-case semantics from the design and spec
- [ ] Preserve all stated constraints and do not alter interfaces beyond the approved delta

**Artifacts:**
${formatPathList(fileScope)}

### Step 2: Tests and verification work

- [ ] Add or update the required tests for this capability, including adversarial coverage
- [ ] Run targeted validation while iterating on the implementation

### Step 3: Documentation and examples

- [ ] Update the required docs and examples for this capability slice
- [ ] Review adjacent docs or examples listed in the proof obligations and update them if affected

### Step 4: Repo gates

- [ ] Run the required repo gates and leave the repository in a fully passing state

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
- \`${designPath}\` — keep edit surface and proof obligations aligned if implementation reveals a contract discrepancy

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
**Size:** M

> **Hydration:** Checkboxes represent meaningful outcomes, not individual code changes. Expand them only when runtime discovery or review feedback requires it.

---

### Step 0: Preflight
**Status:** ⬜ Not Started

- [ ] Read the contract references and confirm the task remains within the approved change contract
- [ ] Confirm the current code snapshot still matches the approved edit surface before modifying files

---

### Step 1: Implement the approved capability slice
**Status:** ⬜ Not Started

- [ ] Apply the requested delta for this capability inside the approved module ownership and edit surface
- [ ] Implement the approved behavioral semantics and exact failure or edge-case semantics
- [ ] Preserve all stated constraints and do not alter interfaces beyond the approved delta

---

### Step 2: Tests and verification work
**Status:** ⬜ Not Started

- [ ] Add or update the required tests for this capability, including adversarial coverage
- [ ] Run targeted validation while iterating on the implementation

---

### Step 3: Documentation and examples
**Status:** ⬜ Not Started

- [ ] Update the required docs and examples for this capability slice
- [ ] Review adjacent docs or examples listed in the proof obligations and update them if affected

---

### Step 4: Repo gates
**Status:** ⬜ Not Started

- [ ] Run the required repo gates and leave the repository in a fully passing state

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
**Size:** M

## Review Level: 3 (Full)

**Assessment:** Terminal whole-change conformance packet generated from the approved planner contract.
**Score:** 6/8 — Blast radius: 2, Pattern novelty: 1, Security: 1, Reversibility: 2

## Canonical Task Folder

${renderCanonicalTaskFolder(folderPath)}

## Mission

Verify the assembled implementation for \`${changeSlug}\` against the approved proposal, design, and delta specs. This task evaluates whole-change conformance and writes the canonical conformance report. It MUST NOT directly implement fixes.

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
- \`${designPath}\` — requested delta, preservation constraints, interface rules, and proof obligations
${specPaths.map((specPath) => `- \`${specPath}\` — delta requirements and scenarios`).join("\n")}

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

### Step 0: Load the approved contract

- [ ] Read proposal, design, delta specs, and relevant Taskplane artifacts
- [ ] Confirm the implementation packets listed in Dependencies are complete

### Step 1: Evaluate delta and preservation conformance

- [ ] Compare the assembled implementation against the approved requested delta and interface rules
- [ ] Check preservation constraints, non-regression expectations, docs, examples, and proof strength

### Step 2: Evaluate proof obligations and repo gates

- [ ] Confirm the required tests, including adversarial coverage, are present and aligned with the approved contract
- [ ] Confirm repo gates and verification outputs support the final verdict

### Step 3: Write the conformance report

- [ ] Write \`${conformanceReportPath}\` with findings, evidence, and an explicit verdict
- [ ] Use the approved disposition model for every blocking or non-blocking finding

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
**Size:** M

> **Hydration:** Checkboxes represent meaningful verification outcomes, not every individual inspection step. Expand them only when review feedback or runtime discovery requires it.

---

### Step 0: Load the approved contract
**Status:** ⬜ Not Started

- [ ] Read proposal, design, delta specs, and relevant Taskplane artifacts
- [ ] Confirm the implementation packets listed in Dependencies are complete

---

### Step 1: Evaluate delta and preservation conformance
**Status:** ⬜ Not Started

- [ ] Compare the assembled implementation against the approved requested delta and interface rules
- [ ] Check preservation constraints, non-regression expectations, docs, examples, and proof strength

---

### Step 2: Evaluate proof obligations and repo gates
**Status:** ⬜ Not Started

- [ ] Confirm the required tests, including adversarial coverage, are present and aligned with the approved contract
- [ ] Confirm repo gates and verification outputs support the final verdict

---

### Step 3: Write the conformance report
**Status:** ⬜ Not Started

- [ ] Write the conformance report with findings, evidence, and an explicit verdict
- [ ] Use the approved disposition model for every blocking or non-blocking finding

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
