import type { PrismaClient } from '@prisma/client';
import { Prisma, ActivationStat } from '@prisma/client';
import { LogActionType, UserRole } from '@my-app/contract';
import type {
  ActivatorDTO,
  ActivatorDetailDTO,
  ActivatorWithCredentialsDTO,
  ActivatorGeneratedPasswordDTO,
  ActivatorPerformanceDTO,
  ActivatorDashboardDTO,
  GetActivatorsQuery,
  CreateActivatorCommand,
  UpdateActivatorCommand,
  ActivatorPerformanceQuery,
  PaginatedResult,
} from '@my-app/contract';
import type { IActivatorService } from './activator.interface';
import { ActivatorMapper } from './activator.mapper';
import { hashPassword } from '@common/utils/password.utils';
import { generateTempPassword } from '@common/utils/password-generator.util';
import { buildPaginationMeta, toSkipTake } from '@common/http/pagination';
import { NotFoundError, ConflictError, ForbiddenError } from '@common/errors';

const IN_PROGRESS_STATS = [
  ActivationStat.PROCESSING,
  ActivationStat.WRONG_INFORMATION,
  ActivationStat.ADDITIONAL_INFORMATION,
  ActivationStat.FREEZE,
] as const;

function computeAvgSeconds(
  activations: Array<{ takenAt: Date | null; completedAt: Date | null }>,
): number | null {
  const completed = activations.filter((a) => a.takenAt && a.completedAt);
  if (completed.length === 0) return null;
  const totalMs = completed.reduce(
    (sum, a) => sum + (a.completedAt!.getTime() - a.takenAt!.getTime()),
    0,
  );
  return totalMs / completed.length / 1000;
}

export class ActivatorService implements IActivatorService {
  constructor(private readonly prisma: PrismaClient) {}

