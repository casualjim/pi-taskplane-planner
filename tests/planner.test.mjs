import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { archiveChange } from "../src/archive.mjs";
import { createFinding, parseConformanceVerdict, summarizeFindings } from "../src/conformance.mjs";
import { extractLikelyPaths } from "../src/markdown.mjs";
import { reopenChange } from "../src/reopen.mjs";
import { stageChange } from "../src/stage.mjs";
import { validateChangeForStaging } from "../src/validate.mjs";

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

describe("planner validation and staging", () => {
  test("validation blocks staging while closure status is unresolved", async () => {
    await scaffoldOpenSpecChange(cwd, "demo-change", "demo-capability");
    const validation = await validateChangeForStaging(cwd, "demo-change");
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
    expect(implementationPrompt).toContain("## Contract References");
    expect(implementationPrompt).toContain("taskplane-tasks/PHASE-IMPLEMENTATION.md");
    expect(implementationPrompt).not.toContain("taskplane-tasks/PHASE-CONFORMANCE.md");
    expect(implementationPrompt).toContain("## Exact Edit Targets");
    expect(implementationPrompt).toContain("## Documentation Requirements");
    expect(implementationPrompt).toContain("## Git Commit Convention");
    expect(implementationPrompt).toContain("### Step 1: Complete the capability slice end to end");
    expect(implementationPrompt).not.toContain("### Step 2: Tests and verification work");
    expect(implementationPrompt).not.toContain("### Step 3: Documentation and examples");
    expect(implementationPrompt).not.toContain("### Step 4: Repo gates");
    expect(implementationPrompt).toContain("Finish the slice completely before closing the step");
    expect(implementationPrompt).toContain("No public or cross-module interface changes are allowed in this change.");

    const implementationStatus = await readFile(path.join(cwd, "taskplane-tasks/TP-001-demo-change-demo-capability/STATUS.md"), "utf8");
    expect(implementationStatus).toContain("### Step 1: Complete the capability slice end to end");
    expect(implementationStatus).not.toContain("### Step 2: Tests and verification work");

    const verifyPrompt = await readFile(path.join(cwd, "taskplane-tasks/TP-002-verify-demo-change/PROMPT.md"), "utf8");
    expect(verifyPrompt).toContain("## Contract References");
    expect(verifyPrompt).toContain("## Findings Disposition Rules");
    expect(verifyPrompt).toContain("## File Scope");
    expect(verifyPrompt).toContain("### Step 1: Verify the whole change and write the report");
    expect(verifyPrompt).not.toContain("### Step 2: Evaluate proof obligations and repo gates");
    expect(verifyPrompt).not.toContain("### Step 3: Write the conformance report");
    expect(verifyPrompt).toContain("taskplane-tasks/PHASE-CONFORMANCE.md");
    expect(verifyPrompt).not.toContain("taskplane-tasks/PHASE-IMPLEMENTATION.md");
    expect(verifyPrompt).toContain("openspec/changes/demo-change/conformance.md");

    const verifyStatus = await readFile(path.join(cwd, "taskplane-tasks/TP-002-verify-demo-change/STATUS.md"), "utf8");
    expect(verifyStatus).toContain("### Step 1: Verify the whole change and write the report");
    expect(verifyStatus).not.toContain("### Step 2: Evaluate proof obligations and repo gates");

    const context = await readFile(path.join(cwd, "taskplane-tasks/CONTEXT.md"), "utf8");
    expect(context).toContain("**Next Task ID:** TP-003");
  });

  test("stage accepts standard OpenSpec propose artifacts without planner-only headings", async () => {
    await scaffoldOpenSpecChange(cwd, "standard-change", "demo-capability");
    await writeStandardApprovedContract(cwd, "standard-change", "demo-capability");

    const validation = await validateChangeForStaging(cwd, "standard-change");
    expect(validation.valid).toBe(true);

    const result = await stageChange(cwd, "standard-change");
    expect(result.created).toContain("taskplane-tasks/TP-001-standard-change-demo-capability");

    const implementationPrompt = await readFile(path.join(cwd, "taskplane-tasks/TP-001-standard-change-demo-capability/PROMPT.md"), "utf8");
    expect(implementationPrompt).toContain("openspec/changes/standard-change/tasks.md");
    expect(implementationPrompt).toContain("src/standard-change.mjs");
    expect(implementationPrompt).toContain("tests/standard-change.test.mjs");
    expect(implementationPrompt).toContain("### Step 1: Complete the capability slice end to end");
    expect(implementationPrompt).not.toContain("### Step 2: Tests and verification work");
    expect(implementationPrompt).toContain("Add or update coverage for scenario: Successful stage");
  });

  test("stage does not reference tasks.md when standard OpenSpec change omits it", async () => {
    await scaffoldOpenSpecChange(cwd, "standard-no-tasks", "demo-capability");
    await writeStandardApprovedContract(cwd, "standard-no-tasks", "demo-capability", { includeTasks: false });

    const validation = await validateChangeForStaging(cwd, "standard-no-tasks");
    expect(validation.valid).toBe(true);
    expect(validation.tasksPath).toBe("");

    await stageChange(cwd, "standard-no-tasks");

    const implementationPrompt = await readFile(path.join(cwd, "taskplane-tasks/TP-001-standard-no-tasks-demo-capability/PROMPT.md"), "utf8");
    const verifyPrompt = await readFile(path.join(cwd, "taskplane-tasks/TP-002-verify-standard-no-tasks/PROMPT.md"), "utf8");
    expect(implementationPrompt).not.toContain("openspec/changes/standard-no-tasks/tasks.md");
    expect(verifyPrompt).not.toContain("openspec/changes/standard-no-tasks/tasks.md");
  });

  test("validation accepts resolved Open Questions prose from standard OpenSpec designs", async () => {
    await scaffoldOpenSpecChange(cwd, "resolved-open-questions", "demo-capability");
    await writeResolvedOpenQuestionsContract(cwd, "resolved-open-questions", "demo-capability");

    const validation = await validateChangeForStaging(cwd, "resolved-open-questions");
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
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

    const conformancePath = path.join(cwd, "openspec/changes/demo-change/conformance.md");
    await writeFile(
      conformancePath,
      `# Conformance Report: demo-change\n\n**Status:** Complete\n**Verdict:** ARCHIVE_READY\n\n## Summary\n\nAll checks passed.\n\n## Findings\n\n### CRITICAL\n\n- None.\n\n### WARNING\n\n- None.\n\n### SUGGESTION\n\n- None.\n\n## Evidence\n\n- tests/planner.test.mjs:1\n\n## Disposition\n\n- ARCHIVE_READY\n`,
      "utf8",
    );

    const result = await archiveChange(cwd, "demo-change");
    const syncedSpec = await readFile(path.join(cwd, "openspec/specs/demo-capability/spec.md"), "utf8");

    expect(parseConformanceVerdict(await readFile(path.join(cwd, result.archivedTo, "conformance.md"), "utf8"))).toEqual({
      ok: true,
      verdict: "ARCHIVE_READY",
      reason: null,
    });
    expect(syncedSpec).toContain("### Requirement: Demo capability works");
    expect(await exists(path.join(cwd, "openspec/changes/archive", path.basename(result.archivedTo)))).toBe(true);
  });
});

