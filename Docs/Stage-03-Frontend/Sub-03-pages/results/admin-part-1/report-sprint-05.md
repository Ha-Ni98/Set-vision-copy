---
sprint: 5
title: Assembly — Activators (list + detail)
status: ✅ Done
commit: (pending — filled in next commit)
---

# Sprint 5 Report — Activators Assembly

## Work done

### List (`src/pages/admin/activators/`)
`ActivatorsPage.tsx` wired to `useActivatorsSummary`, `useActivators` (paged, debounced search, 10/20/50/100 `per_page` select), `useCreateActivator`, `useToggleActivator`, `useDeleteActivator`, `useRecordPayment`. `CreateActivatorModal.tsx` and `RecordPaymentModal.tsx` rewritten from Sprint 3's field-markup shells to real `useForm` + `zodResolver` (see Decisions for a typing issue this surfaced). `ActivatorsTable.tsx`'s `onRecordPayment` prop changed from a no-arg callback to `(activatorId, values)` so the row that opened the modal reaches the final command.

### Detail (`src/pages/admin/activators/`)
`ActivatorDetailPage.tsx` wired to `useActivator(id)` (via `useParams`), `useActivatorPerformance`, `usePayments`, `useUpdateActivator`, `useToggleActivator`, `useResetActivatorPassword`, `useRecordPayment`, `useDeletePayment`. `EditActivatorModal.tsx` rewritten with real RHF (was a shell). Invalid/errored `id` → `NotFoundState` with a back-link.

### Shared
- `hooks/useDebouncedValue.ts` (new) — used by both Activators' and (retrofitted) Distributors' search inputs.

## Validation results
- `npx tsc --noEmit` ✅ clean (one real typing issue found and fixed mid-sprint — see Decisions)
- `npx eslint` ✅ 0 errors, 0 warnings (15 Prettier errors auto-fixed)
- `npx vitest run` ✅ 37/37 files, 310/310 tests green
- No browser verification this sprint (see Decisions).

## Decisions & deviations
- **`useForm` needed 3 generics, not 1, for the two `z.coerce.number()` schemas** (`create-activator.schema.ts`'s `initialCredits`, `record-payment.schema.ts`'s `amount`). A coerced Zod schema's *input* type (what a raw number `<input>` produces, effectively `unknown`/string-ish before parsing) differs from its *output* type (`number`, after coercion) — `useForm<FormValues>()` alone (using only the output/`z.infer` type) makes `zodResolver`'s type incompatible, since `register()` needs the input shape but the resolver's declared type didn't match it. Fixed by adding a second exported type per schema — `*FormInput = z.input<...>` alongside the existing `*FormValues = z.infer<...>` — and using `useForm<Input, unknown, Output>()`. This is the documented RHF+Zod+coerce pattern, not a workaround; `create-distributor`/`update-distributor` schemas (no coercion, all strings) didn't need it.
- **Retrofitted debounce into Sprint 4's Distributors search**, which I'd missed — building it properly for Activators here made the gap obvious. One shared hook now backs both, rather than leaving Distributors firing a request per keystroke or duplicating the debounce logic.
- **Verification scaled back to automated gates only**, continuing Sprint 4's approach at the user's explicit request to stop over-testing and conserve tokens. This sprint's real risk (RHF+coerce typing) is exactly what `tsc` caught.
