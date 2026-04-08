import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureTaskplanePhaseDocs } from "./context.mjs";
import { getChangeDir, ensureDir, ensurePlanningScaffold, exists, slugify } from "./paths.mjs";
import { conformanceTemplate, deltaSpecTemplate, designTemplate, proposalTemplate } from "./templates.mjs";

export async function initPlanner(cwd = process.cwd()) {
  const scaffold = await ensurePlanningScaffold(cwd);
  const taskplane = await ensureTaskplanePhaseDocs(cwd);
  return { ...scaffold, ensured: [...scaffold.ensured, ...taskplane.ensured] };
}

export async function doctorPlanner(cwd = process.cwd(), { fix = true } = {}) {
  const report = [];
  const { paths } = await ensurePlanningScaffold(cwd);

  for (const [label, dir] of [
    ["planningRoot", paths.planningRoot],
    ["changesDir", paths.changesDir],
    ["specsDir", paths.specsDir],
    ["archiveDir", paths.archiveDir],
  ]) {
    const ok = await exists(dir);
    report.push({ label, path: path.relative(cwd, dir), ok });
    if (!ok && fix) await ensureDir(dir);
  }

  const taskplane = await ensureTaskplanePhaseDocs(cwd, { fix });
  for (const entry of taskplane.report) {
    report.push({
      label: entry.label,
      path: entry.path,
      ok: entry.ok,
    });
  }

  return { ok: report.every((entry) => entry.ok), report };
}

export async function scaffoldChange(cwd, rawChangeSlug, capabilities = []) {
  const changeSlug = slugify(rawChangeSlug);
  if (!changeSlug) {
    throw new Error("Change slug must not be empty");
  }

  await ensurePlanningScaffold(cwd);
  const changeDir = getChangeDir(cwd, changeSlug);
  const specsDir = path.join(changeDir, "specs");
  await ensureDir(specsDir);

  const created = [];

  const proposalPath = path.join(changeDir, "proposal.md");
  if (!(await exists(proposalPath))) {
    await writeFile(proposalPath, proposalTemplate(changeSlug), "utf8");
    created.push(path.relative(cwd, proposalPath));
  }

  const designPath = path.join(changeDir, "design.md");
  if (!(await exists(designPath))) {
    await writeFile(designPath, designTemplate(changeSlug), "utf8");
    created.push(path.relative(cwd, designPath));
  }

  const conformancePath = path.join(changeDir, "conformance.md");
  if (!(await exists(conformancePath))) {
    await writeFile(conformancePath, conformanceTemplate(changeSlug), "utf8");
    created.push(path.relative(cwd, conformancePath));
  }

  const specKeep = path.join(specsDir, ".gitkeep");
  if (!(await exists(specKeep))) {
    await writeFile(specKeep, "", "utf8");
    created.push(path.relative(cwd, specKeep));
  }

  for (const capability of capabilities.map(slugify).filter(Boolean)) {
    const capabilityDir = path.join(specsDir, capability);
    await ensureDir(capabilityDir);
    const specPath = path.join(capabilityDir, "spec.md");
    if (!(await exists(specPath))) {
      await writeFile(specPath, deltaSpecTemplate(capability), "utf8");
      created.push(path.relative(cwd, specPath));
    }
  }

  return {
    changeSlug,
    changeDir,
    created,
    existingCapabilities: await listCapabilities(changeDir),
  };
}

export async function listCapabilities(changeDir) {
  const specsDir = path.join(changeDir, "specs");
  if (!(await exists(specsDir))) return [];
  const entries = await readdir(specsDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}
