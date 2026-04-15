import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  OPENSPEC_ARCHIVE_DIR,
  OPENSPEC_CHANGES_DIR,
  OPENSPEC_ROOT,
  OPENSPEC_SPECS_DIR,
  DEFAULT_TASK_ROOT,
  DEFAULT_TASK_PREFIX,
  DEFAULT_TASK_CONTEXT,
} from "./constants.mjs";

export function resolveOpenSpecPaths(cwd = process.cwd()) {
  return {
    cwd,
    openspecRoot: path.join(cwd, OPENSPEC_ROOT),
    changesDir: path.join(cwd, OPENSPEC_CHANGES_DIR),
    specsDir: path.join(cwd, OPENSPEC_SPECS_DIR),
    archiveDir: path.join(cwd, OPENSPEC_ARCHIVE_DIR),
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
  return path.join(resolveOpenSpecPaths(cwd).changesDir, changeSlug);
}

export function getArchivedChangeDir(cwd, changeSlug, dateStamp) {
  return path.join(resolveOpenSpecPaths(cwd).archiveDir, `${dateStamp}-${changeSlug}`);
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

export async function listActiveChanges(cwd) {
  const { changesDir } = resolveOpenSpecPaths(cwd);
  if (!(await exists(changesDir))) return [];
  const entries = await readdir(changesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name !== "archive")
    .map((entry) => entry.name)
    .sort();
}

/**
 * Resolve Taskplane task area config from .pi/taskplane-config.json.
 */
export async function loadTaskArea(cwd) {
  const configPath = path.join(cwd, ".pi", "taskplane-config.json");
  if (await exists(configPath)) {
    const raw = await import("node:fs/promises").then((fs) => fs.readFile(configPath, "utf8"));
    const config = JSON.parse(raw);
    const areas = config?.taskRunner?.taskAreas ?? {};
    const [name, area] = Object.entries(areas)[0] ?? [];
    if (name && area) {
      return { name, path: area.path, prefix: area.prefix, context: area.context };
    }
  }
  return {
    name: "general",
    path: DEFAULT_TASK_ROOT,
    prefix: DEFAULT_TASK_PREFIX,
    context: DEFAULT_TASK_CONTEXT,
  };
}
