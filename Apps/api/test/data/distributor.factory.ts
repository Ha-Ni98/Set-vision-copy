import { faker } from '@faker-js/faker';
import type { Distributor, Wilaya, Commune } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { seedWilaya, seedCommune } from './geography.factory';

export interface SeededDistributor {
  distributor: Distributor;
  wilaya: Wilaya;
  commune: Commune;
}

export const seedDistributor = async (
  prisma: PrismaClient,
  overrides: {
    fullName?: string;
    storeName?: string;
    phone?: string | null;
    isEnabled?: boolean;
    nbOfActiveCards?: number;
    nbOfActivation?: number;
    wilaya?: Wilaya;
    commune?: Commune;
  } = {},
): Promise<SeededDistributor> => {
  const wilaya = overrides.wilaya ?? (await seedWilaya(prisma));
  const commune = overrides.commune ?? (await seedCommune(prisma, wilaya.id));

  const distributor = await prisma.distributor.create({
    data: {
      fullName: overrides.fullName ?? faker.person.fullName(),
      storeName: overrides.storeName ?? faker.company.name(),
      phone: overrides.phone ?? faker.phone.number(),
      wilayaId: wilaya.id,
      communeId: commune.id,
      isEnabled: overrides.isEnabled ?? true,
      nbOfActiveCards: overrides.nbOfActiveCards ?? 0,
      nbOfActivation: overrides.nbOfActivation ?? 0,
    },
  });

  return { distributor, wilaya, commune };
};
