import type { Card, Set, SubscriptionPlan } from '@prisma/client';
import {
  SetResponseSchema,
  type SetDTO,
  SetStat,
  SubscriptionType,
  SubscriptionDuration,
} from '@my-app/contract';

const TYPE_LABEL: Record<SubscriptionType, string> = {
  [SubscriptionType.SNAPCHAT_PLUS]: 'Snapchat Plus',
};

const DURATION_LABEL: Record<SubscriptionDuration, string> = {
  [SubscriptionDuration.ONE_DAY]: '01 Day',
  [SubscriptionDuration.ONE_WEEK]: '01 Week',
  [SubscriptionDuration.TWO_WEEK]: '02 Weeks',
  [SubscriptionDuration.ONE_MONTH]: '01 Month',
  [SubscriptionDuration.THREE_MONTH]: '03 Months',
  [SubscriptionDuration.SIXTH_MONTH]: '06 Months',
  [SubscriptionDuration.ONE_YEAR]: '01 Year',
  [SubscriptionDuration.UNLIMITED]: 'Unlimited',
};

export function composeSubscriptionLabel(plan: Pick<SubscriptionPlan, 'subscriptionType' | 'subscriptionDuration'>): string {
  const type = TYPE_LABEL[plan.subscriptionType as SubscriptionType] ?? plan.subscriptionType;
  const duration = DURATION_LABEL[plan.subscriptionDuration as SubscriptionDuration] ?? plan.subscriptionDuration;
  return `${type} — ${duration}`;
}

export class SetMapper {
  static toDTO(set: Set, plan: Pick<SubscriptionPlan, 'subscriptionType' | 'subscriptionDuration'>): SetDTO {
    const dto: SetDTO = {
      id: set.id,
      setNumber: set.setNumber,
      subscriptionPlanId: set.subscriptionPlanId,
      subscriptionLabel: composeSubscriptionLabel(plan),
      numberOfKeys: set.numberOfKeys,
      setStat: set.setStat as SetStat,
      createdAt: set.createdAt.toISOString(),
      printedAt: set.printedAt ? set.printedAt.toISOString() : null,
    };
    return SetResponseSchema.parse(dto);
  }
}
