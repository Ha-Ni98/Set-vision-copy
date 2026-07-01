import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivationService } from '@modules/activation/activation.service';
import {
  ActivationStat,
  AccountInformation,
  ClientActivationStatus,
  SubscriptionType,
  SubscriptionDuration,
} from '@my-app/contract';
import { ConflictError, NotFoundError } from '@common/errors';
import { faker } from '@faker-js/faker';
import { Prisma } from '@prisma/client';
import { eventBus } from '@common/events/event-bus';

// ─── Mocks ────────────────────────────────────────────────────────────────────

function buildPrisma() {
  const p = {
    activation: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    activationStep: { create: vi.fn() },
    wrongInformation: { createMany: vi.fn(), updateMany: vi.fn() },
    additionalInformation: { createMany: vi.fn(), updateMany: vi.fn() },
    card: { findFirst: vi.fn(), update: vi.fn() },
    activator: { findUnique: vi.fn(), update: vi.fn() },
    distributor: { update: vi.fn() },
    log: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  p.$transaction.mockImplementation(async (fn: (tx: typeof p) => Promise<unknown>) => fn(p));
  return p;
}

const PLAN = {
  subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
  subscriptionDuration: SubscriptionDuration.ONE_MONTH,
};

const COMMISSIONS = [
  {
    commission: new Prisma.Decimal(150),
    commissionDuration: { label: '0–10 min', nbMinuteMin: 0, nbMinuteMax: 10 },
  },
  {
    commission: new Prisma.Decimal(100),
    commissionDuration: { label: 'catch-all', nbMinuteMin: 11, nbMinuteMax: null },
  },
];

const DISTRIBUTOR = { id: faker.string.uuid(), storeName: 'Tech Store', wilayaId: faker.string.uuid(), communeId: faker.string.uuid() };
const WILAYA = { frName: 'Alger' };
const COMMUNE = { frName: 'Bab El Oued' };

function makeActivationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '11111111-1111-1111-8111-111111111111',
    cardId: faker.string.uuid(),
    activatorId: '22222222-2222-2222-8222-222222222222' as string | null,
    activationStat: ActivationStat.FREEZE as string,
    clientFullName: 'Jane Doe',
    clientPhone: '+213555000001',
    clientEmail: null as string | null,
    activationEmail: null as string | null,
    activationPrice: null as Prisma.Decimal | null,
    freezReason: 'Suspicious account' as string | null,
    requestedAt: new Date('2024-06-01T09:00:00.000Z'),
    takenAt: new Date('2024-06-01T09:01:00.000Z') as Date | null,
    completedAt: null as Date | null,
    information: [] as { accountInform: string; value: string | null }[],
    steps: [] as {
      id: string; activationStat: string; createdAt: Date;
      wrongInformation: { accountInform: string; value: string | null }[];
      additionalInformation: { accountInform: string; value: string | null }[];
    }[],
    card: {
      id: faker.string.uuid(),
      key: 'A1B2C3D4E5F6',
      subscriptionPlan: { ...PLAN, commissions: COMMISSIONS },
      distributorId: DISTRIBUTOR.id,
      distributor: { ...DISTRIBUTOR, wilaya: WILAYA, commune: COMMUNE },
    },
    activator: {
      id: '22222222-2222-2222-8222-222222222222',
      userId: faker.string.uuid(),
      fullName: 'Ali Ben',
      phone: '+213555000000',
      totalEarning: new Prisma.Decimal(0),
      credits: new Prisma.Decimal(0),
      nbOfActivation: 5,
      nbOfSuccessfulActivation: 4,
    },
    ...overrides,
  };
}

let prisma: ReturnType<typeof buildPrisma>;
let service: ActivationService;

beforeEach(() => {
  prisma = buildPrisma();
  service = new ActivationService(prisma as never);
  vi.spyOn(eventBus, 'emit').mockImplementation(() => {});
});

// ─── getAll ───────────────────────────────────────────────────────────────────

