# Sprint 16 Report — Statistics: API (Controller + Routes + Wiring)

## Status: ✅ Done

---

## What was built

### `statistics.controller.ts`
9 handler methods as arrow-function class properties (bind-safe):

- `dashboard`, `activatorsSummary`, `distributorsSummary`, `inventorySummary`, `ordersSummary`, `activationsSummary` — no query/params, straight `sendSuccess(res, await this.service.X())`
- `overview` — reads `req.validated.query as StatisticsOverviewQuery`
- `wilayaHeatmap` — reads `req.validated.query as WilayaHeatmapQuery`
- `wilayaDrilldown` — reads `req.validated.params as WilayaIdParams` + `req.validated.query as WilayaDrilldownQuery`

All delegate to `IStatisticsService` and call `next(error)` on throw.

### `statistics.routes.ts`
Manual DI: `new StatisticsService(prisma)` → `new StatisticsController(service)`.

`adminOnly = requireAuth({ roles: [UserRole.ADMIN] })` applied to all 9 routes.

Route registration order (critical):
1. `/dashboard`, `/activators`, `/distributors`, `/inventory`, `/orders`, `/activations` — no `validateRequest`
2. `/overview` — `validateRequest({ query: StatisticsOverviewQuerySchema })`
3. `/wilaya-heatmap` — static route, `validateRequest({ query: WilayaHeatmapQuerySchema })` — **registered BEFORE** the param route
4. `/wilaya/:wilayaId` — `validateRequest({ params: WilayaIdParamsSchema, query: WilayaDrilldownQuerySchema })`

### `modules/index.ts`
Added `STATISTICS_ROUTES` import and `moduleRouter.use(STATISTICS_ROUTES.BASE, statisticsRouter)`.

---

## Tests

### New: `test/integration/statistics.integration.spec.ts` — 23 tests
- 6 summary endpoints: 200 valid shape + 403 non-admin
- `overview`: empty period → zeroed arrays, `this_week` valid shape, invalid period → 400, 403 non-admin
- `wilaya-heatmap`: seeded wilayas appear in result, invalid period → 400, 403 non-admin
- `wilaya/:wilayaId`: 200 + schema parse, 404 unknown UUID, 400 invalid (non-UUID) params, 403 non-admin

### Extended: `test/contract/routes.conformance.spec.ts` — +11 tests (131 total)
- `STATISTICS_ROUTES — registration`: all 9 routes return 401 (not 404)
- `STATISTICS response schemas`: `DashboardStatsResponseSchema` + `StatisticsOverviewResponseSchema` parse valid shapes

---

## Validation

```
tsc --noEmit       → clean (0 errors)
npm run test:unit  → 709/709 passed (44 files)
npm run test:int   → 215/216 passed (statistics: 23/23) — 1 pre-existing failure in admin.integration.spec.ts (unrelated)
```

---

## Key decisions

- **Static before param**: `/wilaya-heatmap` registered before `/wilaya/:wilayaId` to prevent Express swallowing the static segment as a param value.
- **No `validateRequest` on 6 summary routes**: they take no query params; adding an empty schema would be noise.
- **`WilayaHeatmapResponseSchema` parse in integration test**: confirms mapper zero-fills are valid against the contract schema even when no activations exist.
