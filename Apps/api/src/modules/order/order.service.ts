import type { PrismaClient } from '@prisma/client';
import { LotStat as PrismaLotStat, CardStat, OrderStat as PrismaOrderStat } from '@prisma/client';
import { OrderStat, type SubscriptionType, type SubscriptionDuration } from '@my-app/contract';
import type {
  OrderDTO,
  OrderDetailDTO,
  CreateOrderCommand,
  TransitionOrderCommand,
  GetOrdersQuery,
  PaginatedResult,
} from '@my-app/contract';
import type { IOrderService } from './order.interface';
import { OrderMapper, type LotBreakdown, type OrderJoins } from './order.mapper';
import { generateOrderNumber } from './order.util';
import { buildPaginationMeta, toSkipTake } from '@common/http/pagination';
import { NotFoundError, ConflictError, BadRequestError } from '@common/errors';

const ALLOWED_TRANSITIONS: Partial<Record<PrismaOrderStat, PrismaOrderStat[]>> = {
  [PrismaOrderStat.PENDING_DELIVERY]: [PrismaOrderStat.IN_DELIVERY],
  [PrismaOrderStat.IN_DELIVERY]: [PrismaOrderStat.DELIVERED, PrismaOrderStat.RETURNED],
};

export class OrderService implements IOrderService {
  constructor(private readonly prisma: PrismaClient) {}

