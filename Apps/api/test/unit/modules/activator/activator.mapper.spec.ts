import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { ActivatorMapper } from '@modules/activator/activator.mapper';
import {
  ActivatorResponseSchema,
  ActivatorDetailResponseSchema,
  ActivatorWithCredentialsResponseSchema,
  ActivatorGeneratedPasswordResponseSchema,
  ActivatorPerformanceResponseSchema,
  ActivatorDashboardResponseSchema,
} from '@my-app/contract';
import { userEntity } from '../../../data/user.factory';
import { activatorEntity } from '../../../data/activator.factory';

const makeActivator = (overrides = {}) => activatorEntity(overrides);
const makeUser = (overrides = {}) => userEntity({ role: 'ACTIVATOR', ...overrides });
const d = (val: number) => new Prisma.Decimal(val);

describe('ActivatorMapper.toDTO', () => {
  it('produces an ActivatorDTO that parses ActivatorResponseSchema', () => {
    const activator = makeActivator();
    const user = makeUser({ id: activator.userId });
    const dto = ActivatorMapper.toDTO(activator, user, { avgActivationTimeSeconds: null });
    expect(() => ActivatorResponseSchema.parse(dto)).not.toThrow();
  });

  it('never includes password or deletedAt', () => {
    const activator = makeActivator();
    const user = makeUser({ password: 'secret', deletedAt: new Date() });
    const dto = ActivatorMapper.toDTO(activator, user, { avgActivationTimeSeconds: null }) as Record<
      string,
      unknown
    >;
    expect('password' in dto).toBe(false);
    expect('deletedAt' in dto).toBe(false);
  });

  it('sources isEnabled from User', () => {
    const activator = makeActivator();
    const user = makeUser({ isEnabled: false });
    const dto = ActivatorMapper.toDTO(activator, user, { avgActivationTimeSeconds: null });
    expect(dto.isEnabled).toBe(false);
  });

  it('converts Decimal totalEarning to number with 2dp', () => {
    const activator = makeActivator({ totalEarning: d(10.505) });
    const user = makeUser({ id: activator.userId });
    const dto = ActivatorMapper.toDTO(activator, user, { avgActivationTimeSeconds: null });
    expect(dto.totalEarning).toBe(10.51);
  });

  it('converts Decimal credits to number with 2dp', () => {
    const activator = makeActivator({ credits: d(3.14159) });
    const user = makeUser({ id: activator.userId });
    const dto = ActivatorMapper.toDTO(activator, user, { avgActivationTimeSeconds: null });
    expect(dto.credits).toBe(3.14);
  });

  it('passes avgActivationTimeSeconds as null when no completed activations', () => {
    const activator = makeActivator();
    const user = makeUser({ id: activator.userId });
    const dto = ActivatorMapper.toDTO(activator, user, { avgActivationTimeSeconds: null });
    expect(dto.avgActivationTimeSeconds).toBeNull();
  });

  it('passes avgActivationTimeSeconds through when present', () => {
    const activator = makeActivator();
    const user = makeUser({ id: activator.userId });
    const dto = ActivatorMapper.toDTO(activator, user, { avgActivationTimeSeconds: 45.5 });
    expect(dto.avgActivationTimeSeconds).toBe(45.5);
  });

  it('serializes lastLoginAt as null when absent', () => {
    const activator = makeActivator();
    const user = makeUser({ lastLoginAt: null });
    const dto = ActivatorMapper.toDTO(activator, user, { avgActivationTimeSeconds: null });
    expect(dto.lastLoginAt).toBeNull();
  });

  it('serializes lastLoginAt as ISO string when present', () => {
    const ts = new Date('2025-03-01T12:00:00.000Z');
    const activator = makeActivator();
    const user = makeUser({ lastLoginAt: ts });
    const dto = ActivatorMapper.toDTO(activator, user, { avgActivationTimeSeconds: null });
    expect(dto.lastLoginAt).toBe(ts.toISOString());
  });
});

describe('ActivatorMapper.toDetailDTO', () => {
  it('parses ActivatorDetailResponseSchema and includes detail fields', () => {
    const activator = makeActivator();
    const user = makeUser({ id: activator.userId });
    const derived = { avgActivationTimeSeconds: null, totalPaid: 100, creditsOwed: 50, successRate: 0.75 };
    const dto = ActivatorMapper.toDetailDTO(activator, user, derived);
    expect(() => ActivatorDetailResponseSchema.parse(dto)).not.toThrow();
    expect(dto.totalPaid).toBe(100);
    expect(dto.creditsOwed).toBe(50);
    expect(dto.successRate).toBe(0.75);
  });

  it('exposes successRate as 0 when passed 0 (÷0 guard is in service)', () => {
    const activator = makeActivator({ nbOfActivation: 0, nbOfSuccessfulActivation: 0 });
    const user = makeUser({ id: activator.userId });
    const derived = { avgActivationTimeSeconds: null, totalPaid: 0, creditsOwed: 0, successRate: 0 };
    const dto = ActivatorMapper.toDetailDTO(activator, user, derived);
    expect(dto.successRate).toBe(0);
  });
});

