import type { PrismaClient } from '@prisma/client';
import { CardStat as PrismaCardStat } from '@prisma/client';
import { LogActionType, CardStat, CardFlag } from '@my-app/contract';
import type {
  CardDTO,
  CardDetailDTO,
  AvailableCardDTO,
  GetCardsQuery,
  GetAvailableCardsQuery,
  PaginatedResult,
} from '@my-app/contract';
import type { ICardService } from './card.interface';
import { CardMapper, type CardJoins, type DistributionTimelineEntry } from './card.mapper';
import { buildPaginationMeta, toSkipTake } from '@common/http/pagination';
import { NotFoundError, ConflictError } from '@common/errors';

export class CardService implements ICardService {
  constructor(private readonly prisma: PrismaClient) {}

  async getAll(query: GetCardsQuery): Promise<PaginatedResult<CardDTO>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = {
      deletedAt: null,
      ...(query.search && { key: { contains: query.search, mode: 'insensitive' as const } }),
      ...(query.state && { cardStat: query.state as PrismaCardStat }),
      ...(query.setNumber && { set: { setNumber: { contains: query.setNumber, mode: 'insensitive' as const } } }),
      ...(query.lotNumber && { lot: { lotNumber: { contains: query.lotNumber, mode: 'insensitive' as const } } }),
      ...(query.distributorId && { distributorId: query.distributorId }),
      ...(query.subscriptionPlanId && { subscriptionPlanId: query.subscriptionPlanId }),
      ...(query.flag === CardFlag.disabled && { isDisabled: true }),
      ...(query.flag === CardFlag.revoked && { isRevoked: true }),
    };

    const [cards, total] = await Promise.all([
      this.prisma.card.findMany({
        where,
        include: { subscriptionPlan: true, set: true, lot: true, distributor: true },
        orderBy: { createdAt: 'desc' },
        ...toSkipTake({ page, limit }),
      }),
      this.prisma.card.count({ where }),
    ]);

    const items = cards.map((c) => CardMapper.toDTO(c, this.extractJoins(c)));
    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  async getAvailableForLot(query: GetAvailableCardsQuery): Promise<AvailableCardDTO[]> {
    const cards = await this.prisma.card.findMany({
      where: {
        cardStat: PrismaCardStat.PRINTED,
        subscriptionPlanId: query.subscriptionPlanId,
        lotId: null,
        isDisabled: false,
        deletedAt: null,
      },
      include: { subscriptionPlan: true },
      orderBy: { createdAt: 'asc' },
    });

    return cards.map((c) =>
      CardMapper.toAvailableDTO(c, c.subscriptionPlan as unknown as CardJoins['subscriptionPlan']),
    );
  }

  async getById(id: string): Promise<CardDetailDTO> {
    const card = await this.prisma.card.findUnique({
      where: { id },
      include: {
        subscriptionPlan: true,
        set: true,
        lot: {
          include: {
            orderLots: {
              include: { order: true },
              orderBy: { order: { createdAt: 'desc' } },
              take: 1,
            },
          },
        },
        distributor: true,
      },
    });

    if (!card) throw new NotFoundError('Card not found');

    return CardMapper.toDetailDTO(card, this.extractJoins(card), this.buildTimeline(card));
  }

  async delete(id: string, actorId: string): Promise<void> {
    const card = await this.prisma.card.findUnique({ where: { id } });

    if (!card) throw new NotFoundError('Card not found');

    if (card.cardStat !== PrismaCardStat.IN_SET && card.cardStat !== PrismaCardStat.PRINTED) {
      throw new ConflictError(`Cannot delete a card in state ${card.cardStat}`);
    }

    await this.prisma.card.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.prisma.log.create({
      data: {
        actionType: LogActionType.REMOVE_CARD,
        actionDescription: `Deleted card: ${card.key}`,
        userId: actorId,
      },
    });
  }