describe('ActivationService.getAll', () => {
  it('returns empty paginated result when none found', async () => {
    prisma.activation.findMany.mockResolvedValue([]);
    prisma.activation.count.mockResolvedValue(0);

    const result = await service.getAll({});
    expect(result.items).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it('maps to AdminActivationDTO list', async () => {
    prisma.activation.findMany.mockResolvedValue([
      {
        id: '11111111-1111-1111-8111-111111111111',
        activationStat: ActivationStat.FREEZE,
        clientFullName: 'Jane Doe',
        clientPhone: '+213555000001',
        requestedAt: new Date('2024-06-01T09:00:00.000Z'),
        takenAt: new Date('2024-06-01T09:01:00.000Z'),
        completedAt: null,
        activationPrice: null,
        freezReason: 'test',
        card: { key: 'A1B2C3D4E5F6', subscriptionPlan: PLAN, distributor: { storeName: 'Tech Store' } },
        activator: { fullName: 'Ali Ben' },
      },
    ]);
    prisma.activation.count.mockResolvedValue(1);

    const result = await service.getAll({});
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.key).toBe('A1B2C3D4E5F6');
    expect(result.items[0]!.activatorFullName).toBe('Ali Ben');
    expect(result.items[0]!.distributorStoreName).toBe('Tech Store');
    expect(result.meta.total).toBe(1);
  });

  it('passes state filter to Prisma query', async () => {
    prisma.activation.findMany.mockResolvedValue([]);
    prisma.activation.count.mockResolvedValue(0);

    await service.getAll({ state: ActivationStat.FREEZE });

    expect(prisma.activation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ activationStat: ActivationStat.FREEZE }),
      }),
    );
  });

  it('passes key filter on card relation', async () => {
    prisma.activation.findMany.mockResolvedValue([]);
    prisma.activation.count.mockResolvedValue(0);

    await service.getAll({ key: 'E5F6' });

    expect(prisma.activation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          card: expect.objectContaining({ key: { contains: 'E5F6', mode: 'insensitive' } }),
        }),
      }),
    );
  });
});

// ─── getById ──────────────────────────────────────────────────────────────────

describe('ActivationService.getById', () => {
  const id = '11111111-1111-1111-8111-111111111111';

  function makeFullActivation(overrides: Record<string, unknown> = {}) {
    return {
      id,
      activationStat: ActivationStat.FREEZE as string,
      clientFullName: 'Jane Doe',
      clientPhone: '+213555000001',
      activationPrice: null as Prisma.Decimal | null,
      freezReason: 'Suspicious' as string | null,
      requestedAt: new Date('2024-06-01T09:00:00.000Z'),
      takenAt: new Date('2024-06-01T09:01:00.000Z') as Date | null,
      completedAt: null as Date | null,
      card: {
        id: faker.string.uuid(),
        key: 'A1B2C3D4E5F6',
        set: { createdAt: new Date('2024-01-01'), printedAt: new Date('2024-01-02') },
        lot: {
          createdAt: new Date('2024-02-01'),
          orderLots: [{ order: { completedAt: new Date('2024-03-01') } }],
        },
        subscriptionPlan: { ...PLAN, commissions: COMMISSIONS },
        distributor: { ...DISTRIBUTOR, wilaya: WILAYA, commune: COMMUNE },
      },
      activator: { id: '22222222-2222-2222-8222-222222222222', fullName: 'Ali Ben' },
      information: [
        { accountInform: AccountInformation.USERNAME, value: 'jane_doe' },
        { accountInform: AccountInformation.PASSWORD, value: 'secret123' },
      ],
      steps: [] as {
        id: string; activationStat: string; createdAt: Date;
        wrongInformation: { accountInform: string; value: string | null }[];
        additionalInformation: { accountInform: string; value: string | null }[];
      }[],
      ...overrides,
    };
  }

  it('throws NotFoundError when activation not found', async () => {
    prisma.activation.findUnique.mockResolvedValue(null);
    await expect(service.getById(id)).rejects.toThrow(NotFoundError);
  });

  it('returns ActivationDetailDTO with masked PASSWORD', async () => {
    prisma.activation.findUnique.mockResolvedValue(makeFullActivation());

    const result = await service.getById(id);

    expect(result.id).toBe(id);
    expect(result.activator).toEqual({ id: '22222222-2222-2222-8222-222222222222', fullName: 'Ali Ben' });
    const pwdField = result.submittedInformation.find((f) => f.fieldLabel === 'Password');
    expect(pwdField?.value).toBe('****');
    const userField = result.submittedInformation.find((f) => f.fieldLabel === 'Username');
    expect(userField?.value).toBe('jane_doe');
  });

  it('builds cardHistory from card timestamps', async () => {
    prisma.activation.findUnique.mockResolvedValue(makeFullActivation());

    const result = await service.getById(id);

    expect(result.cardHistory).toHaveLength(5); // IN_SET, PRINTED, IN_LOT, AT_DISTRIBUTOR, ACTIVATION_PROGRESS
    expect(result.cardHistory[0]!.stat).toBe('IN_SET');
    expect(result.cardHistory[1]!.stat).toBe('PRINTED');
    expect(result.cardHistory[2]!.stat).toBe('IN_LOT');
    expect(result.cardHistory[3]!.stat).toBe('AT_DISTRIBUTOR');
    expect(result.cardHistory[4]!.stat).toBe('ACTIVATION_PROGRESS');
  });

  it('appends ACTIVATED to cardHistory for completed ACTIVATED activation', async () => {
    prisma.activation.findUnique.mockResolvedValue(makeFullActivation({
      activationStat: ActivationStat.ACTIVATED,
      completedAt: new Date('2024-06-01T09:10:00.000Z'),
      activationPrice: new Prisma.Decimal(150),
    }));

    const result = await service.getById(id);

    const lastEntry = result.cardHistory[result.cardHistory.length - 1];
    expect(lastEntry!.stat).toBe('ACTIVATED');
  });

  it('appends ACTIVATION_FAILED for CANCELLED_BY_ADMIN', async () => {
    prisma.activation.findUnique.mockResolvedValue(makeFullActivation({
      activationStat: ActivationStat.CANCELLED_BY_ADMIN,
      completedAt: new Date('2024-06-01T09:10:00.000Z'),
    }));

    const result = await service.getById(id);

    const lastEntry = result.cardHistory[result.cardHistory.length - 1];
    expect(lastEntry!.stat).toBe('ACTIVATION_FAILED');
  });

  it('computes commissionTierLabel when takenAt + completedAt present', async () => {
    prisma.activation.findUnique.mockResolvedValue(makeFullActivation({
      activationStat: ActivationStat.ACTIVATED,
      takenAt: new Date(Date.now() - 5 * 60 * 1000),
      completedAt: new Date(),
      activationPrice: new Prisma.Decimal(150),
    }));

    const result = await service.getById(id);

    expect(result.financial.commissionTierLabel).toBe('0–10 min');
  });

  it('returns null commissionTierLabel when not completed', async () => {
    prisma.activation.findUnique.mockResolvedValue(makeFullActivation({ completedAt: null }));

    const result = await service.getById(id);

    expect(result.financial.commissionTierLabel).toBeNull();
  });

  it('builds timeline from steps with masking', async () => {
    const stepId = faker.string.uuid();
    prisma.activation.findUnique.mockResolvedValue(makeFullActivation({
      steps: [
        {
          id: stepId,
          activationStat: ActivationStat.WRONG_INFORMATION,
          createdAt: new Date('2024-06-01T09:05:00.000Z'),
          wrongInformation: [{ accountInform: AccountInformation.PASSWORD, value: 'old_secret' }],
          additionalInformation: [],
        },
      ],
    }));

    const result = await service.getById(id);

    expect(result.timeline).toHaveLength(1);
    expect(result.timeline[0]!.stat).toBe(ActivationStat.WRONG_INFORMATION);
    expect(result.timeline[0]!.wrongFields[0]!.value).toBe('****'); // PASSWORD masked
  });
});

