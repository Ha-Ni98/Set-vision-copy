import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivationService } from '@modules/activation/activation.service';
import {
  ActivationStat,
  AccountInformation,
  ClientActivationStatus,
  SubscriptionType,
  SubscriptionDuration,
} from '@my-app/contract';
import { ConflictError, ForbiddenError, NotFoundError } from '@common/errors';
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
    activationStep: {
      create: vi.fn(),
    },
    wrongInformation: {
      createMany: vi.fn(),
      updateMany: vi.fn(),
    },
    additionalInformation: {
      createMany: vi.fn(),
      updateMany: vi.fn(),
    },
    card: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    activator: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    distributor: {
      update: vi.fn(),
    },
    log: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  p.$transaction.mockImplementation(async (fn: (tx: typeof p) => Promise<unknown>) => fn(p));
  return p;
}

const PLAN = {
  subscriptionType: SubscriptionType.SNAPCHAT_PLUS,
  subscriptionDuration: SubscriptionDuration.ONE_MONTH,
};

const DISTRIBUTOR_ROW = {
  id: faker.string.uuid(),
  storeName: 'Tech Store',
  wilaya: { frName: 'Alger' },
  commune: { frName: 'Bab El Oued' },
};

function makeActivation(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    cardId: faker.string.uuid(),
    activatorId: null as string | null,
    activationStat: ActivationStat.PENDING as string,
    clientFullName: 'Jane Doe',
    clientPhone: '+213555000001',
    clientEmail: null as string | null,
    activationEmail: null as string | null,
    activationPrice: null,
    freezReason: null as string | null,
    requestedAt: new Date('2024-06-01T10:00:00.000Z'),
    takenAt: null as Date | null,
    completedAt: null as Date | null,
    information: [] as { accountInform: string; value: string | null }[],
    steps: [] as {
      id: string;
      activationStat: string;
      createdAt: Date;
      wrongInformation: { accountInform: string; value: string | null }[];
      additionalInformation: { accountInform: string; value: string | null }[];
    }[],
    card: {
      id: faker.string.uuid(),
      key: 'A1B2C3D4E5F6',
      subscriptionPlan: PLAN,
      distributorId: DISTRIBUTOR_ROW.id,
      distributor: DISTRIBUTOR_ROW,
    },
    ...overrides,
  };
}

function makeActivator(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    fullName: 'Ali Ben',
    phone: '+213555000000',
    totalEarning: new Prisma.Decimal(0),
    credits: new Prisma.Decimal(0),
    nbOfActivation: 0,
    nbOfSuccessfulActivation: 0,
    ...overrides,
  };
}

