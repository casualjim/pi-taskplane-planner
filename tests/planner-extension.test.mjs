import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import registerPlannerExtension, {
  buildPlannerCommandMessage,
  plannerCommandSpecs,
  stripPromptFrontmatter,
} from "../extensions/planner-extension.mjs";

describe("planner pi extension packaging", () => {
  test("package manifest declares the planner extension entrypoint", async () => {
    const pkgPath = path.resolve(import.meta.dir, "../package.json");
    const pkg = JSON.parse(await readFile(pkgPath, "utf8"));

    expect(pkg.files).toEqual([
      "bin/",
      "extensions/",
      "src/",
      ".pi/prompts/",
      "index.ts",
      "README.md",
    ]);
    expect(pkg.pi.extensions).toEqual(["./extensions/planner-extension.mjs"]);
    expect(pkg.pi.prompts).toBeUndefined();
  });

  test("planner command specs are loaded from internal prompt assets", () => {
    expect(plannerCommandSpecs.map((spec) => spec.name)).toEqual([
      "plan-explore",
      "plan-propose",
      "plan-status",
      "plan-stage",
      "plan-archive",
      "plan-reopen",
    ]);

    const explore = plannerCommandSpecs.find((spec) => spec.name === "plan-explore");
    expect(explore).toBeDefined();
    expect(explore?.description).toContain("explore mode");
    expect(explore?.body).toContain("Enter explore mode.");
    expect(explore?.body.startsWith("---")).toBe(false);
  });

  test("default export registers the planner commands", () => {
    const registered = [];
    const pi = {
      registerCommand(name, options) {
        registered.push({ name, description: options.description });
      },
      sendUserMessage() {},
    };

    registerPlannerExtension(pi);

    expect(registered.map((entry) => entry.name)).toEqual(plannerCommandSpecs.map((spec) => spec.name));
    expect(registered.every((entry) => entry.description.length > 0)).toBe(true);
  });

  test("planner prompt helper keeps internal command context separate from the prompt body", () => {
    const parsed = stripPromptFrontmatter(`---\ndescription: Example prompt\n---\nLine one\nLine two\n`);
    expect(parsed.description).toBe("Example prompt");
    expect(parsed.body).toBe("Line one\nLine two");

    expect(buildPlannerCommandMessage("Base prompt", "")).toBe("Base prompt");
    expect(buildPlannerCommandMessage("Base prompt", "add-planner-status")).toBe(
      "Base prompt\n\nAdditional context from the command:\nadd-planner-status",
    );
  });
});
