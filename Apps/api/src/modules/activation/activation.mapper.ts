import type { Decimal } from '@prisma/client/runtime/library';
import type { SubscriptionPlan } from '@prisma/client';
import {
  ActivationStat,
  AccountInformation,
  ClientActivationStatus,
  KeyVerificationResponseSchema,
  type KeyVerificationDTO,
  ClientActivationStatusResponseSchema,
  type ClientActivationStatusDTO,
  PendingActivationResponseSchema,
  type PendingActivationDTO,
  ActiveRequestResponseSchema,
  type ActiveRequestDTO,
  ActivatorHistoryItemResponseSchema,
  type ActivatorHistoryItemDTO,
  RecentActivationResponseSchema,
  type RecentActivationDTO,
  AdminActivationResponseSchema,
  type AdminActivationDTO,
  ActivationDetailResponseSchema,
  type ActivationDetailDTO,
  type CardStat,
} from '@my-app/contract';
import { composeSubscriptionLabel } from '@modules/set/set.mapper';

// ─── Static lookups ───────────────────────────────────────────────────────────

const FIELD_LABEL: Record<AccountInformation, string> = {
  [AccountInformation.USERNAME]: 'Username',
  [AccountInformation.EMAIL]: 'Email',
  [AccountInformation.PHONE_NUMBER]: 'Phone Number',
  [AccountInformation.OTP]: 'OTP',
  [AccountInformation.BIRTHDAY]: 'Birthday',
  [AccountInformation.PASSWORD]: 'Password',
};

const SENSITIVE_FIELDS = new Set<AccountInformation>([
  AccountInformation.PASSWORD,
  AccountInformation.OTP,
]);

const STAT_TO_CLIENT_STATUS: Partial<Record<ActivationStat, ClientActivationStatus>> = {
  [ActivationStat.PENDING]: ClientActivationStatus.SUBMITTED,
  [ActivationStat.PROCESSING]: ClientActivationStatus.PROCESSING,
  [ActivationStat.WRONG_INFORMATION]: ClientActivationStatus.NEEDS_CORRECTION,
  [ActivationStat.ADDITIONAL_INFORMATION]: ClientActivationStatus.NEEDS_OTP,
  [ActivationStat.FREEZE]: ClientActivationStatus.UNDER_REVIEW,
  [ActivationStat.ACTIVATED]: ClientActivationStatus.ACTIVATED,
  [ActivationStat.ACTIVATED_BY_ADMIN]: ClientActivationStatus.ACTIVATED,
};

// ─── Join types (shapes the service must supply) ─────────────────────────────

export type ActivationPlanJoin = Pick<SubscriptionPlan, 'subscriptionType' | 'subscriptionDuration'>;

export type ActivationDistributorJoin = {
  storeName: string;
  wilaya: { frName: string };
  commune: { frName: string };
};

export type ActivationInfoEntry = {
  accountInform: string;
  value: string | null;
};

