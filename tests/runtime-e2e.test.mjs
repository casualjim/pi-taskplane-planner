import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { archiveChange } from "../src/archive.mjs";
import { parseConformanceVerdict } from "../src/conformance.mjs";
import { stageChange } from "../src/stage.mjs";

const runtimeEnabled = process.env.PLANNER_RUNTIME_E2E === "1";
const runtimeTest = runtimeEnabled ? test : test.skip;
const RUNTIME_E2E_MODEL = process.env.PLANNER_RUNTIME_E2E_MODEL || "openai-codex/gpt-5.4-mini";
const RUNTIME_E2E_THINKING = process.env.PLANNER_RUNTIME_E2E_THINKING || "medium";

let cwd;
let spawnedProcesses = [];
let patchedTaskplaneExecution = null;
let previousWorkerModelEnv;
let previousWorkerThinkingEnv;

beforeEach(async () => {
  cwd = await mkdtemp(path.join(os.tmpdir(), "planner-runtime-e2e-"));
  spawnedProcesses = [];
  previousWorkerModelEnv = process.env.TASKPLANE_WORKER_MODEL;
  previousWorkerThinkingEnv = process.env.TASKPLANE_WORKER_THINKING;
  process.env.TASKPLANE_WORKER_MODEL = RUNTIME_E2E_MODEL;
  process.env.TASKPLANE_WORKER_THINKING = RUNTIME_E2E_THINKING;
});

afterEach(async () => {
  for (const proc of spawnedProcesses) {
    try {
      proc.kill("SIGKILL");
      await proc.exited;
    } catch {
      // best-effort cleanup for opt-in runtime test helpers
    }
  }
  spawnedProcesses = [];
  if (patchedTaskplaneExecution) {
    await writeFile(patchedTaskplaneExecution.path, patchedTaskplaneExecution.original, "utf8");
    patchedTaskplaneExecution = null;
  }
  if (previousWorkerModelEnv === undefined) delete process.env.TASKPLANE_WORKER_MODEL;
  else process.env.TASKPLANE_WORKER_MODEL = previousWorkerModelEnv;
  if (previousWorkerThinkingEnv === undefined) delete process.env.TASKPLANE_WORKER_THINKING;
  else process.env.TASKPLANE_WORKER_THINKING = previousWorkerThinkingEnv;
  if (cwd) {
    await rm(cwd, { recursive: true, force: true });
  }
});

