import type { PrismaClient } from '@prisma/client';
import {
  NotificationChannel,
  NotificationType,
  ActivationStat,
  ClientUpdateKind,
  AccountInformation,
} from '@my-app/contract';
import { eventBus } from '../events/event-bus';
import { logger } from '../config/logger';
import { formatDuration } from '../utils/duration.utils';
import type { INotificationService, NotificationRequest } from './notification.types';
import { allActivators, oneActivator, allAdmins, oneDistributor } from './notification.recipients';
import { render, FIELD_LABEL_FR, formatMoney, composeSubscriptionLabelFR } from './notification.templates';

// Deferral off the synchronous emit path (layer 1 of 3, Set 6 plan §9.3): eventBus.emit() is
// synchronous and un-caught inside domain services, so a throwing subscriber would otherwise
// propagate straight into the request that triggered it. setImmediate returns control to the
// emitting service before any of this runs — a Telegram outage cannot unwind an activation.
//
// This is deliberately NOT the realtime gateway's safe() (layer 2): that one is
// `try { fn() } catch`, sync-only, and would not catch a rejected promise from an async
// handler. This wrapper awaits inside try/catch instead. Do not import or copy safe().
const safeAsync = (evt: string, fn: () => Promise<void>) => (): void => {
  setImmediate(() => {
    void fn().catch((err) => logger.error({ err, evt }, 'Notification subscriber failed'));
  });
};

// Every ActivationStat listed explicitly (not Partial<Record<…>>) so a new enum value fails
// tsc here until someone decides what it means for this table — visible decision, not a
// silent fall-through (Set 6 plan §5.4.2). Only the three admin-facing / receipt outcomes
// produce a message; the other seven are the activator's own action or have no recipient yet.
const STATUS_TEMPLATE: Record<ActivationStat, NotificationType | null> = {
  [ActivationStat.PENDING]: null,
  [ActivationStat.PROCESSING]: null, // covered by activation:client-updated instead (§5.4.2)
  [ActivationStat.WRONG_INFORMATION]: null,
  [ActivationStat.ADDITIONAL_INFORMATION]: null,
  [ActivationStat.FREEZE]: null, // activator's own action; admins are notified via activation:frozen
  [ActivationStat.ACTIVATED]: NotificationType.ACTIVATION_STATUS_CHANGED,
  [ActivationStat.ACTIVATED_BY_ADMIN]: NotificationType.ACTIVATION_STATUS_CHANGED,
  [ActivationStat.CANCELLED_BY_ACTIVATOR]: null,
  [ActivationStat.REMOVED_FROM_ACTIVATOR]: null,
  [ActivationStat.CANCELLED_BY_ADMIN]: NotificationType.ACTIVATION_STATUS_CHANGED,
};

function toRequest(
  type: NotificationType,
  recipient: { role: NotificationRequest['recipient']['role']; profileId: string; name: string; address: string },
  body: string,
): NotificationRequest {
  return { channel: NotificationChannel.TELEGRAM, type, recipient, body };
}

// ─── Row 1: activation:created → all linked activators ────────────────────────────────────
async function onActivationCreated(
  svc: INotificationService,
  prisma: PrismaClient,
  p: { id: string; subscriptionLabel: string; keyMasked: string; requestedAt: string },
): Promise<void> {
  const recipients = await allActivators(prisma);
  if (recipients.length === 0) return;

  const body = render(NotificationType.ACTIVATION_CREATED, {
    cardKeyMasked: p.keyMasked,
    subscriptionLabel: p.subscriptionLabel,
    requestedAt: p.requestedAt,
  });
  await svc.dispatchAll(recipients.map((r) => toRequest(NotificationType.ACTIVATION_CREATED, r, body)));
}

