import type { PrismaClient } from '@prisma/client';
import type { ISubscriptionPlanService } from './subscription-plan.interface';
import { SubscriptionPlanMapper } from './subscription-plan.mapper';
import { NotFoundError, ConflictError } from '@common/errors';
import { LogActionType } from '@my-app/contract';
import type {
  SubscriptionPlanDTO,
  CommissionDurationDTO,
  CommissionMatrixDTO,
  CommissionCellDTO,
  GetSubscriptionPlansQuery,
  CreateSubscriptionPlanCommand,
  UpdateCommissionCommand,
} from '@my-app/contract';

export class SubscriptionPlanService implements ISubscriptionPlanService {
  constructor(private prisma: PrismaClient) {}

  async getAll(query: GetSubscriptionPlansQuery): Promise<SubscriptionPlanDTO[]> {
    const plans = await this.prisma.subscriptionPlan.findMany({
      ...(query.active !== undefined && { where: { isActive: query.active } }),
    });
    return plans.map(SubscriptionPlanMapper.toPlanDTO);
  }

  async create(cmd: CreateSubscriptionPlanCommand): Promise<SubscriptionPlanDTO> {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: {
        subscriptionType_subscriptionDuration: {
          subscriptionType: cmd.subscriptionType,
          subscriptionDuration: cmd.subscriptionDuration,
        },
      },
    });
    if (existing) throw new ConflictError('Subscription plan already exists for this type and duration');

    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        subscriptionType: cmd.subscriptionType,
        subscriptionDuration: cmd.subscriptionDuration,
        isActive: true,
      },
    });
    return SubscriptionPlanMapper.toPlanDTO(plan);
  }

  async toggle(id: string): Promise<SubscriptionPlanDTO> {
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Subscription plan not found');

    const plan = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
    return SubscriptionPlanMapper.toPlanDTO(plan);
  }

  async getCommissionDurations(): Promise<CommissionDurationDTO[]> {
    const tiers = await this.prisma.commissionDuration.findMany({
      orderBy: { nbMinuteMin: 'asc' },
    });
    return tiers.map(SubscriptionPlanMapper.toDurationDTO);
  }

  async getCommissions(): Promise<CommissionMatrixDTO> {
    const [plans, tiers, cells] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({ where: { isActive: true } }),
      this.prisma.commissionDuration.findMany({ orderBy: { nbMinuteMin: 'asc' } }),
      this.prisma.subscriptionPlanCommission.findMany(),
    ]);
    return SubscriptionPlanMapper.toMatrixDTO(plans, tiers, cells);
  }

  async updateCommission(cmd: UpdateCommissionCommand, actorId: string): Promise<CommissionCellDTO> {
    const cell = await this.prisma.$transaction(async (tx) => {
      const upserted = await tx.subscriptionPlanCommission.upsert({
        where: {
          subscriptionPlanId_commissionDurationId: {
            subscriptionPlanId: cmd.subscriptionPlanId,
            commissionDurationId: cmd.commissionDurationId,
          },
        },
        update: { commission: cmd.commission },
        create: {
          subscriptionPlanId: cmd.subscriptionPlanId,
          commissionDurationId: cmd.commissionDurationId,
          commission: cmd.commission,
        },
      });

      await tx.log.create({
        data: {
          actionType: LogActionType.CHANGE_ACTIVATION_COMMISSION,
          actionDescription: `Updated commission for plan ${cmd.subscriptionPlanId} / tier ${cmd.commissionDurationId} to ${cmd.commission}`,
          userId: actorId,
        },
      });

      return upserted;
    });

    return SubscriptionPlanMapper.toCellDTO(cell);
  }
}
