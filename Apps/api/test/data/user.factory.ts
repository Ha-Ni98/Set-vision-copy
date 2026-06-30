import { faker } from '@faker-js/faker';
import type { LoginCommand } from '@my-app/contract';

export const createUserPayload = (overrides: Partial<LoginCommand> = {}): LoginCommand => ({
  username: faker.internet.username(),
  password: 'Password123!',
  ...overrides,
});
