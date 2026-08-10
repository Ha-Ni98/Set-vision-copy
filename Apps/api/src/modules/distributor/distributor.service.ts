import type { PrismaClient, Prisma } from '@prisma/client';
import type { IDistributorService } from './distributor.interface';
import { DistributorMapper } from './distributor.mapper';
import { NotFoundError, BadRequestError, ConflictError } from '@common/errors';
import { LogActionType, CardStat, OrderStat, UserRole } from '@my-app/contract';
import { buildPaginationMeta, toSkipTake } from '@common/http/pagination';
import { hashPassword } from '@common/utils/password.utils';
import { generateTempPassword } from '@common/utils/password-generator.util';
import { resolveDistributorScope } from '@common/auth/distributor-scope';
import type {
  DistributorDTO,
  DistributorDetailDTO,
  DistributorWithCredentialsDTO,
  DistributorDashboardDTO,
  PaginatedDistributors,
  GetDistributorsQuery,
  CreateDistributorCommand,
  UpdateDistributorCommand,
  CreateDistributorAccountCommand,
} from '@my-app/contract';

const GEO_INCLUDE = {
  wilaya: true,
  commune: true,
  user: { select: { username: true } },
} as const;

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
          { user: { username: { contains: query.search, mode: 'insensitive' } } },
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

    const nextEnabled = !existing.isEnabled;

    const distributor = await this.prisma.$transaction(async (tx) => {
      const d = await tx.distributor.update({
        where: { id },
        data: { isEnabled: nextEnabled },
        include: GEO_INCLUDE,
      });

      // A distributor and its login are two independent `isEnabled` flags today — keep them
      // in lockstep so disabling a distributor doesn't leave its login live (Set 1 Q2).
      if (existing.userId) {
        await tx.user.update({
          where: { id: existing.userId },
          data: { isEnabled: nextEnabled },
        });
      }

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

  async delete(id: string, actorId: string): Promise<void> {
    const existing = await this.prisma.distributor.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('Distributor not found');

    await this.prisma.$transaction(async (tx) => {
      // Deleting a distributor with a linked login must not leave that login able to sign
      // in (Set 1 Q5) — unlink it the same way unlinkAccount() does, in the same transaction.
      if (existing.userId) {
        await tx.refreshToken.deleteMany({ where: { userId: existing.userId } });
        await tx.user.update({
          where: { id: existing.userId },
          data: { deletedAt: new Date(), isEnabled: false },
        });
        await tx.log.create({
          data: {
            actionType: LogActionType.UNLINK_USER_ACCOUNT,
            actionDescription: `Unlinked login from distributor ${existing.fullName} (deleted)`,
            userId: actorId,
          },
        });
      }

      await tx.distributor.update({
        where: { id },
        data: { deletedAt: new Date(), ...(existing.userId && { userId: null }) },
      });
    });
  }

  async createAccount(
    id: string,
    cmd: CreateDistributorAccountCommand,
    actorId: string,
  ): Promise<DistributorWithCredentialsDTO> {
    const existing = await this.prisma.distributor.findFirst({
      where: { id, deletedAt: null },
      include: GEO_INCLUDE,
    });
    if (!existing) throw new NotFoundError('Distributor not found');
    if (existing.userId) throw new ConflictError('Distributor already has an account');

    const username = cmd.username.trim();
    const usernameConflict = await this.prisma.user.findUnique({ where: { username } });
    if (usernameConflict) throw new ConflictError('Username already taken');

    const tempPassword = cmd.password ?? generateTempPassword();
    const hashed = await hashPassword(tempPassword);

    const distributor = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username, password: hashed, role: UserRole.DISTRIBUTOR, isEnabled: true },
      });
      const d = await tx.distributor.update({
        where: { id },
        data: { userId: user.id },
        include: GEO_INCLUDE,
      });
      await tx.log.create({
        data: {
          actionType: LogActionType.LINK_USER_ACCOUNT,
          actionDescription: `Linked login ${user.username} to distributor ${d.fullName}`,
          userId: actorId,
        },
      });
      return d;
    });

    const deliveredCount = await this.prisma.order.count({
      where: { distributorId: id, orderStat: OrderStat.DELIVERED },
    });

    return DistributorMapper.toWithCredentialsDTO(distributor, deliveredCount, tempPassword);
  }

  async unlinkAccount(id: string, actorId: string): Promise<DistributorDTO> {
    const existing = await this.prisma.distributor.findFirst({
      where: { id, deletedAt: null },
      include: GEO_INCLUDE,
    });
    if (!existing) throw new NotFoundError('Distributor not found');
    if (!existing.userId) throw new NotFoundError('Distributor has no account');

    const userId = existing.userId;

    const distributor = await this.prisma.$transaction(async (tx) => {
      // Kills live sessions immediately — refresh is dead now, and the access token expires
      // on its own short TTL (Set 1 plan §3.10).
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.user.update({
        where: { id: userId },
        data: { deletedAt: new Date(), isEnabled: false },
      });
      const d = await tx.distributor.update({
        where: { id },
        data: { userId: null },
        include: GEO_INCLUDE,
      });
      await tx.log.create({
        data: {
          actionType: LogActionType.UNLINK_USER_ACCOUNT,
          actionDescription: `Unlinked login from distributor ${d.fullName}`,
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

  private async validateCommuneBelongsToWilaya(communeId: string, wilayaId: string): Promise<void> {
    const commune = await this.prisma.commune.findFirst({ where: { id: communeId, wilayaId } });
    if (!commune) throw new BadRequestError('Commune does not belong to the specified wilaya');
  }

  async myDashboard(principalUserId: string): Promise<DistributorDashboardDTO> {
    const distributor = await resolveDistributorScope(this.prisma, principalUserId);

    // ONE round trip. Grouping on the two boolean flags alongside cardStat yields at most
    // 7 x 2 x 2 = 28 rows, cheaper to fold in memory than three extra COUNT queries
    // (Set 7 execute prompt: "One aggregated summary endpoint. No N+1.").
    const rows = await this.prisma.card.groupBy({
      by: ['cardStat', 'isDisabled', 'isRevoked'],
      where: { distributorId: distributor.id, deletedAt: null },
      _count: { _all: true },
    });

    return DistributorMapper.toDashboardDTO(rows);
  }
}
