import type { PrismaClient } from '@prisma/client';
import { LotStat as PrismaLotStat, CardStat } from '@prisma/client';
import { LogActionType, LotStat, CardUnavailableReason } from '@my-app/contract';
import type {
  LotDTO,
  CreateLotCommand,
  GetLotsQuery,
  GetAvailableLotsQuery,
  PaginatedResult,
  UnavailableCardDTO,
} from '@my-app/contract';
import type { ILotService } from './lot.interface';
import { LotMapper } from './lot.mapper';
import { generateLotNumber } from './lot.util';
import { lotEligibleCardWhere } from '@modules/card/card.eligibility';
import { buildPaginationMeta, toSkipTake } from '@common/http/pagination';
import { NotFoundError, ConflictError, BadRequestError } from '@common/errors';

// One reason per card, ordered most-likely-first (set-8-plan §5.1/§5.3). This is a DIAGNOSTIC
// classification only — the actual eligibility decision at write time is lotEligibleCardWhere,
// re-asserted inside the transaction (§5.3's step (c)); this only exists to explain a failure.
type CardDiagnosticRow = {
  id: string;
  key: string;
  cardStat: CardStat;
  subscriptionPlanId: string;
  lotId: string | null;
  isDisabled: boolean;
  isRevoked: boolean;
  deletedAt: Date | null;
};

function classifyCard(
  cardId: string,
  card: CardDiagnosticRow | undefined,
  subscriptionPlanId: string,
): UnavailableCardDTO | null {
  if (!card) return { cardId, key: null, reason: CardUnavailableReason.NOT_FOUND };
  if (card.deletedAt) return { cardId, key: card.key, reason: CardUnavailableReason.NOT_FOUND };
  if (card.lotId !== null) return { cardId, key: card.key, reason: CardUnavailableReason.ALREADY_IN_LOT };
  if (card.cardStat !== CardStat.PRINTED) return { cardId, key: card.key, reason: CardUnavailableReason.NOT_PRINTED };
  if (card.subscriptionPlanId !== subscriptionPlanId) return { cardId, key: card.key, reason: CardUnavailableReason.WRONG_PLAN };
  if (card.isDisabled) return { cardId, key: card.key, reason: CardUnavailableReason.DISABLED };
  if (card.isRevoked) return { cardId, key: card.key, reason: CardUnavailableReason.REVOKED };
  return null;
}

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

    const lotNumber = await this.uniqueLotNumber();

    const lot = await this.prisma.$transaction(async (tx) => {
      // (a) DIAGNOSTIC read — inside the transaction, so it sees a consistent snapshot. Its
      //     only job is to produce a human-readable failure list; correctness comes from (c).
      const rows = await tx.card.findMany({
        where: { id: { in: cmd.cardIds } },
        select: {
          id: true,
          key: true,
          cardStat: true,
          subscriptionPlanId: true,
          lotId: true,
          isDisabled: true,
          isRevoked: true,
          deletedAt: true,
        },
      });
      const byId = new Map(rows.map((c) => [c.id, c]));

      const unavailableCards = cmd.cardIds
        .map((id) => classifyCard(id, byId.get(id), cmd.subscriptionPlanId))
        .filter((x): x is UnavailableCardDTO => x !== null);

      if (unavailableCards.length > 0) {
        throw new ConflictError(
          `${unavailableCards.length} of the ${cmd.cardIds.length} selected cards are no longer available`,
          { unavailableCards },
        );
      }

      // (b) The lot.
      const created = await tx.lot.create({
        data: {
          lotNumber,
          subscriptionPlanId: cmd.subscriptionPlanId,
          lotStat: PrismaLotStat.PENDING,
          nbOfCards: cmd.cardIds.length,
        },
        include: { subscriptionPlan: true },
      });

      // (c) THE CORRECTNESS GUARD. The where clause re-asserts eligibility AT WRITE TIME, so a
      //     concurrent transaction that took one of these cards between (a) and here loses it
      //     from the match set and the count assertion below rolls us back. Without this, (a)
      //     alone is a check-then-act race — findMany takes no row locks.
      const assigned = await tx.card.updateMany({
        where: { id: { in: cmd.cardIds }, ...lotEligibleCardWhere(cmd.subscriptionPlanId) },
        data: { cardStat: CardStat.IN_LOT, lotId: created.id },
      });

      if (assigned.count !== cmd.cardIds.length) {
        // Reachable only in the (a)→(c) window. Rare, so it does not get a per-card breakdown —
        // the client refetches and retries, and the second attempt gets the precise list from (a).
        throw new ConflictError('Some selected cards were taken by another lot — refresh and retry');
      }

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
