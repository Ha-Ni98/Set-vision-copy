import type { PrismaClient } from '@prisma/client';
import {
  Prisma,
  ActivationStat as PrismaActivationStat,
  CardStat as PrismaCardStat,
  AccountInformation as PrismaAccountInformation,
  type Activator as PrismaActivator,
} from '@prisma/client';
import type { Decimal } from '@prisma/client/runtime/library';
import {
  ActivationStat,
  AccountInformation,
  ClientActivationStatus,
  CardStat,
  LogActionType,
  type KeyVerificationDTO,
  type ClientActivationStatusDTO,
  type PendingActivationDTO,
  type ActiveRequestDTO,
  type ActivatorHistoryItemDTO,
  type RecentActivationDTO,
  type AdminActivationDTO,
  type ActivationDetailDTO,
  type PaginatedResult,
  type VerifyKeyCommand,
  type SubmitActivationCommand,
  type UpdateActivationCommand,
  type SubmitAdditionalInfoCommand,
  type FlagWrongInfoCommand,
  type RequestAdditionalInfoCommand,
  type FreezeRequestCommand,
  type SetActivatorPriceCommand,
  type GetActivationsQuery,
  type GetActivatorHistoryQuery,
  type ActivateActivationCommand,
} from '@my-app/contract';
import type { IActivationService } from './activation.interface';
import {
  ActivationMapper,
  type ActivationPlanJoin,
  type ActivationDistributorJoin,
  type ActivationInfoEntry,
  type ActivationStepEntry,
} from './activation.mapper';
import { buildPaginationMeta, toSkipTake } from '@common/http/pagination';
import { NotFoundError, ConflictError, ForbiddenError } from '@common/errors';
import { eventBus } from '@common/events/event-bus';

// ─── Constants ────────────────────────────────────────────────────────────────

const WORKING_STATS: PrismaActivationStat[] = [
  PrismaActivationStat.PROCESSING,
  PrismaActivationStat.WRONG_INFORMATION,
  PrismaActivationStat.ADDITIONAL_INFORMATION,
  PrismaActivationStat.FREEZE,
];

const LIVE_STATS: PrismaActivationStat[] = [PrismaActivationStat.PENDING, ...WORKING_STATS];

const CANCELLED_STATS: PrismaActivationStat[] = [
  PrismaActivationStat.CANCELLED_BY_ACTIVATOR,
  PrismaActivationStat.REMOVED_FROM_ACTIVATOR,
  PrismaActivationStat.CANCELLED_BY_ADMIN,
];

const TERMINAL_STATS: PrismaActivationStat[] = [
  PrismaActivationStat.ACTIVATED,
  PrismaActivationStat.ACTIVATED_BY_ADMIN,
  ...CANCELLED_STATS,
];

// ─── Full-join include shapes ─────────────────────────────────────────────────

const ACTIVE_REQUEST_INCLUDE = {
  information: true,
  card: {
    include: {
      subscriptionPlan: true,
      distributor: { include: { wilaya: true, commune: true } },
    },
  },
  steps: {
    orderBy: { createdAt: 'desc' as const },
    include: { wrongInformation: true, additionalInformation: true },
  },
} as const;

// ─── Service ──────────────────────────────────────────────────────────────────

export class ActivationService implements IActivationService {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async resolveActivator(userId: string): Promise<PrismaActivator> {
    const activator = await this.prisma.activator.findUnique({ where: { userId } });
    if (!activator) throw new ForbiddenError();
    return activator;
  }

  private assertOwnerAndWorking(
    activation: { activatorId: string | null; activationStat: string },
    activatorId: string,
  ): void {
    if (activation.activatorId !== activatorId) throw new ForbiddenError();
    if (!WORKING_STATS.includes(activation.activationStat as PrismaActivationStat)) {
      throw new ConflictError(`Activation is not in a working state: ${activation.activationStat}`);
    }
  }

  private resolveLatestWinsInfo(
    base: Array<{ accountInform: string; value: string | null }>,
    steps: Array<{
      wrongInformation: Array<{ accountInform: string; value: string | null }>;
      additionalInformation: Array<{ accountInform: string; value: string | null }>;
    }>,
  ): ActivationInfoEntry[] {
    const map = new Map<string, string | null>(base.map((i) => [i.accountInform, i.value]));
    for (const step of [...steps].reverse()) {
      for (const w of step.wrongInformation) map.set(w.accountInform, w.value);
      for (const a of step.additionalInformation) map.set(a.accountInform, a.value);
    }
    return Array.from(map.entries()).map(([accountInform, value]) => ({
      accountInform: accountInform as AccountInformation,
      value,
    }));
  }

  private extractOtpValue(
    steps: Array<{ additionalInformation: Array<{ accountInform: string; value: string | null }> }>,
  ): string | null {
    for (const step of steps) {
      const otp = step.additionalInformation.find((a) => a.accountInform === AccountInformation.OTP);
      if (otp) return otp.value;
    }
    return null;
  }