// ─── activateByAdmin ──────────────────────────────────────────────────────────

describe('ActivationService.activateByAdmin', () => {
  const id = '11111111-1111-1111-8111-111111111111';

  it('throws NotFoundError when activation not found', async () => {
    prisma.activation.findUnique.mockResolvedValue(null);
    await expect(service.activateByAdmin(id)).rejects.toThrow(NotFoundError);
  });

  it('throws ConflictError when not FREEZE', async () => {
    prisma.activation.findUnique.mockResolvedValue(
      makeActivationRow({ activationStat: ActivationStat.PROCESSING }),
    );
    await expect(service.activateByAdmin(id)).rejects.toThrow(ConflictError);
  });

  it('sets ACTIVATED_BY_ADMIN + card ACTIVATED + credits activator', async () => {
    const activation = makeActivationRow({
      takenAt: new Date(Date.now() - 5 * 60 * 1000),
    });
    prisma.activation.findUnique.mockResolvedValue(activation);
    prisma.activation.update.mockResolvedValue({});
    prisma.card.update.mockResolvedValue({});
    prisma.activator.update.mockResolvedValue({});
    prisma.distributor.update.mockResolvedValue({});
    prisma.activationStep.create.mockResolvedValue({});

    await service.activateByAdmin(id);

    expect(prisma.activation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ activationStat: 'ACTIVATED_BY_ADMIN' }),
      }),
    );
    expect(prisma.card.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { cardStat: 'ACTIVATED' } }),
    );
    expect(prisma.activator.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nbOfActivation: { increment: 1 },
          nbOfSuccessfulActivation: { increment: 1 },
        }),
      }),
    );
    expect(prisma.distributor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { nbOfActivation: { increment: 1 }, nbOfActiveCards: { decrement: 1 } },
      }),
    );
  });

  it('emits activation:resolved(ACTIVATED_BY_ADMIN) + status-changed(ACTIVATED)', async () => {
    const activation = makeActivationRow();
    prisma.activation.findUnique.mockResolvedValue(activation);
    prisma.activation.update.mockResolvedValue({});
    prisma.card.update.mockResolvedValue({});
    prisma.activator.update.mockResolvedValue({});
    prisma.distributor.update.mockResolvedValue({});
    prisma.activationStep.create.mockResolvedValue({});

    await service.activateByAdmin(id);

    expect(eventBus.emit).toHaveBeenCalledWith('activation:resolved', expect.objectContaining({
      activationId: id,
      activatorId: '22222222-2222-2222-8222-222222222222',
      outcome: ActivationStat.ACTIVATED_BY_ADMIN,
    }));
    expect(eventBus.emit).toHaveBeenCalledWith('activation:status-changed', expect.objectContaining({
      activationId: id,
      status: ClientActivationStatus.ACTIVATED,
    }));
  });

  it('returns AdminActivationDTO with updated stat', async () => {
    const activation = makeActivationRow();
    prisma.activation.findUnique.mockResolvedValue(activation);
    prisma.activation.update.mockResolvedValue({});
    prisma.card.update.mockResolvedValue({});
    prisma.activator.update.mockResolvedValue({});
    prisma.distributor.update.mockResolvedValue({});
    prisma.activationStep.create.mockResolvedValue({});

    const result = await service.activateByAdmin(id);

    expect(result.state).toBe(ActivationStat.ACTIVATED_BY_ADMIN);
    expect(result.key).toBe('A1B2C3D4E5F6');
    expect(result.activatorFullName).toBe('Ali Ben');
  });
});

