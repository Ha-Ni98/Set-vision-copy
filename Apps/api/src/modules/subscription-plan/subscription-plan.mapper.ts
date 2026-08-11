import type {
  SubscriptionPlan,
  CommissionDuration,
  SubscriptionPlanCommission,
  SubscriptionPlanCost,
} from '@prisma/client';
import {
  SubscriptionPlanResponseSchema,
  CommissionDurationResponseSchema,
  CommissionMatrixResponseSchema,
  CommissionCellResponseSchema,
  SubscriptionPlanCostResponseSchema,
  SubscriptionType,
  SubscriptionDuration,
  type SubscriptionPlanDTO,
  type CommissionDurationDTO,
  type CommissionMatrixDTO,
  type CommissionCellDTO,
  type SubscriptionPlanCostDTO,
} from '@my-app/contract';
import { composeSubscriptionLabel } from '../set/set.mapper';

export class SubscriptionPlanMapper {
  static toPlanDTO(plan: SubscriptionPlan): SubscriptionPlanDTO {
    const dto: SubscriptionPlanDTO = {
      id: plan.id,
      subscriptionType: plan.subscriptionType as SubscriptionType,
      subscriptionDuration: plan.subscriptionDuration as SubscriptionDuration,
      label: composeSubscriptionLabel(plan),
      isActive: plan.isActive,
    };
    return SubscriptionPlanResponseSchema.parse(dto);
  }

  static toDurationDTO(tier: CommissionDuration): CommissionDurationDTO {
    const dto: CommissionDurationDTO = {
      id: tier.id,
      key: tier.key,
      label: tier.label,
      nbMinuteMin: tier.nbMinuteMin,
      nbMinuteMax: tier.nbMinuteMax,
    };
    return CommissionDurationResponseSchema.parse(dto);
  }

  static toMatrixDTO(
    plans: SubscriptionPlan[],
    tiers: CommissionDuration[],
    cells: SubscriptionPlanCommission[],
  ): CommissionMatrixDTO {
    const cellMap = new Map<string, number>();
    for (const cell of cells) {
      const key = `${cell.subscriptionPlanId}:${cell.commissionDurationId}`;
      cellMap.set(key, Number(cell.commission.toFixed(2)));
    }

    const rows = plans.map((plan) => ({
      planId: plan.id,
      planLabel: composeSubscriptionLabel(plan),
      cells: tiers.map((tier) => {
        const key = `${plan.id}:${tier.id}`;
        return {
          commissionDurationId: tier.id,
          commission: cellMap.has(key) ? cellMap.get(key)! : null,
        };
      }),
    }));

    return CommissionMatrixResponseSchema.parse({ tiers: tiers.map(SubscriptionPlanMapper.toDurationDTO), rows });
  }

  static toCellDTO(row: SubscriptionPlanCommission): CommissionCellDTO {
    const dto: CommissionCellDTO = {
      subscriptionPlanId: row.subscriptionPlanId,
      commissionDurationId: row.commissionDurationId,
      commission: Number(row.commission.toFixed(2)),
    };
    return CommissionCellResponseSchema.parse(dto);
  }

  static toCostDTO(plan: SubscriptionPlan, row: SubscriptionPlanCost | null): SubscriptionPlanCostDTO {
    const dto: SubscriptionPlanCostDTO = {
      subscriptionPlanId: plan.id,
      planLabel: composeSubscriptionLabel(plan),
      isActive: plan.isActive,
      cost: row?.cost != null ? Number(row.cost.toFixed(2)) : null,
      updatedAt: row ? row.updatedAt.toISOString() : null,
    };
    return SubscriptionPlanCostResponseSchema.parse(dto);
  }
}