function makeCard(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    key: 'A1B2C3D4E5F6',
    isActive: true,
    cardStat: 'AT_DISTRIBUTOR',
    deletedAt: null,
    subscriptionPlan: PLAN,
    activations: [] as unknown[],
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

// ─── verify ───────────────────────────────────────────────────────────────────

describe('ActivationService.verify', () => {
  it('returns INVALID when card not found', async () => {
    prisma.card.findFirst.mockResolvedValue(null);
    const result = await service.verify({ key: 'MISSING' });
    expect(result.status).toBe(ClientActivationStatus.INVALID);
  });

  it('returns INVALID when card isActive=false', async () => {
    prisma.card.findFirst.mockResolvedValue(makeCard({ isActive: false, activations: [] }));
    const result = await service.verify({ key: 'A1B2C3D4E5F6' });
    expect(result.status).toBe(ClientActivationStatus.INVALID);
  });

  it('returns READY when card has no live activation', async () => {
    prisma.card.findFirst.mockResolvedValue(makeCard({ activations: [] }));
    const result = await service.verify({ key: 'A1B2C3D4E5F6' });
    expect(result.status).toBe(ClientActivationStatus.READY);
    expect(result.subscriptionLabel).toBe('Snapchat Plus — 01 Month');
  });

  it('maps PENDING activation → SUBMITTED', async () => {
    const activation = makeActivation({ activationStat: ActivationStat.PENDING, steps: [] });
    prisma.card.findFirst.mockResolvedValue(makeCard({ activations: [activation] }));
    const result = await service.verify({ key: 'A1B2C3D4E5F6' });
    expect(result.status).toBe(ClientActivationStatus.SUBMITTED);
  });

  it('maps WRONG_INFORMATION → NEEDS_CORRECTION with flaggedFields', async () => {
    const activation = makeActivation({
      activationStat: ActivationStat.WRONG_INFORMATION,
      steps: [{
        id: faker.string.uuid(),
        activationStat: ActivationStat.WRONG_INFORMATION,
        createdAt: new Date(),
        wrongInformation: [{ accountInform: AccountInformation.USERNAME, value: null }],
        additionalInformation: [],
      }],
    });
    prisma.card.findFirst.mockResolvedValue(makeCard({ activations: [activation] }));
    const result = await service.verify({ key: 'A1B2C3D4E5F6' });
    expect(result.status).toBe(ClientActivationStatus.NEEDS_CORRECTION);
    expect(result.flaggedFields).toHaveLength(1);
    expect(result.flaggedFields![0]!.label).toBe('Username');
  });

  it('maps ACTIVATED → ACTIVATED with accountUsername', async () => {
    const activation = makeActivation({
      activationStat: ActivationStat.ACTIVATED,
      information: [{ accountInform: AccountInformation.USERNAME, value: 'john_doe' }],
      steps: [],
    });
    prisma.card.findFirst.mockResolvedValue(makeCard({ activations: [activation] }));
    const result = await service.verify({ key: 'A1B2C3D4E5F6' });
    expect(result.status).toBe(ClientActivationStatus.ACTIVATED);
    expect(result.accountUsername).toBe('john_doe');
  });

  it('returns clientFullName and clientPhone for prefill', async () => {
    const activation = makeActivation({
      activationStat: ActivationStat.PENDING,
      clientFullName: 'Jane Doe',
      clientPhone: '+213555000001',
      steps: [],
    });
    prisma.card.findFirst.mockResolvedValue(makeCard({ activations: [activation] }));
    const result = await service.verify({ key: 'A1B2C3D4E5F6' });
    expect(result.clientFullName).toBe('Jane Doe');
    expect(result.clientPhone).toBe('+213555000001');
  });

  // Stage-04-fix #4A: a value corrected in an EARLIER step (not the most recent one) must
  // still surface — the old code read only the base `information` (pre-correction) with no
  // merge at all, so a client re-checking the key after a correction cycle saw the stale
  // original value instead of what they'd already fixed.
  it('surfaces a value corrected in an earlier step, not just the latest step', async () => {
    const activation = makeActivation({
      activationStat: ActivationStat.PROCESSING,
      information: [{ accountInform: AccountInformation.USERNAME, value: 'wrongname' }],
      steps: [
        // Newest first, matching the real query's orderBy: createdAt desc.
        {
          id: faker.string.uuid(),
          activationStat: ActivationStat.PROCESSING,
          createdAt: new Date('2024-06-01T12:00:00.000Z'),
          wrongInformation: [],
          additionalInformation: [],
        },
        {
          id: faker.string.uuid(),
          activationStat: ActivationStat.WRONG_INFORMATION,
          createdAt: new Date('2024-06-01T11:00:00.000Z'),
          wrongInformation: [{ accountInform: AccountInformation.USERNAME, value: 'corrected_name' }],
          additionalInformation: [],
        },
      ],
    });
    prisma.card.findFirst.mockResolvedValue(makeCard({ activations: [activation] }));

    const result = await service.verify({ key: 'A1B2C3D4E5F6' });

    const username = result.submittedFields?.find((f) => f.field === AccountInformation.USERNAME);
    expect(username?.value).toBe('corrected_name');
  });
});

// ─── submit ───────────────────────────────────────────────────────────────────

describe('ActivationService.submit', () => {
  const cmd = {
    key: 'A1B2C3D4E5F6',
    fullName: 'Jane Doe',
    phone: '+213555000001',
    accountFields: [{ field: AccountInformation.USERNAME, value: 'jane_doe' }],
  };

  it('throws ConflictError when card not available', async () => {
    prisma.card.findFirst.mockResolvedValue(null);
    await expect(service.submit(cmd)).rejects.toThrow(ConflictError);
  });

  it('throws ConflictError when card is disabled (isActive=false)', async () => {
    prisma.card.findFirst.mockResolvedValue(makeCard({ isActive: false }));
    await expect(service.submit(cmd)).rejects.toThrow(ConflictError);
  });

  it('throws ConflictError when card has a live activation', async () => {
    prisma.card.findFirst.mockResolvedValue(makeCard({
      activations: [makeActivation()],
    }));
    await expect(service.submit(cmd)).rejects.toThrow(ConflictError);
  });

  it('creates activation and emits activation:created + status-changed', async () => {
    const card = makeCard({ activations: [] });
    prisma.card.findFirst.mockResolvedValue(card);
    prisma.activation.create.mockResolvedValue(
      makeActivation({ id: '11111111-1111-1111-8111-111111111111', requestedAt: new Date() }),
    );
    prisma.card.update.mockResolvedValue({});

    const result = await service.submit(cmd);

    expect(prisma.activation.create).toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith('activation:created', expect.any(Object));
    expect(eventBus.emit).toHaveBeenCalledWith('activation:status-changed', expect.objectContaining({
      status: ClientActivationStatus.SUBMITTED,
    }));
    expect(result.status).toBe(ClientActivationStatus.SUBMITTED);
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe('ActivationService.update', () => {
  const activationId = '11111111-1111-1111-8111-111111111111';
  const cmd = { accountFields: [{ field: AccountInformation.USERNAME, value: 'corrected' }] };

  it('throws NotFoundError when activation not found', async () => {
    prisma.activation.findUnique.mockResolvedValue(null);
    await expect(service.update(activationId, cmd)).rejects.toThrow(NotFoundError);
  });

  it('throws ConflictError when not in WRONG_INFORMATION state', async () => {
    prisma.activation.findUnique.mockResolvedValue({
      id: activationId,
      activationStat: ActivationStat.PROCESSING,
      activatorId: faker.string.uuid(),
      steps: [],
    });
    await expect(service.update(activationId, cmd)).rejects.toThrow(ConflictError);
  });

  it('updates WrongInformation and emits client-updated + status-changed', async () => {
    const stepId = faker.string.uuid();
    prisma.activation.findUnique.mockResolvedValue({
      id: activationId,
      activationStat: ActivationStat.WRONG_INFORMATION,
      activatorId: '22222222-2222-2222-8222-222222222222',
      steps: [{ id: stepId }],
    });
    prisma.wrongInformation.updateMany.mockResolvedValue({ count: 1 });
    prisma.activationStep.create.mockResolvedValue({});
    prisma.activation.update.mockResolvedValue({});

    const result = await service.update(activationId, cmd);

    expect(prisma.wrongInformation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ activationStepId: stepId }),
    }));
    expect(eventBus.emit).toHaveBeenCalledWith('activation:client-updated', expect.objectContaining({
      activationId,
    }));
    expect(eventBus.emit).toHaveBeenCalledWith('activation:status-changed', expect.objectContaining({
      status: ClientActivationStatus.PROCESSING,
    }));
    expect(result.status).toBe(ClientActivationStatus.PROCESSING);
  });
});

// ─── additional ───────────────────────────────────────────────────────────────

describe('ActivationService.additional', () => {
  const activationId = '11111111-1111-1111-8111-111111111111';
  const cmd = { accountFields: [{ field: AccountInformation.OTP, value: '123456' }] };

  it('throws ConflictError when not in ADDITIONAL_INFORMATION state', async () => {
    prisma.activation.findUnique.mockResolvedValue({
      id: activationId,
      activationStat: ActivationStat.PROCESSING,
      activatorId: faker.string.uuid(),
      steps: [],
    });
    await expect(service.additional(activationId, cmd)).rejects.toThrow(ConflictError);
  });

  it('updates AdditionalInformation and emits', async () => {
    const stepId = faker.string.uuid();
    prisma.activation.findUnique.mockResolvedValue({
      id: activationId,
      activationStat: ActivationStat.ADDITIONAL_INFORMATION,
      activatorId: '22222222-2222-2222-8222-222222222222',
      steps: [{ id: stepId }],
    });
    prisma.additionalInformation.updateMany.mockResolvedValue({ count: 1 });
    prisma.activationStep.create.mockResolvedValue({});
    prisma.activation.update.mockResolvedValue({});

    const result = await service.additional(activationId, cmd);

    expect(eventBus.emit).toHaveBeenCalledWith('activation:client-updated', expect.any(Object));
    expect(result.status).toBe(ClientActivationStatus.PROCESSING);
  });
});

// ─── status ───────────────────────────────────────────────────────────────────

describe('ActivationService.status', () => {
  it('returns ClientActivationStatusDTO', async () => {
    prisma.activation.findUnique.mockResolvedValue({
      id: '11111111-1111-1111-8111-111111111111',
      activationStat: ActivationStat.PROCESSING,
    });
    const result = await service.status('11111111-1111-1111-8111-111111111111');
    expect(result.status).toBe(ClientActivationStatus.PROCESSING);
  });

  it('throws NotFoundError when not found', async () => {
    prisma.activation.findUnique.mockResolvedValue(null);
    await expect(service.status(faker.string.uuid())).rejects.toThrow(NotFoundError);
  });
});

// ─── getPending ───────────────────────────────────────────────────────────────

describe('ActivationService.getPending', () => {
  it('returns empty array when none pending', async () => {
    prisma.activation.findMany.mockResolvedValue([]);
    const result = await service.getPending();
    expect(result).toEqual([]);
  });

  it('returns PendingActivationDTO list with keyMasked', async () => {
    prisma.activation.findMany.mockResolvedValue([
      {
        id: '11111111-1111-1111-8111-111111111111',
        requestedAt: new Date('2024-06-01T10:00:00.000Z'),
        card: { key: 'A1B2C3D4E5F6', subscriptionPlan: PLAN },
      },
    ]);
    const result = await service.getPending();
    expect(result).toHaveLength(1);
    expect(result[0]!.keyMasked).toBe('********E5F6');
  });
});

// ─── getActive ────────────────────────────────────────────────────────────────

describe('ActivationService.getActive', () => {
  const userId = faker.string.uuid();
  const activator = makeActivator({ userId });

  it('throws ForbiddenError when activator not found', async () => {
    prisma.activator.findUnique.mockResolvedValue(null);
    await expect(service.getActive(userId)).rejects.toThrow(ForbiddenError);
  });

  it('returns ActiveRequestDTO list with raw values', async () => {
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.findMany.mockResolvedValue([
      makeActivation({
        activationStat: ActivationStat.PROCESSING,
        activatorId: activator.id,
        takenAt: new Date('2024-06-01T10:00:00.000Z'),
        information: [{ accountInform: AccountInformation.PASSWORD, value: 'secret' }],
      }),
    ]);

    const result = await service.getActive(userId);
    expect(result).toHaveLength(1);
    const pwd = result[0]!.accountFields.find((f) => f.fieldLabel === 'Password');
    expect(pwd?.value).toBe('secret'); // raw, not masked
  });

  // Stage-04-fix #3.3: the OTP has its own dedicated `otpValue` field — it must not also
  // appear in `accountFields`, or the card renders it twice.
  it('surfaces the OTP only via otpValue, not duplicated in accountFields', async () => {
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.findMany.mockResolvedValue([
      makeActivation({
        activationStat: ActivationStat.ADDITIONAL_INFORMATION,
        activatorId: activator.id,
        takenAt: new Date('2024-06-01T10:00:00.000Z'),
        information: [{ accountInform: AccountInformation.USERNAME, value: 'jane_doe' }],
        steps: [
          {
            id: faker.string.uuid(),
            activationStat: ActivationStat.ADDITIONAL_INFORMATION,
            createdAt: new Date('2024-06-01T11:00:00.000Z'),
            wrongInformation: [],
            additionalInformation: [{ accountInform: AccountInformation.OTP, value: '654321' }],
          },
        ],
      }),
    ]);

    const result = await service.getActive(userId);

    expect(result[0]!.otpValue).toBe('654321');
    expect(result[0]!.accountFields.find((f) => f.fieldLabel === 'OTP')).toBeUndefined();
  });

  // Stage-04-fix #3.1: a frozen activation hands off to the admin — it must disappear from
  // the activator's own Active Requests list (getActive), not just visually via a stale cache.
  it('excludes FREEZE from the queried states, so a frozen activation drops off the list', async () => {
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.findMany.mockResolvedValue([]);

    await service.getActive(userId);

    const call = prisma.activation.findMany.mock.calls[0]?.[0] as {
      where: { activationStat: { in: string[] } };
    };
    const states = call.where.activationStat.in;
    expect(states).toContain('PROCESSING');
    expect(states).toContain('WRONG_INFORMATION');
    expect(states).toContain('ADDITIONAL_INFORMATION');
    expect(states).not.toContain('FREEZE');
    expect(states).toHaveLength(3);
  });
});

// ─── take ─────────────────────────────────────────────────────────────────────

describe('ActivationService.take', () => {
  const userId = faker.string.uuid();
  const activator = makeActivator({ userId });
  const id = '11111111-1111-1111-8111-111111111111';

  it('throws ForbiddenError when activator not found', async () => {
    prisma.activator.findUnique.mockResolvedValue(null);
    await expect(service.take(id, userId)).rejects.toThrow(ForbiddenError);
  });

  it('throws ConflictError when ≥3 active', async () => {
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.count.mockResolvedValue(3);
    await expect(service.take(id, userId)).rejects.toThrow(ConflictError);
  });

  // Stage-04-fix #3.1: a frozen activation must not occupy one of the activator's 3 slots —
  // the cap query excludes FREEZE, same as getActive's list query.
  it('counts the active-slot cap without FREEZE', async () => {
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.count.mockResolvedValue(0);
    prisma.activation.updateMany.mockResolvedValue({ count: 0 });

    await service.take(id, userId).catch(() => undefined);

    const call = prisma.activation.count.mock.calls[0]?.[0] as {
      where: { activationStat: { in: string[] } };
    };
    const states = call.where.activationStat.in;
    expect(states).not.toContain('FREEZE');
    expect(states).toHaveLength(3);
  });

  it('throws ConflictError when updateMany returns count=0 (already taken)', async () => {
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.count.mockResolvedValue(0);
    prisma.activation.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.take(id, userId)).rejects.toThrow(ConflictError);
  });

  it('returns ActiveRequestDTO and emits activation:taken on success', async () => {
    const activation = makeActivation({
      id,
      activationStat: ActivationStat.PROCESSING,
      activatorId: activator.id,
      takenAt: new Date('2024-06-01T10:00:00.000Z'),
    });
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.count.mockResolvedValue(1);
    prisma.activation.updateMany.mockResolvedValue({ count: 1 });
    prisma.activationStep.create.mockResolvedValue({});
    prisma.activation.findUnique.mockResolvedValue(activation);

    const result = await service.take(id, userId);

    expect(result.id).toBe(id);
    expect(result.key).toBe('A1B2C3D4E5F6');
    expect(eventBus.emit).toHaveBeenCalledWith('activation:taken', expect.objectContaining({
      activationId: id,
      activatorId: activator.id,
    }));
  });
});

