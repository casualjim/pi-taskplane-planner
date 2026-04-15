import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { FORBIDDEN_STAGE_PHRASES } from "./constants.mjs";
import { getSection, getChecklistValue } from "./markdown.mjs";
import { getChangeDir, exists } from "./paths.mjs";

/**
 * Validate that an openspec change is ready for planner staging.
 *
 * Proposal and design structural validation is handled by `openspec validate`.
 * Here we only check staging-specific constraints:
 * - at least one delta spec must exist
 * - if planner-style closure status exists, it must be fully resolved
 * - if standard OpenSpec open questions exist, they must already be resolved
 * - no forbidden speculative phrasing in design
 */
export async function validateChangeForStaging(cwd, changeSlug) {
  const changeDir = getChangeDir(cwd, changeSlug);
  const proposalPath = path.join(changeDir, "proposal.md");
  const designPath = path.join(changeDir, "design.md");
  const tasksPath = path.join(changeDir, "tasks.md");
  const specsDir = path.join(changeDir, "specs");

  const errors = [];

  if (!(await exists(proposalPath))) errors.push(`Missing proposal: ${path.relative(cwd, proposalPath)}`);
  if (!(await exists(designPath))) errors.push(`Missing design: ${path.relative(cwd, designPath)}`);
  if (!(await exists(specsDir))) errors.push(`Missing specs directory: ${path.relative(cwd, specsDir)}`);
  if (errors.length > 0) return { valid: false, errors, proposalPath, designPath, tasksPath, specFiles: [] };

  const proposal = await readFile(proposalPath, "utf8");
  const design = await readFile(designPath, "utf8");
  const hasTasks = await exists(tasksPath);
  const tasks = hasTasks ? await readFile(tasksPath, "utf8") : "";
  const specFiles = await findSpecFiles(specsDir);

  errors.push(...validateDesignReadiness(design));

  if (specFiles.length === 0) {
    errors.push("At least one delta spec is required before staging");
  }

  const forbiddenHits = findForbiddenPhrases(design).filter(
    (value, index, array) => array.indexOf(value) === index,
  );
  if (forbiddenHits.length > 0) {
    errors.push(`Stage-ready artifacts contain forbidden speculative phrasing: ${forbiddenHits.join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    proposalPath,
    designPath,
    tasksPath: hasTasks ? tasksPath : "",
    specFiles,
    proposal,
    design,
    tasks,
  };
}

const REQUIRED_CLOSURE_STATUS = ["Blockers", "Known Unknowns", "Deferred Design Choices"];
const RESOLVED_OPEN_QUESTION_VALUES = [
  "none",
  "none.",
  "n/a",
  "n/a.",
  "na",
  "no open questions",
  "no open questions.",
  "not applicable",
  "not applicable.",
  "resolved",
  "resolved.",
];
const RESOLVED_OPEN_QUESTION_PATTERNS = [
  /^none(?:\.|\s|$)/i,
  /^no open questions(?:\s+remain)?(?:\.|\s|$)/i,
  /^all (?:open )?questions (?:are |have been )?resolved(?:\.|\s|$)/i,
  /^resolved(?:\.|\s|$)/i,
  /^not applicable(?:\.|\s|$)/i,
  /^n\/a(?:\.|\s|$)/i,
];

function validateDesignReadiness(design) {
  const closureStatus = getSection(design, "Closure Status", 2);
  if (closureStatus.trim()) {
    return validateClosureStatus(closureStatus);
  }

  const openQuestions = getSection(design, "Open Questions", 2);
  if (!openQuestions.trim() || isResolvedOpenQuestions(openQuestions)) {
    return [];
  }

  return ["Design open questions must be resolved before staging"];
}

function validateClosureStatus(closureStatus) {
  const errors = [];
  for (const label of REQUIRED_CLOSURE_STATUS) {
    const value = getChecklistValue(closureStatus, label);
    if (value === null) {
      errors.push(`Design closure status missing value for: ${label}`);
      continue;
    }
    if (value.toLowerCase() !== "none") {
      errors.push(`Design closure status blocks staging: ${label} is ${value}`);
    }
  }
  return errors;
}

function isResolvedOpenQuestions(openQuestions) {
  const normalized = openQuestions
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  if (normalized.length === 0) return true;
  if (normalized.every((line) => RESOLVED_OPEN_QUESTION_VALUES.includes(line.toLowerCase()))) {
    return true;
  }

  const joined = normalized.join(" ").replace(/\s+/g, " ").trim();
  return RESOLVED_OPEN_QUESTION_PATTERNS.some((pattern) => pattern.test(joined));
}

export async function findSpecFiles(specsDir) {
  const entries = await readdir(specsDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const specPath = path.join(specsDir, entry.name, "spec.md");
    if (await exists(specPath)) files.push(specPath);
  }
  return files.sort();
}

export function findForbiddenPhrases(text) {
  const lowered = text.toLowerCase();
  return FORBIDDEN_STAGE_PHRASES.filter((phrase) => lowered.includes(phrase));
}
