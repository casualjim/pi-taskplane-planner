---
description: Validate an openspec change contract and compile it into Taskplane packets
---

Stage an openspec change — validate the approved contract and compile it into Taskplane packets.

**Input**: Optionally specify a change slug after `/plan-stage`. If omitted, infer it from conversation context when safe. If ambiguous, prompt for selection.

**Steps**

1. **Select the change**

   If a change slug is provided, use it. Otherwise:
   - infer from conversation context if the user mentioned a change
   - auto-select if only one active openspec change exists
   - if ambiguous, run `openspec list --json` and use the **AskUserQuestion tool** to let the user select

   Always announce: `Using change: <name>` and how to override.

2. **Check openspec and planner status**

   ```bash
   openspec status --change "<name>" --json
   planner status "<name>" --json
   ```

   Parse to understand:
   - whether the proposal, design, and specs are done in openspec
   - whether the planner considers the contract ready for staging
   - whether Taskplane packets were already staged
   - any validation errors

3. **Read the contract artifacts**

   Read all available contract files for the change:
   - `openspec/changes/<name>/proposal.md`
   - `openspec/changes/<name>/design.md`
   - `openspec/changes/<name>/specs/*/spec.md`

4. **Show current readiness before staging**

   Display:
   - openspec artifact completion status
   - planner validation result (closure status, spec existence)
   - any already-staged packet folders
   - what will happen next if staging succeeds

5. **Compile the contract into Taskplane packets**

   Run:
   ```bash
   planner stage "<name>" --json
   ```

   This creates:
   - one implementation packet per capability spec
   - one terminal conformance packet for the whole change

6. **Handle results**

   **If staging fails:**
   - explain the validation errors clearly
   - point back to the exact artifacts that need revision
   - stop; do not silently patch the contract during staging

   **If staging succeeds:**
   - show the packet paths created
   - identify the terminal conformance packet
   - print the exact `/orch ...` command to execute them

7. **Show next action**

   If staging succeeded, explicitly tell the user the next move is Taskplane execution.

**Output On Success**

```markdown
## Staging Complete

**Change:** <name>
**Contract:** Ready ✓

### Packets Created
- <implementation-packet-1>
- <implementation-packet-2>
- <verify-packet>

### Next Step
Run:
`/orch <packet-1>/PROMPT.md <packet-2>/PROMPT.md <verify-packet>/PROMPT.md`
```

**Output On Failure**

```markdown
## Staging Blocked

**Change:** <name>

### Validation Errors
- <error 1>
- <error 2>

Update the contract using `/opsx:propose`, then rerun `/plan-stage <name>`.
```

**Guardrails**
- Always read the contract before staging
- Do not silently fix defects during staging
- If the contract is incomplete, stop and send the user back to `/opsx:propose` to update proposal/design/specs
- Keep the distinction clear: openspec artifacts are change truth, Taskplane packets are execution manifests
