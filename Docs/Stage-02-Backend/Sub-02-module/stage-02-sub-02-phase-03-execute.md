# Stage 02 · Sub-02 · Phase 03 — Module Execution Protocol

Build the module following manual DI, with `routes.ts` as the composition root.

---

## Objective

Execute the module sprints and produce a fully wired module bound to the contract.

---

## Context & Inputs

- **Sprints:** `/docs/stage-02-backend/sub-02-module/sprints-[module].md`.
- **Plan:** `/docs/stage-02-backend/sub-02-module/plan-[module].md`.
- **Spec:** `module-contracts/[module].md`.
- **Rules:** `module-implementation-rules.md`.
- **Contract:** `@my-app/contract`.

---

## Context Protocol

One sprint per fresh session. Load only: `module-implementation-rules.md`, the module's `plan-[module].md`, `sprints-[module].md`, and `module-contracts/[module].md`.

---

## The Execution Loop (per sprint)

### Step 1 — Select & Review
First sprint not marked ✅. Recall: mapper is static/pure and converts dates; `routes.ts` is the only place `new Service()` happens; controllers read `req.validated` and respond via `sendSuccess`.

### Step 2 — Implement (strict order)
1. **Factories:** ensure `test/data` has what's needed.
2. **Test:** write the spec first (service mocks Prisma; mapper is pure).
3. **Implement:** `src/modules/[name]/...` — mapper → interface → service → (listener) → controller.
4. **Wire:** in `[name].routes.ts`, do manual DI and register routes with contract constants + per-segment `validateRequest`.
5. **Mount:** ensure the module router is mounted under `env.API_PREFIX` in `app.ts`.

### Step 3 — Validate
`tsc --noEmit` clean · `npm run test:unit` (incl. conformance) green · `npm run test:int` green once wired (test DB up) · routes use contract constants · responses use the envelope · no sensitive fields in any DTO.

### Step 4 — Commit on Green
`git commit -m "api: [module] sprint [N] — [name]"`.

### Step 5 — Report & Mark
Write `/docs/stage-02-backend/sub-02-module/results-[module]/report-sprint-[NN].md`. Mark the sprint ✅.

### Step 6 — Pause
Wait for `next`.

---

## Module Commandments

1. **Manual DI only** — constructor injection, no decorators.
2. **`routes.ts` is the composition root** — the only place services/controllers are instantiated.
3. **Mappers are static & pure** — no transformation logic in services/controllers.
4. **No magic strings** — `[MODULE]_ROUTES` constants from the contract.
5. **Depend on `IService`**, not the concrete class.
6. **Responses use the `ApiResponse` envelope** via `sendSuccess`; controllers read `req.validated`.
7. **Conformance** — every DTO parses against its contract schema; every contract route has a handler.
8. **Commit on green**, then report.
9. **Always check the rules file.**
10. **Wait for `next`.**

---

## Expected Outputs (all sprints ✅)

1. A fully wired module (mapper, interface, service, optional listener, controller, routes).
2. Passing unit tests (mapper, service), integration tests (endpoints), and conformance checks.
3. Reports in `/docs/stage-02-backend/sub-02-module/results-[module]/` and one commit per sprint.
