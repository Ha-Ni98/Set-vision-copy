# Stage 03 · Sub-01 — Prompts (Refactor)

Filenames match disk. Standing rules: rules govern HOW, phase files WHAT/WHEN, the contract WHICH; resolve HOW conflicts toward the rules and note them; stop and ask only on a genuine conflict.

---

## Phase 1 — Plan
I have a partially complete AI-generated React MVP. Audit it and create the refactor plan.

Read and follow strictly:
- **Phase file:** `stage-03-sub-01-phase-01-plan.md`
- **Rules:** `front-end-rules.md`, `front-end-best-practices.md`
- **Contract:** `@my-app/contract`

Constraints: no code (audit/plan only); do not invent features — standardize the existing code; output `codebase-map.md` and `plan.md` under `/docs/stage-03-frontend/sub-01-refactor/`.

---

## Phase 2 — Sprints
Create the refactor sprint plan.

Read and follow strictly:
- **Phase file:** `stage-03-sub-01-phase-02-sprints.md`
- **Plan:** `/docs/stage-03-frontend/sub-01-refactor/plan.md`
- **Rules:** `front-end-rules.md`

Constraints: no code; purge libs and fix folders before extracting data or fixing layouts; every sprint validates `tsc` **and** build/UI-render stability; output `/docs/stage-03-frontend/sub-01-refactor/sprints.md`.

---

## Phase 3 — Execute
Begin executing the refactor.

Read and follow strictly:
- **Phase file:** `stage-03-sub-01-phase-03-execute.md`
- **Sprints:** `/docs/stage-03-frontend/sub-01-refactor/sprints.md`
- **Rules:** `front-end-rules.md`

Constraints: extracted Hooks/Services return **typed empty defaults** so components still render; enforce Component→Hook→Service and `useTranslation` (no inline strings); check `@my-app/contract` before creating any type. Take the first sprint not ✅, validate (`tsc`, build), commit on green, update docs, stop and wait for `next`.