// ─── cancelByAdmin ────────────────────────────────────────────────────────────

describe('ActivationService.cancelByAdmin', () => {
  const id = '11111111-1111-1111-8111-111111111111';

  it('throws ConflictError when not FREEZE', async () => {
    prisma.activation.findUnique.mockResolvedValue(
      makeActivationRow({ activationStat: ActivationStat.PROCESSING }),
    );
    await expect(service.cancelByAdmin(id)).rejects.toThrow(ConflictError);
  });

  it('sets CANCELLED_BY_ADMIN + card ACTIVATION_FAILED', async () => {
    prisma.activation.findUnique.mockResolvedValue(makeActivationRow());
    prisma.activation.update.mockResolvedValue({});
    prisma.card.update.mockResolvedValue({});
    prisma.activator.update.mockResolvedValue({});
    prisma.activationStep.create.mockResolvedValue({});

    await service.cancelByAdmin(id);

    expect(prisma.activation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ activationStat: 'CANCELLED_BY_ADMIN' }),
      }),
    );
    expect(prisma.card.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { cardStat: 'ACTIVATION_FAILED' } }),
    );
  });

  it('only increments nbOfActivation — no success/earning', async () => {
    prisma.activation.findUnique.mockResolvedValue(makeActivationRow());
    prisma.activation.update.mockResolvedValue({});
    prisma.card.update.mockResolvedValue({});
    prisma.activator.update.mockResolvedValue({});
    prisma.activationStep.create.mockResolvedValue({});

    await service.cancelByAdmin(id);

    const updateCall = prisma.activator.update.mock.calls[0]?.[0];
    expect(updateCall?.data?.nbOfActivation).toEqual({ increment: 1 });
    expect(updateCall?.data?.nbOfSuccessfulActivation).toBeUndefined();
    expect(updateCall?.data?.totalEarning).toBeUndefined();
    expect(updateCall?.data?.credits).toBeUndefined();
  });

  it('emits activation:resolved(CANCELLED_BY_ADMIN) + status-changed(FAILED)', async () => {
    prisma.activation.findUnique.mockResolvedValue(makeActivationRow());
    prisma.activation.update.mockResolvedValue({});
    prisma.card.update.mockResolvedValue({});
    prisma.activator.update.mockResolvedValue({});
    prisma.activationStep.create.mockResolvedValue({});

    await service.cancelByAdmin(id);

    expect(eventBus.emit).toHaveBeenCalledWith('activation:resolved', expect.objectContaining({
      outcome: ActivationStat.CANCELLED_BY_ADMIN,
    }));
    expect(eventBus.emit).toHaveBeenCalledWith('activation:status-changed', expect.objectContaining({
      status: ClientActivationStatus.FAILED,
    }));
  });

  it('writes no Log (only activateByAdmin logs nothing; setPrice logs)', async () => {
    prisma.activation.findUnique.mockResolvedValue(makeActivationRow());
    prisma.activation.update.mockResolvedValue({});
    prisma.card.update.mockResolvedValue({});
    prisma.activator.update.mockResolvedValue({});
    prisma.activationStep.create.mockResolvedValue({});

    await service.cancelByAdmin(id);

    expect(prisma.log.create).not.toHaveBeenCalled();
  });
});

