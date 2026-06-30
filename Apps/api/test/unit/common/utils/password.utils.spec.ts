import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '@common/utils/password.utils';

describe('password.utils', () => {
  it('produces a hash that is different from the plain text', async () => {
    const plain = 'Password123!';
    const hash = await hashPassword(plain);
    expect(hash).not.toBe(plain);
    expect(hash.length).toBeGreaterThan(0);
  });

  it('comparePassword returns true for the original plain text', async () => {
    const plain = 'Password123!';
    const hash = await hashPassword(plain);
    await expect(comparePassword(plain, hash)).resolves.toBe(true);
  });

  it('comparePassword returns false for a different plain text', async () => {
    const hash = await hashPassword('Password123!');
    await expect(comparePassword('WrongPassword!', hash)).resolves.toBe(false);
  });
});
