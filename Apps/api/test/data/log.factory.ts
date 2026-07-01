import { faker } from '@faker-js/faker';
import { LogActionType } from '@my-app/contract';
import type { Log } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

const ALL_ACTION_TYPES = Object.values(LogActionType);

export const seedLog = async (
  prisma: PrismaClient,
  userId: string,
  overrides: {
    actionType?: LogActionType;
    actionDescription?: string;
    createdAt?: Date;
  } = {},
): Promise<Log> => {
  const actionType =
    overrides.actionType ?? ALL_ACTION_TYPES[Math.floor(Math.random() * ALL_ACTION_TYPES.length)]!;
  return prisma.log.create({
    data: {
      userId,
      actionType,
      actionDescription: overrides.actionDescription ?? faker.lorem.sentence(),
      ...(overrides.createdAt && { createdAt: overrides.createdAt }),
    },
  });
};
