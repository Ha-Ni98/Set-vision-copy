# Stage 02 · Sub-01 — Prompts (Backend Initialization)

Filenames here match the files on disk. Standing rules: follow the precedence policy (rules govern HOW, phase files govern WHAT/WHEN, the contract governs WHICH); resolve HOW conflicts in favour of the rules and note them; stop and ask only on a genuine conflict; otherwise proceed.

---

## Phase 1 — Plan

I have the Contract and the Prisma schema. I need the backend skeleton (infrastructure only, no modules).

Read and follow strictly:
- **Phase file:** `stage-02-sub-01-phase-01-plan.md`
- **Rules:** `back-end-rules.md` and `test-rules.md` and `realtime-rules.md`
- **Inputs:** `@my-app/contract`, `prisma/schema.prisma`

Constraints: no code; no `src/modules/` content; output only `/docs/stage-02-backend/sub-01-init/plan.md`.

---

## Phase 2 — Sprints

The plan is done. Produce the sprint plan.

Read and follow strictly:
- **Phase file:** `stage-02-sub-01-phase-02-sprints.md`
- **Plan:** `/docs/stage-02-backend/sub-01-init/plan.md`
- **Rules:** `back-end-rules.md` and `test-rules.md` and `realtime-rules.md`

Constraints: no code; respect the dependency order; every sprint has a Validation block covering compilation **and** unit tests; before declaring any type/enum/route, confirm it doesn't already exist in `@my-app/contract`; output only `/docs/stage-02-backend/sub-01-init/sprints.md`.

---

## Phase 3 — Execute

Begin execution.

Read and follow strictly:
- **Phase file:** `stage-02-sub-01-phase-03-execute.md`
- **Sprints:** `/docs/stage-02-backend/sub-01-init/sprints.md`
- **Rules:** `back-end-rules.md` and `test-rules.md` and `realtime-rules.md`

Instructions: follow the Context Protocol; take the **first sprint not marked ✅**; test-alongside; validate (`tsc --noEmit`, `npm run test:unit`, lint); commit on green; write the report; mark ✅; stop and wait for `next`.
