import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { archiveChange } from "../src/archive.mjs";
import { createFinding, parseConformanceVerdict, summarizeFindings } from "../src/conformance.mjs";
import { reopenChange } from "../src/reopen.mjs";
import { doctorPlanner, initPlanner, scaffoldChange } from "../src/scaffold.mjs";
import { stageChange } from "../src/stage.mjs";
import { validateChangeContract } from "../src/validate.mjs";

let cwd;

beforeEach(async () => {
  cwd = await mkdtemp(path.join(os.tmpdir(), "planner-test-"));
  await setupTaskplane(cwd);
});

afterEach(async () => {
  if (cwd) {
    await rm(cwd, { recursive: true, force: true });
  }
});

describe("planner scaffold and validation", () => {
  test("init and doctor seed planner-native directories", async () => {
    const init = await initPlanner(cwd);
    expect(init.ensured).toContain("planning/changes");
    expect(await exists(path.join(cwd, "taskplane-tasks/PHASE-IMPLEMENTATION.md"))).toBe(true);
    expect(await exists(path.join(cwd, "taskplane-tasks/PHASE-CONFORMANCE.md"))).toBe(true);
    const doctor = await doctorPlanner(cwd);
    expect(doctor.ok).toBe(true);
  });

  test("scaffold-change creates planner-native contract files", async () => {
    await initPlanner(cwd);
    const result = await scaffoldChange(cwd, "demo-change", ["demo-capability"]);
    expect(result.created).toContain("planning/changes/demo-change/proposal.md");
    expect(result.created).toContain("planning/changes/demo-change/design.md");
    expect(result.created).toContain("planning/changes/demo-change/conformance.md");
    expect(result.created).toContain("planning/changes/demo-change/specs/demo-capability/spec.md");
  });

  test("validation blocks staging while closure status is unresolved", async () => {
    await initPlanner(cwd);
    await scaffoldChange(cwd, "demo-change", ["demo-capability"]);
    const validation = await validateChangeContract(cwd, "demo-change");
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((error) => error.includes("Design closure status blocks staging"))).toBe(true);
  });
});

describe("stage and archive workflow", () => {
  test("stage compiles implementation and verify packets and updates task counter", async () => {
    await createApprovedChange(cwd, "demo-change", "demo-capability");

    const result = await stageChange(cwd, "demo-change");

    expect(result.implementationTaskIds).toEqual(["TP-001"]);
    expect(result.verifyTaskId).toBe("TP-002");
    expect(result.created).toContain("taskplane-tasks/TP-001-demo-change-demo-capability");
    expect(result.created).toContain("taskplane-tasks/TP-002-verify-demo-change");

    const implementationPrompt = await readFile(path.join(cwd, "taskplane-tasks/TP-001-demo-change-demo-capability/PROMPT.md"), "utf8");
    expect(implementationPrompt).toContain("## Canonical Task Folder");
    expect(implementationPrompt).toContain("taskplane-tasks/PHASE-IMPLEMENTATION.md");
    expect(implementationPrompt).not.toContain("taskplane-tasks/PHASE-CONFORMANCE.md");
    expect(implementationPrompt).toContain("## Exact Edit Targets");
    expect(implementationPrompt).toContain("## Documentation Requirements");
    expect(implementationPrompt).toContain("## Git Commit Convention");
    expect(implementationPrompt).toContain("No public or cross-module interface changes are allowed in this change.");

    const verifyPrompt = await readFile(path.join(cwd, "taskplane-tasks/TP-002-verify-demo-change/PROMPT.md"), "utf8");
    expect(verifyPrompt).toContain("## Findings Disposition Rules");
    expect(verifyPrompt).toContain("## File Scope");
    expect(verifyPrompt).toContain("taskplane-tasks/PHASE-CONFORMANCE.md");
    expect(verifyPrompt).not.toContain("taskplane-tasks/PHASE-IMPLEMENTATION.md");
    expect(verifyPrompt).toContain("planning/changes/demo-change/conformance.md");

    const context = await readFile(path.join(cwd, "taskplane-tasks/CONTEXT.md"), "utf8");
    expect(context).toContain("**Next Task ID:** TP-003");
  });

  test("conformance disposition helpers summarize blocking findings correctly", async () => {
    const findings = [
      createFinding({ title: "Need replanning", disposition: "REOPEN_PLANNING" }),
      createFinding({ title: "Minor note", disposition: "LOG_ONLY" }),
    ];
    expect(summarizeFindings(findings)).toBe("REOPEN_PLANNING");
  });

  test("reopen marks a change as reopened for planning", async () => {
    await createApprovedChange(cwd, "demo-change", "demo-capability");
    const result = await reopenChange(cwd, "demo-change", "Interface delta changed.");
    const conformance = await readFile(path.join(cwd, result.conformancePath), "utf8");
    expect(conformance).toContain("**Verdict:** REOPEN_PLANNING");
    expect(conformance).toContain("## Reopen Note");
  });

  test("archive syncs delta specs into cumulative truth after archive-ready conformance", async () => {
    await createApprovedChange(cwd, "demo-change", "demo-capability");
    await stageChange(cwd, "demo-change");

    const conformancePath = path.join(cwd, "planning/changes/demo-change/conformance.md");
    await writeFile(
      conformancePath,
      `# Conformance Report: demo-change\n\n**Status:** Complete\n**Verdict:** ARCHIVE_READY\n\n## Summary\n\nAll checks passed.\n\n## Findings\n\n### CRITICAL\n\n- None.\n\n### WARNING\n\n- None.\n\n### SUGGESTION\n\n- None.\n\n## Evidence\n\n- tests/planner.test.mjs:1\n\n## Disposition\n\n- ARCHIVE_READY\n`,
      "utf8",
    );

    const result = await archiveChange(cwd, "demo-change");
    const syncedSpec = await readFile(path.join(cwd, "planning/specs/demo-capability/spec.md"), "utf8");

    expect(parseConformanceVerdict(await readFile(path.join(cwd, result.archivedTo, "conformance.md"), "utf8"))).toEqual({
      ok: true,
      verdict: "ARCHIVE_READY",
      reason: null,
    });
    expect(syncedSpec).toContain("### Requirement: Demo capability works");
    expect(await exists(path.join(cwd, "planning/archive", path.basename(result.archivedTo)))).toBe(true);
  });
});

