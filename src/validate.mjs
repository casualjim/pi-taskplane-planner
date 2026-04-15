import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { FORBIDDEN_STAGE_PHRASES } from "./constants.mjs";
import { getSection, getChecklistValue } from "./markdown.mjs";
import { getChangeDir, exists } from "./paths.mjs";

/**
 * Validate that an openspec change is ready for planner staging.
 *
 * Proposal and design structural validation is handled by `openspec validate`.
 * Here we only check planner-specific constraints:
 * - design closure status must be resolved
 * - at least one delta spec must exist
 * - no forbidden speculative phrasing in design
 */
export async function validateChangeForStaging(cwd, changeSlug) {
  const changeDir = getChangeDir(cwd, changeSlug);
  const proposalPath = path.join(changeDir, "proposal.md");
  const designPath = path.join(changeDir, "design.md");
  const specsDir = path.join(changeDir, "specs");

  const errors = [];

  if (!(await exists(proposalPath))) errors.push(`Missing proposal: ${path.relative(cwd, proposalPath)}`);
  if (!(await exists(designPath))) errors.push(`Missing design: ${path.relative(cwd, designPath)}`);
  if (!(await exists(specsDir))) errors.push(`Missing specs directory: ${path.relative(cwd, specsDir)}`);
  if (errors.length > 0) return { valid: false, errors, proposalPath, designPath, specFiles: [] };

  const proposal = await readFile(proposalPath, "utf8");
  const design = await readFile(designPath, "utf8");
  const specFiles = await findSpecFiles(specsDir);

  // Closure status check (planner-specific)
  errors.push(...validateClosureStatus(design));

  // Spec existence check
  if (specFiles.length === 0) {
    errors.push("At least one delta spec is required before staging");
  }

  // Forbidden phrasing in design
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
    specFiles,
    proposal,
    design,
  };
}

const REQUIRED_CLOSURE_STATUS = ["Blockers", "Known Unknowns", "Deferred Design Choices"];

function validateClosureStatus(design) {
  const errors = [];
  const closureStatus = getSection(design, "Closure Status", 2);
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
