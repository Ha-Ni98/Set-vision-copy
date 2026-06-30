import { faker } from '@faker-js/faker';
import { UserRole } from '@my-app/contract';
import type { CreateAdminCommand } from '@my-app/contract';
import type { Admin, User } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { hashPassword } from '@common/utils/password.utils';

export const ADMIN_SEED_PASSWORD = 'Password123!';

export const createAdminPayload = (overrides: Partial<CreateAdminCommand> = {}): CreateAdminCommand => ({
  fullName: faker.person.fullName(),
  username: faker.internet.username(),
  phone: faker.phone.number(),
  ...overrides,
});

// Prisma-shaped Admin entity for mapper unit tests.
export const adminEntity = (overrides: Partial<Admin> = {}): Admin => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  fullName: faker.person.fullName(),
  phone: faker.phone.number(),
  isEnabled: true,
  ...overrides,
});

export interface SeededAdmin {
  admin: Admin;
  user: User;
}

// Persists User(ADMIN) + Admin for integration tests.
export const seedAdmin = async (
  prisma: PrismaClient,
  overrides: {
    username?: string;
    fullName?: string;
    phone?: string;
    isEnabled?: boolean;
  } = {},
): Promise<SeededAdmin> => {
  const hashed = await hashPassword(ADMIN_SEED_PASSWORD);
  const user = await prisma.user.create({
    data: {
      username: overrides.username ?? faker.internet.username(),
      password: hashed,
      role: UserRole.ADMIN,
      isEnabled: overrides.isEnabled ?? true,
    },
  });
  const admin = await prisma.admin.create({
    data: {
      userId: user.id,
      fullName: overrides.fullName ?? faker.person.fullName(),
      phone: overrides.phone ?? faker.phone.number(),
    },
  });
  return { admin, user };
};