describe("planner runtime E2E (opt-in)", () => {
  runtimeTest(
    "executes a planner-generated implementation packet through Taskplane and archives after deterministic conformance checks",
    async () => {
      await setupRuntimeRepo(cwd);
      await scaffoldOpenSpecChange(cwd, "runtime-flow", "runtime-e2e-capability");
      await writeRuntimeApprovedContract(cwd, "runtime-flow", "runtime-e2e-capability");

      const staged = await stageChange(cwd, "runtime-flow");
      expect(staged.created).toHaveLength(2);
      const [implementationFolder, verifyFolder] = staged.created;

      await git(cwd, ["add", "."]);
      await git(cwd, ["commit", "-m", "chore: seed runtime e2e repo"]);

      const taskplane = await loadTaskplaneRuntime();
      const orchConfig = taskplane.loadOrchestratorConfig(cwd);
      const runnerConfig = taskplane.loadTaskRunnerConfig(cwd);
      const batchState = taskplane.freshOrchBatchState();
      const notifications = [];

      await taskplane.executeOrchBatch(
        `${implementationFolder}/PROMPT.md`,
        orchConfig,
        runnerConfig,
        cwd,
        batchState,
        (message, level) => notifications.push({ message, level }),
      );

      expect(batchState.phase).toBe("completed");
      expect(batchState.failedTasks).toBe(0);
      expect(batchState.succeededTasks).toBe(1);
      expect(batchState.orchBranch).toBeTruthy();

      const runtimeEvents = await readRuntimeEvents(cwd, batchState);
      expect(runtimeEvents).toContain("PHASE-IMPLEMENTATION.md");
      expect(runtimeEvents).not.toContain("PHASE-CONFORMANCE.md");

      await git(cwd, ["checkout", batchState.baseBranch]);
      await git(cwd, ["merge", "--ff-only", batchState.orchBranch]);

      const implementationOutput = await readFile(path.join(cwd, "src/runtime-e2e.mjs"), "utf8");
      expect(implementationOutput).toContain('RUNTIME_E2E_MARKER = "runtime-e2e"');

      const rootExports = await readFile(path.join(cwd, "src/index.mjs"), "utf8");
      expect(rootExports).toContain("RUNTIME_E2E_MARKER");
      expect(rootExports).toContain("EXISTING_VALUE");

      const generatedTest = await readFile(path.join(cwd, "tests/runtime-e2e.generated.test.mjs"), "utf8");
      expect(generatedTest).toContain("RUNTIME_E2E_MARKER");
      expect(generatedTest).toContain("EXISTING_VALUE");

      expect(await exists(path.join(cwd, verifyFolder, "PROMPT.md"))).toBe(true);
      expect(await exists(path.join(cwd, verifyFolder, "STATUS.md"))).toBe(true);

      const conformanceProbe = spawnTaskplaneBatch(cwd, taskplane.taskplaneRoot, `${verifyFolder}/PROMPT.md`);
      spawnedProcesses.push(conformanceProbe);
      const conformanceBatchId = await waitForNewBatchId(cwd, batchState.batchId);
      const conformanceEvents = await waitForPhaseDocRead(cwd, conformanceBatchId, "PHASE-CONFORMANCE.md");
      expect(conformanceEvents).toContain("PHASE-CONFORMANCE.md");
      expect(conformanceEvents).not.toContain("PHASE-IMPLEMENTATION.md");
      conformanceProbe.kill("SIGKILL");
      await conformanceProbe.exited;
      spawnedProcesses = spawnedProcesses.filter((proc) => proc !== conformanceProbe);

      await writeArchiveReadyConformance(cwd, "runtime-flow");
      const conformance = await readFile(path.join(cwd, "openspec/changes/runtime-flow/conformance.md"), "utf8");
      const verdict = parseConformanceVerdict(conformance);
      expect(verdict.ok).toBe(true);
      expect(verdict.verdict).toBe("ARCHIVE_READY");

      const archived = await archiveChange(cwd, "runtime-flow");
      expect(await exists(path.join(cwd, archived.archivedTo))).toBe(true);
      expect(await exists(path.join(cwd, "openspec/specs/runtime-e2e-capability/spec.md"))).toBe(true);
      expect(notifications.length).toBeGreaterThan(0);
    },
    10 * 60 * 1000,
  );
});

