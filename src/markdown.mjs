function headingPattern(level) {
  return new RegExp(`^${"#".repeat(level)}\\s+(.+?)\\s*$`);
}

export function splitSections(markdown, level = 2) {
  const lines = markdown.split(/\r?\n/);
  const matcher = headingPattern(level);
  const sections = new Map();
  let current = null;
  let buffer = [];

  const flush = () => {
    if (current !== null) {
      sections.set(current, buffer.join("\n").trim());
    }
  };

  for (const line of lines) {
    const match = line.match(matcher);
    if (match) {
      flush();
      current = match[1].trim();
      buffer = [];
      continue;
    }
    if (current !== null) buffer.push(line);
  }

  flush();
  return sections;
}

export function getSection(markdown, title, level = 2) {
  return splitSections(markdown, level).get(title) ?? "";
}

export function hasSection(markdown, title, level = 2) {
  return splitSections(markdown, level).has(title);
}

export function getChecklistValue(sectionContent, label) {
  const regex = new RegExp(`^-\\s*${escapeRegExp(label)}:\\s*(.+)$`, "im");
  const match = sectionContent.match(regex);
  return match?.[1]?.trim() ?? null;
}

export function extractRequirementNames(markdown) {
  return [...markdown.matchAll(/^### Requirement:\s*(.+)$/gm)].map((match) => match[1].trim());
}

export function extractScenarioNames(markdown) {
  return [...markdown.matchAll(/^#### Scenario:\s*(.+)$/gm)].map((match) => match[1].trim());
}

export function extractBacktickedPaths(text) {
  return [...text.matchAll(/`([^`]+)`/g)]
    .map((match) => match[1].trim())
    .filter((value) => value.includes("/") || value.includes("*"));
}

export function uniqueNonEmpty(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function toBulletLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") || line.startsWith("*"));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
