import { describe, it, expect } from 'vitest';
import { generateTempPassword } from '@common/utils/password-generator.util';

describe('generateTempPassword', () => {
  it('returns a string of the requested length (default 14)', () => {
    expect(generateTempPassword()).toHaveLength(14);
    expect(generateTempPassword(20)).toHaveLength(20);
  });

  it('contains at least one lowercase letter', () => {
    expect(generateTempPassword()).toMatch(/[a-z]/);
  });

  it('contains at least one uppercase letter', () => {
    expect(generateTempPassword()).toMatch(/[A-Z]/);
  });

  it('contains at least one digit', () => {
    expect(generateTempPassword()).toMatch(/[0-9]/);
  });

  it('contains at least one symbol', () => {
    expect(generateTempPassword()).toMatch(/[!@#$%^&*()\-_=+\[\]{}]/);
  });

  it('produces unique values on successive calls', () => {
    expect(generateTempPassword()).not.toBe(generateTempPassword());
  });

  it('throws when length is less than 4', () => {
    expect(() => generateTempPassword(3)).toThrow(RangeError);
  });
});