export type ActivationStepEntry = {
  activationStat: string;
  createdAt: Date;
  wrongInformation: Array<{ accountInform: string; value: string | null }>;
  additionalInformation: Array<{ accountInform: string; value: string | null }>;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

function toLabel(field: string): string {
  return FIELD_LABEL[field as AccountInformation] ?? field;
}

function maskKey(key: string): string {
  return key.length <= 4 ? key : '*'.repeat(key.length - 4) + key.slice(-4);
}

function maskValue(field: string, value: string | null): string {
  if (value === null) return '';
  return SENSITIVE_FIELDS.has(field as AccountInformation) ? '****' : value;
}

function decimalToNumber(d: Decimal | null | undefined): number | null {
  if (d == null) return null;
  return Number(Number(d).toFixed(2));
}

function durationSeconds(takenAt: Date | null, completedAt: Date | null): number | null {
  if (!takenAt || !completedAt) return null;
  return Math.round((completedAt.getTime() - takenAt.getTime()) / 1000);
}

function statToClientStatus(stat: string): ClientActivationStatus {
  return STAT_TO_CLIENT_STATUS[stat as ActivationStat] ?? ClientActivationStatus.FAILED;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

export class ActivationMapper {
  static toKeyVerificationDTO(
    clientStatus: ClientActivationStatus,
    plan: ActivationPlanJoin | null,
    activation: {
      id: string;
      information: ActivationInfoEntry[];
      latestStep: {
        wrongInformation: Array<{ accountInform: string }>;
        additionalInformation: Array<{ accountInform: string }>;
      } | null;
    } | null,
  ): KeyVerificationDTO {
    const dto: KeyVerificationDTO = { status: clientStatus };

    if (plan) {
      dto.subscriptionLabel = composeSubscriptionLabel(plan);
    }

    if (activation) {
      dto.activationId = activation.id;

      dto.submittedFields = activation.information.map((i) => ({
        fieldLabel: toLabel(i.accountInform),
        value: maskValue(i.accountInform, i.value),
      }));

      const usernameEntry = activation.information.find(
        (i) => i.accountInform === AccountInformation.USERNAME,
      );
      if (usernameEntry?.value) {
        dto.accountUsername = usernameEntry.value;
      }

      if (activation.latestStep) {
        if (activation.latestStep.wrongInformation.length > 0) {
          dto.flaggedFields = activation.latestStep.wrongInformation.map((w) => ({
            field: w.accountInform as unknown as AccountInformation,
            label: toLabel(w.accountInform),
          }));
        }
        if (activation.latestStep.additionalInformation.length > 0) {
          dto.requestedFields = activation.latestStep.additionalInformation.map((a) => ({
            field: a.accountInform as unknown as AccountInformation,
            label: toLabel(a.accountInform),
          }));
        }
      }
    }

    return KeyVerificationResponseSchema.parse(dto);
  }

  static toClientStatusDTO(activation: { id: string; activationStat: string }): ClientActivationStatusDTO {
    const dto: ClientActivationStatusDTO = {
      activationId: activation.id,
      status: statToClientStatus(activation.activationStat),
    };
    return ClientActivationStatusResponseSchema.parse(dto);
  }

  static toPendingDTO(
    activation: { id: string; requestedAt: Date },
    plan: ActivationPlanJoin,
    cardKey: string,
  ): PendingActivationDTO {
    const dto: PendingActivationDTO = {
      id: activation.id,
      subscriptionLabel: composeSubscriptionLabel(plan),
      keyMasked: maskKey(cardKey),
      requestedAt: activation.requestedAt.toISOString(),
    };
    return PendingActivationResponseSchema.parse(dto);
  }

  static toActiveRequestDTO(
    activation: {
      id: string;
      activationStat: string;
      takenAt: Date;
      clientFullName: string;
      clientPhone: string;
      freezReason: string | null;
    },
    plan: ActivationPlanJoin,
    cardKey: string,
    distributor: ActivationDistributorJoin,
    information: ActivationInfoEntry[],
    latestStepOtp: string | null,
  ): ActiveRequestDTO {
    const dto: ActiveRequestDTO = {
      id: activation.id,
      subscriptionLabel: composeSubscriptionLabel(plan),
      key: cardKey,
      takenAt: activation.takenAt.toISOString(),
      state: activation.activationStat as unknown as ActivationStat,
      distributor: {
        storeName: distributor.storeName,
        wilayaName: distributor.wilaya.frName,
        communeName: distributor.commune.frName,
      },
      client: {
        fullName: activation.clientFullName,
        phone: activation.clientPhone,
      },
      accountFields: information.map((i) => ({
        fieldLabel: toLabel(i.accountInform),
        value: i.value ?? '',
      })),
      otpValue: latestStepOtp,
      freezeReason: activation.freezReason,
    };
    return ActiveRequestResponseSchema.parse(dto);
  }

  static toActivatorHistoryItemDTO(
    activation: {
      id: string;
      activationStat: string;
      requestedAt: Date;
      takenAt: Date | null;
      completedAt: Date | null;
      activationPrice: Decimal | null;
      clientFullName: string;
      clientPhone: string;
    },
    plan: ActivationPlanJoin,
    cardKey: string,
  ): ActivatorHistoryItemDTO {
    const dto: ActivatorHistoryItemDTO = {
      id: activation.id,
      subscriptionLabel: composeSubscriptionLabel(plan),
      key: cardKey,
      state: activation.activationStat as unknown as ActivationStat,
      requestedAt: activation.requestedAt.toISOString(),
      takenAt: activation.takenAt ? activation.takenAt.toISOString() : null,
      completedAt: activation.completedAt ? activation.completedAt.toISOString() : null,
      durationSeconds: durationSeconds(activation.takenAt, activation.completedAt),
      earning: decimalToNumber(activation.activationPrice),
      client: {
        fullName: activation.clientFullName,
        phone: activation.clientPhone,
      },
    };
    return ActivatorHistoryItemResponseSchema.parse(dto);
  }

  static toRecentDTO(
    activation: {
      id: string;
      activationStat: string;
      completedAt: Date;
      activationEmail: string | null;
    },
    plan: ActivationPlanJoin,
    cardKey: string,
  ): RecentActivationDTO {
    const dto: RecentActivationDTO = {
      id: activation.id,
      subscriptionLabel: composeSubscriptionLabel(plan),
      keyMasked: maskKey(cardKey),
      completedAt: activation.completedAt.toISOString(),
      state: activation.activationStat as unknown as ActivationStat,
      activationEmail: activation.activationEmail,
    };
    return RecentActivationResponseSchema.parse(dto);
  }

  static toAdminActivationDTO(
    activation: {
      id: string;
      activationStat: string;
      clientFullName: string;
      clientPhone: string;
      requestedAt: Date;
      takenAt: Date | null;
      completedAt: Date | null;
      activationPrice: Decimal | null;
      freezReason: string | null;
    },
    plan: ActivationPlanJoin,
    cardKey: string,
    activatorFullName: string | null,
    distributorStoreName: string,
  ): AdminActivationDTO {
    const dto: AdminActivationDTO = {
      id: activation.id,
      key: cardKey,
      subscriptionLabel: composeSubscriptionLabel(plan),
      activatorFullName,
      distributorStoreName,
      clientName: activation.clientFullName,
      clientPhone: activation.clientPhone,
      state: activation.activationStat as unknown as ActivationStat,
      requestedAt: activation.requestedAt.toISOString(),
      takenAt: activation.takenAt ? activation.takenAt.toISOString() : null,
      completedAt: activation.completedAt ? activation.completedAt.toISOString() : null,
      durationSeconds: durationSeconds(activation.takenAt, activation.completedAt),
      activationPrice: decimalToNumber(activation.activationPrice),
      freezeReason: activation.freezReason,
    };
    return AdminActivationResponseSchema.parse(dto);
  }

  static toActivationDetailDTO(
    activation: {
      id: string;
      clientFullName: string;
      clientPhone: string;
      activationPrice: Decimal | null;
      freezReason: string | null;
    },
    distributor: ActivationDistributorJoin,
    activator: { id: string; fullName: string } | null,
    information: ActivationInfoEntry[],
    steps: ActivationStepEntry[],
    cardHistory: Array<{ stat: CardStat; at: Date }>,
    commissionTierLabel: string | null,
  ): ActivationDetailDTO {
    const submittedInformation = information.map((i) => ({
      fieldLabel: toLabel(i.accountInform),
      value: maskValue(i.accountInform, i.value),
    }));

    const timeline = steps.map((step) => ({
      stat: step.activationStat as unknown as ActivationStat,
      createdAt: step.createdAt.toISOString(),
      wrongFields: step.wrongInformation.map((w) => ({
        fieldLabel: toLabel(w.accountInform),
        value: maskValue(w.accountInform, w.value),
      })),
      additionalFields: step.additionalInformation.map((a) => ({
        fieldLabel: toLabel(a.accountInform),
        value: maskValue(a.accountInform, a.value),
      })),
      freezeReason: step.activationStat === ActivationStat.FREEZE ? activation.freezReason : null,
    }));

    const dto: ActivationDetailDTO = {
      id: activation.id,
      client: {
        fullName: activation.clientFullName,
        phone: activation.clientPhone,
      },
      distributor: {
        storeName: distributor.storeName,
        wilayaName: distributor.wilaya.frName,
        communeName: distributor.commune.frName,
      },
      activator: activator ? { id: activator.id, fullName: activator.fullName } : null,
      submittedInformation,
      timeline,
      cardHistory: cardHistory.map((h) => ({
        stat: h.stat,
        at: h.at.toISOString(),
      })),
      financial: {
        activationPrice: decimalToNumber(activation.activationPrice),
        commissionTierLabel,
      },
    };
    return ActivationDetailResponseSchema.parse(dto);
  }
}
