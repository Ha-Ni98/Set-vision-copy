import type { PrismaClient, Prisma } from '@prisma/client';
import type { IDistributorService } from './distributor.interface';
import { DistributorMapper } from './distributor.mapper';
import { NotFoundError, BadRequestError } from '@common/errors';
import { LogActionType, CardStat, OrderStat } from '@my-app/contract';
import { buildPaginationMeta, toSkipTake } from '@common/http/pagination';
import type {
  DistributorDTO,
  DistributorDetailDTO,
  PaginatedDistributors,
  GetDistributorsQuery,
  CreateDistributorCommand,
  UpdateDistributorCommand,
} from '@my-app/contract';

const GEO_INCLUDE = { wilaya: true, commune: true } as const;

export class DistributorService implements IDistributorService {
  constructor(private prisma: PrismaClient) {}

  async getAll(query: GetDistributorsQuery): Promise<PaginatedDistributors> {
    const conditions: Prisma.DistributorWhereInput[] = [{ deletedAt: null }];

    if (query.search) {
      conditions.push({
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { storeName: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }
    if (query.wilayaId) conditions.push({ wilayaId: query.wilayaId });
    if (query.communeId) conditions.push({ communeId: query.communeId });

    const where: Prisma.DistributorWhereInput = { AND: conditions };

    const [rows, total] = await Promise.all([
      this.prisma.distributor.findMany({
        where,
        include: GEO_INCLUDE,
        orderBy: { fullName: 'asc' },
        ...toSkipTake({ page: query.page ?? 1, limit: query.limit ?? 10 }),
      }),
      this.prisma.distributor.count({ where }),
    ]);

    const distributorIds = rows.map((d) => d.id);
    const deliveredCounts = distributorIds.length > 0
      ? await this.prisma.order.groupBy({
          by: ['distributorId'],
          where: { distributorId: { in: distributorIds }, orderStat: OrderStat.DELIVERED },
          _count: { _all: true },
        })
      : [];

    const deliveredMap = new Map(deliveredCounts.map((r) => [r.distributorId, r._count._all]));

    return {
      items: rows.map((d) => DistributorMapper.toDTO(d, deliveredMap.get(d.id) ?? 0)),
      meta: buildPaginationMeta(query.page ?? 1, query.limit ?? 10, total),
    };
  }

  async create(cmd: CreateDistributorCommand, actorId: string): Promise<DistributorDTO> {
    await this.validateCommuneBelongsToWilaya(cmd.communeId, cmd.wilayaId);

    const distributor = await this.prisma.$transaction(async (tx) => {
      const d = await tx.distributor.create({
        data: {
          fullName: cmd.fullName.trim(),
          storeName: cmd.storeName.trim(),
          phone: cmd.phone.trim(),
          wilayaId: cmd.wilayaId,
          communeId: cmd.communeId,
          isEnabled: true,
          nbOfActiveCards: 0,
          nbOfActivation: 0,
        },
        include: GEO_INCLUDE,
      });

      await tx.log.create({
        data: {
          actionType: LogActionType.ADD_DISTRIBUTOR,
          actionDescription: `Created distributor ${d.fullName}`,
          userId: actorId,
        },
      });

      return d;
    });

    return DistributorMapper.toDTO(distributor, 0);
  }

  async getById(id: string): Promise<DistributorDetailDTO> {
    const distributor = await this.prisma.distributor.findFirst({
      where: { id, deletedAt: null },
      include: GEO_INCLUDE,
    });
    if (!distributor) throw new NotFoundError('Distributor not found');

    const [soldKeys, ordersCount, deliveredCount] = await Promise.all([
      this.prisma.card.count({ where: { distributorId: id, cardStat: CardStat.ACTIVATED } }),
      this.prisma.order.count({ where: { distributorId: id } }),
      this.prisma.order.count({ where: { distributorId: id, orderStat: OrderStat.DELIVERED } }),
    ]);

    return DistributorMapper.toDetailDTO(distributor, deliveredCount, soldKeys, ordersCount);
  }

  async update(id: string, cmd: UpdateDistributorCommand, actorId: string): Promise<DistributorDTO> {
    const existing = await this.prisma.distributor.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Distributor not found');

    if (cmd.wilayaId !== undefined || cmd.communeId !== undefined) {
      const targetWilayaId = cmd.wilayaId ?? existing.wilayaId;
      const targetCommuneId = cmd.communeId ?? existing.communeId;
      await this.validateCommuneBelongsToWilaya(targetCommuneId, targetWilayaId);
    }

    const distributor = await this.prisma.$transaction(async (tx) => {
      const d = await tx.distributor.update({
        where: { id },
        data: {
          ...(cmd.fullName !== undefined && { fullName: cmd.fullName.trim() }),
          ...(cmd.storeName !== undefined && { storeName: cmd.storeName.trim() }),
          ...(cmd.phone !== undefined && { phone: cmd.phone.trim() }),
          ...(cmd.wilayaId !== undefined && { wilayaId: cmd.wilayaId }),
          ...(cmd.communeId !== undefined && { communeId: cmd.communeId }),
        },
        include: GEO_INCLUDE,
      });

      await tx.log.create({
        data: {
          actionType: LogActionType.CHANGE_DISTRIBUTOR_INFORMATION,
          actionDescription: `Updated distributor ${d.fullName}`,
          userId: actorId,
        },
      });

      return d;
    });

    const deliveredCount = await this.prisma.order.count({
      where: { distributorId: id, orderStat: OrderStat.DELIVERED },
    });

    return DistributorMapper.toDTO(distributor, deliveredCount);
  }

  async toggle(id: string, actorId: string): Promise<DistributorDTO> {
    const existing = await this.prisma.distributor.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Distributor not found');

    const distributor = await this.prisma.$transaction(async (tx) => {
      const d = await tx.distributor.update({
        where: { id },
        data: { isEnabled: !existing.isEnabled },
        include: GEO_INCLUDE,
      });

      await tx.log.create({
        data: {
          actionType: LogActionType.CHANGE_DISTRIBUTOR_STAT,
          actionDescription: `${d.isEnabled ? 'Enabled' : 'Disabled'} distributor ${d.fullName}`,
          userId: actorId,
        },
      });

      return d;
    });

    const deliveredCount = await this.prisma.order.count({
      where: { distributorId: id, orderStat: OrderStat.DELIVERED },
    });

    return DistributorMapper.toDTO(distributor, deliveredCount);
  }

  async delete(id: string, _actorId: string): Promise<void> {
    const existing = await this.prisma.distributor.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Distributor not found');

    await this.prisma.distributor.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async validateCommuneBelongsToWilaya(communeId: string, wilayaId: string): Promise<void> {
    const commune = await this.prisma.commune.findFirst({ where: { id: communeId, wilayaId } });
    if (!commune) throw new BadRequestError('Commune does not belong to the specified wilaya');
  }
}
