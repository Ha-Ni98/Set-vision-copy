---
sprint: 1
title: Foundation — Schemas, i18n, Routes & Lazy scaffolding
status: ✅ Done
commit: (pending — filled in next commit)
---

# Sprint 1 Report — Foundation

## Work done

### Zod schemas (`src/pages/admin/**/components/*.schema.ts`, new)
| File | Notes |
|---|---|
| `activators/components/create-activator.schema.ts` | `fullName` 3–100, `username` 3–30 `^[A-Za-z0-9_]+$`, `phone` Algerian regex, `initialCredits` coerced number `≥0` default `0`. Factory `createActivatorSchema(t)` — validation messages translated. |
| `activators/components/update-activator.schema.ts` | Same field rules, all `.optional()` (partial update). |
| `activators/components/record-payment.schema.ts` | `amount` positive + `.multipleOf(0.01)`; `date` optional passthrough string. **`activatorId` deliberately excluded** — injected by the caller at submit time (plan §D2.4); the assignability check verifies `FormValues & { activatorId: string }` against the command, not `FormValues` alone. |
| `distributors/components/create-distributor.schema.ts` | `fullName` 3–100, `storeName` 2–100, `phone` Algerian regex, `wilayaId`/`communeId` required non-empty strings (see Decisions — not `z.uuid()`). |
| `distributors/components/update-distributor.schema.ts` | Same field rules, all `.optional()`. |

Every file exports its inferred `FormValues` type plus a **compile-time-only** assignability guard (`type _XCommandCheck = AssertAssignable<FormValues extends XCommand ? true : false>`) — zero runtime footprint (fully erased), fails `tsc` if the schema's output shape drifts from its contract Command.

### i18n (`src/config/translations.json`)
Went from 205 → 352 keys. Added:
- `common.validation.*` (8 new: minLength, maxLength, invalidUsername, invalidPhone, positiveNumber, nonNegativeNumber, invalidAmount, selectRequired) — consumed directly by the 5 schemas above.
- `common.actions.*` (11 new: save, delete, edit, view, add, enable, disable, clear, resetPassword, recordPayment, signOut) — reused across all 5 pages rather than adding page-local duplicates.
- `admin.shell.*`, `admin.dashboard.*`, `admin.activators.*` (list + detail), `admin.distributors.*` (list + detail) — ~115 keys, EN/FR authored verbatim from the SV-PAGE-006-010 spec (stat card titles/sub-labels, table columns, empty/error states, dialog copy, nav labels), `ar: ""` throughout.
- `enums.cardStat.*` (7) and `enums.orderStat.*` (4) — needed by Distributor Detail's compact Orders/Cards history tables (S3), not previously in the file.

All new entries validated: parses as JSON, every value has non-empty `en`/`fr` and a present (empty-string) `ar`.

### Route scaffolding
| File | Notes |
|---|---|
| `src/pages/admin/DashboardPage.tsx`, `activators/{ActivatorsPage,ActivatorDetailPage}.tsx`, `distributors/{DistributorsPage,DistributorDetailPage}.tsx` (new) | Stub components rendering `<></>` (see Decisions). |
| `src/components/layout/AdminGuard.tsx`, `AdminLayout.tsx` (new) | Passthrough stubs — bare `<Outlet/>`, one-line comment marking them for Sprint 2. |
| `src/App.tsx` (edited) | 5 new `lazy()` imports; new router branch `{ element: <AdminGuard/>, children: [{ element: <AdminLayout/>, children: [5 routes] }] }`, mirroring the existing `ProtectedRoute → ActivatorLayout` nesting exactly. Each route wrapped in the existing `withSuspense` (→ `<Suspense fallback={<PageLoader/>}>`). `setRedirect`/401 handling untouched. |

## Validation results
- `npx tsc --noEmit` ✅ clean
- `npm run check` (both `tsconfig.json` and `tsconfig.test.json`) ✅ clean
- `npx eslint` on every Sprint 1 file ✅ 0 errors (7 pre-existing Prettier errors in `App.tsx` — 5 on lines this sprint never touched — fixed via `eslint --fix` as a mechanical, whitespace-only change; re-verified with a full `tsc`+`vitest` re-run after)
- `npx vitest run` ✅ 37/37 files, 310/310 tests green (no new test files this sprint — Foundation adds none; existing suite is the regression gate)

## Decisions & deviations
- **Page stubs render `<></>`, not literal `null`**: `App.tsx`'s existing `withSuspense` helper types its argument as `LazyExoticComponent<() => JSX.Element>`. A component returning bare `null` doesn't satisfy `() => JSX.Element` without a cast; an empty fragment does, with identical visual output ("renders nothing yet"). Resolved toward what compiles cleanly without a type-cast hack.
- **i18n authored as a full first pass, not validation-messages-only**: this sprint's own task line named all four namespaces (`admin.shell/dashboard/activators/distributors`) as targets, not just the schema-blocking validation keys. Copy is transcribed verbatim from the spec (stat cards, table columns, empty/error states) — de-risks S2–S6 from inventing wording under time pressure or needing repeated translations.json touches. Component-specific microcopy not given verbatim in the spec (exact aria-labels, hint text) is left for the sprint that builds that component.
- **`wilayaId`/`communeId` validated as non-empty strings, not `z.uuid()`**: an unselected shadcn `Select` reports `""`. `z.uuid()` would surface an "invalid UUID" error on an empty selection, which misdescribes the actual problem. `.min(1, t('common.validation.selectRequired'))` gives the correct UX message; still structurally assignable to the contract's `z.uuid()`-inferred `string` type.
- **Tooling correction — test file suffix**: `front-end-test-rules.md` and both phase docs say `.spec.tsx`; the actual `vitest.config.ts` (`include: ["tests/**/*.test.{ts,tsx}"]`) and all 37 existing test files use `.test.tsx`/`.test.ts`. A `.spec.tsx` file would silently never run. Resolved toward the working convention (rules are HOW, but a convention that contradicts the enforced tool config would produce dead test files) — **Sprint 7 will use `.test.tsx`**. Flagging here since this is the first sprint to touch anything test-adjacent.
- **Two discovered gaps, deliberately not fixed here (out of Foundation's scope), flagged for their consuming sprint:**
  - `StatusBadge` (`src/components/shared/StatusBadge.tsx`) is hard-typed to `ActivationStat` only. Distributor Detail's Cards/Orders history tables need `CardStat`/`OrderStat` badges, and the Activators/Distributors tables need an enabled/disabled badge — none of which the current component supports. **For S3.**
  - `useAuth()` (`AuthProvider.tsx`) exposes no `role`, only `isAuthenticated`/`isReady`/`displayName`/`login`/`isLoggingIn`/`logout` — `role` is computed internally for the socket connection but not surfaced. The real `AdminGuard` needs a role check. **For S2.**