  private computeCommission(
    commissions: Array<{
      commission: Decimal;
      commissionDuration: { label: string; nbMinuteMin: number; nbMinuteMax: number | null };
    }>,
    takenAt: Date,
    completedAt: Date,
  ): { price: Decimal | null; tierLabel: string | null } {
    const durationMinutes = Math.floor(
      (completedAt.getTime() - takenAt.getTime()) / 60000,
    );
    const tier = commissions.find((c) => {
      const { nbMinuteMin: min, nbMinuteMax: max } = c.commissionDuration;
      return durationMinutes >= min && (max === null || durationMinutes <= max);
    });
    return tier
      ? { price: tier.commission, tierLabel: tier.commissionDuration.label }
      : { price: null, tierLabel: null };
  }

  private buildDistributorJoin(dist: {
    storeName: string;
    wilaya: { frName: string };
    commune: { frName: string };
  }): ActivationDistributorJoin {
    return {
      storeName: dist.storeName,
      wilaya: { frName: dist.wilaya.frName },
      commune: { frName: dist.commune.frName },
    };
  }

  private buildActiveRequestDTO(
    activation: {
      id: string;
      activationStat: string;
      takenAt: Date;
      clientFullName: string;
      clientPhone: string;
      freezReason: string | null;
      card: {
        key: string;
        subscriptionPlan: { subscriptionType: string; subscriptionDuration: string };
        distributor: { storeName: string; wilaya: { frName: string }; commune: { frName: string } } | null;
      };
      information: Array<{ accountInform: string; value: string | null }>;
      steps: ActivationStepEntry[];
    },
  ): ActiveRequestDTO {
    const plan = activation.card.subscriptionPlan as unknown as ActivationPlanJoin;
    const distributor = this.buildDistributorJoin(activation.card.distributor!);
    const info = this.resolveLatestWinsInfo(activation.information, activation.steps);
    const otpValue = this.extractOtpValue(activation.steps);
    return ActivationMapper.toActiveRequestDTO(
      activation,
      plan,
      activation.card.key,
      distributor,
      info,
      otpValue,
    );
  }

  private buildCardHistory(
    card: {
      set: { createdAt: Date; printedAt: Date | null };
      lot: { createdAt: Date; orderLots: Array<{ order: { completedAt: Date | null } }> } | null;
    },
    requestedAt: Date,
    completedAt: Date | null,
    activationStat: string,
  ): Array<{ stat: CardStat; at: Date }> {
    const history: Array<{ stat: CardStat; at: Date }> = [];
    history.push({ stat: CardStat.IN_SET, at: card.set.createdAt });
    if (card.set.printedAt) history.push({ stat: CardStat.PRINTED, at: card.set.printedAt });
    if (card.lot) {
      history.push({ stat: CardStat.IN_LOT, at: card.lot.createdAt });
      const orderCompleted = card.lot.orderLots[0]?.order.completedAt;
      if (orderCompleted) history.push({ stat: CardStat.AT_DISTRIBUTOR, at: orderCompleted });
    }
    history.push({ stat: CardStat.ACTIVATION_PROGRESS, at: requestedAt });
    if (completedAt) {
      const terminalStat =
        activationStat === PrismaActivationStat.ACTIVATED ||
        activationStat === PrismaActivationStat.ACTIVATED_BY_ADMIN
          ? CardStat.ACTIVATED
          : activationStat === PrismaActivationStat.CANCELLED_BY_ADMIN
            ? CardStat.ACTIVATION_FAILED
            : null;
      if (terminalStat) history.push({ stat: terminalStat, at: completedAt });
    }
    return history;
  }

  // ─── Client methods ────────────────────────────────────────────────────────

  async verify(cmd: VerifyKeyCommand): Promise<KeyVerificationDTO> {
    const card = await this.prisma.card.findFirst({
      where: { key: cmd.key, deletedAt: null },
      include: {
        subscriptionPlan: true,
        activations: {
          where: { activationStat: { notIn: CANCELLED_STATS } },
          orderBy: { requestedAt: 'desc' },
          take: 1,
          include: {
            information: true,
            steps: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { wrongInformation: true, additionalInformation: true },
            },
          },
        },
      },
    });

    if (!card || !card.isActive) {
      return ActivationMapper.toKeyVerificationDTO(ClientActivationStatus.INVALID, null, null);
    }

    const plan = card.subscriptionPlan as unknown as ActivationPlanJoin;
    const live = card.activations[0] ?? null;

    if (!live) {
      return ActivationMapper.toKeyVerificationDTO(ClientActivationStatus.READY, plan, null);
    }

    const status = ActivationMapper.toClientStatusDTO({
      id: live.id,
      activationStat: live.activationStat,
    }).status;

    const latestStep = live.steps[0] ?? null;

