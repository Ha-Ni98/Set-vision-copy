import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';
import { ActivationMapper, type ActivationPlanJoin, type ActivationDistributorJoin, type ActivationInfoEntry, type ActivationStepEntry } from '@modules/activation/activation.mapper';
import {
  ActivationStat,
  AccountInformation,
  ClientActivationStatus,
  SubscriptionType,
  SubscriptionDuration,
  CardStat,
  KeyVerificationResponseSchema,
  ClientActivationStatusResponseSchema,
  PendingActivationResponseSchema,
  ActiveRequestResponseSchema,
  ActivatorHistoryItemResponseSchema,
  RecentActivationResponseSchema,
  AdminActivationResponseSchema,
  ActivationDetailResponseSchema,
} from '@my-app/contract';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PLAN = {
  subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
  subscriptionDuration: SubscriptionDuration.ONE_MONTH,
} as unknown as ActivationPlanJoin;

const DISTRIBUTOR: ActivationDistributorJoin = {
  storeName: 'Tech Store',
  wilaya: { frName: 'Alger' },
  commune: { frName: 'Bab El Oued' },
};

const CARD_KEY = 'A1B2C3D4E5F6';
const ACTIVATION_ID = '11111111-1111-1111-8111-111111111111';

const TAKEN_AT = new Date('2024-06-01T10:00:00.000Z');
const COMPLETED_AT = new Date('2024-06-01T10:05:30.000Z');

function makeInformation(overrides: Partial<ActivationInfoEntry>[] = []): ActivationInfoEntry[] {
  return [
    { accountInform: AccountInformation.USERNAME, value: 'john_doe', ...overrides[0] },
    { accountInform: AccountInformation.PASSWORD, value: 'secret123', ...overrides[1] },
  ];
}

function makeStep(overrides: Partial<ActivationStepEntry> = {}): ActivationStepEntry {
  return {
    activationStat: ActivationStat.PENDING,
    createdAt: new Date('2024-06-01T10:00:00.000Z'),
    wrongInformation: [],
    additionalInformation: [],
    ...overrides,
  };
}

// ─── toKeyVerificationDTO ─────────────────────────────────────────────────────

describe('ActivationMapper.toKeyVerificationDTO', () => {
  it('returns only status when no plan and no activation', () => {
    const result = ActivationMapper.toKeyVerificationDTO(ClientActivationStatus.INVALID, null, null);
    expect(result.status).toBe(ClientActivationStatus.INVALID);
    expect(result.subscriptionLabel).toBeUndefined();
    expect(result.activationId).toBeUndefined();
    expect(KeyVerificationResponseSchema.safeParse(result).success).toBe(true);
  });

  it('includes subscriptionLabel when plan is supplied', () => {
    const result = ActivationMapper.toKeyVerificationDTO(ClientActivationStatus.READY, PLAN, null);
    expect(result.subscriptionLabel).toBe('Snapchat Plus — 01 Month');
  });

  it('includes activationId when activation is supplied', () => {
    const result = ActivationMapper.toKeyVerificationDTO(
      ClientActivationStatus.SUBMITTED,
      PLAN,
      { id: ACTIVATION_ID, information: [], latestStep: null },
    );
    expect(result.activationId).toBe(ACTIVATION_ID);
  });

  it('masks PASSWORD in submittedFields', () => {
    const result = ActivationMapper.toKeyVerificationDTO(
      ClientActivationStatus.PROCESSING,
      PLAN,
      { id: ACTIVATION_ID, information: makeInformation(), latestStep: null },
    );
    const pwd = result.submittedFields?.find((f) => f.fieldLabel === 'Password');
    expect(pwd?.value).toBe('****');
  });

  it('does not mask USERNAME in submittedFields', () => {
    const result = ActivationMapper.toKeyVerificationDTO(
      ClientActivationStatus.PROCESSING,
      PLAN,
      { id: ACTIVATION_ID, information: makeInformation(), latestStep: null },
    );
    const user = result.submittedFields?.find((f) => f.fieldLabel === 'Username');
    expect(user?.value).toBe('john_doe');
  });

  it('populates accountUsername from USERNAME information entry', () => {
    const result = ActivationMapper.toKeyVerificationDTO(
      ClientActivationStatus.ACTIVATED,
      PLAN,
      { id: ACTIVATION_ID, information: makeInformation(), latestStep: null },
    );
    expect(result.accountUsername).toBe('john_doe');
  });

  it('populates flaggedFields from latestStep wrongInformation', () => {
    const result = ActivationMapper.toKeyVerificationDTO(
      ClientActivationStatus.NEEDS_CORRECTION,
      PLAN,
      {
        id: ACTIVATION_ID,
        information: makeInformation(),
        latestStep: {
          wrongInformation: [{ accountInform: AccountInformation.USERNAME }],
          additionalInformation: [],
        },
      },
    );
    expect(result.flaggedFields).toHaveLength(1);
    expect(result.flaggedFields![0]).toEqual({ field: AccountInformation.USERNAME, label: 'Username' });
  });

  it('populates requestedFields from latestStep additionalInformation', () => {
    const result = ActivationMapper.toKeyVerificationDTO(
      ClientActivationStatus.NEEDS_OTP,
      PLAN,
      {
        id: ACTIVATION_ID,
        information: makeInformation(),
        latestStep: {
          wrongInformation: [],
          additionalInformation: [{ accountInform: AccountInformation.OTP }],
        },
      },
    );
    expect(result.requestedFields).toHaveLength(1);
    expect(result.requestedFields![0]).toEqual({ field: AccountInformation.OTP, label: 'OTP' });
  });

  it('parses KeyVerificationResponseSchema', () => {
    const result = ActivationMapper.toKeyVerificationDTO(
      ClientActivationStatus.SUBMITTED,
      PLAN,
      { id: ACTIVATION_ID, information: makeInformation(), latestStep: null },
    );
    expect(KeyVerificationResponseSchema.safeParse(result).success).toBe(true);
  });
});