  async getAll(query: GetOrdersQuery): Promise<PaginatedResult<OrderDTO>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = {
      ...(query.search && {
        OR: [
          { orderNumber: { contains: query.search, mode: 'insensitive' as const } },
          { receivedName: { contains: query.search, mode: 'insensitive' as const } },
          { distributor: { storeName: { contains: query.search, mode: 'insensitive' as const } } },
        ],
      }),
      ...(query.distributorId && { distributorId: query.distributorId }),
      ...(query.wilayaId && { wilayaId: query.wilayaId }),
      ...(query.deliveryCompanyId && { deliveryCompanyId: query.deliveryCompanyId }),
      ...(query.state && { orderStat: query.state as PrismaOrderStat }),
      ...((query.dateFrom || query.dateTo) && {
        createdAt: {
          ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
          ...(query.dateTo && { lte: new Date(query.dateTo) }),
        },
      }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          distributor: { select: { storeName: true } },
          wilaya: { select: { frName: true } },
          commune: { select: { frName: true } },
          deliveryCompany: { select: { name: true } },
          orderLots: { include: { lot: { select: { lotNumber: true, nbOfCards: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        ...toSkipTake({ page, limit }),
      }),
      this.prisma.order.count({ where }),
    ]);

    const items = orders.map((order) => OrderMapper.toDTO(order, this.extractJoins(order)));
    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  async getById(id: string): Promise<OrderDetailDTO> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        distributor: { select: { storeName: true } },
        wilaya: { select: { frName: true } },
        commune: { select: { frName: true } },
        deliveryCompany: { select: { name: true } },
        orderLots: { include: { lot: { include: { subscriptionPlan: true } } } },
      },
    });

    if (!order) throw new NotFoundError('Order not found');

    const joins = this.extractJoins(order);
    const lots: LotBreakdown[] = order.orderLots.map((ol) => ({
      lotId: ol.lot.id,
      lotNumber: ol.lot.lotNumber,
      subscriptionPlan: {
        subscriptionType: ol.lot.subscriptionPlan.subscriptionType as unknown as SubscriptionType,
        subscriptionDuration: ol.lot.subscriptionPlan.subscriptionDuration as unknown as SubscriptionDuration,
      },
      cardsCount: ol.lot.nbOfCards,
      lotStat: ol.lot.lotStat,
    }));

    return OrderMapper.toDetailDTO(order, joins, lots);
  }

  async create(cmd: CreateOrderCommand): Promise<OrderDTO> {
    const distributor = await this.prisma.distributor.findUnique({ where: { id: cmd.distributorId } });
    if (!distributor) throw new NotFoundError('Distributor not found');
    if (!distributor.isEnabled) throw new BadRequestError('Distributor is not enabled');

    const deliveryCompany = await this.prisma.deliveryCompany.findUnique({ where: { id: cmd.deliveryCompanyId } });
    if (!deliveryCompany || !deliveryCompany.isActive) {
      throw new BadRequestError('Delivery company not found or inactive');
    }

    const commune = await this.prisma.commune.findUnique({ where: { id: cmd.communeId } });
    if (!commune || commune.wilayaId !== cmd.wilayaId) {
      throw new BadRequestError('Commune does not belong to the specified wilaya');
    }

    const lots = await this.prisma.lot.findMany({ where: { id: { in: cmd.lotIds } } });
    if (lots.length !== cmd.lotIds.length) {
      throw new BadRequestError('One or more lot IDs not found');
    }
    for (const lot of lots) {
      if (lot.lotStat !== PrismaLotStat.PENDING && lot.lotStat !== PrismaLotStat.RETURNED) {
        throw new ConflictError(`Lot ${lot.id} is not available for order (state: ${lot.lotStat})`);
      }
    }

    const orderNumber = await this.uniqueOrderNumber();

    const created = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          distributorId: cmd.distributorId,
          receivedName: cmd.receivedName,
          receivedPhone: cmd.receivedPhone,
          wilayaId: cmd.wilayaId,
          communeId: cmd.communeId,
          deliveryCompanyId: cmd.deliveryCompanyId,
          deliveryType: cmd.deliveryType,
          orderPrice: cmd.orderPrice,
          deliverPrice: cmd.deliverPrice,
          orderStat: PrismaOrderStat.PENDING_DELIVERY,
        },
      });

      await tx.orderLot.createMany({
        data: cmd.lotIds.map((lotId) => ({ orderId: order.id, lotId })),
      });

      await tx.lot.updateMany({
        where: { id: { in: cmd.lotIds } },
        data: { lotStat: PrismaLotStat.IN_DELIVERY },
      });

      return order;
    });

    return this.loadOrderDTO(created.id);
  }

  async transition(id: string, cmd: TransitionOrderCommand): Promise<OrderDTO> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderLots: { include: { lot: { select: { nbOfCards: true } } } },
      },
    });

    if (!order) throw new NotFoundError('Order not found');

    const allowed = ALLOWED_TRANSITIONS[order.orderStat as PrismaOrderStat] ?? [];
    if (!allowed.includes(cmd.to as PrismaOrderStat)) {
      throw new ConflictError(`Cannot transition order from ${order.orderStat} to ${cmd.to}`);
    }

    const lotIds = order.orderLots.map((ol) => ol.lotId);
    const now = new Date();

    if (cmd.to === OrderStat.IN_DELIVERY) {
      await this.prisma.order.update({
        where: { id },
        data: { orderStat: PrismaOrderStat.IN_DELIVERY },
      });
    } else if (cmd.to === OrderStat.DELIVERED) {
      const totalCards = order.orderLots.reduce((sum, ol) => sum + ol.lot.nbOfCards, 0);
      const cardsDeliveredCount = cmd.deliveredCount ?? totalCards;

      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id },
          data: { orderStat: PrismaOrderStat.DELIVERED, completedAt: now, cardsDeliveredCount },
        });
        await tx.lot.updateMany({
          where: { id: { in: lotIds } },
          data: { lotStat: PrismaLotStat.DELIVERED, deliveryDate: now },
        });
        const result = await tx.card.updateMany({
          where: { lotId: { in: lotIds } },
          data: { cardStat: CardStat.AT_DISTRIBUTOR, isActive: true, distributorId: order.distributorId },
        });
        await tx.distributor.update({
          where: { id: order.distributorId },
          data: { nbOfActiveCards: { increment: result.count } },
        });
      });
    } else {
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id },
          data: { orderStat: PrismaOrderStat.RETURNED, completedAt: now },
        });
        await tx.lot.updateMany({
          where: { id: { in: lotIds } },
          data: { lotStat: PrismaLotStat.RETURNED, isReturned: true },
        });
      });
    }

    return this.loadOrderDTO(id);
  }

  async delete(id: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderLots: { include: { lot: { select: { isReturned: true } } } },
      },
    });

    if (!order) throw new NotFoundError('Order not found');

    if (order.orderStat !== PrismaOrderStat.PENDING_DELIVERY) {
      throw new ConflictError(`Cannot delete order in state ${order.orderStat}`);
    }

    const returnedLotIds = order.orderLots.filter((ol) => ol.lot.isReturned).map((ol) => ol.lotId);
    const normalLotIds = order.orderLots.filter((ol) => !ol.lot.isReturned).map((ol) => ol.lotId);

    await this.prisma.$transaction(async (tx) => {
      if (returnedLotIds.length > 0) {
        await tx.lot.updateMany({
          where: { id: { in: returnedLotIds } },
          data: { lotStat: PrismaLotStat.RETURNED },
        });
      }
      if (normalLotIds.length > 0) {
        await tx.lot.updateMany({
          where: { id: { in: normalLotIds } },
          data: { lotStat: PrismaLotStat.PENDING },
        });
      }
      await tx.order.delete({ where: { id } });
    });
  }

  private async loadOrderDTO(id: string): Promise<OrderDTO> {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: {
        distributor: { select: { storeName: true } },
        wilaya: { select: { frName: true } },
        commune: { select: { frName: true } },
        deliveryCompany: { select: { name: true } },
        orderLots: { include: { lot: { select: { lotNumber: true, nbOfCards: true } } } },
      },
    });
    return OrderMapper.toDTO(order, this.extractJoins(order));
  }

  private extractJoins(order: {
    distributor: { storeName: string };
    wilaya: { frName: string };
    commune: { frName: string };
    deliveryCompany: { name: string };
    orderLots: Array<{ lot: { lotNumber: string; nbOfCards: number } }>;
  }): OrderJoins {
    return {
      distributor: { storeName: order.distributor.storeName },
      wilaya: { frName: order.wilaya.frName },
      commune: { frName: order.commune.frName },
      deliveryCompany: { name: order.deliveryCompany.name },
      lotNumbers: order.orderLots.map((ol) => ol.lot.lotNumber),
      cardsCount: order.orderLots.reduce((sum, ol) => sum + ol.lot.nbOfCards, 0),
    };
  }

  private async uniqueOrderNumber(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const candidate = generateOrderNumber();
      const existing = await this.prisma.order.findUnique({ where: { orderNumber: candidate } });
      if (!existing) return candidate;
    }
    throw new Error('Failed to generate a unique order number');
  }
}
