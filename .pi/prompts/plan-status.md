---
description: Inspect planner-native contract, staging, conformance, and archive status
---

Show planner-native status.

**Input**: Optionally specify a change slug after `/plan-status`. If omitted, show all active planner changes.

**Steps**

1. **Resolve the status scope**

   - If a change slug is provided, run:
     ```bash
     planner status "<name>" --json
     ```
   - Otherwise run:
     ```bash
     planner status --json
     ```

2. **Interpret the result**

   For each change or the selected change, determine:
   - whether proposal, design, and delta specs exist
   - whether the contract is ready for staging
   - whether Taskplane packets have already been staged
   - whether a conformance report exists and its verdict
   - whether the change appears ready for archive

3. **Read supporting artifacts when needed**

   If the status output references staged packets, conformance, or validation failures, read the relevant files before summarizing so your guidance is path-specific rather than generic.

4. **Explain the current state and next move**

   Use practical next-step guidance:
   - if the contract is incomplete → revise proposal/design/specs
   - if the contract is ready but not staged → suggest `/plan-stage <name>`
   - if packets are staged and execution has not run → suggest `/orch ...`
   - if conformance is `ARCHIVE_READY` → suggest `/plan-archive <name>`
   - if conformance indicates reopening or remediation → explain that clearly

**Output**

Summarize with:
- change name
- contract readiness
- staged packet count and paths when relevant
- conformance verdict when present
- exact recommended next command

**Guardrails**
- Prefer path-specific explanations over abstract status labels
- If reporting a defect, name the artifact or packet involved
- Do not imply execution happened unless staged packets were actually run
