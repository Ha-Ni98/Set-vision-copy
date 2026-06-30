// Provide minimum valid env vars so any test file importing src/env.ts
// does not crash on the first module load. env.spec.ts overrides these per-case.
process.env['NODE_ENV'] = process.env['NODE_ENV'] ?? 'test';
process.env['DATABASE_URL'] =
  process.env['DATABASE_URL'] ?? 'postgresql://user:password@localhost:5432/test_db';
process.env['TEST_DATABASE_URL'] =
  process.env['TEST_DATABASE_URL'] ?? 'postgresql://user:password@localhost:5433/test_db';
process.env['JWT_SECRET'] =
  process.env['JWT_SECRET'] ?? 'test_secret_that_is_at_least_32_chars_long!!';
