# Stage 03 · Sub-02 · Phase 02 — Integration Engine Sprint Planning

Decompose the integration plan into bottom-up sprints, each with its MSW handlers, fixtures, and Vitest tests. **No code yet.**

---

## Objective

Build the data pipeline from the core out: Axios + Query Client first, then Auth, then feature domains — each fully tested before the next.

---

## Context & Inputs
- **Plan:** `/docs/stage-03-frontend/sub-02-integration/results/plan.md`.
- **Rules:** `front-end-rules.md`, `front-end-test-rules.md`.
- **Contract:** `@my-app/contract`.

---

## Ordering (mandatory)
1. **Sprint 1 — Core Pipeline:** `src/lib/axios.ts` (cookie + 401 interceptors), `src/lib/api-path.ts`, `src/lib/query-client.ts` (cache-level error toasts), and the global test setup (MSW server, Vitest config, query wrapper) in `/tests/fixtures/`.
2. **Sprint 2 — Auth Domain:** Auth services + hooks (token logic that later authenticated routes depend on), plus Auth fixtures, MSW handlers, and integration tests.
3. **Sprint 3+ — Feature Domains:** one or up to three domain each (Users, Products, Orders…), implementing Services, hooks, MSW handlers, envelope-shaped fixtures in `/tests/fixtures/data/`, and integration tests.

---

## Sprint Template

````markdown
### Sprint [N]: [Name]   — Status: ⬜ Pending

**Goals**
- [Core/domain outcome.]
- [Testing outcome.]

**Tasks**
- [ ] [e.g. `src/services/auth.service.ts` mapping `AUTH_ROUTES`, unwrapping the envelope.]
- [ ] [e.g. `src/hooks/useAuth.ts` — queries/mutations with keys + invalidations.]
- [ ] [e.g. `/tests/fixtures/data/auth.mock.ts` — fixtures validated via contract schemas.]
- [ ] [e.g. `/tests/fixtures/msw/auth.handlers.ts` — envelope-shaped 200 + 4xx/5xx.]
- [ ] [e.g. `/tests/integration/...` service + hook tests.]

**Validation**
- [ ] `tsc --noEmit` clean; all types from `@my-app/contract`.
- [ ] Services unwrap `ApiResponse` and **throw** on error (never swallow).
- [ ] Query hooks return `{ data, isLoading, isError, error, refetch }`; mutation hooks expose `{ mutate, mutateAsync, isPending, ... }` and invalidate the right keys.
- [ ] MSW intercepts (handlers use the route builder); fixtures parse against contract schemas.
- [ ] Tests cover 200 **and** 4xx/5xx; no test files inside `/src`.
- [ ] Committed on green.

**Risks**
- [Missing DTOs (contract gap); edge cases hard to mock.]
````

---

## Expected Output
`/docs/stage-03-frontend/sub-02-integration/results/sprints.md`.

## Principles
No code; no UI tasks (only `lib`, `services`, `hooks`, `tests`); validate type-compliance with `Apps/contract`; define what NOT to test (no TanStack internals).
