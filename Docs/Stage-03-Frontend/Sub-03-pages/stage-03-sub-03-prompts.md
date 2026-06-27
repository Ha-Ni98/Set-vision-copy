# Stage 03 · Sub-03 — Prompts (Page Assembly)

Run once per page. Replace `[page]` with the page name. Standing rules: rules govern HOW, phase files WHAT/WHEN, the contract WHICH; resolve HOW conflicts toward the rules and note them; stop and ask only on a genuine conflict.

---

## Phase 1 — Plan
Assemble the `[page]` page. The Integration Engine (Services/Hooks) is built. Create the assembly plan.

Read and follow strictly:
- **Phase file:** `stage-03-sub-03-phase-01-plan.md`
- **Rules:** `front-end-rules.md`, `front-end-test-rules.md`
- **Input:** the page requirements file and the existing `/src/hooks`
- **Contract:** `@my-app/contract`

Constraints: no code (audit/plan only); map exactly which `use[Name]` hooks are needed (no `useEffect` fetching); plan Shadcn Skeletons + local error fallbacks; output `/docs/stage-03-frontend/sub-03-pages/[page]/plan.md`.

---

## Phase 2 — Sprints
Create the page sprint plan.

Read and follow strictly:
- **Phase file:** `stage-03-sub-03-phase-02-sprints.md`
- **Plan:** `/docs/stage-03-frontend/sub-03-pages/[page]/plan.md`
- **Rules:** `front-end-rules.md`, `front-end-test-rules.md`

Constraints: no code; order Foundation (schemas/i18n) → Primitives & States → Assembly & Wiring → Polish → Tests; every sprint validates `useTranslation` usage and `tsc`; output `/docs/stage-03-frontend/sub-03-pages/[page]/sprints.md`.

---

## Phase 3 — Execute
Begin executing the `[page]` sprints.

Read and follow strictly:
- **Phase file:** `stage-03-sub-03-phase-03-execute.md`
- **Sprints:** `/docs/stage-03-frontend/sub-03-pages/[page]/sprints.md`
- **Rules:** `front-end-rules.md`, `front-end-test-rules.md`

Constraints: no inline strings (text via `useTranslation` + `translations.json`); implement Skeleton + localized error states whenever a hook is consumed (layout never crashes); forms use React Hook Form + Zod aligned to `@my-app/contract`. Take the first sprint not ✅, validate (`tsc`, `vitest run`), commit on green, update docs, stop and wait for `next`.
