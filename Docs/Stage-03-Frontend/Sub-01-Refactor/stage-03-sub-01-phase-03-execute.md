# Stage 03 · Sub-01 · Phase 03 — Refactor Execution Protocol

Execute each refactor sprint under a human-in-the-loop cycle, keeping the UI rendering throughout.

---

## Objective

Systematically execute `sprints.md` to produce a standardized frontend that follows Component→Hook→Service and is ready for real integration in Sub-02.

---

## Context & Inputs

- **Sprints & plan:** `/docs/stage-03-frontend/sub-01-refactor/results/sprints.md`, `plan.md`.
- **Rules:** `front-end-rules.md`, `front-end-best-practices.md`.
- **Contract:** `Apps/contract`. **Codebase:** `/src`, `package.json`.

---

## Context Protocol
One sprint per fresh session. Load only: the two rules files, `plan.md`, `sprints.md`.

## The Loop (per sprint)

### Step 1 — Select & Review
First sprint not ✅. Re-read `front-end-rules.md` (folder structure, `useTranslation` usage, the Component→Hook→Service rule).

### Step 2 — Implement (Refactor)
- Moving files: update every relative/alias import so nothing breaks.
- Extracting data: move `useEffect`/`axios` out of components into a Hook (`use[Name].ts`) + Service (`[name].service.ts`) that return **typed empty defaults** (`[]` for lists) — enough to keep the UI rendering. The real implementation lands in Sub-02.
- i18n: replace hardcoded text with `useTranslation` keys; update `translations.json`.
- Types come from `Apps/contract`; frontend-only view models go in `src/types`.

### Step 3 — Validate
`tsc --noEmit` clean · `npm run build` succeeds · UI renders, no layout crash · no leftover `console.*`.

### Step 4 — Commit on Green
`git commit -m "fe: refactor sprint [N] — [name]"` — the rollback point.

### Step 5 — Update Docs
Mark the sprint ✅ in `sprints.md`; cross off goals in `plan.md`.

### Step 6 — Pause
Wait for `next`.

---

## Refactor Commandments
1. Check imports before moving a file.
2. Strict layering: Components → Hooks → Services, never Components → Services.
3. No inline strings — `useTranslation` + `translations.json`.
4. Preserve layouts: Skeletons for loading, local error states; no full-page crashes.
5. `tsc`/lint clean; console silent.
6. Commit on green; update all docs.
7. Wait for `next`.

---

## Expected Outputs (all sprints ✅)
1. A refactored codebase adhering to the rules. 2. A clean `package.json` (no unapproved libs). 3. A UI that renders via isolated, empty-default Hooks/Services, ready for Sub-02 — and one commit per sprint.