// ─── Rows 2/3: activation:client-updated → the activator in charge ────────────────────────
async function onActivationClientUpdated(
  svc: INotificationService,
  prisma: PrismaClient,
  p: { activationId: string; activatorId: string; kind: ClientUpdateKind; timestamp: string },
): Promise<void> {
  const recipient = await oneActivator(prisma, p.activatorId);
  if (!recipient) return; // not linked / disabled — no row, per §5.2

  const activation = await prisma.activation.findUnique({
    where: { id: p.activationId },
    select: { clientFullName: true, card: { select: { key: true } } },
  });
  if (!activation) return;

  if (p.kind === ClientUpdateKind.CORRECTION) {
    // ActivationInformation.value IS the current value after Set 3 — a plain findMany gives
    // the effective fields with no overlay logic (Set 6 plan §2.1, §5.3 row 2).
    const fields = await prisma.activationInformation.findMany({
      where: { activationId: p.activationId },
      select: { accountInform: true, value: true },
    });
    const accountFields = fields.map((f) => ({
      label: FIELD_LABEL_FR[f.accountInform as AccountInformation],
      value: f.value ?? '—',
    }));

    const body = render(NotificationType.ACTIVATION_INFORMATION_UPDATED, {
      cardKey: activation.card.key,
      clientFullName: activation.clientFullName,
      accountFields,
    });
    await svc.dispatch(toRequest(NotificationType.ACTIVATION_INFORMATION_UPDATED, recipient, body));
    return;
  }

  // ClientUpdateKind.ADDITIONAL — the OTP is still step-stored, not in ActivationInformation.
  // Newest-first, matching extractOtpValue's semantics (activation.service.ts).
  const otp = await prisma.additionalInformation.findFirst({
    where: { activationStep: { activationId: p.activationId }, accountInform: AccountInformation.OTP },
    orderBy: { activationStep: { createdAt: 'desc' } },
  });
  if (!otp?.value) return; // nothing to report — no OTP value was ever recorded

  const body = render(NotificationType.ACTIVATION_OTP_RECEIVED, {
    cardKey: activation.card.key,
    clientFullName: activation.clientFullName,
    otpValue: otp.value,
  });
  await svc.dispatch(toRequest(NotificationType.ACTIVATION_OTP_RECEIVED, recipient, body));
}

// ─── Row 4: activation:status-changed → the activator in charge (U3: every transition) ────
async function onActivationStatusChanged(
  svc: INotificationService,
  prisma: PrismaClient,
  p: { activationId: string; timestamp: string },
): Promise<void> {
  const activation = await prisma.activation.findUnique({
    where: { id: p.activationId },
    select: {
      activationStat: true,
      activatorId: true,
      clientFullName: true,
      takenAt: true,
      completedAt: true,
      activationPrice: true,
      card: {
        select: {
          key: true,
          distributorId: true,
          subscriptionPlan: { select: { subscriptionType: true, subscriptionDuration: true } },
        },
      },
      activator: { select: { fullName: true } },
    },
  });
  if (!activation) return;

  const templateType = STATUS_TEMPLATE[activation.activationStat as ActivationStat];
  if (!templateType) return; // the activator's own action, or no recipient — §5.4.2

  const outcome = activation.activationStat as
    | ActivationStat.ACTIVATED
    | ActivationStat.ACTIVATED_BY_ADMIN
    | ActivationStat.CANCELLED_BY_ADMIN;

  const seconds =
    activation.takenAt && activation.completedAt
      ? Math.round((activation.completedAt.getTime() - activation.takenAt.getTime()) / 1000)
      : null;

  // The activator's own commission receipt — unchanged behaviour, independent of the
  // admin/distributor fanout below (an unlinked activator must not suppress it, and vice versa).
  if (activation.activatorId) {
    const recipient = await oneActivator(prisma, activation.activatorId);
    if (recipient) {
      const commission =
        outcome === ActivationStat.CANCELLED_BY_ADMIN || activation.activationPrice == null
          ? null
          : formatMoney(Number(activation.activationPrice));

      const body = render(NotificationType.ACTIVATION_STATUS_CHANGED, {
        cardKey: activation.card.key,
        clientFullName: activation.clientFullName,
        durationText: formatDuration(seconds),
        outcome,
        commission,
      });
      await svc.dispatch(toRequest(NotificationType.ACTIVATION_STATUS_CHANGED, recipient, body));
    }
  }

  // All admins + the owning distributor, ACTIVATED / ACTIVATED_BY_ADMIN only — a cancelled
  // freeze resolution is not "done" from their point of view.
  if (outcome !== ActivationStat.CANCELLED_BY_ADMIN) {
    const [admins, distributor] = await Promise.all([
      allAdmins(prisma),
      activation.card.distributorId ? oneDistributor(prisma, activation.card.distributorId) : null,
    ]);

    const completionRecipients = distributor ? [...admins, distributor] : admins;
    if (completionRecipients.length > 0) {
      const body = render(NotificationType.ACTIVATION_COMPLETED, {
        cardKey: activation.card.key,
        subscriptionLabel: composeSubscriptionLabelFR(activation.card.subscriptionPlan),
        clientFullName: activation.clientFullName,
        distributorName: distributor?.name ?? '—',
        activatorName: activation.activator?.fullName ?? '—',
      });
      await svc.dispatchAll(
        completionRecipients.map((r) => toRequest(NotificationType.ACTIVATION_COMPLETED, r, body)),
      );
    }
  }
}

