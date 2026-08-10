import type { PrismaClient, Prisma } from '@prisma/client';
import { OrderRequestStat as PrismaOrderRequestStat, LogActionType as PrismaLogActionType } from '@prisma/client';
import { OrderRequestStat } from '@my-app/contract';
import type {
  CardOrderRequestDTO,
  LinkableCardOrderRequestDTO,
  PaginatedCardOrderRequests,
  GetCardOrderRequestsQuery,
  GetMyCardOrderRequestsQuery,
  CreateCardOrderRequestCommand,
  ReviewCardOrderRequestCommand,
} from '@my-app/contract';
import type { ICardOrderRequestService } from './card-order-request.interface';
import { CardOrderRequestMapper, type CardOrderRequestJoins } from './card-order-request.mapper';
import { buildPaginationMeta, toSkipTake } from '@common/http/pagination';
import { NotFoundError, ConflictError, ForbiddenError, BadRequestError } from '@common/errors';

const DETAIL_INCLUDE = {
  distributor: { select: { storeName: true } },
  subscriptionPlan: { select: { subscriptionType: true, subscriptionDuration: true } },
  reviewedBy: { select: { admin: { select: { fullName: true } } } },
  order: { select: { orderNumber: true } },
} as const;

const CANCELLABLE_STATS: PrismaOrderRequestStat[] = [
  PrismaOrderRequestStat.PENDING,
  PrismaOrderRequestStat.APPROVED,
];

// The touched request, or null when the order has no linked request — callers use this to
// decide whether to emit an event after their transaction commits.
export type PropagationResult = {
  id: string;
  distributorId: string;
  stat: OrderRequestStat;
  previousStat: OrderRequestStat;
  orderId: string | null;
};

// Exported so OrderService can join this transaction (Set 4 plan §3) — the request's status
// mirrors the order's on every OrderStat change, in the SAME transaction as the order write.
export async function propagateOrderStatToRequest(
  tx: Prisma.TransactionClient,
  orderId: string,
  to: PrismaOrderRequestStat,
  actorId: string,
): Promise<PropagationResult | null> {
  const request = await tx.cardOrderRequest.findUnique({ where: { orderId } });
  if (!request) return null;

  const previousStat = request.stat;
  await tx.cardOrderRequest.update({ where: { id: request.id }, data: { stat: to } });
  await tx.log.create({
    data: {
      actionType: PrismaLogActionType.CHANGE_ORDER_REQUEST_STAT,
      actionDescription: `Order request ${request.id} status changed from ${previousStat} to ${to} (order ${orderId})`,
      userId: actorId,
    },
  });

  return {
    id: request.id,
    distributorId: request.distributorId,
    stat: to as OrderRequestStat,
    previousStat: previousStat as OrderRequestStat,
    orderId: request.orderId,
  };
}

// Unlink case (Set 4 plan §2.2 / §3): reverts the request to APPROVED and clears orderId, in
// the caller's transaction. Used both by OrderService.delete() (before the hard delete) and by
// CardOrderRequestService.unlink() (its own transaction).
export async function unlinkRequestFromOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  actorId: string,
): Promise<PropagationResult | null> {
  const request = await tx.cardOrderRequest.findUnique({ where: { orderId } });
  if (!request) return null;

  const previousStat = request.stat;
  await tx.cardOrderRequest.update({
    where: { id: request.id },
    data: { stat: PrismaOrderRequestStat.APPROVED, orderId: null },
  });
  await tx.log.create({
    data: {
      actionType: PrismaLogActionType.CHANGE_ORDER_REQUEST_STAT,
      actionDescription: `Order request ${request.id} unlinked from order ${orderId} (reverted to APPROVED)`,
      userId: actorId,
    },
  });

  return {
    id: request.id,
    distributorId: request.distributorId,
    stat: OrderRequestStat.APPROVED,
    previousStat: previousStat as OrderRequestStat,
    orderId: null,
  };
}

export class CardOrderRequestService implements ICardOrderRequestService {
  constructor(private readonly prisma: PrismaClient) {}

  async getAll(query: GetCardOrderRequestsQuery): Promise<PaginatedCardOrderRequests> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = {
      ...(query.search && {
        distributor: { storeName: { contains: query.search, mode: 'insensitive' as const } },
      }),
      ...(query.distributorId && { distributorId: query.distributorId }),
      ...(query.subscriptionPlanId && { subscriptionPlanId: query.subscriptionPlanId }),
      ...(query.state && { stat: query.state as PrismaOrderRequestStat }),
      ...((query.dateFrom || query.dateTo) && {
        createdAt: {
          ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
          ...(query.dateTo && { lte: new Date(query.dateTo) }),
        },
      }),
    };

    const [requests, total] = await Promise.all([
      this.prisma.cardOrderRequest.findMany({
        where,
        include: DETAIL_INCLUDE,
        orderBy: { createdAt: 'desc' },
        ...toSkipTake({ page, limit }),
      }),
      this.prisma.cardOrderRequest.count({ where }),
    ]);