// ─── flagWrong ────────────────────────────────────────────────────────────────

describe('ActivationService.flagWrong', () => {
  const userId = faker.string.uuid();
  const activator = makeActivator({ userId });
  const id = '11111111-1111-1111-8111-111111111111';

  it('throws ForbiddenError when not caller-owned', async () => {
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.findUnique.mockResolvedValue(
      makeActivation({ id, activatorId: faker.string.uuid(), activationStat: ActivationStat.PROCESSING }),
    );
    await expect(service.flagWrong(id, userId, { fields: [AccountInformation.USERNAME] })).rejects.toThrow(ForbiddenError);
  });

  it('throws ConflictError when not in working state', async () => {
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.findUnique.mockResolvedValue(
      makeActivation({ id, activatorId: activator.id, activationStat: ActivationStat.PENDING }),
    );
    await expect(service.flagWrong(id, userId, { fields: [AccountInformation.USERNAME] })).rejects.toThrow(ConflictError);
  });

  it('creates step + WrongInformation rows and emits status-changed', async () => {
    const stepId = faker.string.uuid();
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.findUnique.mockResolvedValue(
      makeActivation({ id, activatorId: activator.id, activationStat: ActivationStat.PROCESSING, takenAt: new Date() }),
    );
    prisma.activationStep.create.mockResolvedValue({ id: stepId });
    prisma.wrongInformation.createMany.mockResolvedValue({ count: 1 });
    prisma.activation.update.mockResolvedValue({});

    const result = await service.flagWrong(id, userId, { fields: [AccountInformation.USERNAME] });

    expect(prisma.wrongInformation.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ accountInform: AccountInformation.USERNAME }),
        ]),
      }),
    );
    expect(eventBus.emit).toHaveBeenCalledWith('activation:status-changed', expect.objectContaining({
      status: ClientActivationStatus.NEEDS_CORRECTION,
    }));
    expect(result.state).toBe(ActivationStat.WRONG_INFORMATION);
  });
});

