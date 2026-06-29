import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const VALID_ENV = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/db',
  JWT_SECRET: 'a_long_secret_that_is_at_least_32_chars_for_testing!!',
  NODE_ENV: 'test',
};

describe('env.ts', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.resetModules();
    originalEnv = { ...process.env };
    // Remove any previously set env vars so each test starts clean
    delete process.env['DATABASE_URL'];
    delete process.env['JWT_SECRET'];
    delete process.env['NODE_ENV'];
    delete process.env['PORT'];
    delete process.env['API_PREFIX'];
    delete process.env['CORS_ORIGIN'];
    delete process.env['JWT_EXPIRATION'];
    delete process.env['LOG_LEVEL'];
    delete process.env['WS_PATH'];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('parses valid environment and exposes correctly typed values', async () => {
    Object.assign(process.env, VALID_ENV);

    const { env } = await import('../../src/env.js');

    expect(env.NODE_ENV).toBe('test');
    expect(env.PORT).toBe(3000);
    expect(env.API_PREFIX).toBe('/api/v1');
    expect(env.WS_PATH).toBe('/socket.io');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.JWT_SECRET).toBe(VALID_ENV.JWT_SECRET);
    expect(typeof env.PORT).toBe('number');
  });

  it('calls process.exit(1) when JWT_SECRET is missing', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    Object.assign(process.env, { DATABASE_URL: VALID_ENV.DATABASE_URL, NODE_ENV: 'test' });
    // JWT_SECRET intentionally not set

    await import('../../src/env.js');

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('calls process.exit(1) when JWT_SECRET is shorter than 32 chars', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    Object.assign(process.env, { ...VALID_ENV, JWT_SECRET: 'tooshort' });

    await import('../../src/env.js');

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('calls process.exit(1) when DATABASE_URL is missing', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    Object.assign(process.env, { JWT_SECRET: VALID_ENV.JWT_SECRET, NODE_ENV: 'test' });
    // DATABASE_URL intentionally not set

    await import('../../src/env.js');

    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