    const items = requests.map((r) => CardOrderRequestMapper.toDTO(r, r));
    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  async getMine(userId: string, query: GetMyCardOrderRequestsQuery): Promise<PaginatedCardOrderRequests> {
    const distributor = await this.resolveDistributor(userId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = {
      distributorId: distributor.id,
      ...(query.state && { stat: query.state as PrismaOrderRequestStat }),
    };

    const [requests, total] = await Promise.all([
      this.prisma.cardOrderRequest.findMany({
        where,
        include: DETAIL_INCLUDE,
        orderBy: { createdAt: 'desc' },
        ...toSkipTake({ page, limit }),
      }),
      this.prisma.cardOrderRequest.count({ where }),
    ]);

    const items = requests.map((r) => CardOrderRequestMapper.toDTO(r, r));
    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  async getLinkable(): Promise<LinkableCardOrderRequestDTO[]> {
    const requests = await this.prisma.cardOrderRequest.findMany({
      where: { stat: PrismaOrderRequestStat.APPROVED, orderId: null },
      include: {
        distributor: { select: { storeName: true } },
        subscriptionPlan: { select: { subscriptionType: true, subscriptionDuration: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return requests.map((r) => CardOrderRequestMapper.toLinkableDTO(r, r));
  }

  async getById(id: string): Promise<CardOrderRequestDTO> {
    const request = await this.prisma.cardOrderRequest.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!request) throw new NotFoundError('Order request not found');
    return CardOrderRequestMapper.toDTO(request, request);
  }

  async create(userId: string, cmd: CreateCardOrderRequestCommand): Promise<CardOrderRequestDTO> {
    const distributor = await this.resolveDistributor(userId);
    if (!distributor.isEnabled) throw new BadRequestError('Distributor is not enabled');

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: cmd.subscriptionPlanId } });
    if (!plan) throw new NotFoundError('Subscription plan not found');

    const created = await this.prisma.cardOrderRequest.create({
      data: {
        distributorId: distributor.id,
        subscriptionPlanId: cmd.subscriptionPlanId,
        nbOfCards: cmd.nbOfCards,
        ...(cmd.note !== undefined && { note: cmd.note }),
        stat: PrismaOrderRequestStat.PENDING,
      },
      include: DETAIL_INCLUDE,
    });

    return CardOrderRequestMapper.toDTO(created, created);
  }

  async approve(id: string, cmd: ReviewCardOrderRequestCommand, actorId: string): Promise<CardOrderRequestDTO> {
    const request = await this.prisma.cardOrderRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundError('Order request not found');
    if (request.stat !== PrismaOrderRequestStat.PENDING) {
      throw new ConflictError(`Cannot approve an order request in state ${request.stat}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cardOrderRequest.update({
        where: { id },
        data: {
          stat: PrismaOrderRequestStat.APPROVED,
          reviewedAt: new Date(),
          reviewedByUserId: actorId,
          ...(cmd.adminNote !== undefined && { adminNote: cmd.adminNote }),
        },
      });
      await tx.log.create({
        data: {
          actionType: PrismaLogActionType.CHANGE_ORDER_REQUEST_STAT,
          actionDescription: `Order request ${id} approved`,
          userId: actorId,
        },
      });
    });

    return this.getById(id);
  }

  async reject(id: string, cmd: ReviewCardOrderRequestCommand, actorId: string): Promise<CardOrderRequestDTO> {
    const request = await this.prisma.cardOrderRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundError('Order request not found');
    if (request.stat !== PrismaOrderRequestStat.PENDING) {
      throw new ConflictError(`Cannot reject an order request in state ${request.stat}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cardOrderRequest.update({
        where: { id },
        data: {
          stat: PrismaOrderRequestStat.REJECTED,
          reviewedAt: new Date(),
          reviewedByUserId: actorId,
          ...(cmd.adminNote !== undefined && { adminNote: cmd.adminNote }),
        },
      });
      await tx.log.create({
        data: {
          actionType: PrismaLogActionType.CHANGE_ORDER_REQUEST_STAT,
          actionDescription: `Order request ${id} rejected`,
          userId: actorId,
        },
      });
    });

    return this.getById(id);
  }

  async cancel(id: string, userId: string): Promise<CardOrderRequestDTO> {
    const distributor = await this.resolveDistributor(userId);
    const request = await this.prisma.cardOrderRequest.findFirst({
      where: { id, distributorId: distributor.id },
    });
    if (!request) throw new NotFoundError('Order request not found');
    if (!CANCELLABLE_STATS.includes(request.stat)) {
      throw new ConflictError(`Cannot cancel an order request in state ${request.stat}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cardOrderRequest.update({ where: { id }, data: { stat: PrismaOrderRequestStat.CANCELLED } });
      await tx.log.create({
        data: {
          actionType: PrismaLogActionType.CHANGE_ORDER_REQUEST_STAT,
          actionDescription: `Order request ${id} cancelled by distributor`,
          userId,
        },
      });
    });

    return this.getById(id);
  }

  async unlink(id: string, actorId: string): Promise<CardOrderRequestDTO> {
    const request = await this.prisma.cardOrderRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundError('Order request not found');
    if (request.stat !== PrismaOrderRequestStat.PENDING_DELIVERY || !request.orderId) {
      throw new ConflictError(`Cannot unlink an order request in state ${request.stat}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cardOrderRequest.update({
        where: { id },
        data: { stat: PrismaOrderRequestStat.APPROVED, orderId: null },
      });
      await tx.log.create({
        data: {
          actionType: PrismaLogActionType.CHANGE_ORDER_REQUEST_STAT,
          actionDescription: `Order request ${id} unlinked from order ${request.orderId} (reverted to APPROVED)`,
          userId: actorId,
        },
      });
    });

    return this.getById(id);
  }

  private async resolveDistributor(userId: string) {
    const distributor = await this.prisma.distributor.findFirst({ where: { userId, deletedAt: null } });
    if (!distributor) throw new ForbiddenError();
    return distributor;
  }
}