// ─── requestAdditional ────────────────────────────────────────────────────────

describe('ActivationService.requestAdditional', () => {
  const userId = faker.string.uuid();
  const activator = makeActivator({ userId });
  const id = '11111111-1111-1111-8111-111111111111';

  it('throws ConflictError when not in working state', async () => {
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.findUnique.mockResolvedValue(
      makeActivation({ id, activatorId: activator.id, activationStat: ActivationStat.PENDING }),
    );
    await expect(
      service.requestAdditional(id, userId, { fields: [AccountInformation.OTP] }),
    ).rejects.toThrow(ConflictError);
  });

  it('creates AdditionalInformation rows and emits NEEDS_OTP', async () => {
    const stepId = faker.string.uuid();
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.findUnique.mockResolvedValue(
      makeActivation({ id, activatorId: activator.id, activationStat: ActivationStat.PROCESSING, takenAt: new Date() }),
    );
    prisma.activationStep.create.mockResolvedValue({ id: stepId });
    prisma.additionalInformation.createMany.mockResolvedValue({ count: 1 });
    prisma.activation.update.mockResolvedValue({});

    const result = await service.requestAdditional(id, userId, { fields: [AccountInformation.OTP] });

    expect(eventBus.emit).toHaveBeenCalledWith('activation:status-changed', expect.objectContaining({
      status: ClientActivationStatus.NEEDS_OTP,
    }));
    expect(result.state).toBe(ActivationStat.ADDITIONAL_INFORMATION);
  });
});

