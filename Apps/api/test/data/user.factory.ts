import { faker } from '@faker-js/faker';
import type { LoginCommand } from '@my-app/contract';
import { UserRole } from '@my-app/contract';
import type { User } from '@prisma/client';

export const createUserPayload = (overrides: Partial<LoginCommand> = {}): LoginCommand => ({
  username: faker.internet.username(),
  password: 'Password123!',
  ...overrides,
});

// Prisma-shaped User entity for mapper unit tests (includes sensitive fields).
export const userEntity = (overrides: Partial<User> = {}): User => ({
  id: faker.string.uuid(),
  username: faker.internet.username(),
  password: '$argon2id$v=19$m=65536,t=3,p=4$fake-hash',
  role: UserRole.ADMIN,
  isEnabled: true,
  lastLoginAt: null,
  createdAt: new Date('2024-01-15T10:00:00.000Z'),
  updatedAt: new Date('2024-01-15T10:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});
