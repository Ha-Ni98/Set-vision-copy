import type { PrismaClient } from '@prisma/client';
import { LotStat as PrismaLotStat, CardStat } from '@prisma/client';
import { LogActionType, LotStat } from '@my-app/contract';
import type {
  LotDTO,
  CreateLotCommand,
  GetLotsQuery,
  GetAvailableLotsQuery,
  PaginatedResult,
} from '@my-app/contract';
import type { ILotService } from './lot.interface';
import { LotMapper } from './lot.mapper';
import { generateLotNumber } from './lot.util';
import { buildPaginationMeta, toSkipTake } from '@common/http/pagination';
import { NotFoundError, ConflictError, BadRequestError } from '@common/errors';

export class LotService implements ILotService {
  constructor(private readonly prisma: PrismaClient) {}

  async getAll(query: GetLotsQuery): Promise<PaginatedResult<LotDTO>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = {
      ...(query.search && { lotNumber: { contains: query.search, mode: 'insensitive' as const } }),
      ...(query.subscriptionPlanId && { subscriptionPlanId: query.subscriptionPlanId }),
      ...(query.state && { lotStat: query.state as PrismaLotStat }),
    };

    const [lots, total] = await Promise.all([
      this.prisma.lot.findMany({
        where,
        include: { subscriptionPlan: true },
        orderBy: { createdAt: 'desc' },
        ...toSkipTake({ page, limit }),
      }),
      this.prisma.lot.count({ where }),
    ]);

    const items = await Promise.all(
      lots.map(async (lot) => {
        const deliveredCardsCount = await this.prisma.card.count({
          where: { lotId: lot.id, cardStat: CardStat.AT_DISTRIBUTOR },
        });
        return LotMapper.toDTO(lot, lot.subscriptionPlan, deliveredCardsCount);
      }),
    );

    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  async getAvailableForOrder(query: GetAvailableLotsQuery): Promise<LotDTO[]> {
    const lots = await this.prisma.lot.findMany({
      where: {
        lotStat: { in: [PrismaLotStat.PENDING, PrismaLotStat.RETURNED] },
        ...(query.subscriptionPlanId && { subscriptionPlanId: query.subscriptionPlanId }),
      },
      include: { subscriptionPlan: true },
      orderBy: { createdAt: 'asc' },
    });

    return Promise.all(
      lots.map(async (lot) => {
        const deliveredCardsCount = await this.prisma.card.count({
          where: { lotId: lot.id, cardStat: CardStat.AT_DISTRIBUTOR },
        });
        return LotMapper.toDTO(lot, lot.subscriptionPlan, deliveredCardsCount);
      }),
    );
  }

  async create(cmd: CreateLotCommand, _actorId: string): Promise<LotDTO> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: cmd.subscriptionPlanId },
    });
    if (!plan || !plan.isActive) {
      throw new BadRequestError('Subscription plan not found or inactive');
    }

    const cards = await this.prisma.card.findMany({
      where: { id: { in: cmd.cardIds } },
      select: { id: true, cardStat: true, subscriptionPlanId: true, lotId: true },
    });

    if (cards.length !== cmd.cardIds.length) {
      throw new BadRequestError('One or more card IDs not found');
    }

    for (const card of cards) {
      if (card.lotId !== null) {
        throw new ConflictError(`Card ${card.id} is already assigned to a lot`);
      }
      if (card.cardStat !== CardStat.PRINTED) {
        throw new BadRequestError(`Card ${card.id} is not in PRINTED state`);
      }
      if (card.subscriptionPlanId !== cmd.subscriptionPlanId) {
        throw new BadRequestError(`Card ${card.id} belongs to a different subscription plan`);
      }
    }

    const lotNumber = await this.uniqueLotNumber();

    const lot = await this.prisma.$transaction(async (tx) => {
      const created = await tx.lot.create({
        data: {
          lotNumber,
          subscriptionPlanId: cmd.subscriptionPlanId,
          lotStat: PrismaLotStat.PENDING,
          nbOfCards: cmd.cardIds.length,
        },
        include: { subscriptionPlan: true },
      });

      await tx.card.updateMany({
        where: { id: { in: cmd.cardIds } },
        data: { cardStat: CardStat.IN_LOT, lotId: created.id },
      });

      return created;
    });

    return LotMapper.toDTO(lot, lot.subscriptionPlan, 0);
  }

  async delete(id: string, actorId: string): Promise<void> {
    const lot = await this.prisma.lot.findUnique({ where: { id } });

    if (!lot) throw new NotFoundError('Lot not found');

    if (lot.lotStat !== PrismaLotStat.PENDING) {
      throw new ConflictError(`Cannot delete a lot in state ${lot.lotStat}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.card.updateMany({
        where: { lotId: id, cardStat: CardStat.IN_LOT },
        data: { cardStat: CardStat.PRINTED, lotId: null },
      });
      await tx.lot.delete({ where: { id } });
    });

    await this.prisma.log.create({
      data: {
        actionType: LogActionType.REMOVE_LOT,
        actionDescription: `Deleted lot: ${lot.lotNumber}`,
        userId: actorId,
      },
    });
  }

  private async uniqueLotNumber(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const candidate = generateLotNumber();
      const existing = await this.prisma.lot.findUnique({ where: { lotNumber: candidate } });
      if (!existing) return candidate;
    }
    throw new Error('Failed to generate a unique lot number');
  }
}