// ─── activate ─────────────────────────────────────────────────────────────────

describe('ActivationService.activate', () => {
  const userId = faker.string.uuid();
  const activator = makeActivator({ userId });
  const id = '11111111-1111-1111-8111-111111111111';
  const ACTIVATE_CMD = { activationEmail: 'client@example.com' };

  function makeActivationWithCommissions(overrides: Record<string, unknown> = {}) {
    return makeActivation({
      id,
      activationStat: ActivationStat.PROCESSING,
      activatorId: activator.id,
      takenAt: new Date('2024-06-01T10:00:00.000Z'),
      card: {
        id: faker.string.uuid(),
        key: 'A1B2C3D4E5F6',
        distributorId: DISTRIBUTOR_ROW.id,
        distributor: DISTRIBUTOR_ROW,
        subscriptionPlan: {
          ...PLAN,
          commissions: [
            {
              commission: new Prisma.Decimal(150),
              commissionDuration: { label: '0–10 min', nbMinuteMin: 0, nbMinuteMax: 10 },
            },
            {
              commission: new Prisma.Decimal(100),
              commissionDuration: { label: 'catch-all', nbMinuteMin: 11, nbMinuteMax: null },
            },
          ],
        },
      },
      ...overrides,
    });
  }

  it('throws ConflictError when not in working state', async () => {
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.findUnique.mockResolvedValue(
      makeActivation({ id, activatorId: activator.id, activationStat: ActivationStat.PENDING }),
    );
    await expect(service.activate(id, userId, ACTIVATE_CMD)).rejects.toThrow(ConflictError);
  });

  it('picks commission tier by duration (within-range tier)', async () => {
    // takenAt 5 min ago, completedAt = new Date() in service → 5 min → tier "0–10 min" (150)
    const activation = makeActivationWithCommissions({
      takenAt: new Date(Date.now() - 5 * 60 * 1000),
    });
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.findUnique.mockResolvedValue(activation);
    prisma.activation.update.mockResolvedValue({});
    prisma.card.update.mockResolvedValue({});
    prisma.activator.update.mockResolvedValue({});
    prisma.distributor.update.mockResolvedValue({});
    prisma.activationStep.create.mockResolvedValue({});

    await service.activate(id, userId, ACTIVATE_CMD);

    // Verify activationPrice set to tier commission (150)
    expect(prisma.activation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ activationPrice: new Prisma.Decimal(150) }),
      }),
    );
  });

  it('uses catch-all tier when duration exceeds all bounded tiers', async () => {
    // takenAt 60 min ago, completedAt = new Date() in service → 60 min → catch-all (100)
    const activation = makeActivationWithCommissions({
      takenAt: new Date(Date.now() - 60 * 60 * 1000),
    });
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.findUnique.mockResolvedValue(activation);
    prisma.activation.update.mockResolvedValue({});
    prisma.card.update.mockResolvedValue({});
    prisma.activator.update.mockResolvedValue({});
    prisma.distributor.update.mockResolvedValue({});
    prisma.activationStep.create.mockResolvedValue({});

    await service.activate(id, userId, ACTIVATE_CMD);

    expect(prisma.activation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ activationPrice: new Prisma.Decimal(100) }),
      }),
    );
  });

  it('increments activator counters and emits status-changed ACTIVATED', async () => {
    const activation = makeActivationWithCommissions();
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.findUnique.mockResolvedValue(activation);
    prisma.activation.update.mockResolvedValue({});
    prisma.card.update.mockResolvedValue({});
    prisma.activator.update.mockResolvedValue({});
    prisma.distributor.update.mockResolvedValue({});
    prisma.activationStep.create.mockResolvedValue({});

    await service.activate(id, userId, ACTIVATE_CMD);

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
        data: expect.objectContaining({
          nbOfActivation: { increment: 1 },
          nbOfActiveCards: { decrement: 1 },
        }),
      }),
    );
    expect(eventBus.emit).toHaveBeenCalledWith('activation:status-changed', expect.objectContaining({
      status: ClientActivationStatus.ACTIVATED,
    }));
  });

  it('stores the required activationEmail (Stage-04-fix #2)', async () => {
    const activation = makeActivationWithCommissions();
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.findUnique.mockResolvedValue(activation);
    prisma.activation.update.mockResolvedValue({});
    prisma.card.update.mockResolvedValue({});
    prisma.activator.update.mockResolvedValue({});
    prisma.distributor.update.mockResolvedValue({});
    prisma.activationStep.create.mockResolvedValue({});

    await service.activate(id, userId, { activationEmail: 'client@example.com' });

    expect(prisma.activation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ activationEmail: 'client@example.com' }),
      }),
    );
  });
});

