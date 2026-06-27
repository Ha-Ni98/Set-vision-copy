# Stage 03 · Sub-01 · Phase 01 — Codebase Analysis & Refactor Planning

Take the partially complete (AI-generated) React MVP, audit it against the rules, and produce a prioritized refactor plan. **No code — audit and plan only.**

---

## Objective

Map the existing `/src`, cross-reference it with `front-end-rules.md` and `@my-app/contract`, and produce a roadmap to enforce the Component→Hook→Service architecture before any features are built.

---

## Context & Inputs

- **Rules:** `front-end-rules.md`, `front-end-best-practices.md`.
- **Contract:** `@my-app/contract` (DTOs, routes, enums — source of truth).
- **Codebase:** `package.json` and the entire `/src`.

---

## Steps

### Step 1 — Deep Scan & Map
Scan every file; build a mental graph; tag with: `#ui-primitive #shared-component #page #legacy-fetch #inline-string #unapproved-lib #layout #state`.
Track specifically: folder-structure deviations; every in-component `useEffect`/`fetch`/`axios` (`#legacy-fetch`); duplicate components to merge into `shared`; hardcoded text (`#inline-string`); `package.json` vs the approved stack (including any **Zod version mismatch** with the contract).
Output `/docs/stage-03-frontend/sub-01-refactor/codebase-map.md` — per significant file: current vs proposed path, tags, violations, key entities.

### Step 2 — Triage & Themes
Cross-analyze against the rules. Find components holding business logic/state that belongs in a hook. Audit unapproved libs to purge/replace (e.g. `moment`→`date-fns`, `react-hot-toast`→`sonner`, `redux`→Context/TanStack). Group into themes: Folder Restructuring, UI Standardization, i18n, Data Extraction.

### Step 3 — Action Plan
Create `/docs/stage-03-frontend/sub-01-refactor/plan.md`:
1. **The Purge:** libs to uninstall; files to move into the strict `/src` layout.
2. **UI Standardization & i18n:** duplicates to merge into `shared`; text to move into `translations.json` behind `useTranslation`.
3. **Layouts & States:** where `AdminLayout`/`PublicLayout` apply; sections missing `isLoading` (Skeleton) / `isError` (NotFoundState).
4. **Data Extraction:** components that fetch; the lean Services + Hooks that will replace them (returning **typed empty defaults** for now — `[]` for lists, with the UI's loading/empty states covering the rest).
5. **Readiness Checklist:** libs removed · structure matches rules · no in-component `useEffect`/`axios` · text via `useTranslation` · layouts separate routing concerns · monorepo on one Zod major.

---

## Expected Outputs

1. `codebase-map.md` and `plan.md` (paths above).
2. A short heaviest-technical-debt summary.
3. **Open questions:** any missing/mismatched contract DTOs to resolve upstream before refactoring.

---

## Guiding Principles

Be ruthless about rule violations; standardize, don't add features; deliver a clear "what it is now → what it must become" mapping.
