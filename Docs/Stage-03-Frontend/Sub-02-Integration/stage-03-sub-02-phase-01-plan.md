# Stage 03 · Sub-02 · Phase 01 — Integration Engine Planning

Map the type-safe data layer (Axios, Services, Hooks) and its test strategy from `@my-app/contract`. **No code — audit and plan only.**

---

## Objective

Design the single Axios instance, every Service function, the TanStack Query hook structure (keys + invalidations), and the required MSW handlers/tests — all from the contract — before writing code.

---

## Context & Inputs

- **Rules:** `front-end-rules.md`, `front-end-test-rules.md`, `front-end-best-practices.md`.
- **Contract:** `@my-app/contract` (routes + DTOs — source of truth).
- **Current state:** the refactored `/src` with lean empty-default services from Sub-01 (which this stage **replaces**).

---

## Steps

### Step 1 — Contract Analysis & Route Mapping
Read the contract: list every route constant (`USER_ROUTES.GET_ALL`, …), Command, and Response DTO. Note the **envelope** — responses arrive as `ApiResponse<T>`, so services unwrap `.data`. Flag any DTO mismatch with `src/types` as a contract gap. List DTOs needing fixtures in `/tests/fixtures/data/`.

### Step 2 — Core Infrastructure
- **Axios (`src/lib/axios.ts`):** base = `VITE_API_URL`; cookie auth; 401 redirect with **loop prevention** (skip auth endpoints / `/login`). Edge cases for `/tests/unit/lib/`: 401 loop, missing cookie, timeout.
- **Route builder (`src/lib/api-path.ts`):** `apiPath`/`withParams` to compose contract fragments — used by services **and** MSW handlers.
- **Query Client (`src/lib/query-client.ts`):** global error handling on `QueryCache`/`MutationCache` (v5) → `sonner` for 4xx/5xx; suppress toasts for aborted requests and first-load (toast only on background-refetch failure).
- **Test boundaries:** state what *not* to test (don't assert axios sends a header; do assert your interceptor reacts to responses; don't test thin wrappers over built-ins).

### Step 3 — Service & Hook Mapping
Per domain (Auth, User, Product, …): list Service functions with input Command / output DTO types from the contract (returning the **unwrapped** DTO). Define the matching hooks — Query Keys (`['users','list']`) and, for mutations, which keys to invalidate (`useCreateUser` → `['users','list']`). List MSW handlers (200 + explicit 4xx/5xx) and the hook state-transition tests for `/tests/integration/`.

### Step 4 — Integration Plan
Create `/docs/stage-03-frontend/sub-02-integration/plan.md`:
1. **Core Setup** (Axios, route builder, Query Client).
2. **Domain Mapping** (Services, Hooks, MSW handlers per domain).
3. **Query Key Registry** (one central list).
4. **Testing & Edge-Case Strategy** (fixtures, envelope-shaped mocks, edge cases, what-not-to-test).
5. **Readiness Checklist:** interceptors defined · global error mapped · every contract route → a Service · every Service → a Hook · keys/invalidations defined · fixtures validated against contract schemas · test boundaries set.

---

## Expected Outputs
`plan.md` (path above) and a summary confirming every contract route is mapped.

## Principles
Zero code. Think like an SDET (empty array vs null? token expires mid-request?). Contract is king — if it's not in `@my-app/contract`, it doesn't exist. No UI thinking.