// ─── cancel ───────────────────────────────────────────────────────────────────

describe('ActivationService.cancel', () => {
  const userId = faker.string.uuid();
  const activator = makeActivator({ userId });
  const id = '11111111-1111-1111-8111-111111111111';
  const newId = '22222222-2222-2222-8222-222222222222';

  it('throws ConflictError when not in working state', async () => {
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.findUnique.mockResolvedValue(
      makeActivation({ id, activatorId: activator.id, activationStat: ActivationStat.PENDING, information: [] }),
    );
    await expect(service.cancel(id, userId)).rejects.toThrow(ConflictError);
  });

  it('spawns new PENDING activation and emits created + status-changed', async () => {
    const newActivation = {
      id: newId,
      requestedAt: new Date(),
      card: { key: 'A1B2C3D4E5F6', subscriptionPlan: PLAN },
    };
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.findUnique.mockResolvedValue(
      makeActivation({
        id,
        activatorId: activator.id,
        activationStat: ActivationStat.PROCESSING,
        information: [],
      }),
    );
    prisma.activation.update.mockResolvedValue({});
    prisma.activationStep.create.mockResolvedValue({});
    prisma.activation.create.mockResolvedValue(newActivation);
    prisma.activator.update.mockResolvedValue({});

    await service.cancel(id, userId);

    expect(prisma.activation.create).toHaveBeenCalled();
    expect(prisma.activator.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nbOfActivation: { increment: 1 } }),
      }),
    );
    expect(eventBus.emit).toHaveBeenCalledWith('activation:status-changed', expect.objectContaining({
      activationId: id,
      status: ClientActivationStatus.FAILED,
    }));
    expect(eventBus.emit).toHaveBeenCalledWith('activation:created', expect.any(Object));
  });
});

