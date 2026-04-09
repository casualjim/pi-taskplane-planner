/**
 * Planner Extension
 *
 * Registers the planner workflow as a proper pi extension.
 * The command bodies live in internal prompt assets under .pi/prompts/.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const COMMAND_SOURCES = [
  ["plan-explore", ".pi/prompts/plan-explore.md"],
  ["plan-propose", ".pi/prompts/plan-propose.md"],
  ["plan-status", ".pi/prompts/plan-status.md"],
  ["plan-stage", ".pi/prompts/plan-stage.md"],
  ["plan-archive", ".pi/prompts/plan-archive.md"],
  ["plan-reopen", ".pi/prompts/plan-reopen.md"],
];

export function getPlannerPackageRoot(fromUrl = import.meta.url) {
  return dirname(dirname(fileURLToPath(fromUrl)));
}

export function stripPromptFrontmatter(raw) {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return { description: "", body: normalized };
  }

  const frontmatter = match[1] ?? "";
  const body = (match[2] ?? "").trim();
  const descriptionMatch = frontmatter.match(/^description:\s*(.*)$/m);

  return {
    description: descriptionMatch?.[1]?.trim() ?? "",
    body,
  };
}

export function loadPlannerCommandSpecs(packageRoot = getPlannerPackageRoot()) {
  return COMMAND_SOURCES.map(([name, relativePath]) => {
    const sourcePath = join(packageRoot, relativePath);
    const { description, body } = stripPromptFrontmatter(readFileSync(sourcePath, "utf8"));

    if (!body) {
      throw new Error(`Planner prompt template is empty: ${relativePath}`);
    }

    return {
      name,
      description: description || `Planner workflow command: ${name}`,
      body,
      sourcePath,
    };
  });
}

export const plannerCommandSpecs = loadPlannerCommandSpecs();

export function buildPlannerCommandMessage(body, args) {
  const trimmedArgs = args.trim();
  if (!trimmedArgs) return body;
  return `${body}\n\nAdditional context from the command:\n${trimmedArgs}`;
}

function dispatchPlannerCommand(pi, ctx, body, args) {
  const message = buildPlannerCommandMessage(body, args);
  if (ctx.isIdle()) {
    pi.sendUserMessage(message);
    return;
  }

  pi.sendUserMessage(message, { deliverAs: "steer" });
}

export default function registerPlannerExtension(pi) {
  for (const spec of plannerCommandSpecs) {
    pi.registerCommand(spec.name, {
      description: spec.description,
      handler: async (args, ctx) => {
        dispatchPlannerCommand(pi, ctx, spec.body, args);
      },
    });
  }
}