// ─── toClientStatusDTO ────────────────────────────────────────────────────────

describe('ActivationMapper.toClientStatusDTO', () => {
  const cases: [ActivationStat, ClientActivationStatus][] = [
    [ActivationStat.PENDING, ClientActivationStatus.SUBMITTED],
    [ActivationStat.PROCESSING, ClientActivationStatus.PROCESSING],
    [ActivationStat.WRONG_INFORMATION, ClientActivationStatus.NEEDS_CORRECTION],
    [ActivationStat.ADDITIONAL_INFORMATION, ClientActivationStatus.NEEDS_OTP],
    [ActivationStat.FREEZE, ClientActivationStatus.UNDER_REVIEW],
    [ActivationStat.ACTIVATED, ClientActivationStatus.ACTIVATED],
    [ActivationStat.ACTIVATED_BY_ADMIN, ClientActivationStatus.ACTIVATED],
  ];

  it.each(cases)('%s → %s', (stat, expected) => {
    const result = ActivationMapper.toClientStatusDTO({ id: ACTIVATION_ID, activationStat: stat });
    expect(result.status).toBe(expected);
    expect(result.activationId).toBe(ACTIVATION_ID);
  });

  it('unknown stat → FAILED', () => {
    const result = ActivationMapper.toClientStatusDTO({ id: ACTIVATION_ID, activationStat: 'CANCELLED_BY_ACTIVATOR' });
    expect(result.status).toBe(ClientActivationStatus.FAILED);
  });

  it('parses ClientActivationStatusResponseSchema', () => {
    const result = ActivationMapper.toClientStatusDTO({ id: ACTIVATION_ID, activationStat: ActivationStat.PENDING });
    expect(ClientActivationStatusResponseSchema.safeParse(result).success).toBe(true);
  });
});

// ─── toPendingDTO ─────────────────────────────────────────────────────────────

describe('ActivationMapper.toPendingDTO', () => {
  it('masks all but last 4 chars of key', () => {
    const result = ActivationMapper.toPendingDTO(
      { id: ACTIVATION_ID, requestedAt: new Date('2024-06-01T10:00:00.000Z') },
      PLAN,
      CARD_KEY,
    );
    expect(result.keyMasked).toBe('********E5F6');
  });

  it('composes subscriptionLabel', () => {
    const result = ActivationMapper.toPendingDTO(
      { id: ACTIVATION_ID, requestedAt: new Date('2024-06-01T10:00:00.000Z') },
      PLAN,
      CARD_KEY,
    );
    expect(result.subscriptionLabel).toBe('Snapchat Plus — 01 Month');
  });

  it('emits requestedAt as ISO string', () => {
    const requestedAt = new Date('2024-06-01T10:00:00.000Z');
    const result = ActivationMapper.toPendingDTO({ id: ACTIVATION_ID, requestedAt }, PLAN, CARD_KEY);
    expect(result.requestedAt).toBe('2024-06-01T10:00:00.000Z');
  });

  it('parses PendingActivationResponseSchema', () => {
    const result = ActivationMapper.toPendingDTO(
      { id: ACTIVATION_ID, requestedAt: new Date('2024-06-01T10:00:00.000Z') },
      PLAN,
      CARD_KEY,
    );
    expect(PendingActivationResponseSchema.safeParse(result).success).toBe(true);
  });
});

