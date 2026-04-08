import path from "node:path";
import { archiveChange } from "./archive.mjs";
import { doctorPlanner, initPlanner, scaffoldChange } from "./scaffold.mjs";
import { reopenChange } from "./reopen.mjs";
import { stageChange } from "./stage.mjs";
import { plannerStatus } from "./status.mjs";

export async function runCli(argv, cwd = process.cwd()) {
  const [command, ...rest] = argv;
  const json = rest.includes("--json");
  const args = rest.filter((value) => value !== "--json");

  try {
    let result;
    switch (command) {
      case "init":
        result = await initPlanner(cwd);
        break;
      case "doctor":
        result = await doctorPlanner(cwd, { fix: true });
        break;
      case "scaffold-change":
        result = await scaffoldChange(cwd, args[0], args.slice(1));
        break;
      case "status":
        result = await plannerStatus(cwd, args[0] ?? null);
        break;
      case "stage":
        if (!args[0]) throw new Error("Usage: planner stage <change-slug>");
        result = await stageChange(cwd, args[0]);
        break;
      case "archive":
        if (!args[0]) throw new Error("Usage: planner archive <change-slug>");
        result = await archiveChange(cwd, args[0]);
        break;
      case "reopen":
        if (!args[0]) throw new Error("Usage: planner reopen <change-slug> [reason]");
        result = await reopenChange(cwd, args[0], args.slice(1).join(" ") || undefined);
        break;
      case "help":
      case undefined:
        printHelp();
        return 0;
      default:
        throw new Error(`Unknown command: ${command}`);
    }

    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printResult(command, result, cwd);
    }
    return 0;
  } catch (error) {
    console.error(error.message);
    if (error.details) {
      for (const detail of error.details) console.error(`- ${detail}`);
    }
    return 1;
  }
}

function printHelp() {
  console.log(`planner <command>

Commands:
  init                     Seed planner-native directories and scaffold
  doctor                   Validate planner structure and repair safe issues
  scaffold-change <slug>   Create proposal/design/conformance/spec scaffolds for a change
  status [change]          Show planner status
  stage <change>           Compile approved contracts into Taskplane packets
  archive <change>         Promote passing delta specs into cumulative truth and archive the change
  reopen <change> [reason] Mark a change as reopened for planning after a contract defect
`);
}

function printResult(command, result, cwd) {
  switch (command) {
    case "init":
      console.log("Initialized planner scaffold:");
      for (const entry of result.ensured) console.log(`- ${entry}`);
      break;
    case "doctor":
      console.log(result.ok ? "Planner scaffold is healthy." : "Planner scaffold had issues.");
      for (const entry of result.report) {
        console.log(`- ${entry.path}: ${entry.ok ? "ok" : "repaired"}`);
      }
      break;
    case "scaffold-change":
      console.log(`Scaffolded change: ${result.changeSlug}`);
      for (const entry of result.created) console.log(`- ${entry}`);
      break;
    case "status":
      if (Array.isArray(result.changes)) {
        for (const change of result.changes) {
          console.log(`${change.change}: contractReady=${change.contractReady} stagedPackets=${change.stagedPackets.length} conformance=${change.conformanceVerdict ?? "none"}`);
        }
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
      break;
    case "stage":
      console.log(`Staged ${result.changeSlug}:`);
      for (const entry of result.created) console.log(`- ${entry}`);
      console.log(result.instruction);
      break;
    case "archive":
      console.log(`Archived ${result.changeSlug} to ${path.relative(cwd, path.join(cwd, result.archivedTo)) || result.archivedTo}`);
      break;
    case "reopen":
      console.log(`Reopened ${result.changeSlug}; updated ${result.conformancePath}`);
      break;
    default:
      console.log(JSON.stringify(result, null, 2));
  }
}
