# @casualjim/pi-taskplane-planner

Glue between OpenSpec long-horizon planning and Taskplane execution.

This package compiles approved OpenSpec change contracts into Taskplane-native
execution packets, runs whole-change conformance, and archives verified delta
specs into cumulative truth.

**Planning is done by OpenSpec** (`/opsx:explore`, `/opsx:propose`).
**Execution is done by Taskplane** (`/orch`).
**This package bridges the two** — it does not duplicate either.

## What it provides

- **Pi extension commands** (thin orchestration glue):
  - `/plan-stage` — validate an approved OpenSpec change and compile it into Taskplane packets
  - `/plan-archive` — promote passing delta specs into cumulative truth and archive the change
  - `/plan-reopen` — mark a change as reopened after a contract defect
- **Thin CLI** for status and packet operations:
  - `planner status [change]` — inspect staging and conformance state
  - `planner stage <change>` — compile approved contracts into Taskplane packets
  - `planner archive <change>` — archive a verified change
  - `planner reopen <change> [reason]` — reopen after a contract defect
- **Taskplane packet generation**
  - one implementation packet per capability spec (coarse-grained, end-to-end steps)
  - one terminal conformance packet for the whole change
- **Archive flow** that promotes delta specs into cumulative captured truth

## Layout

OpenSpec owns the change contract:

```text
openspec/
  changes/
    <change-slug>/
      proposal.md
      design.md
      specs/
        <capability>/spec.md
      conformance.md          ← written by the conformance Taskplane task
  specs/
    <capability>/spec.md      ← cumulative truth (synced on archive)
  changes/
    archive/
      YYYY-MM-DD-<change-slug>/
```

Taskplane owns execution:

```text
taskplane-tasks/
  CONTEXT.md
  PHASE-IMPLEMENTATION.md
  PHASE-CONFORMANCE.md
  TP-xxx-.../
    PROMPT.md
    STATUS.md
```

## Installation

This package is published to npm as `@casualjim/pi-taskplane-planner` and requires Node.js 24+.

### Install for pi

```bash
pi install npm:@casualjim/pi-taskplane-planner
```

### Install the CLI on your PATH

```bash
npm install -g @casualjim/pi-taskplane-planner
```

Then restart or `/reload` pi. Use `pi list` to confirm the package is registered.

## Workflow

### 1. Plan with OpenSpec

```text
/opsx:explore my-change
/opsx:propose my-change
```

This creates `openspec/changes/my-change/` with proposal, design, specs, and tasks.

### 2. Stage into Taskplane packets

```text
/plan-stage my-change
```

This validates the approved contract and compiles it into Taskplane packets under
`taskplane-tasks/`. Generated packets use coarse-grained end-to-end steps —
tests, documentation, and repo gates are folded into the implementation step.

### 3. Execute with Taskplane

```text
/orch taskplane-tasks/TP-001-.../PROMPT.md taskplane-tasks/TP-002-verify-.../PROMPT.md
```

### 4. Archive verified truth

When conformance passes:

```bash
planner archive my-change
```

This syncs delta specs into cumulative truth and moves the change into the archive.

## Development

Run tests:

```bash
npm test
```

Run the Node-based package gate used by CI/publishing:

```bash
npm run typecheck
npm run check:pack
```

`npm run build` remains an alias for the typecheck gate.

Optional runtime E2E (requires a working local Taskplane + pi runtime environment and model/API access):

```bash
npm run test:runtime-e2e
```

This executes a planner-generated implementation packet through real Taskplane runtime orchestration,
proves the runtime worker reads `PHASE-IMPLEMENTATION.md`, then probes a planner-generated conformance
packet and proves that the runtime worker reads `PHASE-CONFORMANCE.md` at the correct phase boundary.
The test then writes a deterministic `ARCHIVE_READY` conformance report from the harness and archives
the change.

## Publishing

Publishing is automated through GitHub Actions using the same main-branch publish flow as `../pi-heimdall`:

- `CI` runs on pull requests and manual dispatch with `npm ci`, `npm run typecheck`, and `npm run check:pack`
- `Publish` runs on pushes to `main` and manual dispatch
- if the `package.json` version is not already on npm, the workflow publishes it with trusted publishing
- after a successful publish, the workflow bumps the patch version on `main` with `[skip ci]` so the repo is ready for the next publish
- npmjs needs a Trusted Publisher entry for this repo
- npm trusted publishing means no long-lived npm token secret is needed in GitHub

## Notes

- OpenSpec handles all planning: exploration, proposal creation, design, and spec generation.
- Taskplane handles all execution: worker orchestration, review, and merge.
- This package only bridges the two — it compiles approved OpenSpec contracts into Taskplane packets, manages conformance, and archives results.
