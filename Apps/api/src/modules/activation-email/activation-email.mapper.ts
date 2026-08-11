import type { ActivationEmail, SubscriptionPlan } from '@prisma/client';
import {
  ActivationEmailResponseSchema,
  type ActivationEmailDTO,
  ActivationEmailOptionResponseSchema,
  type ActivationEmailOptionDTO,
} from '@my-app/contract';
import { composeSubscriptionLabel } from '@modules/set/set.mapper';

export class ActivationEmailMapper {
  // Settings-list row — ADMIN audience.
  static toDTO(
    entity: ActivationEmail,
    plan: Pick<SubscriptionPlan, 'subscriptionType' | 'subscriptionDuration'>,
  ): ActivationEmailDTO {
    const dto: ActivationEmailDTO = {
      id: entity.id,
      subscriptionPlanId: entity.subscriptionPlanId,
      planLabel: composeSubscriptionLabel(plan),
      email: entity.email,
      nbOfActivation: entity.nbOfActivation,
      lastUsedAt: entity.lastUsedAt ? entity.lastUsedAt.toISOString() : null,
      createdAt: entity.createdAt.toISOString(),
    };
    return ActivationEmailResponseSchema.parse(dto);
  }

  // Picker option — already scoped to one plan and one status; no plan/deletion fields.
  static toOptionDTO(entity: ActivationEmail): ActivationEmailOptionDTO {
    const dto: ActivationEmailOptionDTO = {
      id: entity.id,
      email: entity.email,
      nbOfActivation: entity.nbOfActivation,
      lastUsedAt: entity.lastUsedAt ? entity.lastUsedAt.toISOString() : null,
    };
    return ActivationEmailOptionResponseSchema.parse(dto);
  }
}
