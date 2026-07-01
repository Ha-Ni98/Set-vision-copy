import { describe, it, expect } from 'vitest';
import { LogMapper } from '../../../../src/modules/log/log.mapper';
import { LogResponseSchema, LogActionType } from '@my-app/contract';

const baseUser = {
  id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  username: 'fallback_user',
  password: 'hashed',
  role: 'ADMIN' as const,
  lastLoginAt: null,
  isEnabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const baseLog = {
  id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  actionType: LogActionType.ADD_DISTRIBUTOR,
  actionDescription: 'Added distributor X',
  userId: baseUser.id,
  createdAt: new Date('2026-01-15T10:00:00.000Z'),
};

describe('LogMapper.toDTO', () => {
  it('produces a DTO that parses LogResponseSchema', () => {
    const log = { ...baseLog, user: { ...baseUser, admin: null, activator: null } };
    const dto = LogMapper.toDTO(log);
    expect(() => LogResponseSchema.parse(dto)).not.toThrow();
  });

  it('actionType is a valid LogActionType', () => {
    const log = { ...baseLog, user: { ...baseUser, admin: null, activator: null } };
    const dto = LogMapper.toDTO(log);
    expect(Object.values(LogActionType)).toContain(dto.actionType);
  });

  it('resolves userName from Admin.fullName when admin profile exists', () => {
    const log = {
      ...baseLog,
      user: {
        ...baseUser,
        admin: { id: 'x', userId: baseUser.id, fullName: 'Admin Full Name', phone: '000', isEnabled: true },
        activator: null,
      },
    };
    const dto = LogMapper.toDTO(log);
    expect(dto.userName).toBe('Admin Full Name');
  });

  it('resolves userName from Activator.fullName when activator profile exists', () => {
    const log = {
      ...baseLog,
      user: {
        ...baseUser,
        admin: null,
        activator: {
          id: 'y', userId: baseUser.id, fullName: 'Act Full Name', phone: '000',
          totalEarning: 0 as never, credits: 0 as never,
          nbOfActivation: 0, nbOfSuccessfulActivation: 0,
        },
      },
    };
    const dto = LogMapper.toDTO(log);
    expect(dto.userName).toBe('Act Full Name');
  });

  it('falls back to User.username when no profile exists', () => {
    const log = { ...baseLog, user: { ...baseUser, admin: null, activator: null } };
    const dto = LogMapper.toDTO(log);
    expect(dto.userName).toBe('fallback_user');
  });

  it('converts createdAt to ISO string', () => {
    const log = { ...baseLog, user: { ...baseUser, admin: null, activator: null } };
    const dto = LogMapper.toDTO(log);
    expect(dto.createdAt).toBe('2026-01-15T10:00:00.000Z');
  });
});
