# Planner Phase — Implementation

**Purpose:** These Taskplane packets implement approved planner contract slices.

## Rules

- The approved planner contract is authoritative.
- Read the change proposal, design, and relevant delta spec before coding.
- Stay inside the approved requested delta, preservation constraints, and edit surface.
- Prefer coarse-grained execution: complete a capability slice end to end in as few steps as practical.
- Do not split implementation, tests, documentation, and repo gates into separate phases when they naturally finish the same slice.
- Do not silently broaden scope if execution discovers a contract defect.
- Record discoveries that require contract changes so planning can be reopened.
- Leave whole-change conformance and archive decisions to the conformance packet.

## Expected Outcome

- The assigned capability slice is implemented.
- Required tests, docs, and repo gates for that slice pass.
- The task remains Taskplane-native and planner-bounded.
