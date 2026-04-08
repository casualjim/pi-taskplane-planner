import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CONFORMANCE_PHASE_CONTEXT_FILE,
  DEFAULT_TASK_CONTEXT,
  DEFAULT_TASK_PREFIX,
  DEFAULT_TASK_ROOT,
  IMPLEMENTATION_PHASE_CONTEXT_FILE,
} from "./constants.mjs";
import { exists } from "./paths.mjs";

export async function loadTaskArea(cwd) {
  const configPath = path.join(cwd, ".pi", "taskplane-config.json");
  if (await exists(configPath)) {
    const raw = await readFile(configPath, "utf8");
    const config = JSON.parse(raw);
    const areas = config?.taskRunner?.taskAreas ?? {};
    const [name, area] = Object.entries(areas)[0] ?? [];
    if (name && area) {
      return {
        name,
        path: area.path,
        prefix: area.prefix,
        context: area.context,
      };
    }
  }

  return {
    name: "general",
    path: DEFAULT_TASK_ROOT,
    prefix: DEFAULT_TASK_PREFIX,
    context: DEFAULT_TASK_CONTEXT,
  };
}

export function getPhaseContextPath(areaContextPath, phase) {
  const filename = phase === "conformance"
    ? CONFORMANCE_PHASE_CONTEXT_FILE
    : IMPLEMENTATION_PHASE_CONTEXT_FILE;
  return path.join(path.dirname(areaContextPath), filename).replace(/\\/g, "/");
}

export async function ensureTaskplanePhaseDocs(cwd, { fix = true } = {}) {
  const area = await loadTaskArea(cwd);
  const phaseDocs = [
    {
      path: getPhaseContextPath(area.context, "implementation"),
      content: implementationPhaseContextTemplate(),
    },
    {
      path: getPhaseContextPath(area.context, "conformance"),
      content: conformancePhaseContextTemplate(),
    },
  ];

  const ensured = [];
  const report = [];

  for (const doc of phaseDocs) {
    const absolutePath = path.join(cwd, doc.path);
    const ok = await exists(absolutePath);
    report.push({ label: path.basename(doc.path, ".md").toLowerCase(), path: doc.path, ok });
    if (!ok && fix) {
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, doc.content, "utf8");
      ensured.push(doc.path);
    }
  }

  return { area, ensured, report };
}

export async function allocateTaskIds(cwd, count) {
  const area = await loadTaskArea(cwd);
  const contextPath = path.join(cwd, area.context);
  const raw = await readFile(contextPath, "utf8");
  const match = raw.match(/\*\*Next Task ID:\*\*\s+([A-Z]+)-(\d+)/);
  if (!match) {
    throw new Error(`Could not parse Next Task ID in ${path.relative(cwd, contextPath)}`);
  }

  const [, prefix, numeric] = match;
  const width = numeric.length;
  const start = Number.parseInt(numeric, 10);
  const ids = Array.from({ length: count }, (_, index) => `${prefix}-${String(start + index).padStart(width, "0")}`);
  const nextValue = `${prefix}-${String(start + count).padStart(width, "0")}`;
  const updated = raw.replace(match[0], `**Next Task ID:** ${nextValue}`);
  await writeFile(contextPath, updated, "utf8");

  return { area, ids, nextValue };
}

function implementationPhaseContextTemplate() {
  return `# Planner Phase — Implementation

**Purpose:** These Taskplane packets implement approved planner contract slices.

## Rules

- The planner contract is authoritative: use the change proposal, design, and relevant delta spec as the source of truth.
- Implement only the approved requested delta for the capability assigned to the packet.
- Preserve the approved interface constraints, preservation constraints, and proof obligations.
- If execution reveals a contract defect, capture the discovery and escalate for planner reopening instead of broadening scope silently.
- Do not write the final whole-change conformance verdict from an implementation packet.

## Expected Outcome

- Code, tests, and docs for the assigned capability slice are complete.
- Repo gates required by the approved contract pass.
- The packet stays within the approved edit surface unless an amendment is explicitly required.
`;
}

function conformancePhaseContextTemplate() {
  return `# Planner Phase — Conformance

**Purpose:** These Taskplane packets verify an assembled change against the approved planner contract.

## Rules

- Read the full approved contract before deciding the verdict.
- Evaluate the change against proposal intent, design constraints, delta specs, and proof obligations.
- Write findings and the explicit verdict to the change conformance report.
- Do not implement fixes directly from the conformance packet.
- If a fix is possible inside the approved contract, route it to remediation work. If the contract itself must change, route it to planner reopening.

## Disposition Model

- \`LOG_ONLY\`
- \`INLINE_REVISE\`
- \`REMEDIATION_TASK\`
- \`REOPEN_PLANNING\`
- \`ESCALATE_HUMAN\`
- \`ARCHIVE_READY\`

## Expected Outcome

- The change has a canonical conformance report with evidence and an explicit verdict.
- Archive happens only after an \`ARCHIVE_READY\` verdict.
`;
}