// ─── toActiveRequestDTO ───────────────────────────────────────────────────────

describe('ActivationMapper.toActiveRequestDTO', () => {
  const baseActivation = {
    id: ACTIVATION_ID,
    activationStat: ActivationStat.PROCESSING,
    takenAt: TAKEN_AT,
    clientFullName: 'Jane Doe',
    clientPhone: '+213555000001',
    freezReason: null,
  };

  it('exposes raw key without masking', () => {
    const result = ActivationMapper.toActiveRequestDTO(
      baseActivation, PLAN, CARD_KEY, DISTRIBUTOR, makeInformation(), null,
    );
    expect(result.key).toBe(CARD_KEY);
  });

  it('exposes PASSWORD value without masking', () => {
    const result = ActivationMapper.toActiveRequestDTO(
      baseActivation, PLAN, CARD_KEY, DISTRIBUTOR, makeInformation(), null,
    );
    const pwd = result.accountFields.find((f) => f.fieldLabel === 'Password');
    expect(pwd?.value).toBe('secret123');
  });

  it('maps distributor blocks correctly', () => {
    const result = ActivationMapper.toActiveRequestDTO(
      baseActivation, PLAN, CARD_KEY, DISTRIBUTOR, makeInformation(), null,
    );
    expect(result.distributor).toEqual({
      storeName: 'Tech Store',
      wilayaName: 'Alger',
      communeName: 'Bab El Oued',
    });
  });

  it('passes through otpValue', () => {
    const result = ActivationMapper.toActiveRequestDTO(
      baseActivation, PLAN, CARD_KEY, DISTRIBUTOR, makeInformation(), '123456',
    );
    expect(result.otpValue).toBe('123456');
  });

  it('null otpValue when not supplied', () => {
    const result = ActivationMapper.toActiveRequestDTO(
      baseActivation, PLAN, CARD_KEY, DISTRIBUTOR, makeInformation(), null,
    );
    expect(result.otpValue).toBeNull();
  });

  it('passes freezeReason from activation', () => {
    const result = ActivationMapper.toActiveRequestDTO(
      { ...baseActivation, freezReason: 'Needs review' }, PLAN, CARD_KEY, DISTRIBUTOR, makeInformation(), null,
    );
    expect(result.freezeReason).toBe('Needs review');
  });

  it('parses ActiveRequestResponseSchema', () => {
    const result = ActivationMapper.toActiveRequestDTO(
      baseActivation, PLAN, CARD_KEY, DISTRIBUTOR, makeInformation(), null,
    );
    expect(ActiveRequestResponseSchema.safeParse(result).success).toBe(true);
  });
});

// ─── toActivatorHistoryItemDTO ────────────────────────────────────────────────

describe('ActivationMapper.toActivatorHistoryItemDTO', () => {
  const baseActivation = {
    id: ACTIVATION_ID,
    activationStat: ActivationStat.ACTIVATED,
    requestedAt: new Date('2024-06-01T10:00:00.000Z'),
    takenAt: TAKEN_AT,
    completedAt: COMPLETED_AT,
    activationPrice: new Prisma.Decimal(150.50),
    clientFullName: 'Jane Doe',
    clientPhone: '+213555000001',
  };

  it('exposes raw key', () => {
    const result = ActivationMapper.toActivatorHistoryItemDTO(baseActivation, PLAN, CARD_KEY);
    expect(result.key).toBe(CARD_KEY);
  });

  it('computes durationSeconds between takenAt and completedAt', () => {
    const result = ActivationMapper.toActivatorHistoryItemDTO(baseActivation, PLAN, CARD_KEY);
    expect(result.durationSeconds).toBe(330); // 5m30s
  });

  it('durationSeconds is null when takenAt is null', () => {
    const result = ActivationMapper.toActivatorHistoryItemDTO(
      { ...baseActivation, takenAt: null }, PLAN, CARD_KEY,
    );
    expect(result.durationSeconds).toBeNull();
  });

  it('converts Decimal earning to 2dp number', () => {
    const result = ActivationMapper.toActivatorHistoryItemDTO(baseActivation, PLAN, CARD_KEY);
    expect(result.earning).toBe(150.50);
  });

  it('earning is null when activationPrice is null', () => {
    const result = ActivationMapper.toActivatorHistoryItemDTO(
      { ...baseActivation, activationPrice: null }, PLAN, CARD_KEY,
    );
    expect(result.earning).toBeNull();
  });

  it('parses ActivatorHistoryItemResponseSchema', () => {
    const result = ActivationMapper.toActivatorHistoryItemDTO(baseActivation, PLAN, CARD_KEY);
    expect(ActivatorHistoryItemResponseSchema.safeParse(result).success).toBe(true);
  });
});

