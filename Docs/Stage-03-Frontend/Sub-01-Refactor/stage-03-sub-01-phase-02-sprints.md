# Stage 03 · Sub-01 · Phase 02 — Refactor Sprint Planning

Decompose the refactor plan into incremental sprints that keep the app runnable at every step. **No code yet.**

---

## Objective

Turn `plan.md` into an ordered playbook: clean the foundation, then the UI, then decouple data — minimizing breakage.

---

## Context & Inputs

- **Plan & map:** `/docs/stage-03-frontend/sub-01-refactor/plan.md`, `codebase-map.md`.
- **Rules:** `front-end-rules.md`, `front-end-best-practices.md`.
- **Contract:** `@my-app/contract`.

---

## Ordering (clean → UI → data)

1. **Sprint 1 — Purge & Structure:** uninstall unapproved libs; move files into the strict `/src` layout.
2. **Sprint 2 — UI Standardization & i18n:** merge duplicates into `components/shared`; replace hardcoded text with `useTranslation` keys.
3. **Sprint 3 — Layouts & Boundaries:** apply `AdminLayout`/`PublicLayout`; wrap sections in Shadcn `Skeleton` and local `NotFoundState`.
4. **Sprint 4 — Data Decoupling:** pull `useEffect`/`axios` out of components into lean Hooks + Services that return **typed empty defaults**, preserving the UI until Sub-02 wires the real engine.

---

## Sprint Template

````markdown
### Sprint [N]: [Name]   — Status: ⬜ Pending

**Goals**
- [Measurable "done".]

**Tasks**
- [ ] [Specific move / deletion / change. (#tag)]

**Validation**
- [ ] `tsc --noEmit` clean and `npm run build` succeeds (no broken imports after moves).
- [ ] UI still renders; no layout crashes.
- [ ] No new inline strings; no in-component `useEffect`/`axios` left after Sprint 4.
- [ ] Committed on green.

**Risks**
- [Routes/features that may temporarily break.]
````

---

## Expected Output

`/docs/stage-03-frontend/sub-01-refactor/sprints.md`.

## Principles
No new features. Keep it runnable after every sprint. Strict dependency order — you can't standardize components still in the wrong folders.
