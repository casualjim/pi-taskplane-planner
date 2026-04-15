import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import registerPlannerExtension, {
  buildPlannerCommandMessage,
  plannerCommandSpecs,
  stripPromptFrontmatter,
} from "../extensions/planner-extension.mjs";

const root = path.resolve(import.meta.dir, "..");

async function readProjectFile(...segments) {
  return readFile(path.join(root, ...segments), "utf8");
}

describe("planner npm package and extension", () => {
  test("package manifest declares publishable npm metadata", async () => {
    const pkg = JSON.parse(await readProjectFile("package.json"));

    expect(pkg.name).toBe("@casualjim/pi-taskplane-planner");
    expect(pkg.version).toBe("0.1.1");
    expect(pkg.private).toBe(false);
    expect(pkg.license).toBe("MIT");
    expect(pkg.publishConfig).toEqual({ access: "public" });
    expect(pkg.bin).toEqual({ planner: "bin/planner.mjs" });
    expect(pkg.files).toEqual([
      "bin/",
      "extensions/",
      "src/",
      ".pi/prompts/plan-stage.md",
      ".pi/prompts/plan-archive.md",
      ".pi/prompts/plan-reopen.md",
      "index.ts",
      "README.md",
    ]);
    expect(pkg.pi.extensions).toEqual(["./extensions/planner-extension.mjs"]);
    expect(pkg.repository.url).toContain("github.com/casualjim/pi-taskplane-planner");
    expect(pkg.homepage).toContain("github.com/casualjim/pi-taskplane-planner");
    expect(pkg.bugs.url).toContain("github.com/casualjim/pi-taskplane-planner/issues");
    expect(pkg.engines.node).toBe(">=24.0.0");
  });

  test("release automation workflows and bootstrap config exist", async () => {
    const ci = await readProjectFile(".github/workflows/ci.yml");
    const releasePlease = await readProjectFile(".github/workflows/release-please.yml");
    const publish = await readProjectFile(".github/workflows/publish.yml");
    const releaseConfig = JSON.parse(await readProjectFile("release-please-config.json"));
    const releaseManifest = JSON.parse(await readProjectFile(".release-please-manifest.json"));

    expect(ci).toContain("bun install");
    expect(ci).toContain("bun test");
    expect(ci).toContain("bunx tsc --noEmit");

    expect(releasePlease).toContain("workflow_run");
    expect(releasePlease).toContain("conclusion == 'success'");
    expect(releasePlease).toContain("googleapis/release-please-action@v4");
    expect(releasePlease).toContain("config-file: release-please-config.json");
    expect(releasePlease).toContain("manifest-file: .release-please-manifest.json");

    expect(releaseConfig).toEqual({
      packages: {
        ".": {
          "release-type": "node",
          "bump-patch-for-minor-pre-major": true,
        },
      },
    });
    expect(releaseManifest).toEqual({ ".": "0.1.1" });

    expect(publish).toContain("npm publish --provenance --access public");
    expect(publish).toContain("id-token: write");
    expect(publish).toContain("registry.npmjs.org");
  });

  test("planner command specs are loaded from internal prompt assets", () => {
    expect(plannerCommandSpecs.map((spec) => spec.name)).toEqual([
      "plan-stage",
      "plan-archive",
      "plan-reopen",
    ]);

    const stage = plannerCommandSpecs.find((spec) => spec.name === "plan-stage");
    expect(stage).toBeDefined();
    expect(stage?.description).toContain("openspec change");
    expect(stage?.body).toContain("Taskplane packets");
    expect(stage?.body.startsWith("---")).toBe(false);
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