// ─── release ──────────────────────────────────────────────────────────────────

describe('ActivationService.release', () => {
  const userId = faker.string.uuid();
  const activator = makeActivator({ userId });
  const id = '11111111-1111-1111-8111-111111111111';

  it('spawns new PENDING activation with REMOVED_FROM_ACTIVATOR outcome', async () => {
    const newActivation = {
      id: '22222222-2222-2222-8222-222222222222',
      requestedAt: new Date(),
      card: { key: 'A1B2C3D4E5F6', subscriptionPlan: PLAN },
    };
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.findUnique.mockResolvedValue(
      makeActivation({ id, activatorId: activator.id, activationStat: ActivationStat.PROCESSING, information: [] }),
    );
    prisma.activation.update.mockResolvedValue({});
    prisma.activationStep.create.mockResolvedValue({});
    prisma.activation.create.mockResolvedValue(newActivation);
    prisma.activator.update.mockResolvedValue({});

    await service.release(id, userId);

    expect(prisma.activation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ activationStat: 'REMOVED_FROM_ACTIVATOR' }),
      }),
    );
    expect(eventBus.emit).toHaveBeenCalledWith('activation:created', expect.any(Object));
  });

  it('only increments nbOfActivation (no success/earning)', async () => {
    const newActivation = {
      id: '22222222-2222-2222-8222-222222222222',
      requestedAt: new Date(),
      card: { key: 'A1B2C3D4E5F6', subscriptionPlan: PLAN },
    };
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.findUnique.mockResolvedValue(
      makeActivation({ id, activatorId: activator.id, activationStat: ActivationStat.PROCESSING, information: [] }),
    );
    prisma.activation.update.mockResolvedValue({});
    prisma.activationStep.create.mockResolvedValue({});
    prisma.activation.create.mockResolvedValue(newActivation);
    prisma.activator.update.mockResolvedValue({});

    await service.release(id, userId);

    const updateCall = prisma.activator.update.mock.calls[0]?.[0];
    expect(updateCall?.data?.nbOfActivation).toEqual({ increment: 1 });
    expect(updateCall?.data?.nbOfSuccessfulActivation).toBeUndefined();
    expect(updateCall?.data?.totalEarning).toBeUndefined();
  });
});

