---
description: Archive a planner-native change after conformance passes
---

Archive a completed planner-native change.

**Input**: Optionally specify a change slug. If omitted, infer it from conversation context only when unambiguous. Otherwise prompt for selection.

**Steps**

1. **If no change name is provided, prompt for selection**

   Run:
   ```bash
   planner status --json
   ```

   Show active changes that still exist under `planning/changes/`.
   Prefer changes with conformance reports when presenting options.

   **IMPORTANT**: Do NOT guess when multiple active changes exist.

2. **Check planner status and conformance**

   Run:
   ```bash
   planner status "<name>" --json
   ```

   Parse the JSON to understand:
   - whether the contract exists
   - whether a conformance report exists
   - the conformance verdict
   - whether staged packets still exist

3. **Read the conformance report**

   Read:
   - `planning/changes/<name>/conformance.md`

   Confirm whether the verdict is `ARCHIVE_READY`.

   **If the verdict is not `ARCHIVE_READY`:**
   - explain why archive is blocked
   - do not archive
   - suggest remediation or reopening as appropriate

4. **Explain spec sync impact**

   Planner archive promotes delta specs into cumulative truth under:
   - `planning/specs/<capability>/spec.md`

   Make it clear that archive both:
   - syncs cumulative specs
   - moves the change under `planning/archive/YYYY-MM-DD-<name>/`

5. **Perform the archive**

   Run:
   ```bash
   planner archive "<name>" --json
   ```

6. **Display summary**

   Show archive completion summary including:
   - change name
   - archive location
   - cumulative specs updated
   - note that the change is no longer active under `planning/changes/`

**Output On Success**

```markdown
## Archive Complete

**Change:** <name>
**Archived to:** planning/archive/YYYY-MM-DD-<name>/
**Specs:** Synced to `planning/specs/`

The planner-native change is archived and cumulative specs now reflect the approved delta.
```

**Guardrails**
- Never archive without reading the conformance report first
- Never archive when the verdict is not `ARCHIVE_READY`
- Be explicit that archive updates cumulative specs as part of completion
