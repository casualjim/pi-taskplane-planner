import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  FORBIDDEN_STAGE_PHRASES,
  REQUIRED_CLOSURE_STATUS,
  REQUIRED_DESIGN_SECTIONS,
  REQUIRED_DESIGN_SUBSECTIONS,
  REQUIRED_PROPOSAL_SECTIONS,
  REQUIRED_PROPOSAL_SUBSECTIONS,
} from "./constants.mjs";
import { getChecklistValue, getSection, hasSection } from "./markdown.mjs";
import { getChangeDir, exists } from "./paths.mjs";

export async function validateChangeContract(cwd, changeSlug) {
  const changeDir = getChangeDir(cwd, changeSlug);
  const proposalPath = path.join(changeDir, "proposal.md");
  const designPath = path.join(changeDir, "design.md");
  const specsDir = path.join(changeDir, "specs");

  const errors = [];
  const warnings = [];

  if (!(await exists(proposalPath))) errors.push(`Missing proposal: ${path.relative(cwd, proposalPath)}`);
  if (!(await exists(designPath))) errors.push(`Missing design: ${path.relative(cwd, designPath)}`);
  if (!(await exists(specsDir))) errors.push(`Missing specs directory: ${path.relative(cwd, specsDir)}`);
  if (errors.length > 0) return { valid: false, errors, warnings, proposalPath, designPath, specFiles: [] };

  const proposal = await readFile(proposalPath, "utf8");
  const design = await readFile(designPath, "utf8");
  const specFiles = await findSpecFiles(specsDir);

  errors.push(...validateProposal(proposal));
  errors.push(...validateDesign(design));
  errors.push(...(await validateSpecs(specFiles)));

  const forbiddenHits = [proposal, design]
    .flatMap((content) => findForbiddenPhrases(content))
    .filter((value, index, array) => array.indexOf(value) === index);
  if (forbiddenHits.length > 0) {
    errors.push(`Stage-ready artifacts contain forbidden speculative phrasing: ${forbiddenHits.join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    proposalPath,
    designPath,
    specFiles,
    proposal,
    design,
  };
}

export function validateProposal(markdown) {
  const errors = [];
  for (const section of REQUIRED_PROPOSAL_SECTIONS) {
    if (!hasSection(markdown, section, 2)) {
      errors.push(`Proposal missing section: ${section}`);
    }
  }

  for (const [section, subsections] of Object.entries(REQUIRED_PROPOSAL_SUBSECTIONS)) {
    const content = getSection(markdown, section, 2);
    for (const subsection of subsections) {
      if (!hasSection(content, subsection, 3)) {
        errors.push(`Proposal missing subsection: ${section} -> ${subsection}`);
      }
    }
  }

  return errors;
}

export function validateDesign(markdown) {
  const errors = [];
  for (const section of REQUIRED_DESIGN_SECTIONS) {
    if (!hasSection(markdown, section, 2)) {
      errors.push(`Design missing section: ${section}`);
    }
  }

  for (const [section, subsections] of Object.entries(REQUIRED_DESIGN_SUBSECTIONS)) {
    const content = getSection(markdown, section, 2);
    for (const subsection of subsections) {
      if (!hasSection(content, subsection, 3)) {
        errors.push(`Design missing subsection: ${section} -> ${subsection}`);
      }
    }
  }

  const closureStatus = getSection(markdown, "Closure Status", 2);
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

export async function validateSpecs(specFiles) {
  const errors = [];
  if (specFiles.length === 0) {
    errors.push("At least one delta spec is required before staging");
    return errors;
  }

  for (const specFile of specFiles) {
    const content = await readFile(specFile, "utf8");
    if (!/^### Requirement:/m.test(content)) {
      errors.push(`Spec missing requirement block: ${specFile}`);
    }
    if (!/^#### Scenario:/m.test(content)) {
      errors.push(`Spec missing scenario block: ${specFile}`);
    }
  }

  return errors;
}

export function findForbiddenPhrases(text) {
  const lowered = text.toLowerCase();
  return FORBIDDEN_STAGE_PHRASES.filter((phrase) => lowered.includes(phrase));
}

async function findSpecFiles(specsDir) {
  const entries = await readdir(specsDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const specPath = path.join(specsDir, entry.name, "spec.md");
    if (await exists(specPath)) files.push(specPath);
  }
  return files.sort();
}
