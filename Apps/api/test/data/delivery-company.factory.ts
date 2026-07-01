import { faker } from '@faker-js/faker';
import type { DeliveryCompany } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

export const seedDeliveryCompany = async (
  prisma: PrismaClient,
  overrides: { name?: string; isActive?: boolean } = {},
): Promise<DeliveryCompany> => {
  return prisma.deliveryCompany.create({
    data: {
      name: overrides.name ?? faker.company.name(),
      registeredName: faker.company.name(),
      isActive: overrides.isActive ?? true,
    },
  });
};
