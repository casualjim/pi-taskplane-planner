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
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
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
    expect(pkg.scripts.build).toBe("tsc --noEmit");
    expect(pkg.scripts.typecheck).toBe("tsc --noEmit");
    expect(pkg.scripts["check:pack"]).toBe("npm pack --dry-run");
  });

  test("main-branch publish workflows mirror the pi-heimdall flow", async () => {
    const pkg = JSON.parse(await readProjectFile("package.json"));
    const ci = await readProjectFile(".github/workflows/ci.yml");
    const release = await readProjectFile(".github/workflows/release.yml");
    const lockfile = JSON.parse(await readProjectFile("package-lock.json"));

    await expect(readProjectFile(".github/workflows/publish.yml")).rejects.toThrow();
    await expect(readProjectFile(".github/workflows/release-please.yml")).rejects.toThrow();
    await expect(readProjectFile("release-please-config.json")).rejects.toThrow();
    await expect(readProjectFile(".release-please-manifest.json")).rejects.toThrow();

    expect(ci).toContain("pull_request");
    expect(ci).toContain("workflow_dispatch");
    expect(ci).not.toContain("push:");
    expect(ci).toContain("actions/setup-node@v6");
    expect(ci).toContain("npm ci");
    expect(ci).toContain("npm run typecheck");
    expect(ci).toContain("npm run check:pack");

    expect(release).toContain("push:");
    expect(release).toContain("branches: [main]");
    expect(release).toContain("workflow_dispatch");
    expect(release).toContain("contains(github.event.head_commit.message, '[skip ci]')");
    expect(release).toContain("npm view");
    expect(release).toContain("npm publish --provenance --access public");
    expect(release).toContain("npm version patch --no-git-tag-version");
    expect(release).toContain("git push origin HEAD:main");

    expect(lockfile.name).toBe("@casualjim/pi-taskplane-planner");
    expect(lockfile.version).toBe(pkg.version);
    expect(lockfile.lockfileVersion).toBe(3);
    expect(lockfile.packages[""].version).toBe(pkg.version);
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
