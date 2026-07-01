import { describe, it, expect } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { SubscriptionPlanMapper } from '../../../../src/modules/subscription-plan/subscription-plan.mapper';
import {
  SubscriptionPlanResponseSchema,
  CommissionDurationResponseSchema,
  CommissionMatrixResponseSchema,
  CommissionCellResponseSchema,
  SubscriptionType,
  SubscriptionDuration,
} from '@my-app/contract';

const plan = {
  id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
  subscriptionDuration: SubscriptionDuration.ONE_MONTH,
  isActive: true,
  commissions: [],
  sets: [],
  lots: [],
  cards: [],
};

const tier = {
  id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  key: 'tier_0_60',
  label: '0–60 min',
  nbMinuteMin: 0,
  nbMinuteMax: 60,
  createdAt: new Date(),
  commissions: [],
};

const catchAllTier = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  key: 'tier_catchall',
  label: '>60 min',
  nbMinuteMin: 61,
  nbMinuteMax: null,
  createdAt: new Date(),
  commissions: [],
};

const cell = {
  id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  subscriptionPlanId: plan.id,
  commissionDurationId: tier.id,
  commission: new Decimal('12.50'),
  subscriptionPlan: {} as never,
  commissionDuration: {} as never,
};

// ─── toPlanDTO ────────────────────────────────────────────────────────────────

describe('SubscriptionPlanMapper.toPlanDTO', () => {
  it('produces a DTO that parses SubscriptionPlanResponseSchema', () => {
    const dto = SubscriptionPlanMapper.toPlanDTO(plan);
    expect(() => SubscriptionPlanResponseSchema.parse(dto)).not.toThrow();
  });

  it('composes label from subscriptionType and subscriptionDuration', () => {
    const dto = SubscriptionPlanMapper.toPlanDTO(plan);
    expect(dto.label).toBe('Snapchat Plus — 01 Month');
  });

  it('maps all fields', () => {
    const dto = SubscriptionPlanMapper.toPlanDTO(plan);
    expect(dto.id).toBe(plan.id);
    expect(dto.isActive).toBe(true);
  });
});

// ─── toDurationDTO ────────────────────────────────────────────────────────────

describe('SubscriptionPlanMapper.toDurationDTO', () => {
  it('produces a DTO that parses CommissionDurationResponseSchema', () => {
    const dto = SubscriptionPlanMapper.toDurationDTO(tier);
    expect(() => CommissionDurationResponseSchema.parse(dto)).not.toThrow();
  });

  it('nbMinuteMax is null for catch-all tier', () => {
    const dto = SubscriptionPlanMapper.toDurationDTO(catchAllTier);
    expect(dto.nbMinuteMax).toBeNull();
  });
});

// ─── toMatrixDTO ──────────────────────────────────────────────────────────────

describe('SubscriptionPlanMapper.toMatrixDTO', () => {
  it('produces a DTO that parses CommissionMatrixResponseSchema', () => {
    const matrix = SubscriptionPlanMapper.toMatrixDTO([plan], [tier, catchAllTier], [cell]);
    expect(() => CommissionMatrixResponseSchema.parse(matrix)).not.toThrow();
  });

  it('cell with commission set returns 2dp number', () => {
    const matrix = SubscriptionPlanMapper.toMatrixDTO([plan], [tier], [cell]);
    expect(matrix.rows[0]!.cells[0]!.commission).toBe(12.5);
  });

  it('missing cell returns commission: null', () => {
    const matrix = SubscriptionPlanMapper.toMatrixDTO([plan], [catchAllTier], [cell]);
    expect(matrix.rows[0]!.cells[0]!.commission).toBeNull();
  });

  it('includes planLabel composed from plan', () => {
    const matrix = SubscriptionPlanMapper.toMatrixDTO([plan], [tier], []);
    expect(matrix.rows[0]!.planLabel).toBe('Snapchat Plus — 01 Month');
  });
});

// ─── toCellDTO ────────────────────────────────────────────────────────────────

describe('SubscriptionPlanMapper.toCellDTO', () => {
  it('produces a DTO that parses CommissionCellResponseSchema', () => {
    const dto = SubscriptionPlanMapper.toCellDTO(cell);
    expect(() => CommissionCellResponseSchema.parse(dto)).not.toThrow();
  });

  it('commission is Decimal→number 2dp', () => {
    const dto = SubscriptionPlanMapper.toCellDTO(cell);
    expect(dto.commission).toBe(12.5);
  });
});
