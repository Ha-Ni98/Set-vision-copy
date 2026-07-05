---
sprint: 5
title: Assembly & Wiring — Settings (4 tabs)
status: ✅ Done
commit: 9483b79
---

# Sprint 5 Report — Assembly & Wiring (Settings, 4 tabs)

## Work done

### Architecture: self-contained tabs
Rather than have `SettingsPage` fan out ~15 props per tab (data/loading/error/mutation callbacks × 4 tabs), each tab component (`AdminAccountsTab`, `CommissionMatrixTab`, `SubscriptionPlansTab`, `DeliveryCompaniesTab`) now calls its own TanStack Query hooks directly — the same self-contained pattern already established for modals (`CreateOrderModal`, `CreateSetModal`) and the Statistics heatmap. `SettingsPage` is now just the `Tabs`/`TabsList`/4×`TabsContent` host with zero props threaded through. This also satisfies the sprint's "query enabled on first activation" requirement for free: Radix's `TabsContent` unmounts inactive panels by default, so a tab's hooks (and their queries) simply don't run until that tab is first selected — no manual `enabled` flags needed anywhere.

### Admin Accounts
Fully live: `useAdmins({page:1,limit:100,search})` (debounced), `useSession()` for the current admin's id. `AddAdminModal` and `EditAdminModal` upgraded from static shells to RHF+Zod (mirrors `CreateActivatorModal`/`EditActivatorModal`). The one-time password reveal for **create** follows the established pattern exactly (page-level `generatedPassword` state set in the mutation's `onSuccess`, cleared when the modal closes). For **reset password** — which had no reveal step at all in Sprint 2, just a plain confirm dialog — added a second "revealed" view inside the same `AlertDialog` (swap on `resetGeneratedPassword` state, mirroring the modal's create-then-reveal swap), so the generated password is shown exactly once here too. Delete stays disabled for the signed-in admin's own row and when only one admin remains (§B5), now with a `title` tooltip stating which of the two guards is active.

### Commission
`useCommissions()` feeds the matrix. `CommissionCell` upgraded to RHF+Zod (`commission-cell.schema.ts`); clicking Save calls `useUpdateCommission` with the injected `subscriptionPlanId`/`commissionDurationId`. On success the cell exits edit mode; on failure it also exits edit mode but reverts to the last known-good value with red styling (`hasError` on the collapsed view) — this happens naturally since a failed mutation never invalidates the query cache, so the "reverted" value is just whatever the cache already held.

### Subscription Plans
`useSubscriptionPlans({})` (deliberately no `active` filter, so admins can see and re-enable disabled plans — a filtered list would make disabled plans permanently invisible to the one screen meant to manage them). `AddPlanModal` upgraded to RHF with `Controller`-wrapped `Select`s for both enum fields (shadcn's `Select` isn't a native input `register()` can bind to — Part-1's established fix).

### Delivery Companies
`useDeliveryCompanies({})`. `CompanyModal` upgraded to RHF+Zod, shared between Add and Edit exactly as before — validated against the stricter `create-delivery-company` schema (both fields required) since the UI always shows and submits both regardless of mode, and that shape is a valid subset of the optional `update-delivery-company` Command.

## Decisions & deviations

- **`useCommissionDurations()` turned out unnecessary** — `CommissionMatrixDTO.tiers` (from `useCommissions()`) already embeds the tier headers (`CommissionDurationDTO[]`), so wiring a second call for the same data would have been redundant. Simpler than the plan's task wording implied, similar to Sprint 4's drilldown finding.
- **Found and fixed a real copy bug**: `GeneratedPasswordPanel` (shared with the Activators page) hardcoded `admin.activators.create.successTitle`/`successBody` — so both `AddAdminModal` (already reusing it since Sprint 2) and the new admin reset-password reveal would have shown "Activator created." text in an Admin-Accounts context. Made the title/body keys optional props defaulting to the existing Activators keys (zero behavior change for the 2 existing Activators call sites — `CreateActivatorModal` and `ActivatorDetailPage`'s own reset-password reveal, which was and remains out of scope to fix), and passed the already-existing `admin.settings.admins.create.successTitle`/`successBody` keys from `AddAdminModal`, plus 2 new keys (`resetPasswordConfirm.successTitle`/`successBody`) for the new reset reveal.
- **Admin reset-password one-time reveal built as a second step inside the existing confirm `AlertDialog`**, not a separate modal — kept the number of dialogs the admin sees to one, consistent with how the Create-Admin flow swaps the same Dialog's content rather than opening a second one.
- **Added a `title` tooltip to the disabled Delete menu item** explaining which §B5 guard (self vs. last-remaining-admin) is active — the two i18n keys for this (`cannotDeleteSelf`/`cannotDeleteLast`) already existed since Sprint 1 but were unused; a disabled action with zero explanation is a real (if minor) UX gap, not scope creep, since making Delete's gating comprehensible is part of "guard rejection" in the sprint's own validation checklist.
- No architecture shift at the `plan.md` level — the self-contained-tabs choice is an implementation detail consistent with patterns already used elsewhere in Part 2/3, not a deviation from any documented decision.

## Validation results
- `npm run check` (both `tsconfig.json` and `tsconfig.test.json`) ✅ clean — the full self-contained-tabs rewrite (12 touched files) passed `tsc` on the first attempt.
- `npx vitest run` ✅ 48/48 files, 356/356 tests green (unchanged baseline — tests-last per plan).
- `npx eslint` scoped to this sprint's 12 touched files — 6 pure-Prettier findings across 5 files, fixed via scoped `--fix` (only these files, not the whole tree); re-verified 0 errors after.
- No browser verification this sprint — standing user instruction (Sprint 3+) to conserve Playwright/Chromium time and tokens; confidence rests on `tsc`/`eslint`/existing-suite-green plus every modal/tab following an established, already-browser-verified pattern (`CreateActivatorModal`'s reveal swap, `CreateSetModal`'s `Controller`+self-contained-hooks modal, `EditActivatorModal`'s reset-on-open prefill).
