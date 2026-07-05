import { faker } from '@faker-js/faker';
import { UserRole } from '@my-app/contract';
import { hashPassword } from '@common/utils/password.utils';
import type { PrismaClient } from '@prisma/client';

export const SEED_PASSWORD = 'Password123!';

export interface SeededUser {
  id: string;
  username: string;
  password: string;
  role: UserRole;
}

// Persists a User with an argon2-hashed password for integration tests.
export const seedUser = async (
  prisma: PrismaClient,
  overrides: { role?: UserRole; username?: string; isEnabled?: boolean } = {},
): Promise<SeededUser> => {
  const username = overrides.username ?? faker.internet.username();
  const role = overrides.role ?? UserRole.ADMIN;
  const hashed = await hashPassword(SEED_PASSWORD);

  const user = await prisma.user.create({
    data: {
      username,
      password: hashed,
      role,
      isEnabled: overrides.isEnabled ?? true,
    },
  });

  // Create the role profile so /me can resolve fullName
  const fullName = faker.person.fullName();
  if (role === UserRole.ADMIN) {
    await prisma.admin.create({
      data: { userId: user.id, fullName, phone: faker.phone.number() },
    });
  } else {
    await prisma.activator.create({
      data: { userId: user.id, fullName, phone: faker.phone.number() },
    });
  }

  return { id: user.id, username, password: SEED_PASSWORD, role };
};
