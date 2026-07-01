import { faker } from '@faker-js/faker';
import { ActivationStat, AccountInformation } from '@my-app/contract';
import type { Activation, ActivationInformation, ActivationStep, Card } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

// ─── Plain entity builders (unit-test use, no DB) ────────────────────────────

export const activationEntity = (overrides: Partial<Activation> = {}): Activation => ({
  id: faker.string.uuid(),
  cardId: faker.string.uuid(),
  activatorId: null,
  activationStat: ActivationStat.PENDING as unknown as Activation['activationStat'],
  clientFullName: faker.person.fullName(),
  clientPhone: faker.phone.number(),
  clientEmail: null,
  activationEmail: null,
  activationPrice: null,
  freezReason: null,
  requestedAt: new Date('2024-06-01T10:00:00.000Z'),
  takenAt: null,
  completedAt: null,
  ...overrides,
});

export const activationInfoEntity = (
  overrides: Partial<ActivationInformation> = {},
): ActivationInformation => ({
  id: faker.string.uuid(),
  activationId: faker.string.uuid(),
  accountInform: AccountInformation.USERNAME as unknown as ActivationInformation['accountInform'],
  value: faker.internet.username(),
  ...overrides,
});

// ─── DB seed helpers ──────────────────────────────────────────────────────────

export interface SeededActivation {
  activation: Activation;
  information: ActivationInformation[];
  steps: ActivationStep[];
}

export const seedActivation = async (
  prisma: PrismaClient,
  card: Card,
  overrides: {
    activatorId?: string | null;
    activationStat?: ActivationStat;
    clientFullName?: string;
    clientPhone?: string;
    activationPrice?: number | null;
    freezReason?: string | null;
    takenAt?: Date | null;
    completedAt?: Date | null;
    accountFields?: Array<{ field: AccountInformation; value: string }>;
  } = {},
): Promise<SeededActivation> => {
  const stat = overrides.activationStat ?? ActivationStat.PENDING;

  const activation = await prisma.activation.create({
    data: {
      cardId: card.id,
      activatorId: overrides.activatorId ?? null,
      activationStat: stat as unknown as Activation['activationStat'],
      clientFullName: overrides.clientFullName ?? faker.person.fullName(),
      clientPhone: overrides.clientPhone ?? faker.phone.number(),
      ...(overrides.activationPrice != null && {
        activationPrice: new Prisma.Decimal(overrides.activationPrice),
      }),
      ...(overrides.freezReason != null && { freezReason: overrides.freezReason }),
      ...(overrides.takenAt !== undefined && { takenAt: overrides.takenAt }),
      ...(overrides.completedAt !== undefined && { completedAt: overrides.completedAt }),
    },
  });

  const fields = overrides.accountFields ?? [
    { field: AccountInformation.USERNAME, value: faker.internet.username() },
    { field: AccountInformation.EMAIL, value: faker.internet.email() },
    { field: AccountInformation.PASSWORD, value: 'secret123' },
  ];

  const information = await Promise.all(
    fields.map((f) =>
      prisma.activationInformation.create({
        data: {
          activationId: activation.id,
          accountInform: f.field as unknown as ActivationInformation['accountInform'],
          value: f.value,
        },
      }),
    ),
  );

  const step = await prisma.activationStep.create({
    data: {
      activationId: activation.id,
      activationStat: stat as unknown as ActivationStep['activationStat'],
    },
  });

  return { activation, information, steps: [step] };
};

export const seedCommissionDuration = async (
  prisma: PrismaClient,
  overrides: {
    key?: string;
    label?: string;
    nbMinuteMin?: number;
    nbMinuteMax?: number | null;
  } = {},
) => {
  return prisma.commissionDuration.create({
    data: {
      key: overrides.key ?? faker.string.alphanumeric(8).toUpperCase(),
      label: overrides.label ?? faker.lorem.words(2),
      nbMinuteMin: overrides.nbMinuteMin ?? 0,
      nbMinuteMax: overrides.nbMinuteMax !== undefined ? overrides.nbMinuteMax : 30,
    },
  });
};
