import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { ARCHIVE_DIR, CHANGES_DIR, PLANNING_ROOT, SPECS_DIR } from "./constants.mjs";

export function resolveProjectPaths(cwd = process.cwd()) {
  return {
    cwd,
    planningRoot: path.join(cwd, PLANNING_ROOT),
    changesDir: path.join(cwd, CHANGES_DIR),
    specsDir: path.join(cwd, SPECS_DIR),
    archiveDir: path.join(cwd, ARCHIVE_DIR),
  };
}

export function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

export function getChangeDir(cwd, changeSlug) {
  return path.join(resolveProjectPaths(cwd).changesDir, changeSlug);
}

export function getArchivedChangeDir(cwd, changeSlug, dateStamp) {
  return path.join(resolveProjectPaths(cwd).archiveDir, `${dateStamp}-${changeSlug}`);
}

export async function exists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDir(targetPath) {
  await mkdir(targetPath, { recursive: true });
}

export async function ensurePlanningScaffold(cwd) {
  const paths = resolveProjectPaths(cwd);
  const ensured = [];
  for (const dir of [paths.planningRoot, paths.changesDir, paths.specsDir, paths.archiveDir]) {
    if (!(await exists(dir))) {
      ensured.push(path.relative(cwd, dir) || dir);
    }
    await ensureDir(dir);
  }

  for (const keepPath of [
    path.join(paths.changesDir, ".gitkeep"),
    path.join(paths.specsDir, ".gitkeep"),
    path.join(paths.archiveDir, ".gitkeep"),
  ]) {
    if (!(await exists(keepPath))) {
      await writeFile(keepPath, "", "utf8");
      ensured.push(path.relative(cwd, keepPath));
    }
  }

  return { paths, ensured };
}

export async function listActiveChanges(cwd) {
  const { changesDir } = resolveProjectPaths(cwd);
  if (!(await exists(changesDir))) return [];
  const entries = await readdir(changesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}
