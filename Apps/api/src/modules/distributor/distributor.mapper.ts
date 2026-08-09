import type { Distributor, Wilaya, Commune } from '@prisma/client';
import {
  DistributorResponseSchema,
  DistributorDetailResponseSchema,
  DistributorWithCredentialsResponseSchema,
  type DistributorDTO,
  type DistributorDetailDTO,
  type DistributorWithCredentialsDTO,
} from '@my-app/contract';

type DistributorWithGeo = Distributor & {
  wilaya: Wilaya;
  commune: Commune;
  user: { username: string } | null;
};

export class DistributorMapper {
  static toDTO(distributor: DistributorWithGeo, deliveredOrdersCount: number): DistributorDTO {
    const dto = {
      id: distributor.id,
      hasAccount: distributor.userId !== null,
      username: distributor.user?.username ?? null,
      fullName: distributor.fullName,
      storeName: distributor.storeName,
      phone: distributor.phone ?? '',
      wilayaId: distributor.wilayaId,
      wilayaName: distributor.wilaya.frName,
      communeId: distributor.communeId,
      communeName: distributor.commune.frName,
      isEnabled: distributor.isEnabled,
      nbOfActiveCards: distributor.nbOfActiveCards,
      nbOfActivation: distributor.nbOfActivation,
      deliveredOrdersCount,
      createdAt: distributor.createdAt.toISOString(),
    };
    return DistributorResponseSchema.parse(dto);
  }

  static toDetailDTO(
    distributor: DistributorWithGeo,
    deliveredOrdersCount: number,
    soldKeys: number,
    ordersCount: number,
  ): DistributorDetailDTO {
    const dto = {
      ...DistributorMapper.toDTO(distributor, deliveredOrdersCount),
      soldKeys,
      ordersCount,
    };
    return DistributorDetailResponseSchema.parse(dto);
  }

  static toWithCredentialsDTO(
    distributor: DistributorWithGeo,
    deliveredOrdersCount: number,
    generatedPassword: string,
  ): DistributorWithCredentialsDTO {
    return DistributorWithCredentialsResponseSchema.parse({
      distributor: DistributorMapper.toDTO(distributor, deliveredOrdersCount),
      generatedPassword,
    });
  }
}
