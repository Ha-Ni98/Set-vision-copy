import { describe, it, expect } from 'vitest';
import { AuthTokensResponseSchema, SessionUserResponseSchema, UserRole } from '@my-app/contract';
import { AuthMapper } from '@modules/auth/auth.mapper';
import { userEntity } from '../../../data/user.factory';

const adminProfile = { fullName: 'Alice Admin' };
const activatorProfile = { fullName: 'Bob Activator' };

describe('AuthMapper.toAuthTokensDTO', () => {
  it('parses cleanly against AuthTokensResponseSchema', () => {
    const dto = AuthMapper.toAuthTokensDTO('access-token', 'refresh-token', UserRole.ADMIN);
    expect(() => AuthTokensResponseSchema.parse(dto)).not.toThrow();
  });

  it('returns the exact tokens and role provided', () => {
    const dto = AuthMapper.toAuthTokensDTO('acc', 'ref', UserRole.ACTIVATOR);
    expect(dto.accessToken).toBe('acc');
    expect(dto.refreshToken).toBe('ref');
    expect(dto.role).toBe(UserRole.ACTIVATOR);
  });

  it('never exposes password or tokenHash on the returned object', () => {
    const dto = AuthMapper.toAuthTokensDTO('a', 'b', UserRole.ADMIN) as Record<string, unknown>;
    expect(dto).not.toHaveProperty('password');
    expect(dto).not.toHaveProperty('tokenHash');
  });
});

describe('AuthMapper.toSessionUserDTO', () => {
  it('parses cleanly against SessionUserResponseSchema for an admin profile', () => {
    const user = userEntity({ role: 'ADMIN' });
    const dto = AuthMapper.toSessionUserDTO(user, adminProfile);
    expect(() => SessionUserResponseSchema.parse(dto)).not.toThrow();
  });

  it('parses cleanly against SessionUserResponseSchema for an activator profile', () => {
    const user = userEntity({ role: 'ACTIVATOR' });
    const dto = AuthMapper.toSessionUserDTO(user, activatorProfile);
    expect(() => SessionUserResponseSchema.parse(dto)).not.toThrow();
  });

  it('composes id, username, role from User and fullName from profile', () => {
    const user = userEntity({ role: 'ADMIN' });
    const dto = AuthMapper.toSessionUserDTO(user, adminProfile);
    expect(dto.id).toBe(user.id);
    expect(dto.username).toBe(user.username);
    expect(dto.role).toBe(UserRole.ADMIN);
    expect(dto.fullName).toBe('Alice Admin');
  });

  it('never exposes password or tokenHash', () => {
    const user = userEntity({ role: 'ADMIN' });
    const dto = AuthMapper.toSessionUserDTO(user, adminProfile) as Record<string, unknown>;
    expect(dto).not.toHaveProperty('password');
    expect(dto).not.toHaveProperty('tokenHash');
  });

  it('resolves fullName from activator profile correctly', () => {
    const user = userEntity({ role: 'ACTIVATOR' });
    const dto = AuthMapper.toSessionUserDTO(user, activatorProfile);
    expect(dto.fullName).toBe('Bob Activator');
  });
});
