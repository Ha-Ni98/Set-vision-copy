# Stage 03 · Sub-03 · Phase 02 — Page Assembly Sprint Planning

Decompose the page plan into inside-out sprints: foundation → primitives/states → wiring → polish → tests. **No code yet.**

---

## Objective

A layer-by-layer playbook to build the page, wire its hooks, and enforce error/loading boundaries, backed by unit tests.

---

## Context & Inputs
- **Plan:** `/Docs/stage-03-frontend/sub-03-pages/[pages-set-name]/plan.md`.
- **Rules:** `front-end-rules.md`, `front-end-test-rules.md`.
- **Contract:** `Apps/contract`.

---

## Ordering (UI before wiring)
1. **Sprint 1 — Foundation:** Zod schemas (`[name].schema.ts`), translation keys in `translations.json`, route + `React.lazy()` setup.
2. **Sprint 2 — Primitives & States:** "dumb" components, Shadcn `Skeleton` loaders, local `NotFoundState`/error fallbacks.
3. **Sprint 3 — Assembly & Wiring:** the page component; connect `useQuery`/`useMutation` hooks; wire React Hook Form.
4. **Sprint 4 — Polish:** responsive classes (mobile-first public / desktop-first admin), `useMemo`/`useCallback` where the plan calls for it.
5. **Sprint 5 — Unit Tests:** `/tests/unit/pages/[page]/` with Vitest + RTL + `vi.mock()` on hooks (isLoading/isError/isSuccess) and Zod form validation.

---

## Sprint Template

````markdown
### Sprint [N]: [Name]   — Status: ⬜ Pending

**Goals**
- [Measurable outcome.] / [Testing outcome.]

**Tasks**
- [ ] [e.g. add keys to `config/translations.json`. (#i18n)]
- [ ] [e.g. create `ProductSkeleton.tsx`. (#ui)]
- [ ] [e.g. wire `useProducts` in `ProductsPage.tsx`. (#wiring)]
- [ ] [e.g. `/tests/unit/pages/products/ProductsPage.spec.tsx`. (#testing)]

**Validation**
- [ ] No inline strings — all text via `useTranslation`.
- [ ] No `useEffect` for fetching.
- [ ] `tsc --noEmit` clean.
- [ ] Layout survives `isError: true` (local fallback, no crash).
- [ ] `vitest run` green with mocked hooks (success/loading/error).
- [ ] No test files in `/src`.
- [ ] Committed on green.

**Risks**
- [Layout shifts affecting global layouts.]
````

---

## Expected Output
`/docs/stage-03-frontend/sub-03-pages/[pages-set-name]/sprints.md`.

## Principles
Zero code. Wiring (Sprint 3) never precedes primitives (Sprint 2). Test the UI with mocked hooks (`vi.mock`), not MSW.