async function setupRuntimeRepo(root) {
  await mkdir(path.join(root, ".pi"), { recursive: true });
  await mkdir(path.join(root, "taskplane-tasks"), { recursive: true });
  await mkdir(path.join(root, "src"), { recursive: true });
  await mkdir(path.join(root, "tests"), { recursive: true });  await writeFile(
    path.join(root, ".pi/taskplane-config.json"),
    JSON.stringify(
      {
        configVersion: 1,
        taskRunner: {
          project: { name: "planner-runtime-e2e" },
          paths: { tasks: "taskplane-tasks" },
          testing: {
            commands: {
              unit: "npm test",
              build: "npm run build",
            },
          },
          worker: {
            model: RUNTIME_E2E_MODEL,
            thinking: RUNTIME_E2E_THINKING,
            tools: "read,write,edit,bash,grep,find,ls",
          },
          reviewer: {
            model: RUNTIME_E2E_MODEL,
            thinking: RUNTIME_E2E_THINKING,
            tools: "read,bash,grep,find,ls",
          },
          taskAreas: {
            general: {
              path: "taskplane-tasks",
              prefix: "TP",
              context: "taskplane-tasks/CONTEXT.md",
            },
          },
        },
        orchestrator: {
          orchestrator: {
            maxLanes: 1,
            spawnMode: "subprocess",
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

  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify(
      {
        name: "planner-runtime-e2e",
        type: "module",
        private: true,
        scripts: {
          test: "node --test tests/*.test.mjs",
          build: "node -e \"console.log('build ok')\"",
        },
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  await writeFile(
    path.join(root, "README.md"),
    "# Runtime E2E Fixture\n\nThis repo exists only for planner runtime integration tests.\n",
    "utf8",
  );

  await writeFile(
    path.join(root, "src/index.mjs"),
    'export const EXISTING_VALUE = "existing";\n',
    "utf8",
  );

  await writeFile(
    path.join(root, "tests/existing.test.mjs"),
    'import test from "node:test";\nimport assert from "node:assert/strict";\nimport { EXISTING_VALUE } from "../src/index.mjs";\n\ntest("existing export remains stable", () => {\n  assert.equal(EXISTING_VALUE, "existing");\n});\n',
    "utf8",
  );

  await git(root, ["init"]);
  await git(root, ["config", "user.email", "planner-e2e@example.com"]);
  await git(root, ["config", "user.name", "Planner Runtime E2E"]);
}

async function scaffoldOpenSpecChange(root, changeSlug, capability) {
  const specsDir = path.join(root, `openspec/changes/${changeSlug}/specs/${capability}`);
  await mkdir(specsDir, { recursive: true });
}

async function writeRuntimeApprovedContract(root, changeSlug, capability) {
  await writeFile(
    path.join(root, `openspec/changes/${changeSlug}/proposal.md`),
    `## Why\n\nWe need a real runtime smoke test that proves the planner can hand Taskplane a change that actually executes.\n\n## Change Summary\n\nAdd a tiny exported marker module and test coverage so planner staging and Taskplane execution can be exercised end to end with a bounded runtime footprint.\n\n## Scope Boundaries\n\n### In Scope\n\n- add a tiny runtime marker export\n- add a test for the new export\n\n### Out of Scope\n\n- rebuild orchestration\n- change existing runtime semantics beyond the new export\n- require the runtime smoke task to also perform final archive verification\n\n## Spec Impact\n\n### New Capabilities\n\n- \`${capability}\`: exercise planner staging and Taskplane runtime execution end to end\n\n### Modified Capabilities\n\n- None.\n\n## User / Operator / Interface Impact\n\nThe root module gains a new exported constant named \`RUNTIME_E2E_MARKER\`.\n\n## Risks / Constraints\n\n- Keep the change tiny so runtime execution stays deterministic and time-bounded.\n`,
    "utf8",
  );

  await writeFile(
    path.join(root, `openspec/changes/${changeSlug}/design.md`),
    `## Context\n\nThis change is a runtime integration fixture for the planner and Taskplane.\n\n## Goals / Non-Goals\n\n**Goals:**\n- prove a staged implementation packet can execute through Taskplane\n- preserve the existing root export\n\n**Non-Goals:**\n- rebuild Taskplane\n- introduce additional abstractions\n- require the runtime smoke path to execute whole-change conformance in the same opt-in test\n\n## Key Decisions\n\n### Decision: Use a tiny export and focused regression test\n- **Chosen option:** add a single new export and one dedicated test file\n- **Why:** this keeps runtime execution small and verifiable\n- **Rejected alternatives:** broad implementation tasks that would make runtime e2e flaky or slow\n\n## Requested Delta\n\nCreate \`src/runtime-e2e.mjs\` exporting \`RUNTIME_E2E_MARKER = \"runtime-e2e\"\`, re-export that constant from \`src/index.mjs\`, and add \`tests/runtime-e2e.generated.test.mjs\` covering the new export and the existing export.\n\n## Preservation Constraints\n\n- keep \`EXISTING_VALUE\` exported from \`src/index.mjs\` unchanged\n- do not change package scripts\n- do not weaken existing tests\n\n## Public Interface Deltas\n\n- Old: \`src/index.mjs\` exports only \`EXISTING_VALUE\`\n- New: \`src/index.mjs\` also exports \`RUNTIME_E2E_MARKER\`\n- Existing consumers of \`EXISTING_VALUE\` remain fully compatible\n\n## Module Ownership and Edit Surface\n\n- \`src/runtime-e2e.mjs\` — new module that owns the marker constant\n- \`src/index.mjs\` — re-export the new constant while preserving the old export\n- \`tests/runtime-e2e.generated.test.mjs\` — assert the new export and preserve the existing export behavior\n\n## Behavioral Semantics\n\nThe root module exports \`RUNTIME_E2E_MARKER\` with the exact string value \`runtime-e2e\` and continues exporting \`EXISTING_VALUE\` unchanged.\n\n## Failure / Edge Case Semantics\n\nIf the new module is missing or not re-exported correctly, the generated runtime test must fail.\n\n## Proof Obligations\n\n### Acceptance\n\n- \`src/runtime-e2e.mjs\` exists and exports \`RUNTIME_E2E_MARKER = \"runtime-e2e\"\`\n- \`src/index.mjs\` re-exports \`RUNTIME_E2E_MARKER\`\n\n### Non-Regression\n\n- \`EXISTING_VALUE\` remains exported and equal to \`existing\`\n- package scripts remain unchanged\n\n### Required Tests\n\n- add \`tests/runtime-e2e.generated.test.mjs\` covering the new export and existing export\n- run \`npm test\`\n\n### Documentation and Examples\n\n- None required for this runtime smoke fixture.\n\n### Repo Gates\n\n- \`npm test\`\n- \`npm run build\`\n\n## Risks / Trade-offs\n\n- This fixture favors determinism over breadth.\n\n## Closure Status\n\n- Blockers: None\n- Known Unknowns: None\n- Deferred Design Choices: None\n`,
    "utf8",
  );

  await writeFile(
    path.join(root, `openspec/changes/${changeSlug}/specs/${capability}/spec.md`),
    `## ADDED Requirements\n\n### Requirement: Runtime E2E marker export exists\nThe system SHALL expose a root export named \`RUNTIME_E2E_MARKER\` with the exact value \`runtime-e2e\`.\n\n#### Scenario: Successful runtime e2e export\n- **WHEN** a consumer imports \`RUNTIME_E2E_MARKER\` from the root module\n- **THEN** the value equals \`runtime-e2e\`\n\n### Requirement: Existing export remains stable\nThe system SHALL preserve the existing root export while adding the runtime e2e marker.\n\n#### Scenario: Existing export still works\n- **WHEN** a consumer imports \`EXISTING_VALUE\` from the root module\n- **THEN** the value still equals \`existing\`\n`,
    "utf8",
  );
}

async function writeArchiveReadyConformance(root, changeSlug) {
  await writeFile(
    path.join(root, `openspec/changes/${changeSlug}/conformance.md`),
    `# Conformance Report: ${changeSlug}\n\n**Status:** Complete\n**Verdict:** ARCHIVE_READY\n\n## Summary\n\nThe runtime smoke fixture passed deterministic post-integration checks. The planner-generated implementation packet executed through Taskplane, the resulting orch branch was fast-forward integrated, and the expected code and test artifacts were present afterward.\n\n## Findings\n\n### CRITICAL\n\n- None.\n\n### WARNING\n\n- None.\n\n### SUGGESTION\n\n- None.\n\n## Evidence\n\n- src/runtime-e2e.mjs\n- src/index.mjs\n- tests/runtime-e2e.generated.test.mjs\n\n## Disposition\n\n- ARCHIVE_READY\n`,
    "utf8",
  );
}

async function git(root, args) {
  const proc = Bun.spawn({
    cmd: ["git", ...args],
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed:\n${stdout}\n${stderr}`);
  }
  return stdout;
}

async function loadTaskplaneRuntime() {
  const taskplaneBin = Bun.which("taskplane");
  if (!taskplaneBin) {
    throw new Error("taskplane CLI not found on PATH");
  }

  const realBinProc = Bun.spawn({
    cmd: ["node", "-e", `console.log(require('node:fs').realpathSync(process.argv[1]))`, taskplaneBin],
    stdout: "pipe",
    stderr: "pipe",
  });
  const realBin = (await new Response(realBinProc.stdout).text()).trim();
  const taskplaneRoot = path.dirname(path.dirname(realBin));

  await patchTaskplaneWorkerModelSupport(taskplaneRoot);

  const engine = await import(pathToFileURL(path.join(taskplaneRoot, "extensions/taskplane/engine.ts")).href);
  const config = await import(pathToFileURL(path.join(taskplaneRoot, "extensions/taskplane/config.ts")).href);
  const types = await import(pathToFileURL(path.join(taskplaneRoot, "extensions/taskplane/types.ts")).href);

  return {
    taskplaneRoot,
    executeOrchBatch: engine.executeOrchBatch,
    loadOrchestratorConfig: config.loadOrchestratorConfig,
    loadTaskRunnerConfig: config.loadTaskRunnerConfig,
    freshOrchBatchState: types.freshOrchBatchState,
  };
}

async function patchTaskplaneWorkerModelSupport(taskplaneRoot) {
  const executionPath = path.join(taskplaneRoot, "extensions/taskplane/execution.ts");
  const original = await readFile(executionPath, "utf8");
  if (original.includes("TASKPLANE_WORKER_MODEL")) {
    if (!patchedTaskplaneExecution) {
      patchedTaskplaneExecution = { path: executionPath, original };
    }
    return;
  }

  const patched = original
    .replace(
      'workerModel: "",',
      'workerModel: process.env.TASKPLANE_WORKER_MODEL || extraEnvVars?.TASKPLANE_WORKER_MODEL || "",',
    )
    .replace(
      'workerThinking: "",',
      'workerThinking: process.env.TASKPLANE_WORKER_THINKING || extraEnvVars?.TASKPLANE_WORKER_THINKING || "",',
    );

  if (patched === original) {
    throw new Error("Failed to patch taskplane execution.ts for worker model support");
  }

  await writeFile(executionPath, patched, "utf8");
  patchedTaskplaneExecution = { path: executionPath, original };
}

function spawnTaskplaneBatch(root, taskplaneRoot, promptPath) {
  const script = `
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.TASKPLANE_WORKER_MODEL = ${JSON.stringify(RUNTIME_E2E_MODEL)};
process.env.TASKPLANE_WORKER_THINKING = ${JSON.stringify(RUNTIME_E2E_THINKING)};

const [root, taskplaneRoot, promptPath] = process.argv.slice(1);
const executionPath = path.join(taskplaneRoot, "extensions/taskplane/execution.ts");
const fs = await import("node:fs/promises");
let executionSource = await fs.readFile(executionPath, "utf8");
if (!executionSource.includes("TASKPLANE_WORKER_MODEL")) {
  executionSource = executionSource
    .replace('workerModel: "",', 'workerModel: process.env.TASKPLANE_WORKER_MODEL || extraEnvVars?.TASKPLANE_WORKER_MODEL || "",')
    .replace('workerThinking: "",', 'workerThinking: process.env.TASKPLANE_WORKER_THINKING || extraEnvVars?.TASKPLANE_WORKER_THINKING || "",');
  await fs.writeFile(executionPath, executionSource, "utf8");
}
const engine = await import(pathToFileURL(path.join(taskplaneRoot, "extensions/taskplane/engine.ts")).href);
const config = await import(pathToFileURL(path.join(taskplaneRoot, "extensions/taskplane/config.ts")).href);
const types = await import(pathToFileURL(path.join(taskplaneRoot, "extensions/taskplane/types.ts")).href);
const orchConfig = config.loadOrchestratorConfig(root);
const runnerConfig = config.loadTaskRunnerConfig(root);
const batchState = types.freshOrchBatchState();
await engine.executeOrchBatch(promptPath, orchConfig, runnerConfig, root, batchState, () => {});
`;

  return Bun.spawn({
    cmd: [process.execPath, "-e", script, root, taskplaneRoot, promptPath],
    cwd: root,
    stdout: "ignore",
    stderr: "pipe",
  });
}

async function waitForNewBatchId(root, previousBatchId, timeoutMs = 60_000) {
  const statePath = path.join(root, ".pi", "batch-state.json");
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await exists(statePath)) {
      try {
        const state = JSON.parse(await readFile(statePath, "utf8"));
        if (state?.batchId && state.batchId !== previousBatchId) {
          return state.batchId;
        }
      } catch {
        // file may be mid-write; retry
      }
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for a new batch ID in ${statePath}`);
}

async function waitForPhaseDocRead(root, batchId, phaseDocName, timeoutMs = 120_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const agentsDir = path.join(root, ".pi", "runtime", batchId, "agents");
    if (await exists(agentsDir)) {
      const entries = await readdir(agentsDir, { withFileTypes: true });
      const workerDirs = entries.filter((entry) => entry.isDirectory() && entry.name.includes("worker"));
      for (const entry of workerDirs) {
        const eventsPath = path.join(agentsDir, entry.name, "events.jsonl");
        if (!(await exists(eventsPath))) continue;
        const events = await readFile(eventsPath, "utf8");
        if (events.includes(phaseDocName)) {
          return events;
        }
      }
    }
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for runtime event referencing ${phaseDocName} in batch ${batchId}`);
}

async function readRuntimeEvents(root, batchState) {
  const agentsDir = path.join(root, ".pi", "runtime", batchState.batchId, "agents");
  const entries = await readdir(agentsDir, { withFileTypes: true });
  const workerDirs = entries.filter((entry) => entry.isDirectory() && entry.name.includes("worker"));
  if (workerDirs.length === 0) {
    throw new Error(`Could not resolve runtime worker session under ${agentsDir}`);
  }
  const eventBodies = await Promise.all(
    workerDirs.map((entry) => readFile(path.join(agentsDir, entry.name, "events.jsonl"), "utf8")),
  );
  return eventBodies.join("\n");
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function exists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}
