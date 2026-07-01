import { describe, it, expect } from 'vitest';
import { SetMapper, composeSubscriptionLabel } from '@modules/set/set.mapper';
import { SetResponseSchema, SetStat, SubscriptionType, SubscriptionDuration } from '@my-app/contract';
import { setEntity } from '../../../data/set.factory';
import { subscriptionPlanEntity } from '../../../data/subscription-plan.factory';

const makePlan = (overrides = {}) => subscriptionPlanEntity(overrides);
const makeSet = (overrides = {}) => setEntity(overrides);

describe('SetMapper.toDTO', () => {
  it('produces a SetDTO that parses SetResponseSchema', () => {
    const set = makeSet({ setStat: SetStat.NOT_PRINTED, printedAt: null });
    const plan = makePlan();
    const dto = SetMapper.toDTO(set, plan);
    expect(() => SetResponseSchema.parse(dto)).not.toThrow();
  });

  it('resolves subscriptionLabel from plan type and duration', () => {
    const plan = makePlan({
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.ONE_MONTH,
    });
    const dto = SetMapper.toDTO(makeSet(), plan);
    expect(dto.subscriptionLabel).toBe('Snapchat Plus — 01 Month');
  });

  it('resolves subscriptionLabel for all durations', () => {
    const cases: [SubscriptionDuration, string][] = [
      [SubscriptionDuration.ONE_DAY, 'Snapchat Plus — 01 Day'],
      [SubscriptionDuration.ONE_WEEK, 'Snapchat Plus — 01 Week'],
      [SubscriptionDuration.TWO_WEEK, 'Snapchat Plus — 02 Weeks'],
      [SubscriptionDuration.THREE_MONTH, 'Snapchat Plus — 03 Months'],
      [SubscriptionDuration.SIXTH_MONTH, 'Snapchat Plus — 06 Months'],
      [SubscriptionDuration.ONE_YEAR, 'Snapchat Plus — 01 Year'],
      [SubscriptionDuration.UNLIMITED, 'Snapchat Plus — Unlimited'],
    ];
    for (const [duration, expected] of cases) {
      const plan = makePlan({ subscriptionDuration: duration });
      expect(composeSubscriptionLabel(plan)).toBe(expected);
    }
  });

  it('serializes printedAt as null when not set', () => {
    const set = makeSet({ printedAt: null });
    const dto = SetMapper.toDTO(set, makePlan());
    expect(dto.printedAt).toBeNull();
  });

  it('serializes printedAt as ISO string when present', () => {
    const date = new Date('2024-06-01T12:00:00.000Z');
    const set = makeSet({ printedAt: date });
    const dto = SetMapper.toDTO(set, makePlan());
    expect(dto.printedAt).toBe('2024-06-01T12:00:00.000Z');
  });

  it('serializes createdAt as ISO string', () => {
    const date = new Date('2024-03-15T08:30:00.000Z');
    const set = makeSet({ createdAt: date });
    const dto = SetMapper.toDTO(set, makePlan());
    expect(dto.createdAt).toBe('2024-03-15T08:30:00.000Z');
  });

  it('maps setStat correctly', () => {
    for (const stat of Object.values(SetStat)) {
      const set = makeSet({ setStat: stat });
      const dto = SetMapper.toDTO(set, makePlan());
      expect(dto.setStat).toBe(stat);
    }
  });

  it('does not spread the entity (no extra fields like updatedAt)', () => {
    const set = makeSet();
    const dto = SetMapper.toDTO(set, makePlan()) as Record<string, unknown>;
    expect('updatedAt' in dto).toBe(false);
    expect('subscriptionPlan' in dto).toBe(false);
  });

  it('includes the expected SetDTO fields', () => {
    const set = makeSet();
    const dto = SetMapper.toDTO(set, makePlan());
    expect(dto).toHaveProperty('id');
    expect(dto).toHaveProperty('setNumber');
    expect(dto).toHaveProperty('subscriptionPlanId');
    expect(dto).toHaveProperty('subscriptionLabel');
    expect(dto).toHaveProperty('numberOfKeys');
    expect(dto).toHaveProperty('setStat');
    expect(dto).toHaveProperty('createdAt');
    expect(dto).toHaveProperty('printedAt');
  });
});
