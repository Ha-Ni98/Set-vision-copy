import type { Distributor, Wilaya, Commune } from '@prisma/client';
import {
  DistributorResponseSchema,
  DistributorDetailResponseSchema,
  DistributorWithCredentialsResponseSchema,
  DistributorDashboardResponseSchema,
  type CardStat,
  type DistributorDTO,
  type DistributorDetailDTO,
  type DistributorWithCredentialsDTO,
  type DistributorDashboardDTO,
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

  static toDashboardDTO(
    rows: Array<{ cardStat: string; isDisabled: boolean; isRevoked: boolean; _count: { _all: number } }>,
  ): DistributorDashboardDTO {
    const byStat = new Map<CardStat, number>();
    let totalCards = 0;
    let disabledCards = 0;
    let revokedCards = 0;

    for (const row of rows) {
      const stat = row.cardStat as CardStat;
      byStat.set(stat, (byStat.get(stat) ?? 0) + row._count._all);
      totalCards += row._count._all;
      if (row.isDisabled) disabledCards += row._count._all;
      if (row.isRevoked) revokedCards += row._count._all;
    }

    const dto: DistributorDashboardDTO = {
      cardsByStat: Array.from(byStat.entries()).map(([stat, count]) => ({ stat, count })),
      totalCards,
      disabledCards,
      revokedCards,
    };
    return DistributorDashboardResponseSchema.parse(dto);
  }
}
