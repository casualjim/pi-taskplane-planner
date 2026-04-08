import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createConformanceReportTemplate } from "./conformance.mjs";
import { getChangeDir, exists } from "./paths.mjs";

export async function reopenChange(cwd, changeSlug, reason = "Contract defect requires replanning.") {
  const changeDir = getChangeDir(cwd, changeSlug);
  if (!(await exists(changeDir))) {
    throw new Error(`Unknown change: ${changeSlug}`);
  }

  const conformancePath = path.join(changeDir, "conformance.md");
  const base = (await exists(conformancePath)) ? await readFile(conformancePath, "utf8") : createConformanceReportTemplate(changeSlug);
  const withStatus = replaceOrAppendLine(base, /^\*\*Status:\*\*.*$/m, "**Status:** Reopened");
  const withVerdict = replaceOrAppendLine(withStatus, /^\*\*Verdict:\*\*.*$/m, "**Verdict:** REOPEN_PLANNING");
  const reopenNote = `\n## Reopen Note\n\n${reason.trim()}\n`;
  const next = withVerdict.includes("## Reopen Note")
    ? withVerdict.replace(/## Reopen Note[\s\S]*$/, reopenNote.trimEnd())
    : `${withVerdict.trimEnd()}${reopenNote}`;
  await writeFile(conformancePath, `${next.trimEnd()}\n`, "utf8");

  return {
    changeSlug,
    conformancePath: path.relative(cwd, conformancePath),
    verdict: "REOPEN_PLANNING",
  };
}

function replaceOrAppendLine(markdown, pattern, replacement) {
  if (pattern.test(markdown)) {
    return markdown.replace(pattern, replacement);
  }
  return `${markdown.trimEnd()}\n${replacement}\n`;
}