describe('ActivatorMapper.toWithCredentialsDTO', () => {
  it('parses ActivatorWithCredentialsResponseSchema', () => {
    const activator = makeActivator();
    const user = makeUser({ id: activator.userId });
    const dto = ActivatorMapper.toWithCredentialsDTO(
      activator,
      user,
      { avgActivationTimeSeconds: null },
      'Temp#Pass99',
    );
    expect(() => ActivatorWithCredentialsResponseSchema.parse(dto)).not.toThrow();
    expect(dto.generatedPassword).toBe('Temp#Pass99');
    expect('password' in dto.activator).toBe(false);
  });
});

describe('ActivatorMapper.toGeneratedPasswordDTO', () => {
  it('parses ActivatorGeneratedPasswordResponseSchema', () => {
    const dto = ActivatorMapper.toGeneratedPasswordDTO('NewTemp#12');
    expect(() => ActivatorGeneratedPasswordResponseSchema.parse(dto)).not.toThrow();
    expect(dto.generatedPassword).toBe('NewTemp#12');
  });
});

describe('ActivatorMapper.toPerformanceDTO', () => {
  it('maps series dates to ISO strings and converts earned Decimal to number', () => {
    const series = [
      { date: new Date('2025-06-01T00:00:00.000Z'), count: 3, earned: d(150.75) },
      { date: new Date('2025-06-02T00:00:00.000Z'), count: 1, earned: d(50.0) },
    ];
    const dto = ActivatorMapper.toPerformanceDTO(series);
    expect(() => ActivatorPerformanceResponseSchema.parse(dto)).not.toThrow();
    expect(dto.series[0]?.earned).toBe(150.75);
    expect(dto.series[1]?.earned).toBe(50.0);
    expect(dto.series[0]?.date).toBe('2025-06-01T00:00:00.000Z');
  });

  it('returns empty series array when no data', () => {
    const dto = ActivatorMapper.toPerformanceDTO([]);
    expect(dto.series).toHaveLength(0);
  });
});

describe('ActivatorMapper.toDashboardDTO', () => {
  it('converts Decimal fields and maps weekly dates to ISO strings', () => {
    const stats = {
      totalEarnings: d(1000.5),
      earningsTrendPercent: 12.5,
      creditsBalance: d(250.0),
      totalActivations: 20,
      activationsToday: 2,
      avgActivationTimeSeconds: 120,
      activeSlotsUsed: 1,
      weekly: [{ date: new Date('2025-06-24T00:00:00.000Z'), count: 5 }],
    };
    const dto = ActivatorMapper.toDashboardDTO(stats);
    expect(() => ActivatorDashboardResponseSchema.parse(dto)).not.toThrow();
    expect(dto.totalEarnings).toBe(1000.5);
    expect(dto.creditsBalance).toBe(250.0);
    expect(dto.weekly[0]?.date).toBe('2025-06-24T00:00:00.000Z');
  });

  it('passes avgActivationTimeSeconds as null when no completed activations', () => {
    const stats = {
      totalEarnings: d(0),
      earningsTrendPercent: 0,
      creditsBalance: d(0),
      totalActivations: 0,
      activationsToday: 0,
      avgActivationTimeSeconds: null,
      activeSlotsUsed: 0,
      weekly: [],
    };
    const dto = ActivatorMapper.toDashboardDTO(stats);
    expect(dto.avgActivationTimeSeconds).toBeNull();
  });
});

describe('ActivatorMapper.toPersistenceCreate', () => {
  it('trims string fields and maps initialCredits to credits', () => {
    const result = ActivatorMapper.toPersistenceCreate({
      fullName: '  Alice  ',
      username: '  alice  ',
      phone: '  0612345678  ',
      initialCredits: 100,
    });
    expect(result).toEqual({ fullName: 'Alice', username: 'alice', phone: '0612345678', credits: 100 });
  });

  it('defaults credits to 0 when initialCredits is absent', () => {
    const result = ActivatorMapper.toPersistenceCreate({
      fullName: 'Bob',
      username: 'bob',
      phone: '0612345679',
    });
    expect(result.credits).toBe(0);
  });
});

describe('ActivatorMapper.toPersistenceUpdate', () => {
  it('trims string fields and omits undefined fields', () => {
    const result = ActivatorMapper.toPersistenceUpdate({ fullName: '  Charlie  ' });
    expect(result).toEqual({ fullName: 'Charlie' });
    expect('username' in result).toBe(false);
    expect('phone' in result).toBe(false);
  });

  it('handles all fields present', () => {
    const result = ActivatorMapper.toPersistenceUpdate({
      fullName: '  Dave  ',
      username: '  dave  ',
      phone: '  0699999999  ',
    });
    expect(result).toEqual({ fullName: 'Dave', username: 'dave', phone: '0699999999' });
  });
});
