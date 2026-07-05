import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '@common/utils/password.utils';

describe('password.utils (argon2id)', () => {
  it('produces an argon2id hash', async () => {
    const hash = await hashPassword('Password123!');
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it('hash differs from the plain text', async () => {
    const plain = 'Password123!';
    const hash = await hashPassword(plain);
    expect(hash).not.toBe(plain);
  });

  it('comparePassword returns true for the correct plain text', async () => {
    const plain = 'Password123!';
    const hash = await hashPassword(plain);
    await expect(comparePassword(plain, hash)).resolves.toBe(true);
  });

  it('comparePassword returns false for a wrong password', async () => {
    const hash = await hashPassword('Password123!');
    await expect(comparePassword('WrongPassword!', hash)).resolves.toBe(false);
  });

  it('comparePassword returns false (not throws) for a malformed hash', async () => {
    await expect(comparePassword('anything', 'not-a-valid-hash')).resolves.toBe(false);
  });
});
