import { faker } from '@faker-js/faker';
import { UserRole } from '@my-app/contract';
import type { CreateActivatorCommand } from '@my-app/contract';
import type { Activator, User } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { hashPassword } from '@common/utils/password.utils';

export const ACTIVATOR_SEED_PASSWORD = 'Password123!';

export const createActivatorPayload = (
  overrides: Partial<CreateActivatorCommand> = {},
): CreateActivatorCommand => ({
  fullName: faker.person.fullName(),
  username: faker.internet.username(),
  phone: faker.phone.number(),
  ...overrides,
});

export const activatorEntity = (overrides: Partial<Activator> = {}): Activator => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  fullName: faker.person.fullName(),
  phone: faker.phone.number(),
  totalEarning: new Prisma.Decimal(0),
  credits: new Prisma.Decimal(0),
  nbOfActivation: 0,
  nbOfSuccessfulActivation: 0,
  ...overrides,
});

export interface SeededActivator {
  activator: Activator;
  user: User;
}

export const seedActivator = async (
  prisma: PrismaClient,
  overrides: {
    username?: string;
    fullName?: string;
    phone?: string;
    isEnabled?: boolean;
    credits?: number;
    totalEarning?: number;
    nbOfActivation?: number;
    nbOfSuccessfulActivation?: number;
  } = {},
): Promise<SeededActivator> => {
  const hashed = await hashPassword(ACTIVATOR_SEED_PASSWORD);
  const user = await prisma.user.create({
    data: {
      username: overrides.username ?? faker.internet.username(),
      password: hashed,
      role: UserRole.ACTIVATOR,
      isEnabled: overrides.isEnabled ?? true,
    },
  });
  const activator = await prisma.activator.create({
    data: {
      userId: user.id,
      fullName: overrides.fullName ?? faker.person.fullName(),
      phone: overrides.phone ?? faker.phone.number(),
      ...(overrides.credits !== undefined && { credits: overrides.credits }),
      ...(overrides.totalEarning !== undefined && { totalEarning: overrides.totalEarning }),
      ...(overrides.nbOfActivation !== undefined && { nbOfActivation: overrides.nbOfActivation }),
      ...(overrides.nbOfSuccessfulActivation !== undefined && {
        nbOfSuccessfulActivation: overrides.nbOfSuccessfulActivation,
      }),
    },
  });
  return { activator, user };
};