describe("markdown helpers", () => {
  test("extractLikelyPaths ignores prose abbreviations and version strings", () => {
    expect(extractLikelyPaths("e.g., keep the prose simple")).toEqual([]);
    expect(extractLikelyPaths("version 0.2.1 is already published")).toEqual([]);
    expect(extractLikelyPaths("Update README.md and src/index.mjs.")).toEqual(["README.md", "src/index.mjs"]);
  });
});

describe("planner CLI end-to-end", () => {
  test("full CLI flow stages and archives a change", async () => {
    await scaffoldOpenSpecChange(cwd, "cli-flow", "demo-capability");
    await writeApprovedContract(cwd, "cli-flow", "demo-capability");

    let result = await runPlannerCli(cwd, "status", "cli-flow", "--json");
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
    expect(result.json.archivedTo).toContain("openspec/changes/archive/");
    expect(await exists(path.join(cwd, "openspec/specs/demo-capability/spec.md"))).toBe(true);
    expect(await exists(path.join(cwd, result.json.archivedTo))).toBe(true);
  });

  test("CLI reopen flow marks a change as reopened", async () => {
    await scaffoldOpenSpecChange(cwd, "cli-reopen", "demo-capability");
    await writeApprovedContract(cwd, "cli-reopen", "demo-capability");

    const result = await runPlannerCli(cwd, "reopen", "cli-reopen", "Contract changed", "--json");
    expect(result.exitCode).toBe(0);
    expect(result.json.verdict).toBe("REOPEN_PLANNING");

    const conformance = await readFile(path.join(cwd, result.json.conformancePath), "utf8");
    expect(conformance).toContain("**Verdict:** REOPEN_PLANNING");
    expect(conformance).toContain("Contract changed");
  });
});

