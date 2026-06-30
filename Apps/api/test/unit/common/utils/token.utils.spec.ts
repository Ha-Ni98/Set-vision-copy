import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { generateToken, verifyToken } from '@common/utils/token.utils';
import { env } from '../../../../src/env';
import { UserRole } from '@my-app/contract';

describe('token.utils', () => {
  const payload = { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', role: UserRole.ADMIN };

  it('generates a verifiable JWT with the correct payload', () => {
    const token = generateToken(payload);
    const decoded = verifyToken(token);
    expect(decoded['id']).toBe(payload.id);
    expect(decoded['role']).toBe(payload.role);
  });

  it('verifyToken throws for an expired token', () => {
    const expired = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '0s' });
    expect(() => verifyToken(expired)).toThrow();
  });

  it('verifyToken throws for a tampered token', () => {
    const token = generateToken(payload);
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => verifyToken(tampered)).toThrow();
  });
});
