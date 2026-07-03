---
sprint: 3
title: Assembly & Wiring — Orders
status: ✅ Done
commit: TBD
---

# Sprint 3 Report — Assembly & Wiring — Orders

## Work done

### `OrdersPage.tsx` (rewritten from Sprint 2's static composition)
Fully live: `useOrdersSummary()` → 4 `StatsRow` cards (Total incl. month/week sub-label, Pending Delivery, In Delivery, Total Revenue via `formatDZD`); `useOrders(...)` with `useDebouncedValue` search + `SimplePagination`; `distributorId` seeded once from `?distributor=` via a lazy `useState` initializer reading `useSearchParams()` (no `useEffect`); `useWilayas()`/`useDeliveryCompanies({active:true})` feed the filter row; `useOrder(viewOrderId)` (`enabled: !!id`, driven by the table's "View" action) feeds `OrderDetailDrawer`; `useCreateOrder`/`useTransitionOrder`/`useDeleteOrder` wired to the table's action callbacks.

### `CreateOrderModal.tsx` (rewritten from Sprint 2's shell)
Owns the wizard's single `useForm<CreateOrderFormInput, unknown, CreateOrderFormValues>` (create-order.schema + `zodResolver`) plus **every hook the wizard's 5 steps need** — `useDistributors` (client `isEnabled` filter, F-5), `useSubscriptionPlans`, `useAvailableLotsForOrder`, `useWilayas`/`useCommunes(watchedWilayaId)`, `useDeliveryCompanies`. Advancing a step calls `trigger([...stepFields])`; only a valid step advances. Selecting a distributor prefills `receivedName`/`receivedPhone`/`wilayaId`/`communeId` from that distributor's own record via `setValue` (an event-driven derivation, not a fetch). Confirm calls `handleSubmit((values) => onSubmit(values))`; the page's `onSubmit` calls `createOrder.mutate(command, { onSuccess: () => setCreateOpen(false) })` — failure leaves the wizard open with every value intact (global toast handles the error).

### Step panels (`StepReceiverInfo.tsx`, `StepDeliveryConfig.tsx` rewritten; `StepSelectDistributor.tsx`/`StepSelectLots.tsx` extended)
`StepReceiverInfo`/`StepDeliveryConfig` now take `register`/`errors` (typed against `CreateOrderFormInput`, not the output `CreateOrderFormValues` — see Decisions) and render real Zod validation messages under each field; their previously-local `communeId`/`deliveryCompanyId`/`deliveryType` state is now host-owned (mirrors `wilayaId`'s existing pattern) since all four are real form fields. `StepSelectDistributor`/`StepSelectLots` gained an optional `error` prop to surface `trigger()` failures ("select a distributor", "select at least one lot").

### `MarkDeliveredModal.tsx` (rewritten from Sprint 2's shell)
Real `useForm<MarkDeliveredFormInput, unknown, MarkDeliveredFormValues>` with `markDeliveredSchema(t, maxCount)` — `maxCount` (the row's `cardsCount`) is a per-instance schema parameter, so the upper-bound message is always correct for that order. `useEffect(() => { if (open) reset({ deliveredCount: maxCount }) }, ...)` re-defaults on open (same non-fetching-effect pattern as `CreateDistributorModal`'s Sprint-1 precedent). `onSubmit` signature changed from parameterless to `(values: MarkDeliveredFormValues) => void`.

### `OrdersTable.tsx` (one signature change)
`onMarkDelivered` widened from `(order) => void` to `(order, values: MarkDeliveredFormValues) => void` so the real captured count reaches the page's `useTransitionOrder.mutate`.

## Validation results
- `npm run check` (both `tsconfig.json` and `tsconfig.test.json`) ✅ clean (one real typing issue found and fixed — see Decisions)
- `npx eslint` on every touched file: 8 pure-Prettier findings, fixed via `--fix`, re-verified 0 errors/warnings
- `npx vitest run` ✅ 45/45 files, 334/334 tests green (unchanged baseline — no test files added, tests-last convention)
- **Browser-verified end-to-end** against the live local API + seeded admin (`sv_test_admin`): logged in, navigated directly to `/admin/distributors/orders` (bypassing the pre-existing, out-of-scope `LoginPage` role-redirect bug flagged in Part-1), confirmed real data end-to-end — 4 stat cards render `0`/`0 DZD` against the actually-empty seeded DB (not stuck loading), wilaya/delivery-company selects populate from real API data, the empty-table state renders correctly with a working "Create Order" CTA, and the wizard opens to Step 1 showing a real (empty) distributor list with correct `EmptyState` copy and Back/Next gating. No console errors traceable to this sprint's code (only the already-flagged `LoginPage` redirect's downstream 401/403s).

## Decisions & deviations
- **`CreateOrderModal` calls its own hooks directly instead of the page threading ~15 data props into it.** Every wizard-scoped read (`useDistributors`, `useSubscriptionPlans`, `useAvailableLotsForOrder`, `useWilayas`, `useCommunes`, `useDeliveryCompanies`) and the `useForm` itself now live in the modal component. Any React component may call hooks — nothing in rules §2/§3 restricts hook calls to "page" components — and `CreateOrderModal` is unconditionally mounted (visibility is just its `open` prop), so this is architecturally identical to calling them at the page level, just with a far smaller prop surface and no prop-drilling. `OrdersPage` now only passes `open`/`onOpenChange`/`onSubmit`/`isPending`.
- **`register`/`errors` props on `StepReceiverInfo`/`StepDeliveryConfig` are typed against `CreateOrderFormInput` (the `useForm` first generic), not `CreateOrderFormValues` (the third/output generic).** First pass typed them against the output and `tsc` failed — `formState.errors` is always keyed by the *input* shape (coerced-number fields are `unknown` pre-parse), matching `record-payment.schema.ts`'s established Input/Output split. Fixed by typing both props against `CreateOrderFormInput`.
- **Distributor prefill on Step 1 selection is a plain `setValue` call inside the selection handler, not a `useEffect` watching the selected id.** Keeps rules §2's "no `useEffect` fetching" intact in spirit (it isn't a fetch either way — the distributor's data is already in memory from `useDistributors`) while avoiding an effect entirely.
- No architecture shift — `plan.md` untouched.
