# Stage 03 · Sub-02 · Phase 03 — Integration Engine Execution Protocol

Build the data layer sprint by sprint: Axios singleton, typed Services, TanStack Query hooks, backed by MSW integration tests.

---

## Objective

Execute `sprints.md` to produce a 100% type-safe integration engine, ready to plug into the UI in Sub-03.

---

## Context & Inputs
- **Sprints & plan:** `/docs/stage-03-frontend/sub-02-integration/results/sprints.md`, `plan.md`.
- **Rules:** `front-end-rules.md`, `front-end-test-rules.md`.
- **Contract:** `@my-app/contract`. **Codebase:** `/src/lib`, `/src/services`, `/src/hooks`, `/tests`.

---

## Context Protocol
One sprint per fresh session. Load only: the rules files, `plan.md`, `sprints.md`, and the contract files for this sprint's domain.

## The Loop (per sprint)

### Step 1 — Select & Review
First sprint not ✅. Review the sprint's routes/DTOs in `Apps/contract`; confirm Query Keys, required MSW handlers, and fixtures.

### Step 2 — Implement & Test
- **Axios:** base = `import.meta.env.VITE_API_URL`; cookie auth; 401 redirect with loop prevention.
- **Fixtures & MSW:** envelope-shaped mocks (`{ success: true, data }`) in `/tests/fixtures/data/` (validated via contract schemas) and handlers in `/tests/fixtures/msw/` using the route builder, covering 200 + 4xx/5xx.
- **Services:** import the Axios singleton; **unwrap `ApiResponse`** to return the DTO; **throw** errors (never `{ error: true }`).
- **Hooks:** wrap services in TanStack Query. Query hooks return `{ data, isLoading, isError, error, refetch }`; mutations expose `{ mutate, mutateAsync, isPending, ... }` and call `queryClient.invalidateQueries` on success.
- **Tests:** Vitest integration tests for services (unwrap, mapping, throwing via MSW) and hooks (state transitions), without mocking TanStack internals.

### Step 3 — Validate
`tsc --noEmit` clean · `vitest run` green (200 + 4xx/5xx) · MSW intercepts · fixtures parse against contract schemas · no test files in `/src`.

### Step 5 — Update Docs and Generate Report
Write `/docs/stage-03-frontend/sub-02-integration/results/report-sprint-[NN].md`.
Mark ✅ in `sprints.md`; 

### Step 4 — Commit on Green
`git add .`
`git commit -m "fe: integration sprint [N] — [domain]"`.


### Step 6 — Pause
Wait for `next`.

---

## Data-Layer Commandments
1. **Contract is absolute** — never guess a URL; compose route constants via the builder.
2. **No UI code** — don't touch `/src/components` or `/src/pages`.
3. **One Axios** — never import `axios` directly into a service; use `src/lib/axios.ts`.
4. **Unwrap, then throw** — return the DTO; let errors throw to the global handler.
5. **Invalidate** — mutations refresh their read queries.
6. **Test both paths** (200 + 4xx/5xx) with MSW; fixtures match the envelope.
7. **Keep `/src` pure** — no `*.spec.ts` or mocks in `/src`.
8. `tsc`/lint clean; console silent.
9. Commit on green; update docs.
10. Wait for `next`.

---

## Expected Outputs (all sprints ✅)
A typed Axios config; pure Services mapping 1:1 to the contract (envelope-aware); TanStack hooks ready for the UI; integration tests in `/tests/integration/`; envelope-shaped fixtures + MSW handlers in `/tests/fixtures/`; one commit per sprint.
