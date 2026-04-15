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

export function extractChecklistItems(markdown) {
  return [...markdown.matchAll(/^-\s*\[(?: |x)\]\s+(.+)$/gim)].map((match) => match[1].trim());
}

export function extractBacktickedPaths(text) {
  return [...text.matchAll(/`([^`]+)`/g)]
    .map((match) => match[1].trim())
    .filter((value) => value.includes("/") || value.includes("*") || /\.[A-Za-z0-9*_-]+$/.test(value));
}

const LIKELY_PATH_EXTENSIONS = new Set([
  "c", "cc", "cpp", "cs", "css", "go", "h", "hpp", "html", "ini", "java", "js", "json", "jsx",
  "kt", "md", "mjs", "php", "py", "rb", "rs", "scala", "sh", "sql", "swift", "toml", "ts", "tsx",
  "txt", "xml", "yaml", "yml",
]);

export function extractLikelyPaths(text) {
  return [...text.matchAll(/(?:^|[\s(\[>])`?((?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.[A-Za-z0-9*_-]+)`?(?=$|[\s)\].,:;!<])/gm)]
    .map((match) => match[1]?.trim() ?? "")
    .filter((value) => isLikelyPathToken(value));
}

export function uniqueNonEmpty(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function firstNonEmpty(...values) {
  return values.find((value) => value?.trim())?.trim() ?? "";
}

export function toBulletLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") || line.startsWith("*"));
}

function isLikelyPathToken(value) {
  if (!value || value.includes("://")) return false;
  if (/^\d+(?:\.\d+)+$/.test(value)) return false;
  if (/^[A-Za-z]\.([A-Za-z])$/i.test(value)) return false;

  const basename = value.split("/").pop() ?? value;
  if (basename.startsWith(".") && !basename.slice(1).includes(".")) return false;

  const extension = basename.split(".").pop()?.toLowerCase() ?? "";
  return LIKELY_PATH_EXTENSIONS.has(extension);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