// ─── toRecentDTO ──────────────────────────────────────────────────────────────

describe('ActivationMapper.toRecentDTO', () => {
  it('masks key — last 4 only', () => {
    const result = ActivationMapper.toRecentDTO(
      {
        id: ACTIVATION_ID,
        activationStat: ActivationStat.ACTIVATED,
        completedAt: COMPLETED_AT,
        activationEmail: null,
      },
      PLAN,
      CARD_KEY,
    );
    expect(result.keyMasked).toBe('********E5F6');
  });

  it('emits completedAt as ISO string', () => {
    const result = ActivationMapper.toRecentDTO(
      {
        id: ACTIVATION_ID,
        activationStat: ActivationStat.ACTIVATED,
        completedAt: COMPLETED_AT,
        activationEmail: null,
      },
      PLAN,
      CARD_KEY,
    );
    expect(result.completedAt).toBe('2024-06-01T10:05:30.000Z');
  });

  it('parses RecentActivationResponseSchema', () => {
    const result = ActivationMapper.toRecentDTO(
      {
        id: ACTIVATION_ID,
        activationStat: ActivationStat.ACTIVATED,
        completedAt: COMPLETED_AT,
        activationEmail: null,
      },
      PLAN,
      CARD_KEY,
    );
    expect(RecentActivationResponseSchema.safeParse(result).success).toBe(true);
  });

  it('passes activationEmail through (Stage-04-fix #2)', () => {
    const result = ActivationMapper.toRecentDTO(
      {
        id: ACTIVATION_ID,
        activationStat: ActivationStat.ACTIVATED,
        completedAt: COMPLETED_AT,
        activationEmail: 'client@example.com',
      },
      PLAN,
      CARD_KEY,
    );
    expect(result.activationEmail).toBe('client@example.com');
  });
});

// ─── toAdminActivationDTO ─────────────────────────────────────────────────────

describe('ActivationMapper.toAdminActivationDTO', () => {
  const baseActivation = {
    id: ACTIVATION_ID,
    activationStat: ActivationStat.ACTIVATED,
    clientFullName: 'Jane Doe',
    clientPhone: '+213555000001',
    requestedAt: new Date('2024-06-01T10:00:00.000Z'),
    takenAt: TAKEN_AT,
    completedAt: COMPLETED_AT,
    activationPrice: new Prisma.Decimal(200),
    freezReason: null,
  };

  it('exposes raw key', () => {
    const result = ActivationMapper.toAdminActivationDTO(baseActivation, PLAN, CARD_KEY, 'Ali Ben', 'Tech Store');
    expect(result.key).toBe(CARD_KEY);
  });

  it('computes durationSeconds', () => {
    const result = ActivationMapper.toAdminActivationDTO(baseActivation, PLAN, CARD_KEY, 'Ali Ben', 'Tech Store');
    expect(result.durationSeconds).toBe(330);
  });

  it('activatorFullName nullable', () => {
    const result = ActivationMapper.toAdminActivationDTO(baseActivation, PLAN, CARD_KEY, null, 'Tech Store');
    expect(result.activatorFullName).toBeNull();
  });

  it('converts activationPrice Decimal to number', () => {
    const result = ActivationMapper.toAdminActivationDTO(baseActivation, PLAN, CARD_KEY, null, 'Tech Store');
    expect(result.activationPrice).toBe(200);
  });

  it('activationPrice null when not set', () => {
    const result = ActivationMapper.toAdminActivationDTO(
      { ...baseActivation, activationPrice: null }, PLAN, CARD_KEY, null, 'Tech Store',
    );
    expect(result.activationPrice).toBeNull();
  });

  it('parses AdminActivationResponseSchema', () => {
    const result = ActivationMapper.toAdminActivationDTO(baseActivation, PLAN, CARD_KEY, 'Ali Ben', 'Tech Store');
    expect(AdminActivationResponseSchema.safeParse(result).success).toBe(true);
  });
});