// --- Helpers ---

/** Scaffold an openspec change directory (replaces planner scaffold-change) */
async function scaffoldOpenSpecChange(root, changeSlug, capability) {
  const changeDir = path.join(root, "openspec/changes", changeSlug);
  const specsDir = path.join(changeDir, "specs", capability);
  await mkdir(specsDir, { recursive: true });

  // Write scaffolded proposal
  await writeFile(
    path.join(changeDir, "proposal.md"),
    `## Why\n\n<!-- motivation -->\n\n## Change Summary\n\n<!-- delta -->\n\n## Scope Boundaries\n\n### In Scope\n\n- <!-- items -->\n\n### Out of Scope\n\n- <!-- items -->\n\n## Spec Impact\n\n### New Capabilities\n\n- \`${capability}\`: <!-- description -->\n\n### Modified Capabilities\n\n- None.\n\n## User / Operator / Interface Impact\n\n<!-- impact -->\n\n## Risks / Constraints\n\n- <!-- risks -->\n`,
    "utf8",
  );

  // Write scaffolded design
  await writeFile(
    path.join(changeDir, "design.md"),
    `## Context\n\n<!-- context -->\n\n## Goals / Non-Goals\n\n**Goals:**\n- <!-- goals -->\n\n**Non-Goals:**\n- <!-- non-goals -->\n\n## Key Decisions\n\n### Decision: placeholder\n- **Chosen option:** <!-- option -->\n- **Why:** <!-- reason -->\n- **Rejected alternatives:** <!-- alternatives -->\n\n## Requested Delta\n\n<!-- delta -->\n\n## Preservation Constraints\n\n- <!-- constraints -->\n\n## Public Interface Deltas\n\n<!-- interface deltas -->\n\n## Module Ownership and Edit Surface\n\n- \\\`src/index.mjs\\\` — placeholder\n\n## Behavioral Semantics\n\n<!-- behavior -->\n\n## Failure / Edge Case Semantics\n\n<!-- failure handling -->\n\n## Proof Obligations\n\n### Acceptance\n\n- <!-- acceptance -->\n\n### Non-Regression\n\n- <!-- non-regression -->\n\n### Required Tests\n\n- <!-- tests -->\n\n### Documentation and Examples\n\n- <!-- docs -->\n\n### Repo Gates\n\n- \\\`npm test\\\`\n- \\\`npm run build\\\`\n\n## Risks / Trade-offs\n\n- <!-- risks -->\n\n## Closure Status\n\n- Blockers: TBD\n- Known Unknowns: TBD\n- Deferred Design Choices: TBD\n`,
    "utf8",
  );

  // Write scaffolded delta spec
  await writeFile(
    path.join(specsDir, "spec.md"),
    `## ADDED Requirements\n\n### Requirement: ${capability}\nThe system SHALL <!-- requirement -->.\n\n#### Scenario: Successful path\n- **WHEN** <!-- condition -->\n- **THEN** <!-- outcome -->\n`,
    "utf8",
  );
}

