# Sprint 0 Report — Framework Foundation Corrections

**Status:** ✅ Done  
**Date:** 2026-06-30

## What was done

| FC | Task | Result |
|----|------|--------|
| FC-1 | `argon2` added, `bcrypt`/`@types/bcrypt` removed; `password.utils.ts` rewritten to Argon2id (same signatures) | ✅ |
| FC-2 | `generateOpaqueToken()` + `hashRefreshToken()` (SHA-256) added to `token.utils.ts` | ✅ |
| FC-3 | `REFRESH_TOKEN_EXPIRATION` (default `7d`) added to `env.ts`, `.env.example`, `env-template.md` | ✅ |
| FC-4 | `password-generator.util.ts` — `generateTempPassword(length=14)`, crypto-backed, all char classes guaranteed | ✅ |
| FC-5 | `pagination.ts` — `buildPaginationMeta` + `toSkipTake` | ✅ |
| FC-6 | `modules/index.ts` — empty `moduleRouter`; `app.ts` mounts it at `API_PREFIX` (replaces `express.Router()`) | ✅ |

## Files created / modified

- `src/common/utils/password.utils.ts` — rewritten (Argon2id)
- `src/common/utils/token.utils.ts` — 2 new exports
- `src/common/utils/password-generator.util.ts` — new
- `src/common/http/pagination.ts` — new
- `src/modules/index.ts` — new
- `src/env.ts` — added `REFRESH_TOKEN_EXPIRATION`
- `src/app.ts` — mounts `moduleRouter`
- `.env.example` + `Docs/…/env-template.md` — updated
- `test/unit/common/utils/password.utils.spec.ts` — 5 tests (argon2id)
- `test/unit/common/utils/token.utils.spec.ts` — 8 tests (incl. 5 new refresh-token tests)
- `test/unit/common/utils/password-generator.spec.ts` — 7 tests (new)
- `test/unit/common/http/pagination.spec.ts` — 4 tests (new)
- `test/unit/env.spec.ts` — `REFRESH_TOKEN_EXPIRATION` default assertion added

## Validation

- `tsc --noEmit`: clean
- `npm run test:unit`: **68/68 passed** (was 50 before sprint; +18 new tests)
- No `bcrypt` import remaining in `src/` or `test/`
- `modules/index.ts` has no routes registered (no behavior change to existing endpoints)
