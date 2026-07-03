---
sprint: 3
title: Assembly & Wiring — Activations + Detail + Logs
status: ✅ Done
commit: TBD
---

# Sprint 3 Report — Assembly & Wiring (Activations + Detail + Logs)

## Work done

### ActivationsPage
Fully live: `useActivationsSummary()` feeds the 3 stat cards + `ByStateDonut`; `useAdminActivations({...})` drives the table with `useDebouncedValue`-backed `key` search plus `subscriptionPlanId`/`activatorId`/`distributorId`/`wilayaId`/`communeId`/`state`/date-range filters (`useSubscriptionPlans`/`useActivators`/`useDistributors`/`useWilayas`/`useCommunes`, each `{page:1,limit:100}` or `{active:true}` per the existing filter-dropdown convention) + `SimplePagination`. `?activator`/`?distributor`/`?state` are seeded once via lazy `useState` initializers reading `useSearchParams()` (no `useEffect`), matching Part-2's `OrdersPage` precedent exactly. `ActivationActionsMenu`'s Resolve/Set-Price gating was already correct from Sprint 2 (built self-contained). Wired `onActivate`/`onCancel`/`onSetPrice` to `useActivateByAdmin`/`useCancelByAdmin`/`useSetActivationPrice`.

### SetActivatorPriceModal
Upgraded from Sprint 2's static field shell to real RHF + Zod (`set-activator-price.schema.ts`), following `RecordPaymentModal`'s established pattern exactly: `useForm<Input, unknown, Output>` + `zodResolver`, reset-on-open to `currentAmount`, inline validation error. `ActivationsTable`'s `onSubmit` now reads the real validated `values.amount` instead of the Sprint-2 placeholder that echoed back `priceRow.activationPrice`.

### ActivationDetailPage
Fully live: `useActivationDetail(id)` drives one page-wide loading/error region (not per-block, per plan §D2); all 7 sections render from the resolved DTO. Invalid/nonexistent id (or any fetch error) → `NotFoundState` + back-link. Reuses the same upgraded `SetActivatorPriceModal`.

**One derivation not explicit in the plan**: `ActivationDetailResponseSchema` has no top-level `state` field (confirmed via `Apps/contract/src/modules/activation/activation.dtos.ts`), so the Financial block's Set-Price gating (completed + unpriced, same two-condition rule as the list) needed a current-state value to check against. Derived it from `detail.timeline.at(-1)?.stat` — the timeline's last entry's `stat` is genuinely the activation's current status (it's how the list's own `state` column would read at the same read-model layer), so this reads an existing field rather than fabricating one.

### LogsPage
Fully live: `useLogs({...})` with debounced `search`, `userId` (via `useAdmins({page:1,limit:100})` for the user filter dropdown), `actionType` enum, and date range, plus `SimplePagination`. `LogActionBadge` and relative-time cells were already built in Sprint 2 and needed no changes.

## Validation results
- `npm run check` (both `tsconfig.json` and `tsconfig.test.json`) ✅ clean — no type errors on first pass across all 5 touched files.
- `npx vitest run` ✅ 48/48 files, 356/356 tests green (unchanged baseline — Sprint 3 adds no test files, tests-last per plan).
- `npx eslint` scoped to this sprint's 5 touched files (not the whole tree, learning from Sprint 2's collateral-reformatting incident) — 0 errors, 0 warnings, no `--fix` needed.
- No browser verification this sprint, per explicit user instruction to conserve Playwright/Chromium time and tokens — same call as Part-2 Sprints 4–5. Confidence rests on `tsc`+`eslint`+existing-suite-green plus direct comparison against Part-2's already-browser-verified `OrdersPage` wiring pattern, which this sprint follows structurally point-for-point (debounced search, lazy-`useState` URL seeding, filter-dropdown query shapes, `SimplePagination`, self-contained row actions).

## Decisions & deviations
- **`SetActivatorPriceModal` gated to real RHF this sprint, not Sprint 2** — the plan's Sprint 2 primitive was deliberately a "static shell" per its own inline comment; this sprint fulfills that TODO by wiring the schema, matching `RecordPaymentModal`'s reset-on-open + `Input`/`Output` split pattern already established in Part 1.
- **Activation-Detail Set-Price gating derives current state from the last timeline entry** (§ note above) — flagged since it isn't literally the `state` field the Activations list gates on, but it observes the same underlying status through the DTO's only available lens; no contract change needed and no fabricated field.
- **`git add .` used directly for this commit** — an explicit user instruction for this sprint (overriding the admin-part-3 default of scoped `git add`, which exists to keep the untracked `react-algeria-map` heatmap source out of commits); the source has been `.gitignore`d since Sprint 1, so this is safe.
- No architecture shift — `plan.md` untouched.