async function createApprovedChange(root, changeSlug, capability) {
  await scaffoldOpenSpecChange(root, changeSlug, capability);
  await writeApprovedContract(root, changeSlug, capability);
}

async function writeApprovedContract(root, changeSlug, capability) {
  await writeFile(
    path.join(root, `openspec/changes/${changeSlug}/proposal.md`),
    `## Why\n\nNeed a planner-native change contract.\n\n## Change Summary\n\nDeliver a minimal approved planner contract for ${changeSlug}.\n\n## Scope Boundaries\n\n### In Scope\n\n- Planner-native scaffolding\n\n### Out of Scope\n\n- Runtime orchestration rewrites\n\n## Spec Impact\n\n### New Capabilities\n\n- \`${capability}\`: Demonstrate staging and archive behavior\n\n### Modified Capabilities\n\n- None.\n\n## User / Operator / Interface Impact\n\nNo public or cross-module interface changes are permitted in this change.\n\n## Risks / Constraints\n\n- Keep the implementation self-contained.\n`,
    "utf8",
  );
  await writeFile(
    path.join(root, `openspec/changes/${changeSlug}/design.md`),
    `## Context\n\nThis change demonstrates the planner-native compiler path.\n\n## Goals / Non-Goals\n\n**Goals:**\n- Stage valid Taskplane packets\n\n**Non-Goals:**\n- Rebuild Taskplane\n\n## Key Decisions\n\n### Decision: Keep the implementation local\n- **Chosen option:** Store planner artifacts in planner-native paths\n- **Why:** Keep runtime independent from OpenSpec\n- **Rejected alternatives:** Keep OpenSpec as a runtime dependency\n\n## Requested Delta\n\nAdd planner-native contract and packet generation support for ${changeSlug}.\n\n## Preservation Constraints\n\n- Do not weaken tests or docs\n- Do not alter runtime interfaces beyond the approved change contract\n\n## Public Interface Deltas\n\nNo public or cross-module interface changes are allowed in this change.\n\n## Module Ownership and Edit Surface\n\n- \`src/index.mjs\` — export planner-native helpers\n- \`README.md\` — document planner-native workflow\n- \`.pi/prompts/plan-stage.md\` — describe staging behavior\n\n## Behavioral Semantics\n\nThe compiler stages one implementation packet per capability and one verify packet per change.\n\n## Failure / Edge Case Semantics\n\nIf closure status is not fully resolved, staging fails without creating packets.\n\n## Proof Obligations\n\n### Acceptance\n\n- Implementation packet is created\n- Verify packet is created\n\n### Non-Regression\n\n- Taskplane packet metadata remains valid\n\n### Required Tests\n\n- \`bun test\`\n- add adversarial coverage for staging and archive behavior\n\n### Documentation and Examples\n\n- \`README.md\`\n- \`.pi/prompts/plan-stage.md\`\n\n### Repo Gates\n\n- \`npm test\`\n- \`npm run build\`\n\n## Risks / Trade-offs\n\n- Higher upfront planning cost is acceptable.\n\n## Closure Status\n\n- Blockers: None\n- Known Unknowns: None\n- Deferred Design Choices: None\n`,
    "utf8",
  );
  await writeFile(
    path.join(root, `openspec/changes/${changeSlug}/specs/${capability}/spec.md`),
    `## ADDED Requirements\n\n### Requirement: Demo capability works\nThe system SHALL stage planner-native Taskplane packets from approved contracts.\n\n#### Scenario: Successful stage\n- **WHEN** the planner stages an approved change\n- **THEN** it creates implementation and verify packets\n`,
    "utf8",
  );
}

