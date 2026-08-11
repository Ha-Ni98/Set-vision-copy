import { z } from 'zod';
import { paginated } from '../../common/types';

export const ActivatorResponseSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  fullName: z.string(),
  username: z.string(),
  phone: z.string(),
  isEnabled: z.boolean(),
  totalEarning: z.number(),
  credits: z.number(),
  nbOfActivation: z.number().int(),
  nbOfSuccessfulActivation: z.number().int(),
  avgActivationTimeSeconds: z.number().int().nullable(),
  lastLoginAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type ActivatorDTO = z.infer<typeof ActivatorResponseSchema>;

export const ActivatorDetailResponseSchema = ActivatorResponseSchema.extend({
  totalPaid: z.number(),
  creditsOwed: z.number(),
  successRate: z.number(),
});
export type ActivatorDetailDTO = z.infer<typeof ActivatorDetailResponseSchema>;

// Sanctioned §0.1.1 exception: one-time create response
export const ActivatorWithCredentialsResponseSchema = z.object({
  activator: ActivatorResponseSchema,
  generatedPassword: z.string(),
});
export type ActivatorWithCredentialsDTO = z.infer<typeof ActivatorWithCredentialsResponseSchema>;

// Sanctioned §0.1.1 exception: one-time reset-password response (kept local — not shared with admin module)
export const ActivatorGeneratedPasswordResponseSchema = z.object({
  generatedPassword: z.string(),
});
export type ActivatorGeneratedPasswordDTO = z.infer<typeof ActivatorGeneratedPasswordResponseSchema>;

export const ActivatorPerformanceResponseSchema = z.object({
  series: z.array(
    z.object({
      date: z.iso.datetime(),
      count: z.number().int(),
      earned: z.number(),
    })
  ),
});
export type ActivatorPerformanceDTO = z.infer<typeof ActivatorPerformanceResponseSchema>;

export const ActivatorDashboardResponseSchema = z.object({
  totalEarnings: z.number(),
  earningsTrendPercent: z.number(),
  creditsBalance: z.number(),
  totalActivations: z.number().int(),
  activationsToday: z.number().int(),
  avgActivationTimeSeconds: z.number().int().nullable(),
  activeSlotsUsed: z.number().int(),
  weekly: z.array(
    z.object({
      date: z.iso.datetime(),
      count: z.number().int(),
    })
  ),
});
export type ActivatorDashboardDTO = z.infer<typeof ActivatorDashboardResponseSchema>;

export const PaginatedActivatorsSchema = paginated(ActivatorResponseSchema);
export type PaginatedActivators = z.infer<typeof PaginatedActivatorsSchema>;
