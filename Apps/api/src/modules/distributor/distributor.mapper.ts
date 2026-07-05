import type { Distributor, Wilaya, Commune } from '@prisma/client';
import {
  DistributorResponseSchema,
  DistributorDetailResponseSchema,
  type DistributorDTO,
  type DistributorDetailDTO,
} from '@my-app/contract';

type DistributorWithGeo = Distributor & { wilaya: Wilaya; commune: Commune };

export class DistributorMapper {
  static toDTO(distributor: DistributorWithGeo, deliveredOrdersCount: number): DistributorDTO {
    const dto = {
      id: distributor.id,
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
      id: distributor.id,
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
      soldKeys,
      ordersCount,
    };
    return DistributorDetailResponseSchema.parse(dto);
  }
}
