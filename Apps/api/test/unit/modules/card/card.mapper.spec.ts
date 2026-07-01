import { describe, it, expect } from 'vitest';
import { CardMapper, type CardJoins, type DistributionTimelineEntry } from '@modules/card/card.mapper';
import {
  CardResponseSchema,
  CardDetailResponseSchema,
  AvailableCardResponseSchema,
  CardStat,
  SubscriptionType,
  SubscriptionDuration,
} from '@my-app/contract';
import { cardEntity } from '../../../data/card.factory';

const PLAN = {
  subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
  subscriptionDuration: SubscriptionDuration.ONE_MONTH,
};

function makeJoins(overrides: Partial<CardJoins> = {}): CardJoins {
  return {
    subscriptionPlan: PLAN,
    set: { setNumber: 'SET-20240101-AABBCC' },
    lot: null,
    distributor: null,
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────────────────
// toDTO
// ────────────────────────────────────────────────────────────────────────────────

describe('CardMapper.toDTO', () => {
  it('produces a CardDTO that parses CardResponseSchema', () => {
    const dto = CardMapper.toDTO(cardEntity(), makeJoins());
    expect(() => CardResponseSchema.parse(dto)).not.toThrow();
  });

  it('lotNumber is null when lot join is absent', () => {
    const dto = CardMapper.toDTO(cardEntity(), makeJoins({ lot: null }));
    expect(dto.lotNumber).toBeNull();
  });

  it('lotNumber is resolved from lot join', () => {
    const dto = CardMapper.toDTO(cardEntity(), makeJoins({ lot: { lotNumber: 'LOT-001' } }));
    expect(dto.lotNumber).toBe('LOT-001');
  });

  it('distributorName is null when distributor join is absent', () => {
    const dto = CardMapper.toDTO(cardEntity(), makeJoins({ distributor: null }));
    expect(dto.distributorName).toBeNull();
  });

  it('distributorName is resolved from distributor.storeName', () => {
    const dto = CardMapper.toDTO(cardEntity(), makeJoins({ distributor: { storeName: 'Best Shop' } }));
    expect(dto.distributorName).toBe('Best Shop');
  });

  it('resolves subscriptionLabel from plan', () => {
    const dto = CardMapper.toDTO(cardEntity(), makeJoins());
    expect(dto.subscriptionLabel).toBe('Snapchat Plus — 01 Month');
  });

  it('resolves setNumber from set join', () => {
    const dto = CardMapper.toDTO(cardEntity(), makeJoins({ set: { setNumber: 'SET-XYZ' } }));
    expect(dto.setNumber).toBe('SET-XYZ');
  });

  it('passes isActive, isDisabled, isRevoked flags through', () => {
    const card = cardEntity({ isActive: true, isDisabled: true, isRevoked: true });
    const dto = CardMapper.toDTO(card, makeJoins());
    expect(dto.isActive).toBe(true);
    expect(dto.isDisabled).toBe(true);
    expect(dto.isRevoked).toBe(true);
  });

  it('serializes createdAt as ISO string', () => {
    const card = cardEntity({ createdAt: new Date('2024-06-01T10:00:00.000Z') });
    const dto = CardMapper.toDTO(card, makeJoins());
    expect(dto.createdAt).toBe('2024-06-01T10:00:00.000Z');
  });

  it('maps all CardStat values', () => {
    for (const stat of Object.values(CardStat)) {
      const card = cardEntity({ cardStat: stat as CardStat });
      const dto = CardMapper.toDTO(card, makeJoins());
      expect(dto.cardStat).toBe(stat);
    }
  });

  it('does not expose deletedAt or updatedAt in output', () => {
    const dto = CardMapper.toDTO(cardEntity(), makeJoins()) as Record<string, unknown>;
    expect(dto).not.toHaveProperty('deletedAt');
    expect(dto).not.toHaveProperty('updatedAt');
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// toDetailDTO
// ────────────────────────────────────────────────────────────────────────────────

describe('CardMapper.toDetailDTO', () => {
  it('produces a CardDetailDTO that parses CardDetailResponseSchema', () => {
    const timeline: DistributionTimelineEntry[] = [
      { stat: CardStat.IN_SET, at: new Date('2024-01-01T00:00:00.000Z') },
    ];
    const dto = CardMapper.toDetailDTO(cardEntity(), makeJoins(), timeline);
    expect(() => CardDetailResponseSchema.parse(dto)).not.toThrow();
  });

  it('serializes timeline entry dates as ISO strings', () => {
    const timeline: DistributionTimelineEntry[] = [
      { stat: CardStat.IN_SET, at: new Date('2024-01-01T00:00:00.000Z') },
      { stat: CardStat.PRINTED, at: new Date('2024-01-02T00:00:00.000Z') },
    ];
    const dto = CardMapper.toDetailDTO(cardEntity(), makeJoins(), timeline);
    expect(dto.distributionTimeline[0]).toEqual({ stat: CardStat.IN_SET, at: '2024-01-01T00:00:00.000Z' });
    expect(dto.distributionTimeline[1]).toEqual({ stat: CardStat.PRINTED, at: '2024-01-02T00:00:00.000Z' });
  });

  it('distributionTimeline is empty when no entries are passed', () => {
    const dto = CardMapper.toDetailDTO(cardEntity(), makeJoins(), []);
    expect(dto.distributionTimeline).toEqual([]);
  });

  it('distributionTimeline length matches the number of entries passed', () => {
    const timeline: DistributionTimelineEntry[] = [
      { stat: CardStat.IN_SET, at: new Date() },
      { stat: CardStat.PRINTED, at: new Date() },
      { stat: CardStat.IN_LOT, at: new Date() },
      { stat: CardStat.AT_DISTRIBUTOR, at: new Date() },
    ];
    const dto = CardMapper.toDetailDTO(cardEntity(), makeJoins(), timeline);
    expect(dto.distributionTimeline).toHaveLength(4);
  });

  it('includes base CardDTO fields alongside distributionTimeline', () => {
    const dto = CardMapper.toDetailDTO(cardEntity(), makeJoins({ lot: { lotNumber: 'LOT-X' } }), []);
    expect(dto.lotNumber).toBe('LOT-X');
    expect(dto).toHaveProperty('distributionTimeline');
  });
});

// ────────────────────────────────────────────────────────────────────────────────
// toAvailableDTO
// ────────────────────────────────────────────────────────────────────────────────

describe('CardMapper.toAvailableDTO', () => {
  it('produces an AvailableCardDTO that parses AvailableCardResponseSchema', () => {
    const card = cardEntity();
    const dto = CardMapper.toAvailableDTO(card, PLAN);
    expect(() => AvailableCardResponseSchema.parse(dto)).not.toThrow();
  });

  it('includes id, key, and subscriptionLabel', () => {
    const card = cardEntity({ id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' });
    const dto = CardMapper.toAvailableDTO(card, PLAN);
    expect(dto.id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(dto.key).toBe(card.key);
    expect(dto.subscriptionLabel).toBe('Snapchat Plus — 01 Month');
  });

  it('resolves subscriptionLabel for different plans', () => {
    const plan = { subscriptionType: SubscriptionType.SNAPCHAT_PLUS, subscriptionDuration: SubscriptionDuration.THREE_MONTH };
    const dto = CardMapper.toAvailableDTO(cardEntity(), plan);
    expect(dto.subscriptionLabel).toBe('Snapchat Plus — 03 Months');
  });
});
