---
sprint: 6
title: Contract Conformance Scaffold
status: ✅ Done
commit: tbd
---

# Sprint 6 Report — Contract Conformance Scaffold

## Work done

### L8 — Conformance harness
| File | Notes |
|---|---|
| `test/contract/routes.conformance.spec.ts` | Imports all 16 route-constant exports from `@my-app/contract`; uses `it.each` to assert each constant is `typeof === 'object'` and has a defined `BASE`. Contains a TODO comment naming Sub-02 as the owner of the route-vs-app coverage assertion. No `console.*`; uses Vitest `expect` only. |

## Route constants confirmed (by `grep -r '_ROUTES = {' Apps/contract/src`)
`AUTH_ROUTES`, `ADMIN_ROUTES`, `ACTIVATOR_ROUTES`, `ACTIVATION_ROUTES`, `KEY_ROUTES`, `CARD_ROUTES`, `LOT_ROUTES`, `SET_ROUTES`, `ORDER_ROUTES`, `PAYMENT_ROUTES`, `LOG_ROUTES`, `GEOGRAPHY_ROUTES`, `DELIVERY_COMPANY_ROUTES`, `DISTRIBUTOR_ROUTES`, `SUBSCRIPTION_PLAN_ROUTES`, `STATISTICS_ROUTES`

## Validation results
- `tsc --noEmit` ✅ clean (0 errors)
- `npm run test:unit` ✅ 50/50 tests pass (11 files: 1 new conformance spec × 16 cases + 10 existing files)

## Decisions & deviations
- **`KEY_ROUTES` not `USER_ROUTES`**: the sprint plan listed `USER_ROUTES` but the grep confirms the contract exports `KEY_ROUTES` (route base `/keys`, the client-facing activation-key flow) — no `USER_ROUTES` exists. The conformance spec reflects the actual contract exports.
- **`it.each` over individual `it` calls**: cleaner for 16 identical assertions; any future route-constant addition to the contract needs only one entry in `ALL_ROUTES` to be covered.