// ─── toActivationDetailDTO ────────────────────────────────────────────────────

describe('ActivationMapper.toActivationDetailDTO', () => {
  const baseActivation = {
    id: ACTIVATION_ID,
    clientFullName: 'Jane Doe',
    clientPhone: '+213555000001',
    activationPrice: new Prisma.Decimal(150),
    freezReason: 'Suspicious activity',
  };

  const ACTIVATOR = { id: '22222222-2222-2222-8222-222222222222', fullName: 'Ali Ben' };

  const cardHistory = [
    { stat: CardStat.IN_SET, at: new Date('2024-01-01T00:00:00.000Z') },
    { stat: CardStat.AT_DISTRIBUTOR, at: new Date('2024-01-05T00:00:00.000Z') },
  ];

  it('masks PASSWORD in submittedInformation', () => {
    const info: ActivationInfoEntry[] = [
      { accountInform: AccountInformation.PASSWORD, value: 'secret' },
    ];
    const result = ActivationMapper.toActivationDetailDTO(
      baseActivation, DISTRIBUTOR, ACTIVATOR, info, [], cardHistory, null,
    );
    expect(result.submittedInformation[0]!.value).toBe('****');
  });

  it('masks OTP in submittedInformation', () => {
    const info: ActivationInfoEntry[] = [
      { accountInform: AccountInformation.OTP, value: '999888' },
    ];
    const result = ActivationMapper.toActivationDetailDTO(
      baseActivation, DISTRIBUTOR, ACTIVATOR, info, [], cardHistory, null,
    );
    expect(result.submittedInformation[0]!.value).toBe('****');
  });

  it('does not mask USERNAME in submittedInformation', () => {
    const info: ActivationInfoEntry[] = [
      { accountInform: AccountInformation.USERNAME, value: 'john_doe' },
    ];
    const result = ActivationMapper.toActivationDetailDTO(
      baseActivation, DISTRIBUTOR, ACTIVATOR, info, [], cardHistory, null,
    );
    expect(result.submittedInformation[0]!.value).toBe('john_doe');
  });

  it('FREEZE step carries freezeReason from activation', () => {
    const steps: ActivationStepEntry[] = [
      makeStep({ activationStat: ActivationStat.FREEZE }),
    ];
    const result = ActivationMapper.toActivationDetailDTO(
      baseActivation, DISTRIBUTOR, ACTIVATOR, [], steps, cardHistory, null,
    );
    expect(result.timeline[0]!.freezeReason).toBe('Suspicious activity');
  });

  it('non-FREEZE step has null freezeReason', () => {
    const steps: ActivationStepEntry[] = [
      makeStep({ activationStat: ActivationStat.PROCESSING }),
    ];
    const result = ActivationMapper.toActivationDetailDTO(
      baseActivation, DISTRIBUTOR, ACTIVATOR, [], steps, cardHistory, null,
    );
    expect(result.timeline[0]!.freezeReason).toBeNull();
  });

  it('cardHistory emits ISO dates', () => {
    const result = ActivationMapper.toActivationDetailDTO(
      baseActivation, DISTRIBUTOR, ACTIVATOR, [], [], cardHistory, null,
    );
    expect(result.cardHistory[0]).toEqual({ stat: CardStat.IN_SET, at: '2024-01-01T00:00:00.000Z' });
  });

  it('activator null when not assigned', () => {
    const result = ActivationMapper.toActivationDetailDTO(
      baseActivation, DISTRIBUTOR, null, [], [], cardHistory, null,
    );
    expect(result.activator).toBeNull();
  });

  it('financial carries commissionTierLabel', () => {
    const result = ActivationMapper.toActivationDetailDTO(
      baseActivation, DISTRIBUTOR, ACTIVATOR, [], [], cardHistory, '5–10 min',
    );
    expect(result.financial.commissionTierLabel).toBe('5–10 min');
  });

  it('parses ActivationDetailResponseSchema', () => {
    const result = ActivationMapper.toActivationDetailDTO(
      baseActivation, DISTRIBUTOR, ACTIVATOR, [], [], cardHistory, null,
    );
    expect(ActivationDetailResponseSchema.safeParse(result).success).toBe(true);
  });
});
