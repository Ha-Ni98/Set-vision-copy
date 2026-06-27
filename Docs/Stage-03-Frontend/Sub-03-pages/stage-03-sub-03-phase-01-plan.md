# Stage 03 · Sub-03 · Phase 01 — Page Assembly Planning

Plan one page (repeat per page/feature): connect its UI to the Integration Engine with granular states, forms, and unit tests. **No code — plan only.**

---

## Objective

Translate a page's requirements into a React plan: components, the `use[Name]` hooks to wire, RHF + Zod forms, `isLoading`/`isError` handling that never breaks the global layout, and the unit-test strategy.

---

## Context & Inputs

- **Page requirements:** a markdown file (e.g. `/docs/requirements/pages/[page].md`).
- **Codebase:** refactored UI (Sub-01) + the Integration Engine hooks/services (Sub-02).
- **Rules:** `front-end-rules.md`, `front-end-test-rules.md`, `front-end-best-practices.md`.
- **Contract:** `@my-app/contract` (for Zod/DTO alignment).

---

## Steps

### Step 1 — Requirements & Hook Mapping
Extract every component, interaction, form, and data dependency. Map each to an existing `use[Name]` hook from Sub-02 (no `useEffect` fetching). **Scope confinement:** if the page links elsewhere, plan only the `<Link>`, not the destination.

### Step 2 — Architecture, State & Tests
- **Granular states:** for each hook, name the Shadcn `Skeleton` for `isLoading` and the local fallback for `isError`, preserving `AdminLayout`/`PublicLayout`.
- **Forms:** the Zod schema (`[name].schema.ts`, aligned to the contract DTO/Command) and the mutation hook it triggers.
- **Optimization:** flag any `React.lazy()` route or `useMemo` list.
- **Unit-test strategy:** which `.spec.tsx` files, which hooks to `vi.mock()`, which interactions to assert (Zod errors, skeleton, clicks). Tests go in `/tests/unit/pages/[page]/`.

### Step 3 — Page Action Plan
Create `/docs/stage-03-frontend/sub-03-pages/[page]/plan.md`:
1. **Hook & Data Mapping** — exact hooks consumed.
2. **UI Components** — *Shared* (reuse from `components/shared`) vs *New* (`src/pages/[page]/components/`).
3. **Granular States** — Skeletons + local error components.
4. **Forms & Mutations** — RHF setups, Zod schemas, target mutations.
5. **Optimization** — where `React.lazy`/`Suspense`/`useMemo` apply.
6. **Unit-Test Strategy** — `.spec.tsx` files, mocked hooks, interactions.
7. **Acceptance Criteria** — what "done" means for this page.

---

## Expected Outputs
`/docs/stage-03-frontend/sub-03-pages/[page]/plan.md` and a list of any missing hooks or contract DTOs to resolve first.

## Principles
Zero code. Reuse first (`components/shared`, `components/ui`). Loading/error are localized, never full-page. Test the UI's reaction to state (mocked hooks), not the network.
