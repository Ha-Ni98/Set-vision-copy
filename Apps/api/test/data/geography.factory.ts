import { faker } from '@faker-js/faker';
import type { Wilaya, Commune } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

export const seedWilaya = async (
  prisma: PrismaClient,
  overrides: { frName?: string; arName?: string } = {},
): Promise<Wilaya> => {
  return prisma.wilaya.create({
    data: {
      wilayaCode: faker.string.numeric(5),
      frName: overrides.frName ?? faker.location.state(),
      arName: overrides.arName ?? faker.location.state(),
    },
  });
};

export const seedCommune = async (
  prisma: PrismaClient,
  wilayaId: string,
  overrides: { frName?: string; arName?: string } = {},
): Promise<Commune> => {
  return prisma.commune.create({
    data: {
      communeCode: faker.string.numeric(6),
      wilayaId,
      frName: overrides.frName ?? faker.location.city(),
      arName: overrides.arName ?? faker.location.city(),
    },
  });
};
