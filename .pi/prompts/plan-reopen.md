---
description: Reopen an openspec change when conformance finds a contract defect
---

Reopen an openspec change when verification or remediation shows the approved contract is no longer correct.

**Input**: Optionally specify a change slug after `/plan-reopen`. If omitted, infer from context only when safe; otherwise prompt for selection.

**Steps**

1. **Select the change**

   If the user provided a change slug, use it. Otherwise:
   - inspect `planner status --json`
   - identify active changes with conformance reports or staged packets
   - if more than one candidate exists, use **AskUserQuestion** to let the user choose

2. **Load the current contract and evidence**

   Read:
   - `openspec/changes/<name>/proposal.md`
   - `openspec/changes/<name>/design.md`
   - `openspec/changes/<name>/specs/*/spec.md`
   - `openspec/changes/<name>/conformance.md` if present

3. **Identify the reason for reopening**

   Reopen only when the approved contract itself must change, for example:
   - intent changed
   - public interface semantics changed
   - preservation constraints changed
   - proof obligations changed
   - conformance found an issue that cannot be resolved within the approved contract

   If the issue can be resolved without changing the contract, prefer remediation rather than reopening.

4. **Mark the change as reopened**

   Run:
   ```bash
   planner reopen "<name>" "<reason>"
   ```

5. **Update the contract artifacts**

   Use `/opsx:propose` to revise the openspec contract so it matches the newly understood truth:
   - proposal for scope/intent changes
   - design for interface, preservation, or proof changes
   - delta specs for requirement changes

6. **Explain the new state**

   Summarize:
   - why reopening was necessary
   - which artifacts changed
   - whether the user should review before restaging
   - the next command (`/opsx:propose`, `/plan-stage`, or continued exploration via `/opsx:explore`)

**Guardrails**
- Do not patch code directly from this command
- Reopen only for contract defects, not routine implementation fixes
- Prefer explicit reasoning tied to the conformance report or changed requirements