async function writeStandardApprovedContract(root, changeSlug, capability, options = {}) {
  const { includeTasks = true } = options;
  await writeFile(
    path.join(root, `openspec/changes/${changeSlug}/proposal.md`),
    `## Why\n\nNeed to prove planner staging works directly from standard OpenSpec artifacts.\n\n## What Changes\n\n- Add \`src/standard-change.mjs\` with the implementation for ${changeSlug}\n- Re-export the new capability from \`src/index.mjs\`\n- Add \`tests/standard-change.test.mjs\` covering the new behavior\n\n## Capabilities\n\n### New Capabilities\n- \`${capability}\`: Stage directly from standard OpenSpec proposal, design, specs, and tasks artifacts\n\n### Modified Capabilities\n- None.\n\n## Impact\n\n- \`src/standard-change.mjs\`\n- \`src/index.mjs\`\n- \`tests/standard-change.test.mjs\`\n- \`README.md\`\n`,
    "utf8",
  );
  await writeFile(
    path.join(root, `openspec/changes/${changeSlug}/design.md`),
    `## Context\n\nThis change is written in the default OpenSpec format produced by \`/opsx:propose\`.\n\n## Goals / Non-Goals\n\n**Goals:**\n- Let \`planner stage\` compile standard OpenSpec artifacts without planner-only headings\n- Keep the staged Taskplane packet explicit enough for execution\n\n**Non-Goals:**\n- Reintroduce a second planner-specific design format\n- Depend on manual post-processing before staging\n\n## Decisions\n\n- Stage from proposal, design, spec, and \`tasks.md\` when planner-only sections are absent\n- Infer file scope from artifact paths already named in proposal impact and task checklist\n\n## Risks / Trade-offs\n\n- If authors omit concrete file paths entirely, staged packets may need to fall back to narrower runtime discovery\n`,
    "utf8",
  );
  if (includeTasks) {
    await writeFile(
      path.join(root, `openspec/changes/${changeSlug}/tasks.md`),
      `## 1. Implementation\n\n- [ ] 1.1 Create \`src/standard-change.mjs\`\n- [ ] 1.2 Re-export the capability from \`src/index.mjs\`\n\n## 2. Verification\n\n- [ ] 2.1 Add \`tests/standard-change.test.mjs\` covering the successful stage scenario\n- [ ] 2.2 Update \`README.md\` if operator-facing behavior changes\n`,
      "utf8",
    );
  }
  await writeFile(
    path.join(root, `openspec/changes/${changeSlug}/specs/${capability}/spec.md`),
    `## ADDED Requirements\n\n### Requirement: Demo capability works\nThe system SHALL stage Taskplane packets from standard OpenSpec artifacts.\n\n#### Scenario: Successful stage\n- **WHEN** the planner stages an approved change created from standard OpenSpec artifacts\n- **THEN** it creates implementation and verify packets without requiring planner-only headings\n`,
    "utf8",
  );
}

async function writeResolvedOpenQuestionsContract(root, changeSlug, capability) {
  await writeFile(
    path.join(root, `openspec/changes/${changeSlug}/proposal.md`),
    `## Why\n\nNeed to prove standard OpenSpec open-question prose is accepted when fully resolved.\n\n## What Changes\n\n- Add \`src/resolved-open-questions.mjs\`\n\n## Impact\n\n- \`src/resolved-open-questions.mjs\`\n`,
    "utf8",
  );
  await writeFile(
    path.join(root, `openspec/changes/${changeSlug}/design.md`),
    `## Context\n\nThis design uses standard OpenSpec headings.\n\n## Goals / Non-Goals\n\n**Goals:**\n- accept resolved prose in open questions\n\n**Non-Goals:**\n- require planner-only closure headings\n\n## Decisions\n\n- keep the contract in standard OpenSpec form\n\n## Open Questions\n\nNone at the product-contract level for this change. All open questions have been resolved during proposal review.\n\n## Risks / Trade-offs\n\n- keep validation strict for actually unresolved questions\n`,
    "utf8",
  );
  await writeFile(
    path.join(root, `openspec/changes/${changeSlug}/specs/${capability}/spec.md`),
    `## ADDED Requirements\n\n### Requirement: Resolved open questions still stage\nThe system SHALL accept standard OpenSpec designs whose open-questions section explicitly says there are no remaining contract questions.\n\n#### Scenario: Open questions resolved in prose\n- **WHEN** the design says all contract-level questions are resolved\n- **THEN** staging succeeds\n`,
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
  const conformancePath = path.join(root, `openspec/changes/${changeSlug}/conformance.md`);
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
