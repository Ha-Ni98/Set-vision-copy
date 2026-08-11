import { z } from 'zod';
import { SubscriptionDuration, SubscriptionType } from './subscription-plan.enums';

export const SubscriptionPlanResponseSchema = z.object({
  id: z.uuid(),
  subscriptionType: z.enum(SubscriptionType),
  subscriptionDuration: z.enum(SubscriptionDuration),
  label: z.string(),
  isActive: z.boolean(),
});
export type SubscriptionPlanDTO = z.infer<typeof SubscriptionPlanResponseSchema>;

export const CommissionDurationResponseSchema = z.object({
  id: z.uuid(),
  key: z.string(),
  label: z.string(),
  nbMinuteMin: z.number().int(),
  nbMinuteMax: z.number().int().nullable(),
});
export type CommissionDurationDTO = z.infer<typeof CommissionDurationResponseSchema>;

export const CommissionCellResponseSchema = z.object({
  subscriptionPlanId: z.uuid(),
  commissionDurationId: z.uuid(),
  commission: z.number(),
});
export type CommissionCellDTO = z.infer<typeof CommissionCellResponseSchema>;

export const CommissionMatrixResponseSchema = z.object({
  tiers: z.array(CommissionDurationResponseSchema),
  rows: z.array(
    z.object({
      planId: z.uuid(),
      planLabel: z.string(),
      cells: z.array(
        z.object({
          commissionDurationId: z.uuid(),
          commission: z.number().nullable(),
        })
      ),
    })
  ),
});
export type CommissionMatrixDTO = z.infer<typeof CommissionMatrixResponseSchema>;

// Set 9 (D10). null = never configured for this plan (renders "—"); distinct from a
// deliberate 0 (a genuinely free plan).
export const SubscriptionPlanCostResponseSchema = z.object({
  subscriptionPlanId: z.uuid(),
  planLabel: z.string(),
  isActive: z.boolean(),
  cost: z.number().nullable(),
  updatedAt: z.iso.datetime().nullable(),
});
export type SubscriptionPlanCostDTO = z.infer<typeof SubscriptionPlanCostResponseSchema>;
