# Stage 03 · Sub-03 — Prompts (Page Assembly)

Run once per page. Replace `[page]` with the page name. Standing rules: rules govern HOW, phase files WHAT/WHEN, the contract WHICH; resolve HOW conflicts toward the rules and note them; stop and ask only on a genuine conflict.

---

## Phase 1 — Plan
Assemble the admin part 2 pages. The Integration Engine (Services/Hooks) is built. Create the assembly plan.

Read and follow strictly:
- **Phase file:** @Docs/Stage-03-Frontend/Sub-03-pages/stage-03-sub-03-phase-01-plan.md  
- **Rules:** @Docs/Stage-03-Frontend/front-end-rules.md  , @Docs/Stage-03-Frontend/front-end-test-rules.md  
- **Input:** the page requirements file @Docs/Stage-00-Conception/Pages-Requirements/SV-PAGE-011-013_admin_part2_spec.md  and the existing `/src/hooks` and the backend in `Apps/api`
- **Contract:** `@my-app/contract`

Constraints: no code (audit/plan only); map exactly which `use[Name]` hooks are needed (no `useEffect` fetching); plan Shadcn Skeletons + local error fallbacks; output `/Docs/stage-03-frontend/sub-03-pages/results/[page-set-name]/plan.md`.

Standing rules: rules govern HOW, phase files WHAT/WHEN, the contract WHICH; resolve HOW conflicts toward the rules and note them; stop and ask only on a genuine conflict.
If you see any conflict or ambiguous points that needs more clarification ask me before you proceed otherwise generate the plan file.

---

## Phase 2 — Sprints
Create the page sprint plan.

Read and follow strictly:
- **Phase file:** stage-03-sub-03-phase-02-sprints.md
- **Plan:** plan.md
- **Rules:** front-end-rules.md , front-end-test-rules.md

Constraints: no code; order Foundation (schemas/i18n) → Primitives & States → Assembly & Wiring → Polish → Tests; every sprint validates `useTranslation` usage and `tsc`; output `/docs/stage-03-frontend/sub-03-pages/results/[page-set-name]/sprints.md`.

---

## Phase 3 — Execute
Begin executing the `[page]` sprints.

Read and follow strictly:
- **Phase file:** stage-03-sub-03-phase-03-execute.md
- **Sprints:** sprints.md
- **Rules:** front-end-rules.md , front-end-test-rules.md

Constraints: no inline strings (text via `useTranslation` + `translations.json`); implement Skeleton + localized error states whenever a hook is consumed (layout never crashes); forms use React Hook Form + Zod aligned to `@my-app/contract`. Take the first sprint not ✅, validate (`tsc`, `vitest run`), commit on green, update docs, stop and wait for `next`.