// ─── freeze ───────────────────────────────────────────────────────────────────

describe('ActivationService.freeze', () => {
  const userId = faker.string.uuid();
  const activator = makeActivator({ userId });
  const id = '11111111-1111-1111-8111-111111111111';

  it('sets FREEZE + reason and emits frozen + status-changed', async () => {
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.findUnique.mockResolvedValue(
      makeActivation({ id, activatorId: activator.id, activationStat: ActivationStat.PROCESSING, takenAt: new Date() }),
    );
    prisma.activation.update.mockResolvedValue({});
    prisma.activationStep.create.mockResolvedValue({});

    const result = await service.freeze(id, userId, { reason: 'Suspicious activity' });

    expect(prisma.activation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ activationStat: 'FREEZE', freezReason: 'Suspicious activity' }),
      }),
    );
    expect(eventBus.emit).toHaveBeenCalledWith('activation:frozen', expect.objectContaining({ activationId: id }));
    expect(eventBus.emit).toHaveBeenCalledWith('activation:status-changed', expect.objectContaining({
      status: ClientActivationStatus.UNDER_REVIEW,
    }));
    expect(result.state).toBe(ActivationStat.FREEZE);
  });
});

// ─── getMyHistory ──────────────────────────────────────────────────────────────

describe('ActivationService.getMyHistory', () => {
  const userId = faker.string.uuid();
  const activator = makeActivator({ userId });

  it('returns paginated history', async () => {
    prisma.activator.findUnique.mockResolvedValue(activator);
    prisma.activation.findMany.mockResolvedValue([
      {
        id: '11111111-1111-1111-8111-111111111111',
        activationStat: ActivationStat.ACTIVATED,
        requestedAt: new Date('2024-06-01T10:00:00.000Z'),
        takenAt: new Date('2024-06-01T10:01:00.000Z'),
        completedAt: new Date('2024-06-01T10:06:00.000Z'),
        activationPrice: new Prisma.Decimal(150),
        clientFullName: 'Jane Doe',
        clientPhone: '+213555000001',
        card: { key: 'A1B2C3D4E5F6', subscriptionPlan: PLAN },
      },
    ]);
    prisma.activation.count.mockResolvedValue(1);

    const result = await service.getMyHistory(userId, {});

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.key).toBe('A1B2C3D4E5F6');
    expect(result.items[0]!.durationSeconds).toBe(300); // 5 min
    expect(result.meta.total).toBe(1);
  });
});

// ─── getRecent ────────────────────────────────────────────────────────────────

describe('ActivationService.getRecent', () => {
  it('returns last 10 completed activations with keyMasked and activationEmail (Stage-04-fix #2)', async () => {
    prisma.activation.findMany.mockResolvedValue([
      {
        id: '11111111-1111-1111-8111-111111111111',
        activationStat: ActivationStat.ACTIVATED,
        completedAt: new Date('2024-06-01T10:00:00.000Z'),
        activationEmail: 'client@example.com',
        card: { key: 'A1B2C3D4E5F6', subscriptionPlan: PLAN },
      },
    ]);

    const result = await service.getRecent();
    expect(result).toHaveLength(1);
    expect(result[0]!.keyMasked).toBe('********E5F6');
    expect(result[0]!.activationEmail).toBe('client@example.com');
  });
});
