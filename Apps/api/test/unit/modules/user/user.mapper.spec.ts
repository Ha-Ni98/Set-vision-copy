import { describe, it, expect } from 'vitest';
import { UserIdentityResponseSchema, UserRole } from '@my-app/contract';
import { UserMapper } from '@modules/user/user.mapper';
import { userEntity } from '../../../data/user.factory';

describe('UserMapper.toUserIdentityDTO', () => {
  it('parses cleanly against UserIdentityResponseSchema', () => {
    const dto = UserMapper.toUserIdentityDTO(userEntity());
    expect(() => UserIdentityResponseSchema.parse(dto)).not.toThrow();
  });

  it('never returns password', () => {
    const dto = UserMapper.toUserIdentityDTO(userEntity()) as Record<string, unknown>;
    expect(dto).not.toHaveProperty('password');
  });

  it('never returns deletedAt', () => {
    const dto = UserMapper.toUserIdentityDTO(userEntity({ deletedAt: new Date() })) as Record<string, unknown>;
    expect(dto).not.toHaveProperty('deletedAt');
  });

  it('converts lastLoginAt Date to ISO string', () => {
    const date = new Date('2025-06-01T12:00:00.000Z');
    const dto = UserMapper.toUserIdentityDTO(userEntity({ lastLoginAt: date }));
    expect(dto.lastLoginAt).toBe('2025-06-01T12:00:00.000Z');
  });

  it('passes lastLoginAt null through as null', () => {
    const dto = UserMapper.toUserIdentityDTO(userEntity({ lastLoginAt: null }));
    expect(dto.lastLoginAt).toBeNull();
  });

  it('converts createdAt Date to ISO string', () => {
    const date = new Date('2024-01-15T10:00:00.000Z');
    const dto = UserMapper.toUserIdentityDTO(userEntity({ createdAt: date }));
    expect(dto.createdAt).toBe('2024-01-15T10:00:00.000Z');
  });

  it('maps role ADMIN correctly', () => {
    const dto = UserMapper.toUserIdentityDTO(userEntity({ role: 'ADMIN' }));
    expect(dto.role).toBe(UserRole.ADMIN);
  });

  it('maps role ACTIVATOR correctly', () => {
    const dto = UserMapper.toUserIdentityDTO(userEntity({ role: 'ACTIVATOR' }));
    expect(dto.role).toBe(UserRole.ACTIVATOR);
  });

  it('passes through id, username, isEnabled', () => {
    const entity = userEntity({ isEnabled: false });
    const dto = UserMapper.toUserIdentityDTO(entity);
    expect(dto.id).toBe(entity.id);
    expect(dto.username).toBe(entity.username);
    expect(dto.isEnabled).toBe(false);
  });
});