  async getAll(query: GetActivatorsQuery): Promise<PaginatedResult<ActivatorDTO>> {
    const where = {
      AND: [
        { user: { deletedAt: null } },
        ...(query.search
          ? [
              {
                OR: [
                  { fullName: { contains: query.search, mode: 'insensitive' as const } },
                  { phone: { contains: query.search, mode: 'insensitive' as const } },
                  { user: { username: { contains: query.search, mode: 'insensitive' as const } } },
                ],
              },
            ]
          : []),
      ],
    };

    const [rows, total] = await Promise.all([
      this.prisma.activator.findMany({
        where,
        include: {
          user: true,
          activations: {
            where: {
              activationStat: ActivationStat.ACTIVATED,
              completedAt: { not: null },
              takenAt: { not: null },
            },
            select: { completedAt: true, takenAt: true },
          },
        },
        ...toSkipTake(query),
      }),
      this.prisma.activator.count({ where }),
    ]);

    return {
      items: rows.map((r) =>
        ActivatorMapper.toDTO(r, r.user, {
          avgActivationTimeSeconds: computeAvgSeconds(r.activations),
        }),
      ),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async create(cmd: CreateActivatorCommand, actorId: string): Promise<ActivatorWithCredentialsDTO> {
    const persistence = ActivatorMapper.toPersistenceCreate(cmd);

    const existing = await this.prisma.user.findUnique({ where: { username: persistence.username } });
    if (existing) throw new ConflictError('Username already taken');

    const tempPassword = generateTempPassword();
    const hashed = await hashPassword(tempPassword);

    const [newUser, newActivator] = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: persistence.username,
          password: hashed,
          role: UserRole.ACTIVATOR,
          isEnabled: true,
        },
      });
      const activator = await tx.activator.create({
        data: {
          userId: user.id,
          fullName: persistence.fullName,
          phone: persistence.phone,
          credits: persistence.credits,
        },
      });
      await tx.log.create({
        data: {
          actionType: LogActionType.CHANGE_USER_INFORMATION,
          actionDescription: `Created activator: ${user.username}`,
          userId: actorId,
        },
      });
      return [user, activator] as const;
    });

    return ActivatorMapper.toWithCredentialsDTO(
      newActivator,
      newUser,
      { avgActivationTimeSeconds: null },
      tempPassword,
    );
  }

  async getById(id: string): Promise<ActivatorDetailDTO> {
    const result = await this.prisma.activator.findFirst({
      where: { id, user: { deletedAt: null } },
      include: {
        user: true,
        activations: {
          where: {
            activationStat: ActivationStat.ACTIVATED,
            completedAt: { not: null },
            takenAt: { not: null },
          },
          select: { completedAt: true, takenAt: true },
        },
        payments: {
          where: { isDeleted: false },
          select: { totalAmount: true },
        },
      },
    });
    if (!result) throw new NotFoundError('Activator not found');

    const avgActivationTimeSeconds = computeAvgSeconds(result.activations);
    const totalPaid = result.payments.reduce(
      (sum, p) => sum + Number(p.totalAmount.toFixed(2)),
      0,
    );
    const creditsOwed = Number(result.credits.toFixed(2));
    const successRate =
      result.nbOfActivation === 0
        ? 0
        : result.nbOfSuccessfulActivation / result.nbOfActivation;

    return ActivatorMapper.toDetailDTO(result, result.user, {
      avgActivationTimeSeconds,
      totalPaid,
      creditsOwed,
      successRate,
    });
  }

  async update(id: string, cmd: UpdateActivatorCommand, actorId: string): Promise<ActivatorDTO> {
    const result = await this.prisma.activator.findFirst({
      where: { id, user: { deletedAt: null } },
      include: { user: true },
    });
    if (!result) throw new NotFoundError('Activator not found');

    const persistence = ActivatorMapper.toPersistenceUpdate(cmd);
    const { username, ...activatorFields } = persistence;

    if (username !== undefined && username !== result.user.username) {
      const conflict = await this.prisma.user.findUnique({ where: { username } });
      if (conflict) throw new ConflictError('Username already taken');
    }

    const [updatedUser, updatedActivator] = await this.prisma.$transaction(async (tx) => {
      const user =
        username !== undefined
          ? await tx.user.update({ where: { id: result.userId }, data: { username } })
          : result.user;

      const activator =
        Object.keys(activatorFields).length > 0
          ? await tx.activator.update({ where: { id }, data: activatorFields })
          : result;

      await tx.log.create({
        data: {
          actionType: LogActionType.CHANGE_USER_INFORMATION,
          actionDescription: `Updated activator information: ${user.username}`,
          userId: actorId,
        },
      });

      return [user, activator] as const;
    });

    return ActivatorMapper.toDTO(updatedActivator, updatedUser, { avgActivationTimeSeconds: null });
  }

  async toggle(id: string, actorId: string): Promise<ActivatorDTO> {
    const result = await this.prisma.activator.findFirst({
      where: { id, user: { deletedAt: null } },
      include: { user: true },
    });
    if (!result) throw new NotFoundError('Activator not found');

    const newEnabled = !result.user.isEnabled;

    const [updatedUser] = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: result.userId },
        data: { isEnabled: newEnabled },
      });
      await tx.log.create({
        data: {
          actionType: LogActionType.CHANGE_USER_STAT,
          actionDescription: `Activator ${newEnabled ? 'enabled' : 'disabled'}: ${user.username}`,
          userId: actorId,
        },
      });
      return [user] as const;
    });

    return ActivatorMapper.toDTO(result, updatedUser, { avgActivationTimeSeconds: null });
  }

  async resetPassword(id: string, actorId: string): Promise<ActivatorGeneratedPasswordDTO> {
    const result = await this.prisma.activator.findFirst({
      where: { id, user: { deletedAt: null } },
      select: { userId: true, user: { select: { username: true } } },
    });
    if (!result) throw new NotFoundError('Activator not found');

    const tempPassword = generateTempPassword();
    const hashed = await hashPassword(tempPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: result.userId }, data: { password: hashed } });
      await tx.log.create({
        data: {
          actionType: LogActionType.CHANGE_USER_PASSWORD,
          actionDescription: `Activator password reset: ${result.user.username}`,
          userId: actorId,
        },
      });
    });

    return ActivatorMapper.toGeneratedPasswordDTO(tempPassword);
  }

  async delete(id: string, actorId: string): Promise<void> {
    const result = await this.prisma.activator.findFirst({
      where: { id, user: { deletedAt: null } },
      select: { userId: true },
    });
    if (!result) throw new NotFoundError('Activator not found');

    // suppress unused warning — actorId reserved for future audit log
    void actorId;

    const inProgressCount = await this.prisma.activation.count({
      where: { activatorId: id, activationStat: { in: [...IN_PROGRESS_STATS] } },
    });
    if (inProgressCount > 0) throw new ConflictError('Activator has in-progress activations');

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: result.userId },
        data: { deletedAt: new Date(), isEnabled: false },
      });
    });
  }

  async performance(id: string, query: ActivatorPerformanceQuery): Promise<ActivatorPerformanceDTO> {
    const activator = await this.prisma.activator.findFirst({
      where: { id, user: { deletedAt: null } },
      select: { id: true },
    });
    if (!activator) throw new NotFoundError('Activator not found');

    const since = new Date();
    since.setDate(since.getDate() - query.days);
    since.setHours(0, 0, 0, 0);

    const activations = await this.prisma.activation.findMany({
      where: {
        activatorId: id,
        activationStat: ActivationStat.ACTIVATED,
        completedAt: { gte: since },
      },
      select: { completedAt: true, activationPrice: true },
      orderBy: { completedAt: 'asc' },
    });

    const dayMap = new Map<string, { count: number; earned: Prisma.Decimal }>();
    for (const a of activations) {
      const day = a.completedAt!.toISOString().slice(0, 10);
      const price = a.activationPrice ?? new Prisma.Decimal(0);
      const existing = dayMap.get(day);
      if (existing) {
        existing.count += 1;
        existing.earned = existing.earned.plus(price);
      } else {
        dayMap.set(day, { count: 1, earned: new Prisma.Decimal(price) });
      }
    }

    const series = Array.from(dayMap.entries()).map(([day, v]) => ({
      date: new Date(`${day}T00:00:00.000Z`),
      count: v.count,
      earned: v.earned,
    }));

    return ActivatorMapper.toPerformanceDTO(series);
  }

  async myStats(principalUserId: string): Promise<ActivatorDashboardDTO> {
    const activator = await this.prisma.activator.findFirst({
      where: { userId: principalUserId, user: { deletedAt: null } },
      include: { user: true },
    });
    if (!activator) throw new ForbiddenError('Not an activator');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(thirtyDaysAgo);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 30);

    const [
      activeSlotsUsed,
      activationsToday,
      weeklyActivations,
      completedActivations,
      currentPeriodEarnings,
      prevPeriodEarnings,
    ] = await Promise.all([
      this.prisma.activation.count({
        where: { activatorId: activator.id, activationStat: { in: [...IN_PROGRESS_STATS] } },
      }),
      this.prisma.activation.count({
        where: {
          activatorId: activator.id,
          activationStat: ActivationStat.ACTIVATED,
          completedAt: { gte: todayStart },
        },
      }),
      this.prisma.activation.findMany({
        where: {
          activatorId: activator.id,
          activationStat: ActivationStat.ACTIVATED,
          completedAt: { gte: weekStart },
        },
        select: { completedAt: true },
      }),
      this.prisma.activation.findMany({
        where: {
          activatorId: activator.id,
          activationStat: ActivationStat.ACTIVATED,
          completedAt: { not: null },
          takenAt: { not: null },
        },
        select: { completedAt: true, takenAt: true },
      }),
      this.prisma.activation.aggregate({
        where: {
          activatorId: activator.id,
          activationStat: ActivationStat.ACTIVATED,
          completedAt: { gte: thirtyDaysAgo },
        },
        _sum: { activationPrice: true },
      }),
      this.prisma.activation.aggregate({
        where: {
          activatorId: activator.id,
          activationStat: ActivationStat.ACTIVATED,
          completedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
        _sum: { activationPrice: true },
      }),
    ]);

    const weeklyMap = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      weeklyMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const a of weeklyActivations) {
      const day = a.completedAt!.toISOString().slice(0, 10);
      if (weeklyMap.has(day)) weeklyMap.set(day, (weeklyMap.get(day) ?? 0) + 1);
    }
    const weekly = Array.from(weeklyMap.entries()).map(([day, count]) => ({
      date: new Date(`${day}T00:00:00.000Z`),
      count,
    }));

    const avgActivationTimeSeconds = computeAvgSeconds(completedActivations);

    const curr = Number(currentPeriodEarnings._sum.activationPrice?.toFixed(2) ?? '0');
    const prev = Number(prevPeriodEarnings._sum.activationPrice?.toFixed(2) ?? '0');
    const earningsTrendPercent = prev === 0 ? 0 : ((curr - prev) / prev) * 100;

    return ActivatorMapper.toDashboardDTO({
      totalEarnings: activator.totalEarning,
      earningsTrendPercent,
      creditsBalance: activator.credits,
      totalActivations: activator.nbOfActivation,
      activationsToday,
      avgActivationTimeSeconds,
      activeSlotsUsed,
      weekly,
    });
  }
}