// ─── Row 5: activation:frozen → all linked admins ──────────────────────────────────────────
async function onActivationFrozen(
  svc: INotificationService,
  prisma: PrismaClient,
  p: { activationId: string; timestamp: string },
): Promise<void> {
  const recipients = await allAdmins(prisma);
  if (recipients.length === 0) return;

  const activation = await prisma.activation.findUnique({
    where: { id: p.activationId },
    select: {
      clientFullName: true,
      freezReason: true,
      takenAt: true,
      card: { select: { key: true } },
      activator: { select: { fullName: true } },
    },
  });
  if (!activation) return;

  const seconds = activation.takenAt
    ? Math.round((new Date(p.timestamp).getTime() - activation.takenAt.getTime()) / 1000)
    : null;

  const body = render(NotificationType.ACTIVATION_FROZEN, {
    cardKey: activation.card.key,
    clientFullName: activation.clientFullName,
    activatorName: activation.activator?.fullName ?? '—',
    durationText: formatDuration(seconds),
    freezeReason: activation.freezReason ?? '—',
  });
  await svc.dispatchAll(recipients.map((r) => toRequest(NotificationType.ACTIVATION_FROZEN, r, body)));
}

// ─── Row 6: order-request:created → all linked admins ──────────────────────────────────────
async function onOrderRequestCreated(
  svc: INotificationService,
  prisma: PrismaClient,
  p: { distributorName: string; subscriptionLabel: string; nbOfCards: number },
): Promise<void> {
  const recipients = await allAdmins(prisma);
  if (recipients.length === 0) return;

  const body = render(NotificationType.ORDER_REQUEST_CREATED, {
    distributorName: p.distributorName,
    subscriptionLabel: p.subscriptionLabel,
    nbOfCards: p.nbOfCards,
  });
  await svc.dispatchAll(recipients.map((r) => toRequest(NotificationType.ORDER_REQUEST_CREATED, r, body)));
}

// ─── Row 7: revocation-request:created → all linked admins ────────────────────────────────
async function onRevocationRequestCreated(
  svc: INotificationService,
  prisma: PrismaClient,
  p: { distributorName: string; cardKey: string; subscriptionLabel: string; reason: string },
): Promise<void> {
  const recipients = await allAdmins(prisma);
  if (recipients.length === 0) return;

  const body = render(NotificationType.REVOCATION_REQUEST_CREATED, {
    distributorName: p.distributorName,
    cardKey: p.cardKey,
    subscriptionLabel: p.subscriptionLabel,
    reason: p.reason,
  });
  await svc.dispatchAll(
    recipients.map((r) => toRequest(NotificationType.REVOCATION_REQUEST_CREATED, r, body)),
  );
}