  async disable(id: string): Promise<CardDTO> {
    const card = await this.prisma.card.findUnique({
      where: { id },
      include: { subscriptionPlan: true, set: true, lot: true, distributor: true },
    });

    if (!card) throw new NotFoundError('Card not found');

    if (
      card.cardStat !== PrismaCardStat.IN_LOT &&
      card.cardStat !== PrismaCardStat.AT_DISTRIBUTOR
    ) {
      throw new ConflictError(`Cannot disable a card in state ${card.cardStat}`);
    }

    if (card.isDisabled) {
      throw new ConflictError('Card is already disabled');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.card.update({
        where: { id },
        data: { isDisabled: true, isActive: false },
        include: { subscriptionPlan: true, set: true, lot: true, distributor: true },
      });

      if (card.cardStat === PrismaCardStat.AT_DISTRIBUTOR && card.distributorId) {
        await tx.distributor.update({
          where: { id: card.distributorId },
          data: { nbOfActiveCards: { decrement: 1 } },
        });
      }

      return u;
    });

    return CardMapper.toDTO(updated, this.extractJoins(updated));
  }

  async enable(id: string): Promise<CardDTO> {
    const card = await this.prisma.card.findUnique({
      where: { id },
      include: { subscriptionPlan: true, set: true, lot: true, distributor: true },
    });

    if (!card) throw new NotFoundError('Card not found');

    if (!card.isDisabled) {
      throw new ConflictError('Card is not disabled');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.card.update({
        where: { id },
        data: { isDisabled: false, isActive: true, cardStat: PrismaCardStat.AT_DISTRIBUTOR },
        include: { subscriptionPlan: true, set: true, lot: true, distributor: true },
      });

      if (card.distributorId) {
        await tx.distributor.update({
          where: { id: card.distributorId },
          data: { nbOfActiveCards: { increment: 1 } },
        });
      }

      return u;
    });

    return CardMapper.toDTO(updated, this.extractJoins(updated));
  }

  async revoke(id: string, actorId: string): Promise<CardDTO> {
    const card = await this.prisma.card.findUnique({
      where: { id },
      include: { subscriptionPlan: true, set: true, lot: true, distributor: true },
    });

    if (!card) throw new NotFoundError('Card not found');

    if (card.cardStat !== PrismaCardStat.ACTIVATION_FAILED) {
      throw new ConflictError(`Cannot revoke a card in state ${card.cardStat}`);
    }

    if (card.isDisabled) {
      throw new ConflictError('Cannot revoke a disabled card');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.card.update({
        where: { id },
        data: { isRevoked: true, isActive: true, cardStat: PrismaCardStat.AT_DISTRIBUTOR },
        include: { subscriptionPlan: true, set: true, lot: true, distributor: true },
      });

      if (card.distributorId) {
        await tx.distributor.update({
          where: { id: card.distributorId },
          data: { nbOfActiveCards: { increment: 1 } },
        });
      }

      return u;
    });

    await this.prisma.log.create({
      data: {
        actionType: LogActionType.REVOKE_CARD,
        actionDescription: `Revoked card: ${card.key}`,
        userId: actorId,
      },
    });

    return CardMapper.toDTO(updated, this.extractJoins(updated));
  }

  private extractJoins(card: {
    subscriptionPlan: { subscriptionType: string; subscriptionDuration: string };
    set: { setNumber: string };
    lot: { lotNumber: string } | null;
    distributor: { storeName: string } | null;
  }): CardJoins {
    return {
      subscriptionPlan: card.subscriptionPlan as unknown as CardJoins['subscriptionPlan'],
      set: { setNumber: card.set.setNumber },
      lot: card.lot ? { lotNumber: card.lot.lotNumber } : null,
      distributor: card.distributor ? { storeName: card.distributor.storeName } : null,
    };
  }

  private buildTimeline(card: {
    set: { createdAt: Date; printedAt: Date | null };
    lot: {
      createdAt: Date;
      orderLots: Array<{ order: { completedAt: Date | null } }>;
    } | null;
  }): DistributionTimelineEntry[] {
    const timeline: DistributionTimelineEntry[] = [];

    timeline.push({ stat: CardStat.IN_SET, at: card.set.createdAt });

    if (card.set.printedAt) {
      timeline.push({ stat: CardStat.PRINTED, at: card.set.printedAt });
    }

    if (card.lot) {
      timeline.push({ stat: CardStat.IN_LOT, at: card.lot.createdAt });

      const completedAt = card.lot.orderLots[0]?.order.completedAt;
      if (completedAt) {
        timeline.push({ stat: CardStat.AT_DISTRIBUTOR, at: completedAt });
      }
    }

    return timeline;
  }
}
