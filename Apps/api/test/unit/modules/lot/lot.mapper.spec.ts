import { describe, it, expect } from 'vitest';
import { LotMapper } from '@modules/lot/lot.mapper';
import { LotResponseSchema, LotStat, SubscriptionType, SubscriptionDuration } from '@my-app/contract';
import { lotEntity } from '../../../data/lot.factory';
import { subscriptionPlanEntity } from '../../../data/subscription-plan.factory';

const makePlan = (overrides = {}) => subscriptionPlanEntity(overrides);
const makeLot = (overrides = {}) => lotEntity(overrides);

describe('LotMapper.toDTO', () => {
  it('produces a LotDTO that parses LotResponseSchema', () => {
    const lot = makeLot();
    const plan = makePlan();
    const dto = LotMapper.toDTO(lot, plan, 0);
    expect(() => LotResponseSchema.parse(dto)).not.toThrow();
  });

  it('passes deliveredCardsCount through as a mapper input (derived, not stored)', () => {
    const lot = makeLot();
    const plan = makePlan();
    const dto = LotMapper.toDTO(lot, plan, 7);
    expect(dto.deliveredCardsCount).toBe(7);
  });

  it('serializes deliveryDate as null when not set', () => {
    const lot = makeLot({ deliveryDate: null });
    const dto = LotMapper.toDTO(lot, makePlan(), 0);
    expect(dto.deliveryDate).toBeNull();
  });

  it('serializes deliveryDate as ISO string when present', () => {
    const date = new Date('2024-06-15T09:00:00.000Z');
    const lot = makeLot({ deliveryDate: date });
    const dto = LotMapper.toDTO(lot, makePlan(), 3);
    expect(dto.deliveryDate).toBe('2024-06-15T09:00:00.000Z');
  });

  it('serializes createdAt as ISO string', () => {
    const date = new Date('2024-04-01T06:00:00.000Z');
    const lot = makeLot({ createdAt: date });
    const dto = LotMapper.toDTO(lot, makePlan(), 0);
    expect(dto.createdAt).toBe('2024-04-01T06:00:00.000Z');
  });

  it('resolves subscriptionLabel from plan', () => {
    const plan = makePlan({
      subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
      subscriptionDuration: SubscriptionDuration.ONE_MONTH,
    });
    const dto = LotMapper.toDTO(makeLot(), plan, 0);
    expect(dto.subscriptionLabel).toBe('Snapchat Plus — 01 Month');
  });

  it('maps lotStat correctly for all values', () => {
    for (const stat of Object.values(LotStat)) {
      const lot = makeLot({ lotStat: stat });
      const dto = LotMapper.toDTO(lot, makePlan(), 0);
      expect(dto.lotStat).toBe(stat);
    }
  });

  it('does not spread the entity (no extra fields)', () => {
    const dto = LotMapper.toDTO(makeLot(), makePlan(), 0) as Record<string, unknown>;
    expect('orderLots' in dto).toBe(false);
    expect('subscriptionPlan' in dto).toBe(false);
  });

  it('passes isReturned through', () => {
    const lot = makeLot({ isReturned: true });
    const dto = LotMapper.toDTO(lot, makePlan(), 0);
    expect(dto.isReturned).toBe(true);
  });
});
