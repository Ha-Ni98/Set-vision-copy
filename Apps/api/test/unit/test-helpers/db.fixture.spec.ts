import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('resetDatabase', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects when NODE_ENV is not test (no DB connection attempted)', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { resetDatabase } = await import('../../fixtures/db.fixture');
    await expect(resetDatabase()).rejects.toThrow(
      'resetDatabase blocked outside NODE_ENV=test',
    );
  });
});
