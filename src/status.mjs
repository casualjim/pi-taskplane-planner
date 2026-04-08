import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseConformanceVerdict } from "./conformance.mjs";
import { listActiveChanges, getChangeDir, resolveProjectPaths, exists } from "./paths.mjs";
import { validateChangeContract } from "./validate.mjs";

export async function plannerStatus(cwd, changeSlug = null) {
  if (changeSlug) {
    return describeChange(cwd, changeSlug);
  }

  const changes = await listActiveChanges(cwd);
  return {
    changes: await Promise.all(changes.map((slug) => describeChange(cwd, slug))),
  };
}

async function describeChange(cwd, changeSlug) {
  const changeDir = getChangeDir(cwd, changeSlug);
  const proposalPath = path.join(changeDir, "proposal.md");
  const designPath = path.join(changeDir, "design.md");
  const conformancePath = path.join(changeDir, "conformance.md");
  const validation = await validateChangeContract(cwd, changeSlug).catch((error) => ({ valid: false, errors: [error.message], specFiles: [] }));
  const conformance = (await exists(conformancePath)) ? parseConformanceVerdict(await readFile(conformancePath, "utf8")) : { verdict: null };
  const stagedPackets = await findStagedPackets(cwd, changeSlug);
  return {
    change: changeSlug,
    proposal: await exists(proposalPath),
    design: await exists(designPath),
    specs: validation.specFiles?.length ?? 0,
    contractReady: validation.valid,
    errors: validation.errors ?? [],
    stagedPackets,
    conformanceVerdict: conformance.verdict,
  };
}

async function findStagedPackets(cwd, changeSlug) {
  const taskRoot = path.join(cwd, "taskplane-tasks");
  if (!(await exists(taskRoot))) return [];
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(taskRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name.includes(changeSlug))
    .map((entry) => path.posix.join("taskplane-tasks", entry.name))
    .sort();
}