// ─── setPrice ─────────────────────────────────────────────────────────────────

describe('ActivationService.setPrice', () => {
  const id = '11111111-1111-1111-8111-111111111111';
  const actorId = faker.string.uuid();

  function makeCompletedActivation(overrides: Record<string, unknown> = {}) {
    return {
      ...makeActivationRow({
        activationStat: ActivationStat.ACTIVATED,
        completedAt: new Date('2024-06-01T09:10:00.000Z'),
        activationPrice: new Prisma.Decimal(150),
      }),
      card: {
        id: faker.string.uuid(),
        key: 'A1B2C3D4E5F6',
        subscriptionPlan: PLAN,
        distributor: { storeName: 'Tech Store' },
      },
      activator: { id: '22222222-2222-2222-8222-222222222222', fullName: 'Ali Ben' },
      ...overrides,
    };
  }

  it('throws NotFoundError when not found', async () => {
    prisma.activation.findUnique.mockResolvedValue(null);
    await expect(service.setPrice(id, { amount: 200 }, actorId)).rejects.toThrow(NotFoundError);
  });

  it('throws ConflictError when not completed', async () => {
    prisma.activation.findUnique.mockResolvedValue(
      makeCompletedActivation({ activationStat: ActivationStat.FREEZE }),
    );
    await expect(service.setPrice(id, { amount: 200 }, actorId)).rejects.toThrow(ConflictError);
  });

  it('updates activationPrice and adjusts activator delta (positive)', async () => {
    // old price: 150, new price: 200 → delta +50
    prisma.activation.findUnique.mockResolvedValue(makeCompletedActivation());
    prisma.activation.update.mockResolvedValue({});
    prisma.activator.update.mockResolvedValue({});
    prisma.log.create.mockResolvedValue({});

    await service.setPrice(id, { amount: 200 }, actorId);

    expect(prisma.activation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ activationPrice: new Prisma.Decimal(200) }),
      }),
    );
    const activatorUpdate = prisma.activator.update.mock.calls[0]?.[0];
    expect(activatorUpdate?.data?.totalEarning).toEqual({ increment: 50 });
    expect(activatorUpdate?.data?.credits).toEqual({ increment: 50 });
  });

  it('adjusts delta negative when new price is lower', async () => {
    // old price: 150, new price: 100 → delta -50
    prisma.activation.findUnique.mockResolvedValue(makeCompletedActivation());
    prisma.activation.update.mockResolvedValue({});
    prisma.activator.update.mockResolvedValue({});
    prisma.log.create.mockResolvedValue({});

    await service.setPrice(id, { amount: 100 }, actorId);

    const activatorUpdate = prisma.activator.update.mock.calls[0]?.[0];
    expect(activatorUpdate?.data?.totalEarning).toEqual({ increment: -50 });
  });

  it('writes CHANGE_ACTIVATION_COMMISSION log', async () => {
    prisma.activation.findUnique.mockResolvedValue(makeCompletedActivation());
    prisma.activation.update.mockResolvedValue({});
    prisma.activator.update.mockResolvedValue({});
    prisma.log.create.mockResolvedValue({});

    await service.setPrice(id, { amount: 200 }, actorId);

    expect(prisma.log.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actionType: 'CHANGE_ACTIVATION_COMMISSION',
          userId: actorId,
        }),
      }),
    );
  });

  it('does NOT emit any event', async () => {
    prisma.activation.findUnique.mockResolvedValue(makeCompletedActivation());
    prisma.activation.update.mockResolvedValue({});
    prisma.activator.update.mockResolvedValue({});
    prisma.log.create.mockResolvedValue({});

    await service.setPrice(id, { amount: 200 }, actorId);

    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it('returns AdminActivationDTO with updated price', async () => {
    prisma.activation.findUnique.mockResolvedValue(makeCompletedActivation());
    prisma.activation.update.mockResolvedValue({});
    prisma.activator.update.mockResolvedValue({});
    prisma.log.create.mockResolvedValue({});

    const result = await service.setPrice(id, { amount: 200 }, actorId);

    expect(result.activationPrice).toBe(200);
    expect(result.key).toBe('A1B2C3D4E5F6');
  });
});
