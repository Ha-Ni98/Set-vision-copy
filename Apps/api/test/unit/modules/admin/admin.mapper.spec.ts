import { describe, it, expect } from 'vitest';
import { AdminMapper } from '@modules/admin/admin.mapper';
import { AdminResponseSchema, AdminWithCredentialsResponseSchema, AdminGeneratedPasswordResponseSchema } from '@my-app/contract';
import { userEntity } from '../../../data/user.factory';
import { adminEntity } from '../../../data/admin.factory';

const makeAdmin = (overrides = {}) => adminEntity(overrides);
const makeUser = (overrides = {}) => userEntity({ role: 'ADMIN', ...overrides });

describe('AdminMapper.toDTO', () => {
  it('produces an AdminDTO that parses AdminResponseSchema', () => {
    const admin = makeAdmin();
    const user = makeUser({ id: admin.userId });

    const dto = AdminMapper.toDTO(admin, user);
    expect(() => AdminResponseSchema.parse(dto)).not.toThrow();
  });

  it('never includes password or deletedAt', () => {
    const admin = makeAdmin();
    const user = makeUser({ password: 'secret', deletedAt: new Date() });

    const dto = AdminMapper.toDTO(admin, user) as Record<string, unknown>;
    expect('password' in dto).toBe(false);
    expect('deletedAt' in dto).toBe(false);
  });

  it('sources isEnabled from User, not Admin', () => {
    const admin = makeAdmin({ isEnabled: false });
    const user = makeUser({ isEnabled: true });

    const dto = AdminMapper.toDTO(admin, user);
    expect(dto.isEnabled).toBe(true);
  });

  it('serializes lastLoginAt as null when absent', () => {
    const admin = makeAdmin();
    const user = makeUser({ lastLoginAt: null });

    const dto = AdminMapper.toDTO(admin, user);
    expect(dto.lastLoginAt).toBeNull();
  });

  it('serializes lastLoginAt as ISO string when present', () => {
    const ts = new Date('2025-03-01T12:00:00.000Z');
    const admin = makeAdmin();
    const user = makeUser({ lastLoginAt: ts });

    const dto = AdminMapper.toDTO(admin, user);
    expect(dto.lastLoginAt).toBe(ts.toISOString());
  });

  it('serializes createdAt as ISO string', () => {
    const ts = new Date('2025-01-10T08:30:00.000Z');
    const admin = makeAdmin();
    const user = makeUser({ createdAt: ts });

    const dto = AdminMapper.toDTO(admin, user);
    expect(dto.createdAt).toBe(ts.toISOString());
  });

  it('maps id from Admin and username from User', () => {
    const admin = makeAdmin({ id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' });
    const user = makeUser({ username: 'alice_admin' });

    const dto = AdminMapper.toDTO(admin, user);
    expect(dto.id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(dto.username).toBe('alice_admin');
  });
});

describe('AdminMapper.toWithCredentialsDTO', () => {
  it('parses AdminWithCredentialsResponseSchema', () => {
    const admin = makeAdmin();
    const user = makeUser({ id: admin.userId });

    const dto = AdminMapper.toWithCredentialsDTO(admin, user, 'Temp#Pass99');
    expect(() => AdminWithCredentialsResponseSchema.parse(dto)).not.toThrow();
    expect(dto.generatedPassword).toBe('Temp#Pass99');
  });
});

describe('AdminMapper.toGeneratedPasswordDTO', () => {
  it('parses AdminGeneratedPasswordResponseSchema', () => {
    const dto = AdminMapper.toGeneratedPasswordDTO('NewTemp#12');
    expect(() => AdminGeneratedPasswordResponseSchema.parse(dto)).not.toThrow();
    expect(dto.generatedPassword).toBe('NewTemp#12');
  });
});

describe('AdminMapper.toPersistence', () => {
  it('trims all string fields', () => {
    const result = AdminMapper.toPersistence({
      fullName: '  Alice  ',
      username: '  alice  ',
      phone: '  0612345678  ',
    });
    expect(result).toEqual({ fullName: 'Alice', username: 'alice', phone: '0612345678' });
  });

  it('omits undefined fields (supports partial update)', () => {
    const result = AdminMapper.toPersistence({ fullName: '  Bob  ' });
    expect(result).toEqual({ fullName: 'Bob' });
    expect('username' in result).toBe(false);
    expect('phone' in result).toBe(false);
  });
});
