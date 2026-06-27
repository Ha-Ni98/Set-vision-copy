# Module Specification: Geography

## 1. Context [CONTRACT]
- Prisma Entity: `Wilaya`, `Commune`
- Depends on: `common` (`ApiResponse`, `ErrorCode`)
- Consumed by: Distributor and Order modules (FK validation + resolved names); the admin forms (wilaya/commune dropdowns, cascading)

## 2. API Interface [CONTRACT]
`GEOGRAPHY_ROUTES` (`BASE: '/geography'`). Reference reads only — these are seed tables with no create/update/delete surface.

- Route Constant: `GEOGRAPHY_ROUTES.GET_WILAYAS` (GET `/geography/wilayas`)
  - Access: Admin
  - Input: none
  - Output: `WilayaDTO[]` (all 58, unpaginated)

- Route Constant: `GEOGRAPHY_ROUTES.GET_COMMUNES` (GET `/geography/wilayas/:wilayaId/communes`)
  - Access: Admin
  - Input (query/params): `WilayaIdParams` { wilayaId }
  - Output: `CommuneDTO[]`

DTOs:
- `WilayaDTO` = { id, wilayaCode, frName, arName }.
- `CommuneDTO` = { id, communeCode, wilayaId, frName, arName }.

(No `command.ts`; this module is read-only. `events.ts` omitted.)

## 3. Events [CONTRACT]
(none)

## 4. Business Logic (Service) [BACKEND]
- **getWilayas:** list all `Wilaya` ordered by `wilayaCode` → map.
- **getCommunes:** validate the wilaya exists (`RESOURCE_NOT_FOUND` if not) → list `Commune` where `wilayaId` matches, ordered by `communeCode` → map.

## 5. Data Mapping [BACKEND]
- **toDTO:** pass through bilingual fields ({ id, code, frName, arName }, plus `wilayaId` on communes). No sensitive fields, no date fields.
- **toPersistence:** n/a (seed-only; not written through the API).

## 6. Technical Constraints [BACKEND]
- Seed data (the 58 Algerian wilayas and their communes), read-only via the API. Both `frName` and `arName` are always returned so the frontend localizes per active language. IDs are UUIDs; `wilayaCode`/`communeCode` carry the official numeric codes for display/sorting.

## 7. Test Scenarios [BACKEND]
- 200 — `/wilayas` returns all 58, ordered by code; 403 for a non-admin principal.
- 200 — `/wilayas/:wilayaId/communes` returns that wilaya's communes; 404 `RESOURCE_NOT_FOUND` for an unknown `wilayaId`; an empty array for a valid wilaya with no communes.