describe("planner CLI end-to-end", () => {
  test("full CLI flow seeds, stages, and archives a change", async () => {
    let result = await runPlannerCli(cwd, "init", "--json");
    expect(result.exitCode).toBe(0);
    expect(result.json.paths.changesDir).toContain("planning/changes");

    result = await runPlannerCli(cwd, "doctor", "--json");
    expect(result.exitCode).toBe(0);
    expect(result.json.ok).toBe(true);

    result = await runPlannerCli(cwd, "scaffold-change", "cli-flow", "demo-capability", "--json");
    expect(result.exitCode).toBe(0);
    expect(result.json.changeSlug).toBe("cli-flow");

    await writeApprovedContract(cwd, "cli-flow", "demo-capability");

    result = await runPlannerCli(cwd, "status", "cli-flow", "--json");
    expect(result.exitCode).toBe(0);
    expect(result.json.contractReady).toBe(true);
    expect(result.json.stagedPackets).toEqual([]);

    result = await runPlannerCli(cwd, "stage", "cli-flow", "--json");
    expect(result.exitCode).toBe(0);
    expect(result.json.created).toContain("taskplane-tasks/TP-001-cli-flow-demo-capability");
    expect(result.json.created).toContain("taskplane-tasks/TP-002-verify-cli-flow");

    result = await runPlannerCli(cwd, "status", "cli-flow", "--json");
    expect(result.exitCode).toBe(0);
    expect(result.json.stagedPackets.length).toBe(2);

    await writeArchiveReadyConformance(cwd, "cli-flow");

    result = await runPlannerCli(cwd, "archive", "cli-flow", "--json");
    expect(result.exitCode).toBe(0);
    expect(result.json.archivedTo).toContain("planning/archive/");
    expect(await exists(path.join(cwd, "planning/specs/demo-capability/spec.md"))).toBe(true);
    expect(await exists(path.join(cwd, result.json.archivedTo))).toBe(true);
  });

  test("CLI reopen flow marks a change as reopened", async () => {
    let result = await runPlannerCli(cwd, "init", "--json");
    expect(result.exitCode).toBe(0);
    result = await runPlannerCli(cwd, "scaffold-change", "cli-reopen", "demo-capability", "--json");
    expect(result.exitCode).toBe(0);
    await writeApprovedContract(cwd, "cli-reopen", "demo-capability");

    result = await runPlannerCli(cwd, "reopen", "cli-reopen", "Contract changed", "--json");
    expect(result.exitCode).toBe(0);
    expect(result.json.verdict).toBe("REOPEN_PLANNING");

    const conformance = await readFile(path.join(cwd, result.json.conformancePath), "utf8");
    expect(conformance).toContain("**Verdict:** REOPEN_PLANNING");
    expect(conformance).toContain("Contract changed");
  });
});

async function createApprovedChange(root, changeSlug, capability) {
  await initPlanner(root);
  await scaffoldChange(root, changeSlug, [capability]);
  await writeApprovedContract(root, changeSlug, capability);
}

