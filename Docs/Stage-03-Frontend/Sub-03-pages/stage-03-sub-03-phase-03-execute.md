# Stage 03 · Sub-03 · Phase 03 — Page Assembly Execution Protocol

Build and wire one page's or set of pages UI sprint by sprint, powered by the Integration Engine and protected by granular states, backed by unit tests.

---

## Objective

Execute the page's `sprints.md` to deliver a production-ready, responsive page aligned with the rules and validated by Vitest unit tests.

---

## Context & Inputs
- **Sprints & plan:** `/Docs/stage-03-frontend/sub-03-pages/results/[page-set-name]/sprints.md`, `plan.md`.
- **Rules:** `front-end-rules.md`, `front-end-test-rules.md`, `front-end-best-practices.md`.
- **Contract:** `@my-app/contract`. **Codebase:** `Apps/web/src` (`components`, `pages`, `hooks`, `config`), `Apps/web/tests/unit`.

---

## Context Protocol
One sprint per fresh session. Load only: the rules files, the page's `plan.md` and `sprints.md`, and the requirements file.

## The Loop (per sprint)

### Step 1 — Select & Review
First sprint not ✅. Re-read layout/responsive rules (admin desktop-first, public mobile-first) and the hook-mocking pattern in `front-end-test-rules.md`.

### Step 2 — Implement & Test
- **Wire real hooks:** connect the Sub-02 `use[Name]` hooks; **no `useEffect` fetching**.
- **Granular states:** every hook gets an `isLoading` Skeleton and a local `isError` fallback — the global layout never unmounts.
- **Forms:** Zod schema (`[name].schema.ts`, aligned to the contract) wired via React Hook Form `zodResolver`.
- **i18n:** add text to `config/translations.json`; render via `useTranslation`.
- **Unit tests:** `/tests/unit/pages/[page]/` with Vitest + RTL; `vi.mock()` the hooks to force `isLoading`/`isError`/`isSuccess` and verify Skeletons, error fallbacks, and Zod validation render correctly.

### Step 3 — Validate
`tsc --noEmit` clean · `vitest run` green under all mocked hook states · no inline strings · no `useEffect` fetching · no test files in `/src`.

### Step 4 — Update Docs
Mark ✅ in `sprints.md`; update `plan.md` if architecture shifted.
generate the sprint report and write it in `/Docs/stage-03-frontend/sub-03-pages/results/[page-set-names]/report-sprint-[NN].md`.

### Step 5 — Commit on Green
`git add . && git commit -m "fe: [page] sprint [N] — [name]"`.

### Step 6 — Pause
Wait for `next`.

---

## UI Assembly Commandments
1. No inline strings — `useTranslation` + `translations.json`.
2. No `useEffect` fetching — only the pre-built hooks.
3. Protect the layout — granular, localized loading/error.
4. Admin desktop-first; public mobile-first.
5. All forms gated by Zod + React Hook Form.
6. `tsc`/lint clean; console silent.
7. **Mock the hooks, not the network** — unit tests `vi.mock()` the hook, bypassing services/MSW.
8. Keep `/src` pure — no `*.spec.tsx` in `/src`.
9. Commit on green; update docs.
10. Wait for `next`.

---

## Expected Outputs (all sprints ✅)
A responsive page wired to the real engine; full `isLoading`/`isError` coverage; typed forms aligned to contract DTOs; unit tests in `/tests/unit/pages/[page]/`; updated docs; one commit per sprint.
