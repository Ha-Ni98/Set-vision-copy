# Stage 03 · Sub-02 — Prompts (Integration Engine)

Filenames match disk. Standing rules: rules govern HOW, phase files WHAT/WHEN, the contract WHICH; resolve HOW conflicts toward the rules and note them; stop and ask only on a genuine conflict.

---

## Phase 1 — Plan
Build the Integration Engine (Axios, Services, Hooks) from `Apps/contract`, replacing the lean mock services. Create the integration plan.

Read and follow strictly:
- **Phase file:** stage-03-sub-02-phase-01-plan.md
- **Rules:** front-end-rules.md , front-end-test-rules.md
- **Contract:** `Apps/contract`

Constraints: no code (audit/plan only); no UI thinking — 100% the data pipeline; account for the `ApiResponse` envelope; output `/docs/stage-03-frontend/sub-02-integration/results/plan.md`.

---

## Phase 2 — Sprints
Create the integration sprint plan.

Read and follow strictly:
- **Phase file:** stage-03-sub-02-phase-02-sprints.md
- **Plan:** /docs/stage-03-frontend/sub-02-integration/results/plan.md
- **Rules:** front-end-rules.md , front-end-test-rules.md

Constraints: no code; Core Pipeline + Auth before feature domains; every sprint validates type-compliance with `Apps/contract` and envelope-shaped fixtures; output `/docs/stage-03-frontend/sub-02-integration/results/sprints.md`.

---

## Phase 3 — Execute
Begin executing the integration sprints.

Read and follow strictly:
- **Phase file:** stage-03-sub-02-phase-03-execute.md
- **Sprints:** /docs/stage-03-frontend/sub-02-integration/results/sprints.md
- **Rules:** front-end-rules.md, front-end-test-rules.md
- **Contract:** `Apps/contract`

Constraints: only touch `/src/lib`, `/src/services`, `/src/hooks`, `/tests` — **never** `/src/components` or `/src/pages`. Axios handles cookies + 401 (loop-prevented); services **unwrap `ApiResponse`** and **throw**; query hooks return `{ data, isLoading, isError, error, refetch }`, mutations invalidate keys. Take the first sprint not ✅, validate (`tsc`, `vitest run`), update docs and save the report file, commit on green, stop and wait for `next`.
