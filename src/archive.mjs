import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseConformanceVerdict } from "./conformance.mjs";
import { getArchivedChangeDir, getChangeDir, resolveOpenSpecPaths, exists } from "./paths.mjs";

export async function archiveChange(cwd, changeSlug) {
  const changeDir = getChangeDir(cwd, changeSlug);
  if (!(await exists(changeDir))) {
    throw new Error(`Unknown change: ${changeSlug}`);
  }

  const conformancePath = path.join(changeDir, "conformance.md");
  if (!(await exists(conformancePath))) {
    throw new Error(`Missing conformance report: ${path.relative(cwd, conformancePath)}`);
  }

  const conformance = await readFile(conformancePath, "utf8");
  const verdict = parseConformanceVerdict(conformance);
  if (!verdict.ok) {
    throw new Error(`Cannot archive ${changeSlug}: ${verdict.reason}`);
  }

  await syncDeltaSpecs(cwd, changeSlug);

  const dateStamp = new Date().toISOString().slice(0, 10);
  const archiveDir = getArchivedChangeDir(cwd, changeSlug, dateStamp);
  if (await exists(archiveDir)) {
    throw new Error(`Archive target already exists: ${path.relative(cwd, archiveDir)}`);
  }

  await mkdir(path.dirname(archiveDir), { recursive: true });
  await rename(changeDir, archiveDir);

  return {
    changeSlug,
    archivedTo: path.relative(cwd, archiveDir),
    syncedSpecsTo: resolveOpenSpecPaths(cwd).specsDir,
  };
}

export async function syncDeltaSpecs(cwd, changeSlug) {
  const { specsDir } = resolveOpenSpecPaths(cwd);
  const changeSpecsDir = path.join(getChangeDir(cwd, changeSlug), "specs");
  await mkdir(specsDir, { recursive: true });

  const capabilities = await listCapabilityDirs(changeSpecsDir);
  const updated = [];

  for (const capability of capabilities) {
    const deltaPath = path.join(changeSpecsDir, capability, "spec.md");
    const mainPath = path.join(specsDir, capability, "spec.md");
    await mkdir(path.dirname(mainPath), { recursive: true });
    const delta = await readFile(deltaPath, "utf8");
    const nextMain = await applyDelta(await readIfExists(mainPath), delta, capability);
    await writeFile(mainPath, nextMain, "utf8");
    updated.push(path.relative(cwd, mainPath));
  }

  return updated;
}

async function listCapabilityDirs(specsDir) {
  if (!(await exists(specsDir))) return [];
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(specsDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function readIfExists(filePath) {
  if (!(await exists(filePath))) return "";
  return readFile(filePath, "utf8");
}

async function applyDelta(existingMain, delta, capability) {
  const mainMap = parseRequirementDocument(existingMain);
  const deltaSections = parseDeltaSections(delta);

  for (const block of deltaSections.added) {
    mainMap.set(block.name, block.body);
  }
  for (const block of deltaSections.modified) {
    mainMap.set(block.name, block.body);
  }
  for (const block of deltaSections.removed) {
    mainMap.delete(block.name);
  }
  for (const rename of deltaSections.renamed) {
    if (mainMap.has(rename.from)) {
      const body = mainMap.get(rename.from);
      mainMap.delete(rename.from);
      mainMap.set(rename.to, body.replace(`### Requirement: ${rename.from}`, `### Requirement: ${rename.to}`));
    }
  }

  const requirements = [...mainMap.values()].join("\n\n").trim();
  return `# ${capability}\n\n## Requirements\n\n${requirements}\n`;
}

function parseRequirementDocument(markdown) {
  const map = new Map();
  for (const block of splitRequirementBlocks(markdown)) {
    const nameMatch = block.match(/^### Requirement:\s*(.+)$/m);
    if (!nameMatch) continue;
    map.set(nameMatch[1].trim(), block);
  }
  return map;
}

function parseDeltaSections(markdown) {
  return {
    added: parseBlocksUnder(markdown, "ADDED Requirements"),
    modified: parseBlocksUnder(markdown, "MODIFIED Requirements"),
    removed: parseBlocksUnder(markdown, "REMOVED Requirements"),
    renamed: parseRenames(markdown),
  };
}

function parseBlocksUnder(markdown, sectionTitle) {
  const section = extractTopSection(markdown, sectionTitle);
  return splitRequirementBlocks(section)
    .map((body) => {
      const nameMatch = body.match(/^### Requirement:\s*(.+)$/m);
      if (!nameMatch) return null;
      return { name: nameMatch[1].trim(), body };
    })
    .filter(Boolean);
}

function parseRenames(markdown) {
  const section = extractTopSection(markdown, "RENAMED Requirements");
  const matches = [...section.matchAll(/- FROM:\s*`?### Requirement:\s*(.+?)`?\s*\n- TO:\s*`?### Requirement:\s*(.+?)`?/gm)];
  return matches.map((match) => ({ from: match[1].trim(), to: match[2].trim() }));
}

function extractTopSection(markdown, title) {
  const lines = markdown.split(/\r?\n/);
  const sectionHeader = `## ${title}`;
  let collecting = false;
  const buffer = [];

  for (const line of lines) {
    if (!collecting) {
      if (line.trim() === sectionHeader) {
        collecting = true;
      }
      continue;
    }

    if (/^##\s+/.test(line)) break;
    buffer.push(line);
  }

  return buffer.join("\n").trim();
}

function splitRequirementBlocks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let buffer = [];

  const flush = () => {
    const value = buffer.join("\n").trim();
    if (value) blocks.push(value);
    buffer = [];
  };

  for (const line of lines) {
    if (line.startsWith("### Requirement:")) {
      flush();
    }
    if (buffer.length > 0 || line.startsWith("### Requirement:")) {
      buffer.push(line);
    }
  }

  flush();
  return blocks;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
