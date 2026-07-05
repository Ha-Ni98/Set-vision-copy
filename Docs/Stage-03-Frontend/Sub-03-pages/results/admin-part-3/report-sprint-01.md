---
sprint: 1
title: Foundation — Schemas, i18n & Routes
status: ✅ Done
commit: 4c57d65
---

# Sprint 1 Report — Foundation

## Work done

### Zod schemas (new)
| File | Notes |
|---|---|
| `pages/admin/activations/components/set-activator-price.schema.ts` | `amount` coerced nonnegative `.multipleOf(0.01)`; shared by D1 (Activations list) and D2 (Activation Detail's Financial block). |
| `pages/admin/settings/components/create-admin.schema.ts` / `update-admin.schema.ts` | Same field rules as Part-1's activator schemas (`fullName` 3–100, `username` 3–30 `^[A-Za-z0-9_]+$`, Algerian phone regex); update variant all-optional. |
| `pages/admin/settings/components/create-subscription-plan.schema.ts` | `subscriptionType`/`subscriptionDuration` are `z.enum(SubscriptionType/SubscriptionDuration, ...)` — the first enum-driven Add-Plan form, no free-text type/duration (plan decision #3: the spec's separate types/durations endpoints don't exist and aren't needed). |
| `pages/admin/settings/components/create-delivery-company.schema.ts` / `update-delivery-company.schema.ts` | `name` 2–100, `registeredName` 2–150; update variant all-optional. |
| `pages/admin/settings/components/commission-cell.schema.ts` | Only field is `commission` (coerced, nonnegative, `.01`); `subscriptionPlanId`/`commissionDurationId` are injected by the caller (the cell already knows its row/column), same injection pattern as `record-payment.schema.ts`'s `activatorId` — the assignability check verifies `FormValues & {subscriptionPlanId, commissionDurationId}` against `UpdateCommissionCommand`. |

All 7 export a compile-time-only `AssertAssignable<FormValues extends Command ? true : false>` guard, following the established Part-1/2 pattern exactly.

### i18n (`src/config/translations.json`)
**169 new keys** (all with `ar: ""`). Namespaces: `admin.activations.*` (stats/filters/table/empty/actions/modals), `admin.activationDetail.*` (client/distributor/activator/timeline/cardHistory/financial/notFound), `admin.statistics.*` (filters/6 chart titles/heatmap/drilldown/`period.*`/`colorMode.*`), `admin.settings.*` (4 tab labels + admins/commission/plans/companies sub-namespaces), `admin.logs.*` (filters/table/empty); enum labels `enums.subscriptionType.*` (1 value), `enums.subscriptionDuration.*` (8 values), `enums.logActionType.*` (13 values, matching the contract enum's full member count). Reused rather than duplicated: `enums.activationStat.*`/`enums.cardStat.*` (Parts 1–2), and — where the exact same two mutations are involved — Dashboard's existing `admin.dashboard.frozen.activateConfirm.*`/`cancelConfirm.*` keys are earmarked for Activations' Resolve-Freeze flow in Sprint 3 (not duplicated here).

### Route scaffolding
| File | Notes |
|---|---|
| `pages/admin/activations/{ActivationsPage,ActivationDetailPage}.tsx` (new, alongside Part-2's existing `SetsLotsPage`/`CardsPage` in the same directory), `pages/admin/statistics/StatisticsPage.tsx`, `pages/admin/settings/SettingsPage.tsx`, `pages/admin/logs/LogsPage.tsx` (new directories) | Stub components rendering `<></>`, matching `withSuspense`'s `LazyExoticComponent<() => JSX.Element>` typing (Part-1/2 precedent). |
| `src/App.tsx` (edited) | 5 new `lazy()` imports; 5 new routes inside the existing `AdminGuard → AdminLayout` branch. `/admin/activations` (index-style static path) and `/admin/activations/:id` are both declared; `:id` is declared **after** Part-2's static `/admin/activations/sets-lots` and `/admin/activations/cards` siblings, with a comment noting React Router's static-over-dynamic ranking — mirrors Part-2's `/distributors/orders` vs `/distributors/:id` precedent exactly. |

## Validation results
- `npm run check` (both `tsconfig.json` and `tsconfig.test.json`) ✅ clean
- `npx eslint` on every Sprint 1 file: 3 pure-Prettier/config-warning findings (2 line-wrap errors, 1 "file ignored" warning for the `.json` itself, expected — `translations.json` isn't an eslint target), fixed the 2 real errors via `--fix`, re-verified 0 errors after
- `npx vitest run` ✅ 48/48 files, 356/356 tests green (unchanged baseline — Foundation adds no test files)
- `node -e "JSON.parse(...)"` on `translations.json` ✅ valid

## Decisions & deviations
- **Found and fixed a real `.gitignore` bug in both the root and `Apps/web` gitignore files**: both had a bare `logs` pattern (from the default Vite/Node scaffold, meant for build-log output) with no leading slash, so it matched **any** directory named `logs` anywhere in the tree — silently swallowing `Apps/web/src/pages/admin/logs/` the moment it was created. This would have permanently prevented `LogsPage.tsx` (and everything under it in later sprints) from ever being tracked, with no warning. Anchored both to the repo root (`/logs`) so only the intended build-artifact directory is ignored. Confirmed via `git check-ignore -v` before and after, and confirmed `Docs/Stage-00-Conception/react-algeria-map` (the heatmap source, deliberately ignored at the root `.gitignore`) is unaffected by this fix.
- **No browser verification this sprint** — same call as Part-2 Sprint 1 (Foundation): stub pages render nothing, so a browser pass would only confirm routes 404-free, which `tsc`+the route-array structure already guarantee. Real browser verification resumes once S2/S3 render actual UI.
- **`create-subscription-plan.schema.ts` is the first schema in this codebase with two enum-driven `<Select>` fields** (both `subscriptionType` and `subscriptionDuration`) — no coerced-number fields, so it needs only one exported type (`FormValues`), no `FormInput` split, mirroring `create-lot.schema.ts`'s precedent (Part-2) for schemas with no coercion.
- **Dashboard's existing Activate/Cancel confirm-dialog copy will be reused for Activations' Resolve-Freeze flow (Sprint 3), not duplicated** — flagged now since it affects what Sprint 2's primitives should accept as props (translation keys, not fresh copy).
- No architecture shift — `plan.md` untouched.
