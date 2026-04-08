import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { allocateTaskIds, ensureTaskplanePhaseDocs, getPhaseContextPath } from "./context.mjs";
import { getSection } from "./markdown.mjs";
import { buildConformancePrompt, buildConformanceStatus, buildImplementationPrompt, buildImplementationStatus, writeTaskPacket } from "./taskplane.mjs";
import { validateChangeContract } from "./validate.mjs";
import { getChangeDir, exists } from "./paths.mjs";

export async function stageChange(cwd, changeSlug) {
  const validation = await validateChangeContract(cwd, changeSlug);
  if (!validation.valid) {
    const error = new Error(`Cannot stage ${changeSlug}; contract validation failed.`);
    error.details = validation.errors;
    throw error;
  }

  const changeDir = getChangeDir(cwd, changeSlug);
  const specEntries = await loadSpecEntries(changeDir);
  if (specEntries.length === 0) {
    throw new Error(`Cannot stage ${changeSlug}; no capability specs found.`);
  }

  const existingTaskFolders = await findExistingTaskFolders(cwd, changeSlug);
  await ensureTaskplanePhaseDocs(cwd);
  if (existingTaskFolders.length > 0) {
    throw new Error(`Change ${changeSlug} already has staged Taskplane packets: ${existingTaskFolders.join(", ")}`);
  }

  const { area, ids } = await allocateTaskIds(cwd, specEntries.length + 1);
  const created = [];

  for (const [index, specEntry] of specEntries.entries()) {
    const taskId = ids[index];
    const folderName = `${taskId}-${changeSlug}-${specEntry.capabilityName}`;
    const relativeFolder = path.join(area.path, folderName).replace(/\\/g, "/");
    const prompt = buildImplementationPrompt({
      taskId,
      folderPath: relativeFolder,
      changeSlug,
      capabilityName: specEntry.capabilityName,
      proposalPath: path.relative(cwd, validation.proposalPath).replace(/\\/g, "/"),
      designPath: path.relative(cwd, validation.designPath).replace(/\\/g, "/"),
      specPath: path.relative(cwd, specEntry.specPath).replace(/\\/g, "/"),
      proposal: validation.proposal,
      design: validation.design,
      spec: specEntry.content,
      areaContextPath: area.context,
      phaseContextPath: getPhaseContextPath(area.context, "implementation"),
    });
    const status = buildImplementationStatus({ taskId, changeSlug, capabilityName: specEntry.capabilityName });
    await writeTaskPacket({ folder: path.join(cwd, relativeFolder), prompt, status });
    created.push(relativeFolder);
  }

  const verifyTaskId = ids.at(-1);
  const verifyFolderName = `${verifyTaskId}-verify-${changeSlug}`;
  const verifyRelativeFolder = path.join(area.path, verifyFolderName).replace(/\\/g, "/");
  const verifyPrompt = buildConformancePrompt({
    taskId: verifyTaskId,
    folderPath: verifyRelativeFolder,
    changeSlug,
    proposalPath: path.relative(cwd, validation.proposalPath).replace(/\\/g, "/"),
    designPath: path.relative(cwd, validation.designPath).replace(/\\/g, "/"),
    specPaths: specEntries.map((entry) => path.relative(cwd, entry.specPath).replace(/\\/g, "/")),
    implementationTaskIds: ids.slice(0, -1),
    conformanceReportPath: `planning/changes/${changeSlug}/conformance.md`,
    areaContextPath: area.context,
    phaseContextPath: getPhaseContextPath(area.context, "conformance"),
  });
  const verifyStatus = buildConformanceStatus({ taskId: verifyTaskId, changeSlug });
  await writeTaskPacket({ folder: path.join(cwd, verifyRelativeFolder), prompt: verifyPrompt, status: verifyStatus });
  created.push(verifyRelativeFolder);

  return {
    changeSlug,
    created,
    verifyTaskId,
    implementationTaskIds: ids.slice(0, -1),
    instruction: `Run /orch ${created.map((folder) => `${folder}/PROMPT.md`).join(" ")}`,
  };
}

async function loadSpecEntries(changeDir) {
  const specsDir = path.join(changeDir, "specs");
  const entries = await readdir(specsDir, { withFileTypes: true });
  const specs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const specPath = path.join(specsDir, entry.name, "spec.md");
    if (!(await exists(specPath))) continue;
    const content = await readFile(specPath, "utf8");
    specs.push({ capabilityName: entry.name, specPath, content, requirements: getSection(content, "ADDED Requirements", 2) });
  }
  return specs.sort((a, b) => a.capabilityName.localeCompare(b.capabilityName));
}

async function findExistingTaskFolders(cwd, changeSlug) {
  const taskRoot = path.join(cwd, "taskplane-tasks");
  if (!(await exists(taskRoot))) return [];
  const entries = await readdir(taskRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name.includes(changeSlug))
    .map((entry) => path.posix.join("taskplane-tasks", entry.name))
    .sort();
}
