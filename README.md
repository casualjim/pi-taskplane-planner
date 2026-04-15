# @casualjim/pi-taskplane-planner

A planner-native pi extension and CLI companion to Taskplane.

This project builds a strict planning layer that turns ambiguous change requests
into explicit contracts and then compiles those contracts into Taskplane-native
execution packets.

## What it provides

- **Planner-native artifact scaffold** under `planning/`
- **Thin CLI** for bootstrap and maintenance
  - `planner init`
  - `planner doctor`
  - `planner scaffold-change <slug>`
  - `planner status [change]`
  - `planner stage <change>`
  - `planner archive <change>`
  - `planner reopen <change> [reason]`
- **Pi extension commands** for day-to-day workflow
  - `/plan-explore`
  - `/plan-propose`
  - `/plan-status`
  - `/plan-stage`
  - `/plan-archive`
  - `/plan-reopen`
- **Internal prompt assets** under `.pi/prompts/` that back those commands
- **Taskplane packet generation**
  - one implementation packet per capability spec
  - one terminal conformance packet per change
- **Archive flow** that promotes delta specs into cumulative captured truth

## Planner-native layout

```text
planning/
  changes/
    <change-slug>/
      proposal.md
      design.md
      conformance.md
      specs/
        <capability>/spec.md
  specs/
    <capability>/spec.md
  archive/
    YYYY-MM-DD-<change-slug>/
```

Taskplane remains the runtime and receives compiled packets under:

```text
taskplane-tasks/
  CONTEXT.md
  PHASE-IMPLEMENTATION.md
  PHASE-CONFORMANCE.md
  TP-xxx-.../
    PROMPT.md
    STATUS.md
```

The phase documents are project-owned Taskplane context files. Planner-generated
packets reference them so phase behavior lives in Taskplane docs rather than in
planner-specific runtime prompt logic.

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

## Quickstart

### 1. Seed planner-native scaffold

```bash
planner init
```

### 2. Create a change scaffold

```bash
planner scaffold-change add-planner-status status-reporting
```

This creates:
- `planning/changes/add-planner-status/proposal.md`
- `planning/changes/add-planner-status/design.md`
- `planning/changes/add-planner-status/conformance.md`
- `planning/changes/add-planner-status/specs/status-reporting/spec.md`

### 3. Use planner commands in pi

These commands are registered by the extension you installed above.

Inside `pi`:

```text
/plan-explore add-planner-status
/plan-propose add-planner-status
/plan-stage add-planner-status
```

### 4. Execute with Taskplane

After staging, run the generated Taskplane packets with `/orch`.

### 5. Archive verified truth

When conformance passes:

```bash
planner archive add-planner-status
```

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
- to start a new release line, bump `package.json` and `package-lock.json` to the first unpublished version in that series (currently `0.2.0`)
- npmjs needs a Trusted Publisher entry for this repo
- npm trusted publishing means no long-lived npm token secret is needed in GitHub

## Notes

- OpenSpec content in this repository is bootstrap scaffolding only.
- The finished planner is intended to operate without requiring OpenSpec at runtime.
- Taskplane remains the execution and review runtime; this project focuses on producing the best possible Taskplane input.
