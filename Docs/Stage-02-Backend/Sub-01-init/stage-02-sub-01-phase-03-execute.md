# Stage 02 · Sub-01 · Phase 03 — Backend Init Execution

Execute the init sprints, building the engine and its safety net (tests) together.

---

## Objective

Produce a running backend core (strict TS, Pino, single `requireAuth` guard, `ApiResponse` envelope) with passing unit tests.

---

## Context & Inputs

- **Sprints:** `/docs/stage-02-backend/sub-01-init/sprints.md`.
- **Plan:** `/docs/stage-02-backend/sub-01-init/plan.md`.
- **Rules:** `back-end-rules.md`, `test-rules.md`.

---

## Context Protocol

One sprint per fresh session. Load only: `back-end-rules.md`, `test-rules.md`, `plan.md`, `sprints.md`. State lives on disk, so a fresh agent resumes cleanly.

---

## The Execution Loop (per sprint)

### Step 1 — Select & Review
- First sprint not marked ✅ in `sprints.md`.
- Recall the standards that apply: single `requireAuth` guard, `validateRequest` writes to `req.validated`, responses via `sendSuccess`, Pino only. Confirm where this sprint's tests live.

### Step 2 — Implement (test-alongside)
1. **Data first:** create/extend the factory in `test/data` (no hardcoded values).
2. **Test:** write the spec in the correct `test/unit/...` folder.
3. **Implement:** write the source under `src/common/...` (or `src/`).
4. **Verify:** `npm run test:unit` passes; `src/env.ts` crashes on missing vars.

### Step 3 — Validate
`tsc --noEmit` clean · `npm run test:unit` green · lint clean · no `console.*` · no `process.env` outside `env.ts`.

### Step 4 — Commit on Green
Commit (`git commit -m "api: sub-01 sprint [N] — [name]"`). This is the rollback point.

### Step 5 — Report & Mark
Write `/docs/stage-02-backend/sub-01-init/results/report-sprint-[NN].md` (work done + tests created). Mark the sprint ✅ in `sprints.md`.

### Step 6 — Pause
Wait for `next`.

---

## Backend Commandments

1. **Crash early** — invalid config never boots.
2. **Logs are data** — Pino/JSON, no `console.*`.
3. **Strict types** — `strict: true`, no `any`.
4. **No magic data** — tests use `test/data` factories.
5. **Correct test location** — utils → `test/unit/utils`, middleware → `test/unit/middleware`.
6. **Dependency order** — env → errors → db → config → middleware → app → server.
7. **Secrets** — never commit `.env`.
8. **Graceful exit** — handle SIGTERM/SIGINT, disconnect Prisma.
9. **Commit on green**, then report.
10. **Always check the rules files.**
11. **Wait for `next`.**

---

## Expected Outputs (all sprints ✅)

1. A running `apps/api` skeleton answering `GET /health`.
2. A reusable `common/` framework (errors, logger, db, http, events, middleware, utils).
3. A unit-test suite for utils and middleware, with factories and a guarded DB fixture.
4. Reports in `/docs/stage-02-backend/sub-01-init/results/` and one commit per sprint.