// ─── Row 8: order-request:status-changed, filtered to APPROVED→PENDING_DELIVERY ───────────
// That one transition is the only one that means "the order was actually created" — an admin
// approving the request is not that, and delivery-status propagation isn't either (Set 4 §9,
// Set 6 plan §5.3). previousStat exists on the payload precisely so this filter needs no read.
async function onOrderRequestStatusChanged(
  svc: INotificationService,
  prisma: PrismaClient,
  p: { distributorId: string; stat: string; previousStat: string; orderId: string | null },
): Promise<void> {
  if (p.previousStat !== 'APPROVED' || p.stat !== 'PENDING_DELIVERY' || !p.orderId) return;

  const recipient = await oneDistributor(prisma, p.distributorId);
  if (!recipient) return;

  const order = await prisma.order.findUnique({
    where: { id: p.orderId },
    select: { orderNumber: true, orderLots: { select: { lot: { select: { nbOfCards: true } } } } },
  });
  if (!order) return;
  const nbOfCards = order.orderLots.reduce((sum, ol) => sum + ol.lot.nbOfCards, 0);

  const body = render(NotificationType.ORDER_CREATED, { orderNumber: order.orderNumber, nbOfCards });
  await svc.dispatch(toRequest(NotificationType.ORDER_CREATED, recipient, body));
}

// ─── Row 9: revocation-request:status-changed, filtered to APPROVED ───────────────────────
async function onRevocationRequestStatusChanged(
  svc: INotificationService,
  prisma: PrismaClient,
  p: { distributorId: string; cardKey?: string | undefined; stat: string; adminNote: string | null },
): Promise<void> {
  if (p.stat !== 'APPROVED') return;
  // cardKey is optional on the bus payload as of Set 7 (the distributor socket room strips
  // it — §7.3); the three service call sites that reach this handler still always populate
  // it, so this is a defensive guard, not an expected path.
  if (!p.cardKey) return;

  const recipient = await oneDistributor(prisma, p.distributorId);
  if (!recipient) return;

  const body = render(NotificationType.REVOCATION_APPROVED, {
    cardKey: p.cardKey,
    adminNote: p.adminNote,
  });
  await svc.dispatch(toRequest(NotificationType.REVOCATION_APPROVED, recipient, body));
}

/**
 * The ONLY caller of NotificationService for domain-triggered sends (resend, called from an
 * admin's own request, is the one sanctioned exception — modules/notification/). Registers one
 * listener per event on the shared bus, alongside the realtime gateway (a second, independent
 * consumer — Set 6 plan §0.4). Called once from common/notifications/index.ts, and only when
 * NOTIFICATIONS_ENABLED=true.
 */
export function initNotificationSubscribers(svc: INotificationService, prisma: PrismaClient): void {
  eventBus.on('activation:created', (p) =>
    safeAsync('activation:created', () => onActivationCreated(svc, prisma, p))(),
  );

  eventBus.on('activation:client-updated', (p) =>
    safeAsync('activation:client-updated', () => onActivationClientUpdated(svc, prisma, p))(),
  );

  eventBus.on('activation:status-changed', (p) =>
    safeAsync('activation:status-changed', () => onActivationStatusChanged(svc, prisma, p))(),
  );

  eventBus.on('activation:frozen', (p) =>
    safeAsync('activation:frozen', () => onActivationFrozen(svc, prisma, p))(),
  );

  eventBus.on('order-request:created', (p) =>
    safeAsync('order-request:created', () => onOrderRequestCreated(svc, prisma, p))(),
  );

  eventBus.on('revocation-request:created', (p) =>
    safeAsync('revocation-request:created', () => onRevocationRequestCreated(svc, prisma, p))(),
  );

  eventBus.on('order-request:status-changed', (p) =>
    safeAsync('order-request:status-changed', () => onOrderRequestStatusChanged(svc, prisma, p))(),
  );

  eventBus.on('revocation-request:status-changed', (p) =>
    safeAsync('revocation-request:status-changed', () =>
      onRevocationRequestStatusChanged(svc, prisma, p),
    )(),
  );

  logger.info('Notification subscribers registered');
}
