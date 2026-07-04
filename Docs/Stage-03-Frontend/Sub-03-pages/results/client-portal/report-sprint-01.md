---
sprint: 1
title: Foundation — Schema, i18n, RTL-ready infra & public 401-exempt
status: ✅ Done
commit: 8afc049
---

# Sprint 1 Report — Foundation

## Work done

### Schema alignment (`account-form.schema.ts`)
Tightened validation to the spec's exact Snapchat rules: `fullName` (3–100 chars, `/^[\p{L}\s-]+$/u` — letters/spaces/hyphens, using `\p{L}` rather than `A-Z` so accented/non-Latin names aren't rejected), `phone`/`phoneNumber` (the same `ALGERIAN_PHONE_PATTERN` regex already duplicated per-file across 6+ Admin schemas — followed that exact co-located convention rather than introducing a shared import), `password` (min 6, was min 1). Added three new exports — `toAccountFields()`, `toSubmitCommand()`, `toUpdateCommand()` — plus compile-time `AssertAssignable` checks against `SubmitActivationCommand`/`UpdateActivationCommand`.

**A real gap fixed in the mapping, not just an alignment**: the spec says the optional Snapchat-phone field "defaults to the personal phone" — the account's `PHONE_NUMBER` field should always be present. The *current* `AccountForm.tsx` inline mapping omits it entirely when blank (`...(values.phoneNumber ? [...] : [])`). The new `toAccountFields()` helper fixes this (`value: values.phoneNumber || values.phone`), ready for `AccountForm.tsx` to switch to once it's rewired.

**Deliberately not renamed yet**: the plan names this field `snapchatPhone`; the schema keeps `phoneNumber` for now. Renaming it today, with `AccountForm.tsx` completely untouched, would just be churn with no behavioral effect — the rename lands in Sprint 2/3 together with the component rewrite that actually consumes these new helpers.

### i18n extension
~30 new/updated `public.landing.*` keys, one per spec-named variant not yet covered: Step 1's empty-key/bad-format/network errors; Step 2's processing notice, Clear-Fields confirm dialog, and submit-network error; Step 3's OTP wrong-code/lockout/attempts-remaining, plus two entirely new dedicated views (`review.*` for Under-review, `failed.*` for the Step-3 Failed card — previously only a generic `message.failed*` pair existed, built for the old MVP's single "message" view type, not the spec's distinct completion-style failure card). Added one shared `public.landing.serverError` reused across all three steps' 5xx cases (the spec gives the identical generic wording each time — one key, not three near-duplicates). Added `common.social.{instagram,whatsapp,facebook}` — `PublicHeader`/`PublicFooter` currently hardcode `aria-label="Instagram"` etc. as raw English strings, a real "no inline strings" violation; the keys exist now, get wired in when Sprint 2 actually rewrites those components. Realigned two existing keys to the spec's *exact* quoted wording rather than the existing paraphrase: `message.invalidBody` and `form.correctionBanner`.

### RTL-ready infra
The plan's own implementation guidance for `dir` is `language === "ar" ? "rtl" : "ltr"` — but `Language` was `"en" | "fr"` only, and TypeScript flags a literal-union comparison with zero overlap as an error (not just a lint nit — a real `tsc` failure). Widened `Language` to `"en" | "fr" | "ar"` to make the plan's own conditional even compile. Added `dirForLanguage()` to `lib/i18n.ts`; `LanguageProvider` now computes `dir` and reflects it onto `document.documentElement.dir` via a `useEffect`; `useTranslation()` returns `dir` alongside `t`/`language` for components that want it directly. The ripple from widening `Language` was small and contained: `lib/utils.ts`'s `LOCALE_TAG: Record<Language, string>` needed an `ar: "ar-DZ"` entry to stay exhaustive, and `LanguageToggle.tsx`'s own local label map needed the same — the toggle itself still only ever renders EN/FR options. `components.json`'s `rtl` flag stays `false`; every `ar` copy value stays `""`. No logical-CSS authoring yet — there's no new JSX this sprint to apply it to; that starts in earnest in Sprint 2.

### Public 401-exemption
Added `isPublicEndpoint()` to `lib/axios.ts`, checking whether the request URL starts with `/keys` — deliberately a **prefix** check, not an exact-match `Set` like the existing `TOKEN_ENDPOINTS`. Three of `KEY_ROUTES`'s five routes (`UPDATE`, `ADDITIONAL`, `STATUS`) are parameterized (`/:activationId/...`); the *resolved* request URL carries a real id, so it would never equality-match a literal route-template string the way `TOKEN_ENDPOINTS`' unparameterized auth routes do. A prefix match correctly covers all five routes (and any future one under the same base) in one line. The plan's "+ a future `/stats`" isn't added — that route doesn't exist in the contract yet (E-1), nothing to exempt.

## Validation results
- `npm run check` (both tsconfigs) ✅ clean.
- `npx vitest run` ✅ 59/59 files, 439/439 tests (438 baseline + 1 new).
- `npx eslint` scoped to all 10 touched files — 0 errors (1 pre-existing `react-refresh/only-export-components` warning on `LanguageProvider.tsx`, unrelated to this sprint's changes — that file already exported both a component and a hook before today).
- **New test coverage, not just manual verification**: added a case to the existing `tests/unit/lib/axios.test.ts` (MSW-backed, mirrors the file's own existing LOGIN-endpoint exemption test) proving a 401 from a *parameterized* `/keys/:activationId/status` request doesn't trigger a refresh attempt or a redirect — specifically chosen to exercise the prefix-check reasoning above, not just the easy unparameterized case.

## Sprint plan status
Client Portal: 1/6 sprints done. Next = S2 (Primitives & States — `ActivationContext` + plan-forms registry + all region dumb-components), where `AccountForm.tsx` actually gets rewritten to consume this sprint's new schema helpers and the `phoneNumber`→`snapchatPhone` rename lands.
