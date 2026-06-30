import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { generateToken, verifyToken, generateOpaqueToken, hashRefreshToken } from '@common/utils/token.utils';
import { env } from '../../../../src/env';
import { UserRole } from '@my-app/contract';

describe('token.utils — JWT', () => {
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

describe('token.utils — opaque refresh tokens', () => {
  it('generateOpaqueToken returns a 64-char hex string', () => {
    const token = generateOpaqueToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generateOpaqueToken produces unique values', () => {
    expect(generateOpaqueToken()).not.toBe(generateOpaqueToken());
  });

  it('hashRefreshToken is deterministic (same input → same output)', () => {
    const raw = generateOpaqueToken();
    expect(hashRefreshToken(raw)).toBe(hashRefreshToken(raw));
  });

  it('hashRefreshToken produces different hashes for different inputs', () => {
    expect(hashRefreshToken(generateOpaqueToken())).not.toBe(hashRefreshToken(generateOpaqueToken()));
  });

  it('hashRefreshToken returns a 64-char hex SHA-256 string', () => {
    expect(hashRefreshToken('anything')).toMatch(/^[0-9a-f]{64}$/);
  });
});
