---
description: Propose a new planner-native change and generate the contract artifacts in one step
---

Propose a new planner-native change — create or update the change and generate the contract artifacts in one step.

I'll create or update these planner-native artifacts:
- `proposal.md` (what & why)
- `design.md` (how)
- delta specs under `planning/changes/<change>/specs/<capability>/spec.md`

When the contract is ready for execution, run `/plan-stage <change>`.

---

**Input**: The user's request should include a change slug (kebab-case) OR a description of what they want to build.

**Steps**

1. **If no clear input is provided, ask what they want to build**

   Use the **AskUserQuestion tool** (open-ended, no preset options) to ask:
   > "What change do you want to work on? Describe what you want to build or fix."

   From their description, derive a kebab-case change slug (e.g. "add user authentication" → `add-user-auth`).

   **IMPORTANT**: Do NOT proceed without understanding what the user wants to build.

2. **Ensure the planner scaffold exists**

   If `planning/` does not exist, run:
   ```bash
   planner init
   ```

3. **Create or select the change directory**

   If the change does not exist yet, scaffold it:
   ```bash
   planner scaffold-change "<name>"
   ```

   This creates a planner-native scaffold at `planning/changes/<name>/`.

   If it already exists, treat this command as an update pass rather than creating a second change.

4. **Check current planner status**

   Run:
   ```bash
   planner status "<name>" --json
   ```

   Parse the JSON to understand:
   - whether proposal, design, and delta specs already exist
   - whether the contract is currently ready for staging
   - whether staged packets or conformance already exist

5. **Create or update the contract artifacts in sequence until staging-ready**

   Use the **TodoWrite tool** to track progress through the artifacts.

   At minimum, ensure the change has:
   - `planning/changes/<name>/proposal.md`
   - `planning/changes/<name>/design.md`
   - one or more delta specs at `planning/changes/<name>/specs/<capability>/spec.md`

   For each artifact:
   - Read any existing artifact before editing it
   - Read dependency artifacts for context before writing the next one
   - Keep the contract explicit and planner-first
   - Capture durable conclusions from research in the contract itself

   **Proposal requirements**
   - why the change exists
   - clear scope boundaries
   - explicit user/operator/interface impact
   - risks and constraints

   **Design requirements**
   - requested delta
   - preservation constraints
   - public interface deltas
   - module ownership and edit surface
   - proof obligations
   - no known unknowns at staging time

   **Delta spec requirements**
   - explicit requirements and scenarios
   - concrete capability names
   - no speculative wording about execution

6. **If critical context is unclear, ask instead of guessing**

   Use **AskUserQuestion** when the ambiguity would materially affect:
   - scope
   - interface semantics
   - preservation constraints
   - proof obligations

   Otherwise, make reasonable decisions and keep momentum.

7. **Re-check status after writing**

   Run:
   ```bash
   planner status "<name>" --json
   ```

   Confirm whether the contract is now ready for `/plan-stage`.

**Output**

After completing the contract work, summarize:
- change slug and location
- artifacts created or updated
- whether the contract is ready for staging
- prompt: `Run /plan-stage <name> to compile Taskplane packets.`

**Artifact Creation Guidelines**

- Keep planner artifacts as the canonical source of change truth
- Do not create Taskplane packets from this command
- Do not leave interface deltas implicit
- Do not leave proof obligations vague
- Read existing artifacts before overwriting them
- Update the existing change if the user is continuing prior work

**Guardrails**
- Always understand the requested change before proceeding
- Always ensure `planning/` exists before working under it
- Always read dependency artifacts before creating or revising downstream artifacts
- If a change with that name already exists, continue it intentionally rather than duplicating it
- Keep the contract explicit enough that `/plan-stage` can fail only on real defects, not ambiguity
