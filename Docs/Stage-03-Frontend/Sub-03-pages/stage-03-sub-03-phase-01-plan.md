# Stage 03 · Sub-03 · Phase 01 — Page Assembly Planning

Plan one page or set of pages (repeat per page/feature): connect its UI to the Integration Engine with granular states, forms, and unit tests. **No code — plan only.**

---

## Objective

Translate a page's requirements into a React plan: components, the `use[Name]` hooks to wire, RHF + Zod forms, `isLoading`/`isError` handling that never breaks the global layout, and the unit-test strategy.

---

## Context & Inputs

- **Page requirements:** a markdown file (e.g. docs/requirements/pages/[pages-set-name].md ).
- **Codebase:** refactored UI (Sub-01) + the Integration Engine hooks/services (Sub-02).
- **Rules:** front-end-rules.md , front-end-test-rules.md ,  front-end-best-practices.md .
- **Contract:** `Apps/contract` (for Zod/DTO alignment).

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
Create `/Docs/stage-03-frontend/sub-03-pages/results/[pages-set-name]/plan.md`:
1. **Hook & Data Mapping** — exact hooks consumed.
2. **UI Components** — *Shared* (reuse from `components/shared`) vs *New* (`src/pages/[page]/components/`).
3. **Granular States** — Skeletons + local error components.
4. **Forms & Mutations** — RHF setups, Zod schemas, target mutations.
5. **Optimization** — where `React.lazy`/`Suspense`/`useMemo` apply.
6. **Unit-Test Strategy** — `.spec.tsx` files, mocked hooks, interactions.
7. **Acceptance Criteria** — what "done" means for this page.

---

## Expected Outputs
`Docs/stage-03-frontend/sub-03-pages/[pages-set-name]/plan.md` and a list of any missing hooks or contract DTOs to resolve first.

## Principles
Zero code. Reuse first (`components/shared`, `components/ui`). Loading/error are localized, never full-page. Test the UI's reaction to state (mocked hooks), not the network.