async function writeApprovedContract(root, changeSlug, capability) {
  await writeFile(
    path.join(root, `planning/changes/${changeSlug}/proposal.md`),
    `## Why\n\nNeed a planner-native change contract.\n\n## Change Summary\n\nDeliver a minimal approved planner contract for ${changeSlug}.\n\n## Scope Boundaries\n\n### In Scope\n\n- Planner-native scaffolding\n\n### Out of Scope\n\n- Runtime orchestration rewrites\n\n## Spec Impact\n\n### New Capabilities\n\n- \`${capability}\`: Demonstrate staging and archive behavior\n\n### Modified Capabilities\n\n- None.\n\n## User / Operator / Interface Impact\n\nNo public or cross-module interface changes are permitted in this change.\n\n## Risks / Constraints\n\n- Keep the implementation self-contained.\n`,
    "utf8",
  );
  await writeFile(
    path.join(root, `planning/changes/${changeSlug}/design.md`),
    `## Context\n\nThis change demonstrates the planner-native compiler path.\n\n## Goals / Non-Goals\n\n**Goals:**\n- Stage valid Taskplane packets\n\n**Non-Goals:**\n- Rebuild Taskplane\n\n## Key Decisions\n\n### Decision: Keep the implementation local\n- **Chosen option:** Store planner artifacts in planner-native paths\n- **Why:** Keep runtime independent from OpenSpec\n- **Rejected alternatives:** Keep OpenSpec as a runtime dependency\n\n## Requested Delta\n\nAdd planner-native contract and packet generation support for ${changeSlug}.\n\n## Preservation Constraints\n\n- Do not weaken tests or docs\n- Do not alter runtime interfaces beyond the approved change contract\n\n## Public Interface Deltas\n\nNo public or cross-module interface changes are allowed in this change.\n\n## Module Ownership and Edit Surface\n\n- \`src/index.mjs\` — export planner-native helpers\n- \`README.md\` — document planner-native workflow\n- \`.pi/prompts/plan-stage.md\` — describe staging behavior\n\n## Behavioral Semantics\n\nThe compiler stages one implementation packet per capability and one verify packet per change.\n\n## Failure / Edge Case Semantics\n\nIf closure status is not fully resolved, staging fails without creating packets.\n\n## Proof Obligations\n\n### Acceptance\n\n- Implementation packet is created\n- Verify packet is created\n\n### Non-Regression\n\n- Taskplane packet metadata remains valid\n\n### Required Tests\n\n- \`bun test\`\n- add adversarial coverage for staging and archive behavior\n\n### Documentation and Examples\n\n- \`README.md\`\n- \`.pi/prompts/plan-stage.md\`\n\n### Repo Gates\n\n- \`npm test\`\n- \`npm run build\`\n\n## Risks / Trade-offs\n\n- Higher upfront planning cost is acceptable.\n\n## Closure Status\n\n- Blockers: None\n- Known Unknowns: None\n- Deferred Design Choices: None\n`,
    "utf8",
  );
  await writeFile(
    path.join(root, `planning/changes/${changeSlug}/specs/${capability}/spec.md`),
    `## ADDED Requirements\n\n### Requirement: Demo capability works\nThe system SHALL stage planner-native Taskplane packets from approved contracts.\n\n#### Scenario: Successful stage\n- **WHEN** the planner stages an approved change\n- **THEN** it creates implementation and verify packets\n`,
    "utf8",
  );
}

async function setupTaskplane(root) {
  await mkdir(path.join(root, ".pi"), { recursive: true });
  await mkdir(path.join(root, "taskplane-tasks"), { recursive: true });
  await writeFile(
    path.join(root, ".pi/taskplane-config.json"),
    JSON.stringify(
      {
        configVersion: 1,
        taskRunner: {
          taskAreas: {
            general: {
              path: "taskplane-tasks",
              prefix: "TP",
              context: "taskplane-tasks/CONTEXT.md",
            },
          },
        },
      },
      null,
      2,
    ),
    "utf8",
  );
  await writeFile(
    path.join(root, "taskplane-tasks/CONTEXT.md"),
    `# General — Context\n\n**Last Updated:** 2026-04-07\n**Status:** Active\n**Next Task ID:** TP-001\n`,
    "utf8",
  );
}

async function exists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function writeArchiveReadyConformance(root, changeSlug) {
  const conformancePath = path.join(root, `planning/changes/${changeSlug}/conformance.md`);
  await writeFile(
    conformancePath,
    `# Conformance Report: ${changeSlug}\n\n**Status:** Complete\n**Verdict:** ARCHIVE_READY\n\n## Summary\n\nAll checks passed.\n\n## Findings\n\n### CRITICAL\n\n- None.\n\n### WARNING\n\n- None.\n\n### SUGGESTION\n\n- None.\n\n## Evidence\n\n- tests/planner.test.mjs:1\n\n## Disposition\n\n- ARCHIVE_READY\n`,
    "utf8",
  );
}

async function runPlannerCli(root, ...args) {
  const binPath = path.resolve(import.meta.dir, "../bin/planner.mjs");
  const proc = Bun.spawn({
    cmd: ["node", binPath, ...args],
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  let json = null;
  const trimmed = stdout.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    json = JSON.parse(trimmed);
  }
  return { exitCode, stdout, stderr, json };
}
