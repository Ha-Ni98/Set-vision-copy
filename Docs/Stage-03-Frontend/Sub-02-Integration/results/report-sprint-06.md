---
sprint: 6
title: Network & Places — Geography + Distributors + Delivery Companies
status: ✅ Done
commit: aeb567a
---

# Sprint 6 Report — Network & Places

## Work done

### Services (`src/services`, all new)
| File | Notes |
|---|---|
| `src/services/geography.service.ts` | Both `GEOGRAPHY_ROUTES`. `getCommunes(wilayaId, signal?)` substitutes `:wilayaId` via `withParams`. |
| `src/services/distributors.service.ts` | All 6 `DISTRIBUTOR_ROUTES` — `getAll`, `create` (201), `getById`, `update` (PATCH), `toggle`, `remove` (204). |
| `src/services/delivery-companies.service.ts` | All 4 `DELIVERY_COMPANY_ROUTES` — no delete route exists for this domain (confirmed against `Apps/api`, not assumed), matching the plan's 4-route count. |

### Hooks (`src/hooks`, all new, grouped per D6)
| File | Notes |
|---|---|
| `src/hooks/useGeography.ts` | `useWilayas()` and `useCommunes(wilayaId)`, both `staleTime: Infinity` (static reference data). `useCommunes` is enabled-gated on a truthy `wilayaId`. |
| `src/hooks/useDistributors.ts` | 6 hooks (list, create, detail enabled-gated, update, toggle, delete). All 4 mutations invalidate `qk.distributors.all()`. |
| `src/hooks/useDeliveryCompanies.ts` | 4 hooks (list, create, update, toggle). All 3 mutations invalidate `qk.deliveryCompanies.all()`. |

### Test scaffold additions
| File | Notes |
|---|---|
| `tests/fixtures/data/geography.mock.ts` | `WilayaDTO` ×2, `CommuneDTO` ×2 — the commune fixtures carry real Arabic `arName` content (e.g. `سيدي امحمد`) specifically to exercise encoding through fetch/JSON, not a transliteration. |
| `tests/fixtures/data/distributors.mock.ts` | `DistributorDTO`, `DistributorDetailDTO`, paginated. |
| `tests/fixtures/data/delivery-companies.mock.ts` | `DeliveryCompanyDTO` active + inactive variants. |
| `tests/fixtures/msw/{geography,distributors,delivery-companies}.handlers.ts` | Happy-path defaults + `*ErrorHandlers` maps. |
| `tests/fixtures/msw/server.ts` | Now seeded with all three new handler arrays. |

### Tests
| File | Cases |
|---|---|
| `tests/integration/services/geography.service.test.ts` | 4 cases: wilayas unwrap/500, communes unwrap via the parameterized URL (path assertion, not just data) /500. |
| `tests/integration/services/distributors.service.test.ts` | 9 cases: full CRUD unwrap/throw coverage incl. create 201/400, getById 404, remove 204. |
| `tests/integration/services/delivery-companies.service.test.ts` | 8 cases incl. the required `active` boolean-string serialization (`true`/`false` as literal query values). |
| `tests/integration/hooks/geography.test.tsx` | 3 cases: `useWilayas` resolves; `useCommunes` issues no request while `wilayaId` is undefined, then fetches once provided, with the URL's param substitution asserted directly. |
| `tests/integration/hooks/distributors.test.tsx` | 7 cases: list/detail-enabled-gating query hooks + all 4 mutations' `qk.distributors.all()` invalidation via a shared helper. |
| `tests/integration/hooks/delivery-companies.test.tsx` | 4 cases: list hook + all 3 mutations' `qk.deliveryCompanies.all()` invalidation. |

## Validation results
- `npx tsc --noEmit` ✅ clean (`src`, 0 errors)
- `npx tsc --noEmit -p tsconfig.test.json` ✅ clean (`src` + `tests`, 0 errors) — first sprint since Sprint 3 with **no** page/limit type surprises: `GetDistributorsQuery` and `GetDeliveryCompaniesQuery` both use the activation-style `.default().optional()` pattern (or have no pagination at all), unlike Sprint 5's activator/admin/payment queries — verified by letting `tsc` catch it early rather than assuming either way from the naming.
- `npx eslint` on every Sprint 6 file ✅ 0 errors after `--fix` (prettier formatting only)
- `npx vitest run` ✅ 220/220 tests pass, 23/23 files (185 carried over from Sprints 1–5 + 35 new), all passing on the first run — no MSW/wiring surprises this sprint
- `npx vite build` ✅ production build unaffected

## Decisions & deviations
- **No deviations from the plan this sprint.** All three domains matched `plan.md` §2.9–§2.11 exactly once verified against `Apps/api`'s actual routers/interfaces/controllers — same verification step as every prior sprint, just with nothing surprising to report this time (no stale Sub-01 TODOs to correct, since these three domains had no Sub-01 stubs; no `/src/components`/`/src/pages` tension, since this domain has no UI consumer yet at all).
- **Delivery companies genuinely have no delete route** — confirmed by reading `Apps/api`'s `delivery-company.routes.ts` and `delivery-company.interface.ts` directly rather than assuming symmetry with distributors/activators/admins, which all do have one. `useDeliveryCompanies.ts` has 4 hooks, not 5, matching the plan's stated count exactly.
