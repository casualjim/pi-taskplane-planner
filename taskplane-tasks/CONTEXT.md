# General — Context

**Last Updated:** 2026-04-06
**Status:** Active
**Next Task ID:** TP-002

---

## Current State

This is the default task area for pi-taskplane-planner. Tasks that don't belong
to a specific domain area are created here.

Taskplane is configured and ready for task execution. Use `/task` for single
tasks or `/orch all` for parallel batch execution.

Planner-compiled packets use phase-specific context documents alongside this
base context:
- `taskplane-tasks/PHASE-IMPLEMENTATION.md`
- `taskplane-tasks/PHASE-CONFORMANCE.md`

---

## Key Files

| Category | Path |
|----------|------|
| Tasks | `taskplane-tasks/` |
| Context | `taskplane-tasks/CONTEXT.md` |
| Phase | `taskplane-tasks/PHASE-IMPLEMENTATION.md` |
| Phase | `taskplane-tasks/PHASE-CONFORMANCE.md` |
| Config | `.pi/task-runner.yaml` |
| Config | `.pi/task-orchestrator.yaml` |

---

## Technical Debt / Future Work

_Items discovered during task execution are logged here by agents._
