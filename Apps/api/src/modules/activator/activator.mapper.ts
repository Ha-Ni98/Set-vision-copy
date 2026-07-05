import type { Activator, User } from '@prisma/client';
import { Prisma } from '@prisma/client';
import {
  ActivatorResponseSchema,
  ActivatorDetailResponseSchema,
  ActivatorWithCredentialsResponseSchema,
  ActivatorGeneratedPasswordResponseSchema,
  ActivatorPerformanceResponseSchema,
  ActivatorDashboardResponseSchema,
  type ActivatorDTO,
  type ActivatorDetailDTO,
  type ActivatorWithCredentialsDTO,
  type ActivatorGeneratedPasswordDTO,
  type ActivatorPerformanceDTO,
  type ActivatorDashboardDTO,
  type CreateActivatorCommand,
  type UpdateActivatorCommand,
} from '@my-app/contract';

type AvgDerived = { avgActivationTimeSeconds: number | null };

type DetailDerived = AvgDerived & {
  totalPaid: number;
  creditsOwed: number;
  successRate: number;
};

type PerformanceSeries = { date: Date; count: number; earned: Prisma.Decimal };

type DashboardStats = {
  totalEarnings: Prisma.Decimal;
  earningsTrendPercent: number;
  creditsBalance: Prisma.Decimal;
  totalActivations: number;
  activationsToday: number;
  avgActivationTimeSeconds: number | null;
  activeSlotsUsed: number;
  weekly: Array<{ date: Date; count: number }>;
};

export class ActivatorMapper {
  private static decimalToNumber(d: Prisma.Decimal): number {
    return Number(d.toFixed(2));
  }

  static toDTO(activator: Activator, user: User, derived: AvgDerived): ActivatorDTO {
    return ActivatorResponseSchema.parse({
      id: activator.id,
      userId: activator.userId,
      fullName: activator.fullName,
      phone: activator.phone,
      username: user.username,
      isEnabled: user.isEnabled,
      totalEarning: ActivatorMapper.decimalToNumber(activator.totalEarning),
      credits: ActivatorMapper.decimalToNumber(activator.credits),
      nbOfActivation: activator.nbOfActivation,
      nbOfSuccessfulActivation: activator.nbOfSuccessfulActivation,
      avgActivationTimeSeconds: derived.avgActivationTimeSeconds,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    });
  }

  static toDetailDTO(activator: Activator, user: User, derived: DetailDerived): ActivatorDetailDTO {
    return ActivatorDetailResponseSchema.parse({
      ...ActivatorMapper.toDTO(activator, user, derived),
      totalPaid: derived.totalPaid,
      creditsOwed: derived.creditsOwed,
      successRate: derived.successRate,
    });
  }

  static toWithCredentialsDTO(
    activator: Activator,
    user: User,
    derived: AvgDerived,
    generatedPassword: string,
  ): ActivatorWithCredentialsDTO {
    return ActivatorWithCredentialsResponseSchema.parse({
      activator: ActivatorMapper.toDTO(activator, user, derived),
      generatedPassword,
    });
  }

  static toGeneratedPasswordDTO(generatedPassword: string): ActivatorGeneratedPasswordDTO {
    return ActivatorGeneratedPasswordResponseSchema.parse({ generatedPassword });
  }

  static toPerformanceDTO(series: PerformanceSeries[]): ActivatorPerformanceDTO {
    return ActivatorPerformanceResponseSchema.parse({
      series: series.map((s) => ({
        date: s.date.toISOString(),
        count: s.count,
        earned: ActivatorMapper.decimalToNumber(s.earned),
      })),
    });
  }

  static toDashboardDTO(stats: DashboardStats): ActivatorDashboardDTO {
    return ActivatorDashboardResponseSchema.parse({
      totalEarnings: ActivatorMapper.decimalToNumber(stats.totalEarnings),
      earningsTrendPercent: stats.earningsTrendPercent,
      creditsBalance: ActivatorMapper.decimalToNumber(stats.creditsBalance),
      totalActivations: stats.totalActivations,
      activationsToday: stats.activationsToday,
      avgActivationTimeSeconds: stats.avgActivationTimeSeconds,
      activeSlotsUsed: stats.activeSlotsUsed,
      weekly: stats.weekly.map((w) => ({
        date: w.date.toISOString(),
        count: w.count,
      })),
    });
  }

  static toPersistenceCreate(cmd: CreateActivatorCommand): {
    fullName: string;
    username: string;
    phone: string;
    credits: number;
  } {
    return {
      fullName: cmd.fullName.trim(),
      username: cmd.username.trim(),
      phone: cmd.phone.trim(),
      credits: cmd.initialCredits ?? 0,
    };
  }

  static toPersistenceUpdate(cmd: UpdateActivatorCommand): {
    fullName?: string;
    username?: string;
    phone?: string;
  } {
    return {
      ...(cmd.fullName !== undefined && { fullName: cmd.fullName.trim() }),
      ...(cmd.username !== undefined && { username: cmd.username.trim() }),
      ...(cmd.phone !== undefined && { phone: cmd.phone.trim() }),
    };
  }
}