    return ActivationMapper.toKeyVerificationDTO(status, plan, {
      id: live.id,
      information: live.information.map((i) => ({
        accountInform: i.accountInform as AccountInformation,
        value: i.value,
      })),
      latestStep: latestStep
        ? {
            wrongInformation: latestStep.wrongInformation.map((w) => ({
              accountInform: w.accountInform as AccountInformation,
            })),
            additionalInformation: latestStep.additionalInformation.map((a) => ({
              accountInform: a.accountInform as AccountInformation,
            })),
          }
        : null,
    });
  }

  async submit(cmd: SubmitActivationCommand): Promise<ClientActivationStatusDTO> {
    const card = await this.prisma.card.findFirst({
      where: { key: cmd.key, deletedAt: null },
      include: {
        subscriptionPlan: true,
        activations: {
          where: { activationStat: { in: LIVE_STATS } },
          take: 1,
        },
      },
    });

    if (!card || !card.isActive || card.cardStat !== PrismaCardStat.AT_DISTRIBUTOR) {
      throw new ConflictError('Card is not available for activation');
    }

    if (card.activations.length > 0) {
      throw new ConflictError('Card already has a live activation');
    }

    const now = new Date();

    const activation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.activation.create({
        data: {
          cardId: card.id,
          activationStat: PrismaActivationStat.PENDING,
          clientFullName: cmd.fullName,
          clientPhone: cmd.phone,
          requestedAt: now,
          information: {
            create: cmd.accountFields.map((f) => ({
              accountInform: f.field as unknown as PrismaAccountInformation,
              value: f.value,
            })),
          },
          steps: { create: [{ activationStat: PrismaActivationStat.PENDING }] },
        },
      });

      await tx.card.update({
        where: { id: card.id },
        data: { cardStat: PrismaCardStat.ACTIVATION_PROGRESS },
      });

      return created;
    });

    const pendingDto = ActivationMapper.toPendingDTO(
      { id: activation.id, requestedAt: activation.requestedAt },
      card.subscriptionPlan as unknown as ActivationPlanJoin,
      card.key,
    );

    eventBus.emit('activation:created', pendingDto);
    eventBus.emit('activation:status-changed', {
      activationId: activation.id,
      status: ClientActivationStatus.SUBMITTED,
      timestamp: now.toISOString(),
    });

    return ActivationMapper.toClientStatusDTO({
      id: activation.id,
      activationStat: activation.activationStat,
    });
  }

  async update(activationId: string, cmd: UpdateActivationCommand): Promise<ClientActivationStatusDTO> {
    const activation = await this.prisma.activation.findUnique({
      where: { id: activationId },
      include: {
        steps: {
          where: { activationStat: PrismaActivationStat.WRONG_INFORMATION },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!activation) throw new NotFoundError('Activation not found');
    if (activation.activationStat !== PrismaActivationStat.WRONG_INFORMATION) {
      throw new ConflictError('Activation is not awaiting correction');
    }

    const latestWrongStep = activation.steps[0];
    if (!latestWrongStep) throw new ConflictError('No wrong information step found');

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        cmd.accountFields.map((f) =>
          tx.wrongInformation.updateMany({
            where: {
              activationStepId: latestWrongStep.id,
              accountInform: f.field as unknown as PrismaAccountInformation,
            },
            data: { value: f.value },
          }),
        ),
      );

      await tx.activationStep.create({
        data: { activationId, activationStat: PrismaActivationStat.PROCESSING },
      });

      await tx.activation.update({
        where: { id: activationId },
        data: { activationStat: PrismaActivationStat.PROCESSING },
      });
    });

    eventBus.emit('activation:client-updated', {
      activationId,
      activatorId: activation.activatorId!,
      timestamp: now.toISOString(),
    });
    eventBus.emit('activation:status-changed', {
      activationId,
      status: ClientActivationStatus.PROCESSING,
      timestamp: now.toISOString(),
    });

    return ActivationMapper.toClientStatusDTO({
      id: activationId,
      activationStat: PrismaActivationStat.PROCESSING,
    });
  }

  async additional(activationId: string, cmd: SubmitAdditionalInfoCommand): Promise<ClientActivationStatusDTO> {
    const activation = await this.prisma.activation.findUnique({
      where: { id: activationId },
      include: {
        steps: {
          where: { activationStat: PrismaActivationStat.ADDITIONAL_INFORMATION },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!activation) throw new NotFoundError('Activation not found');
    if (activation.activationStat !== PrismaActivationStat.ADDITIONAL_INFORMATION) {
      throw new ConflictError('Activation is not awaiting additional information');
    }

    const latestAdditionalStep = activation.steps[0];
    if (!latestAdditionalStep) throw new ConflictError('No additional information step found');

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        cmd.accountFields.map((f) =>
          tx.additionalInformation.updateMany({
            where: {
              activationStepId: latestAdditionalStep.id,
              accountInform: f.field as unknown as PrismaAccountInformation,
            },
            data: { value: f.value },
          }),
        ),
      );

      await tx.activationStep.create({
        data: { activationId, activationStat: PrismaActivationStat.PROCESSING },
      });

      await tx.activation.update({
        where: { id: activationId },
        data: { activationStat: PrismaActivationStat.PROCESSING },
      });
    });

    eventBus.emit('activation:client-updated', {
      activationId,
      activatorId: activation.activatorId!,
      timestamp: now.toISOString(),
    });
    eventBus.emit('activation:status-changed', {
      activationId,
      status: ClientActivationStatus.PROCESSING,
      timestamp: now.toISOString(),
    });

    return ActivationMapper.toClientStatusDTO({
      id: activationId,
      activationStat: PrismaActivationStat.PROCESSING,
    });
  }

  async status(activationId: string): Promise<ClientActivationStatusDTO> {
    const activation = await this.prisma.activation.findUnique({
      where: { id: activationId },
    });
    if (!activation) throw new NotFoundError('Activation not found');
    return ActivationMapper.toClientStatusDTO({
      id: activation.id,
      activationStat: activation.activationStat,
    });
  }

  // ─── Activator methods ─────────────────────────────────────────────────────

  async getPending(): Promise<PendingActivationDTO[]> {
    const activations = await this.prisma.activation.findMany({
      where: { activationStat: PrismaActivationStat.PENDING },
      orderBy: { requestedAt: 'asc' },
      include: {
        card: { include: { subscriptionPlan: true } },
      },
    });

    return activations.map((a) =>
      ActivationMapper.toPendingDTO(
        { id: a.id, requestedAt: a.requestedAt },
        a.card.subscriptionPlan as unknown as ActivationPlanJoin,
        a.card.key,
      ),
    );
  }

  async getActive(principalUserId: string): Promise<ActiveRequestDTO[]> {
    const activator = await this.resolveActivator(principalUserId);

    const activations = await this.prisma.activation.findMany({
      where: {
        activatorId: activator.id,
        activationStat: { in: WORKING_STATS },
      },
      include: ACTIVE_REQUEST_INCLUDE,
    });

    return activations.map((a) => this.buildActiveRequestDTO({ ...a, takenAt: a.takenAt! }));
  }

  async take(id: string, principalUserId: string): Promise<ActiveRequestDTO> {
    const activator = await this.resolveActivator(principalUserId);

    const activeCount = await this.prisma.activation.count({
      where: { activatorId: activator.id, activationStat: { in: WORKING_STATS } },
    });

    if (activeCount >= 3) {
      throw new ConflictError('Maximum of 3 active requests reached');
    }

    const now = new Date();

    const result = await this.prisma.activation.updateMany({
      where: { id, activationStat: PrismaActivationStat.PENDING },
      data: {
        activationStat: PrismaActivationStat.PROCESSING,
        activatorId: activator.id,
        takenAt: now,
      },
    });

    if (result.count === 0) {
      throw new ConflictError('Activation is no longer pending');
    }

    await this.prisma.activationStep.create({
      data: { activationId: id, activationStat: PrismaActivationStat.PROCESSING },
    });

    const activation = await this.prisma.activation.findUnique({
      where: { id },
      include: ACTIVE_REQUEST_INCLUDE,
    });

    eventBus.emit('activation:taken', {
      activationId: id,
      activatorId: activator.id,
      timestamp: now.toISOString(),
    });

    return this.buildActiveRequestDTO({ ...activation!, takenAt: activation!.takenAt! });
  }

  async flagWrong(
    id: string,
    principalUserId: string,
    cmd: FlagWrongInfoCommand,
  ): Promise<ActiveRequestDTO> {
    const activator = await this.resolveActivator(principalUserId);

    const activation = await this.prisma.activation.findUnique({
      where: { id },
      include: ACTIVE_REQUEST_INCLUDE,
    });

    if (!activation) throw new NotFoundError('Activation not found');
    this.assertOwnerAndWorking(activation, activator.id);

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const step = await tx.activationStep.create({
        data: { activationId: id, activationStat: PrismaActivationStat.WRONG_INFORMATION },
      });

      await tx.wrongInformation.createMany({
        data: cmd.fields.map((f) => ({
          activationStepId: step.id,
          accountInform: f as unknown as PrismaAccountInformation,
          value: null,
        })),
      });

      await tx.activation.update({
        where: { id },
        data: { activationStat: PrismaActivationStat.WRONG_INFORMATION },
      });
    });

    eventBus.emit('activation:status-changed', {
      activationId: id,
      status: ClientActivationStatus.NEEDS_CORRECTION,
      timestamp: now.toISOString(),
    });

    return this.buildActiveRequestDTO({
      ...activation,
      activationStat: PrismaActivationStat.WRONG_INFORMATION,
      takenAt: activation.takenAt!,
    });
  }

  async requestAdditional(
    id: string,
    principalUserId: string,
    cmd: RequestAdditionalInfoCommand,
  ): Promise<ActiveRequestDTO> {
    const activator = await this.resolveActivator(principalUserId);

    const activation = await this.prisma.activation.findUnique({
      where: { id },
      include: ACTIVE_REQUEST_INCLUDE,
    });

    if (!activation) throw new NotFoundError('Activation not found');
    this.assertOwnerAndWorking(activation, activator.id);

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const step = await tx.activationStep.create({
        data: { activationId: id, activationStat: PrismaActivationStat.ADDITIONAL_INFORMATION },
      });

      await tx.additionalInformation.createMany({
        data: cmd.fields.map((f) => ({
          activationStepId: step.id,
          accountInform: f as unknown as PrismaAccountInformation,
          value: null,
        })),
      });

      await tx.activation.update({
        where: { id },
        data: { activationStat: PrismaActivationStat.ADDITIONAL_INFORMATION },
      });
    });

    eventBus.emit('activation:status-changed', {
      activationId: id,
      status: ClientActivationStatus.NEEDS_OTP,
      timestamp: now.toISOString(),
    });

    return this.buildActiveRequestDTO({
      ...activation,
      activationStat: PrismaActivationStat.ADDITIONAL_INFORMATION,
      takenAt: activation.takenAt!,
    });
  }

  async activate(
    id: string,
    principalUserId: string,
    cmd: ActivateActivationCommand,
  ): Promise<ActiveRequestDTO> {
    const activator = await this.resolveActivator(principalUserId);

    const activation = await this.prisma.activation.findUnique({
      where: { id },
      include: {
        ...ACTIVE_REQUEST_INCLUDE,
        card: {
          include: {
            subscriptionPlan: {
              include: { commissions: { include: { commissionDuration: true } } },
            },
            distributor: { include: { wilaya: true, commune: true } },
          },
        },
      },
    });

    if (!activation) throw new NotFoundError('Activation not found');
    this.assertOwnerAndWorking(activation, activator.id);

    const now = new Date();
    const { price, tierLabel } = this.computeCommission(
      activation.card.subscriptionPlan.commissions,
      activation.takenAt!,
      now,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.activation.update({
        where: { id },
        data: {
          activationStat: PrismaActivationStat.ACTIVATED,
          completedAt: now,
          activationEmail: cmd.activationEmail,
          ...(price && { activationPrice: price }),
        },
      });

      await tx.card.update({
        where: { id: activation.cardId },
        data: { cardStat: PrismaCardStat.ACTIVATED },
      });

      await tx.activator.update({
        where: { id: activator.id },
        data: {
          nbOfActivation: { increment: 1 },
          nbOfSuccessfulActivation: { increment: 1 },
          ...(price && {
            totalEarning: { increment: price },
            credits: { increment: price },
          }),
        },
      });

      await tx.distributor.update({
        where: { id: activation.card.distributorId! },
        data: { nbOfActivation: { increment: 1 }, nbOfActiveCards: { decrement: 1 } },
      });

      await tx.activationStep.create({
        data: { activationId: id, activationStat: PrismaActivationStat.ACTIVATED },
      });
    });

    eventBus.emit('activation:status-changed', {
      activationId: id,
      status: ClientActivationStatus.ACTIVATED,
      timestamp: now.toISOString(),
    });

    return this.buildActiveRequestDTO({
      ...activation,
      activationStat: PrismaActivationStat.ACTIVATED,
      takenAt: activation.takenAt!,
    });
  }

  async cancel(id: string, principalUserId: string): Promise<void> {
    const activator = await this.resolveActivator(principalUserId);

    const activation = await this.prisma.activation.findUnique({
      where: { id },
      include: { information: true },
    });

    if (!activation) throw new NotFoundError('Activation not found');
    this.assertOwnerAndWorking(activation, activator.id);

    const now = new Date();

    const newActivation = await this.prisma.$transaction(async (tx) => {
      await tx.activation.update({
        where: { id },
        data: {
          activationStat: PrismaActivationStat.CANCELLED_BY_ACTIVATOR,
          completedAt: now,
        },
      });

      await tx.activationStep.create({
        data: { activationId: id, activationStat: PrismaActivationStat.CANCELLED_BY_ACTIVATOR },
      });

      const created = await tx.activation.create({
        data: {
          cardId: activation.cardId,
          activationStat: PrismaActivationStat.PENDING,
          clientFullName: activation.clientFullName,
          clientPhone: activation.clientPhone,
          ...(activation.clientEmail && { clientEmail: activation.clientEmail }),
          information: {
            create: activation.information.map((i) => ({
              accountInform: i.accountInform,
              value: i.value,
            })),
          },
          steps: { create: [{ activationStat: PrismaActivationStat.PENDING }] },
        },
        include: { card: { include: { subscriptionPlan: true } } },
      });

      await tx.activator.update({
        where: { id: activator.id },
        data: { nbOfActivation: { increment: 1 } },
      });

      return created;
    });

    const plan = newActivation.card.subscriptionPlan as unknown as ActivationPlanJoin;

    eventBus.emit('activation:status-changed', {
      activationId: id,
      status: ClientActivationStatus.FAILED,
      timestamp: now.toISOString(),
    });
    eventBus.emit(
      'activation:created',
      ActivationMapper.toPendingDTO(
        { id: newActivation.id, requestedAt: newActivation.requestedAt },
        plan,
        newActivation.card.key,
      ),
    );
  }

  async release(id: string, principalUserId: string): Promise<void> {
    const activator = await this.resolveActivator(principalUserId);

    const activation = await this.prisma.activation.findUnique({
      where: { id },
      include: { information: true },
    });

    if (!activation) throw new NotFoundError('Activation not found');
    this.assertOwnerAndWorking(activation, activator.id);

    const now = new Date();

    const newActivation = await this.prisma.$transaction(async (tx) => {
      await tx.activation.update({
        where: { id },
        data: {
          activationStat: PrismaActivationStat.REMOVED_FROM_ACTIVATOR,
          completedAt: now,
        },
      });

      await tx.activationStep.create({
        data: { activationId: id, activationStat: PrismaActivationStat.REMOVED_FROM_ACTIVATOR },
      });

      const created = await tx.activation.create({
        data: {
          cardId: activation.cardId,
          activationStat: PrismaActivationStat.PENDING,
          clientFullName: activation.clientFullName,
          clientPhone: activation.clientPhone,
          ...(activation.clientEmail && { clientEmail: activation.clientEmail }),
          information: {
            create: activation.information.map((i) => ({
              accountInform: i.accountInform,
              value: i.value,
            })),
          },
          steps: { create: [{ activationStat: PrismaActivationStat.PENDING }] },
        },
        include: { card: { include: { subscriptionPlan: true } } },
      });

      await tx.activator.update({
        where: { id: activator.id },
        data: { nbOfActivation: { increment: 1 } },
      });

      return created;
    });

    const plan = newActivation.card.subscriptionPlan as unknown as ActivationPlanJoin;

    eventBus.emit('activation:status-changed', {
      activationId: id,
      status: ClientActivationStatus.FAILED,
      timestamp: now.toISOString(),
    });
    eventBus.emit(
      'activation:created',
      ActivationMapper.toPendingDTO(
        { id: newActivation.id, requestedAt: newActivation.requestedAt },
        plan,
        newActivation.card.key,
      ),
    );
  }

  async freeze(id: string, principalUserId: string, cmd: FreezeRequestCommand): Promise<ActiveRequestDTO> {
    const activator = await this.resolveActivator(principalUserId);

    const activation = await this.prisma.activation.findUnique({
      where: { id },
      include: ACTIVE_REQUEST_INCLUDE,
    });

    if (!activation) throw new NotFoundError('Activation not found');
    this.assertOwnerAndWorking(activation, activator.id);

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.activation.update({
        where: { id },
        data: {
          activationStat: PrismaActivationStat.FREEZE,
          freezReason: cmd.reason,
        },
      });

      await tx.activationStep.create({
        data: { activationId: id, activationStat: PrismaActivationStat.FREEZE },
      });
    });

    eventBus.emit('activation:frozen', {
      activationId: id,
      timestamp: now.toISOString(),
    });
    eventBus.emit('activation:status-changed', {
      activationId: id,
      status: ClientActivationStatus.UNDER_REVIEW,
      timestamp: now.toISOString(),
    });

    return this.buildActiveRequestDTO({
      ...activation,
      activationStat: PrismaActivationStat.FREEZE,
      freezReason: cmd.reason,
      takenAt: activation.takenAt!,
    });
  }

  async getMyHistory(
    principalUserId: string,
    query: GetActivatorHistoryQuery,
  ): Promise<PaginatedResult<ActivatorHistoryItemDTO>> {
    const activator = await this.resolveActivator(principalUserId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = {
      activatorId: activator.id,
      activationStat: { in: TERMINAL_STATS },
      ...(query.status && { activationStat: query.status as unknown as PrismaActivationStat }),
      ...(query.dateFrom && { requestedAt: { gte: new Date(query.dateFrom) } }),
      ...(query.dateTo && { requestedAt: { lte: new Date(query.dateTo) } }),
      ...(query.search && { card: { key: { contains: query.search, mode: 'insensitive' as const } } }),
    };

    const orderBy = query.sortBy === 'durationSeconds'
      ? { takenAt: 'asc' as const }
      : query.sortBy === 'completedAt'
        ? { completedAt: 'desc' as const }
        : query.sortBy === 'activationPrice'
          ? { activationPrice: 'desc' as const }
          : { requestedAt: 'desc' as const };

    const [activations, total] = await Promise.all([
      this.prisma.activation.findMany({
        where,
        orderBy,
        include: { card: { include: { subscriptionPlan: true } } },
        ...toSkipTake({ page, limit }),
      }),
      this.prisma.activation.count({ where }),
    ]);

    const items = activations.map((a) =>
      ActivationMapper.toActivatorHistoryItemDTO(
        {
          id: a.id,
          activationStat: a.activationStat,
          requestedAt: a.requestedAt,
          takenAt: a.takenAt,
          completedAt: a.completedAt,
          activationPrice: a.activationPrice,
          clientFullName: a.clientFullName,
          clientPhone: a.clientPhone,
        },
        a.card.subscriptionPlan as unknown as ActivationPlanJoin,
        a.card.key,
      ),
    );

    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  async getRecent(): Promise<RecentActivationDTO[]> {
    const activations = await this.prisma.activation.findMany({
      where: {
        activationStat: {
          in: [PrismaActivationStat.ACTIVATED, PrismaActivationStat.ACTIVATED_BY_ADMIN],
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
      include: { card: { include: { subscriptionPlan: true } } },
    });

    return activations.map((a) =>
      ActivationMapper.toRecentDTO(
        {
          id: a.id,
          activationStat: a.activationStat,
          completedAt: a.completedAt!,
          activationEmail: a.activationEmail,
        },
        a.card.subscriptionPlan as unknown as ActivationPlanJoin,
        a.card.key,
      ),
    );
  }

  // ─── Admin methods ─────────────────────────────────────────────────────────

  async getAll(query: GetActivationsQuery): Promise<PaginatedResult<AdminActivationDTO>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const cardWhere: {
      subscriptionPlanId?: string;
      distributorId?: string;
      key?: { contains: string; mode: 'insensitive' };
      distributor?: { wilayaId?: string; communeId?: string };
    } = {};
    if (query.subscriptionPlanId) cardWhere.subscriptionPlanId = query.subscriptionPlanId;
    if (query.distributorId) cardWhere.distributorId = query.distributorId;
    if (query.key) cardWhere.key = { contains: query.key, mode: 'insensitive' };
    if (query.wilayaId || query.communeId) {
      cardWhere.distributor = {
        ...(query.wilayaId && { wilayaId: query.wilayaId }),
        ...(query.communeId && { communeId: query.communeId }),
      };
    }

    const requestedAtFilter: { gte?: Date; lte?: Date } = {};
    if (query.dateFrom) requestedAtFilter.gte = new Date(query.dateFrom);
    if (query.dateTo) requestedAtFilter.lte = new Date(query.dateTo);

    const where = {
      ...(Object.keys(cardWhere).length > 0 && { card: cardWhere }),
      ...(query.activatorId && { activatorId: query.activatorId }),
      ...(query.state && { activationStat: query.state as unknown as PrismaActivationStat }),
      ...(Object.keys(requestedAtFilter).length > 0 && { requestedAt: requestedAtFilter }),
    };

    const [activations, total] = await Promise.all([
      this.prisma.activation.findMany({
        where,
        include: {
          card: { include: { subscriptionPlan: true, distributor: { select: { storeName: true } } } },
          activator: { select: { fullName: true } },
        },
        orderBy: { requestedAt: 'desc' },
        ...toSkipTake({ page, limit }),
      }),
      this.prisma.activation.count({ where }),
    ]);

    const items = activations.map((a) =>
      ActivationMapper.toAdminActivationDTO(
        a,
        a.card.subscriptionPlan as unknown as ActivationPlanJoin,
        a.card.key,
        a.activator?.fullName ?? null,
        a.card.distributor?.storeName ?? '',
      ),
    );

    return { items, meta: buildPaginationMeta(page, limit, total) };
  }

  async getById(id: string): Promise<ActivationDetailDTO> {
    const activation = await this.prisma.activation.findUnique({
      where: { id },
      include: {
        card: {
          include: {
            set: true,
            lot: {
              include: {
                orderLots: {
                  take: 1,
                  include: { order: { select: { completedAt: true } } },
                },
              },
            },
            subscriptionPlan: {
              include: { commissions: { include: { commissionDuration: true } } },
            },
            distributor: { include: { wilaya: true, commune: true } },
          },
        },
        activator: { select: { id: true, fullName: true } },
        information: true,
        steps: {
          orderBy: { createdAt: 'desc' as const },
          include: { wrongInformation: true, additionalInformation: true },
        },
      },
    });

    if (!activation) throw new NotFoundError('Activation not found');

    const plan = activation.card.subscriptionPlan as unknown as ActivationPlanJoin;
    const dist = this.buildDistributorJoin(activation.card.distributor!);
    const latestWinsInfo = this.resolveLatestWinsInfo(activation.information, activation.steps);
    const cardHistory = this.buildCardHistory(
      activation.card,
      activation.requestedAt,
      activation.completedAt,
      activation.activationStat,
    );

    const { tierLabel: commissionTierLabel } =
      activation.takenAt && activation.completedAt
        ? this.computeCommission(
            activation.card.subscriptionPlan.commissions,
            activation.takenAt,
            activation.completedAt,
          )
        : { tierLabel: null };

    return ActivationMapper.toActivationDetailDTO(
      activation,
      dist,
      activation.activator,
      latestWinsInfo,
      activation.steps,
      cardHistory,
      commissionTierLabel,
    );
  }

  async activateByAdmin(id: string, cmd: ActivateActivationCommand): Promise<AdminActivationDTO> {
    const activation = await this.prisma.activation.findUnique({
      where: { id },
      include: {
        card: {
          include: {
            subscriptionPlan: { include: { commissions: { include: { commissionDuration: true } } } },
            distributor: { select: { id: true, storeName: true } },
          },
        },
        activator: true,
      },
    });

    if (!activation) throw new NotFoundError('Activation not found');
    if (activation.activationStat !== PrismaActivationStat.FREEZE) {
      throw new ConflictError('Activation is not frozen');
    }

    const now = new Date();
    const { price, tierLabel: _tierLabel } = activation.takenAt
      ? this.computeCommission(activation.card.subscriptionPlan.commissions, activation.takenAt, now)
      : { price: null, tierLabel: null };

    await this.prisma.$transaction(async (tx) => {
      await tx.activation.update({
        where: { id },
        data: {
          activationStat: PrismaActivationStat.ACTIVATED_BY_ADMIN,
          completedAt: now,
          activationEmail: cmd.activationEmail,
          ...(price && { activationPrice: price }),
        },
      });

      await tx.card.update({
        where: { id: activation.cardId },
        data: { cardStat: PrismaCardStat.ACTIVATED },
      });

      if (activation.activator) {
        await tx.activator.update({
          where: { id: activation.activator.id },
          data: {
            nbOfActivation: { increment: 1 },
            nbOfSuccessfulActivation: { increment: 1 },
            ...(price && { totalEarning: { increment: price }, credits: { increment: price } }),
          },
        });
      }

      await tx.distributor.update({
        where: { id: activation.card.distributor!.id },
        data: { nbOfActivation: { increment: 1 }, nbOfActiveCards: { decrement: 1 } },
      });

      await tx.activationStep.create({
        data: { activationId: id, activationStat: PrismaActivationStat.ACTIVATED_BY_ADMIN },
      });
    });

    const plan = activation.card.subscriptionPlan as unknown as ActivationPlanJoin;

    eventBus.emit('activation:resolved', {
      activationId: id,
      activatorId: activation.activator!.id,
      outcome: ActivationStat.ACTIVATED_BY_ADMIN,
      timestamp: now.toISOString(),
    });
    eventBus.emit('activation:status-changed', {
      activationId: id,
      status: ClientActivationStatus.ACTIVATED,
      timestamp: now.toISOString(),
    });

    return ActivationMapper.toAdminActivationDTO(
      { ...activation, activationStat: PrismaActivationStat.ACTIVATED_BY_ADMIN, completedAt: now, activationPrice: price },
      plan,
      activation.card.key,
      activation.activator?.fullName ?? null,
      activation.card.distributor?.storeName ?? '',
    );
  }

  async cancelByAdmin(id: string): Promise<AdminActivationDTO> {
    const activation = await this.prisma.activation.findUnique({
      where: { id },
      include: {
        card: { include: { subscriptionPlan: true, distributor: { select: { id: true, storeName: true } } } },
        activator: { select: { id: true, fullName: true } },
      },
    });

    if (!activation) throw new NotFoundError('Activation not found');
    if (activation.activationStat !== PrismaActivationStat.FREEZE) {
      throw new ConflictError('Activation is not frozen');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.activation.update({
        where: { id },
        data: { activationStat: PrismaActivationStat.CANCELLED_BY_ADMIN, completedAt: now },
      });

      await tx.card.update({
        where: { id: activation.cardId },
        data: { cardStat: PrismaCardStat.ACTIVATION_FAILED },
      });

      if (activation.activator) {
        await tx.activator.update({
          where: { id: activation.activator.id },
          data: { nbOfActivation: { increment: 1 } },
        });
      }

      await tx.activationStep.create({
        data: { activationId: id, activationStat: PrismaActivationStat.CANCELLED_BY_ADMIN },
      });
    });

    const plan = activation.card.subscriptionPlan as unknown as ActivationPlanJoin;

    eventBus.emit('activation:resolved', {
      activationId: id,
      activatorId: activation.activator!.id,
      outcome: ActivationStat.CANCELLED_BY_ADMIN,
      timestamp: now.toISOString(),
    });
    eventBus.emit('activation:status-changed', {
      activationId: id,
      status: ClientActivationStatus.FAILED,
      timestamp: now.toISOString(),
    });

    return ActivationMapper.toAdminActivationDTO(
      { ...activation, activationStat: PrismaActivationStat.CANCELLED_BY_ADMIN, completedAt: now },
      plan,
      activation.card.key,
      activation.activator?.fullName ?? null,
      activation.card.distributor?.storeName ?? '',
    );
  }

  async setPrice(id: string, cmd: SetActivatorPriceCommand, actorId: string): Promise<AdminActivationDTO> {
    const activation = await this.prisma.activation.findUnique({
      where: { id },
      include: {
        card: { include: { subscriptionPlan: true, distributor: { select: { storeName: true } } } },
        activator: { select: { id: true, fullName: true } },
      },
    });

    if (!activation) throw new NotFoundError('Activation not found');

    const completedStats: PrismaActivationStat[] = [
      PrismaActivationStat.ACTIVATED,
      PrismaActivationStat.ACTIVATED_BY_ADMIN,
    ];
    if (!completedStats.includes(activation.activationStat as PrismaActivationStat)) {
      throw new ConflictError('Activation is not completed');
    }

    const oldPrice = activation.activationPrice ? Number(activation.activationPrice) : 0;
    const delta = cmd.amount - oldPrice;

    await this.prisma.$transaction(async (tx) => {
      await tx.activation.update({
        where: { id },
        data: { activationPrice: new Prisma.Decimal(cmd.amount) },
      });

      if (activation.activator) {
        await tx.activator.update({
          where: { id: activation.activator.id },
          data: { totalEarning: { increment: delta }, credits: { increment: delta } },
        });
      }
    });

    await this.prisma.log.create({
      data: {
        actionType: LogActionType.CHANGE_ACTIVATION_COMMISSION,
        actionDescription: `Set activation price to ${cmd.amount} (was ${oldPrice})`,
        userId: actorId,
      },
    });

    const plan = activation.card.subscriptionPlan as unknown as ActivationPlanJoin;

    return ActivationMapper.toAdminActivationDTO(
      { ...activation, activationPrice: new Prisma.Decimal(cmd.amount) },
      plan,
      activation.card.key,
      activation.activator?.fullName ?? null,
      activation.card.distributor?.storeName ?? '',
    );
  }
}
