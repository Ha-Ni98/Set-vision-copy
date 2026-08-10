import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { eventBus } from '../events/event-bus';
import { logger } from '../config/logger';
import { NS, rooms } from './rooms';
import type { AppIOServer } from './socket';

const ActivationIdSchema = z.uuid();

const safe = (fn: () => void, evt: string): void => {
  try {
    fn();
  } catch (err) {
    logger.error({ err, evt }, 'Realtime emit failed');
  }
};

export const initRealtimeGateway = (io: AppIOServer, prisma: PrismaClient): void => {
  const clientNs = io.of(NS.CLIENT);
  const activatorNs = io.of(NS.ACTIVATORS);
  const adminNs = io.of(NS.ADMIN);
  const distributorNs = io.of(NS.DISTRIBUTORS);

  activatorNs.on('connection', (socket) => {
    const userId = socket.data.user?.id;
    if (!userId) return;
    // `activation:client-updated`/`activation:resolved` emit to rooms.activator(activatorId)
    // — the Activator row's id, not the User's (Stage-04-fix #3.4: joining by userId put
    // every activator in a room nothing ever emits to, so the card never live-updated).
    prisma.activator
      .findFirst({ where: { userId }, select: { id: true } })
      .then((activator) => {
        if (activator) void socket.join(rooms.activator(activator.id));
      })
      .catch((err) => logger.error({ err, userId }, 'Failed to resolve activator for realtime join'));
  });

  adminNs.on('connection', (socket) => {
    void socket.join(rooms.ADMIN_BELL);
  });

  distributorNs.on('connection', (socket) => {
    const userId = socket.data.user?.id;
    if (!userId) return;
    // Same rule as the activator join above: room keyed by Distributor.id, not User.id.
    // deletedAt: null is the one intentional difference — Distributor is soft-deleted,
    // unlike Activator.
    prisma.distributor
      .findFirst({ where: { userId, deletedAt: null }, select: { id: true } })
      .then((distributor) => {
        if (distributor) void socket.join(rooms.distributor(distributor.id));
      })
      .catch((err) => logger.error({ err, userId }, 'Failed to resolve distributor for realtime join'));
  });

  clientNs.on('connection', (socket) => {
    socket.on('subscribe', (activationId) => {
      const parsed = ActivationIdSchema.safeParse(activationId);
      if (parsed.success) void socket.join(rooms.activation(parsed.data));
    });
    socket.on('unsubscribe', (activationId) => {
      const parsed = ActivationIdSchema.safeParse(activationId);
      if (parsed.success) void socket.leave(rooms.activation(parsed.data));
    });
  });

  eventBus.on('activation:created', (p) =>
    safe(() => activatorNs.emit('activation:created', p), 'activation:created'),
  );

  eventBus.on('activation:taken', (p) =>
    safe(
      () => activatorNs.emit('activation:taken', { activationId: p.activationId, timestamp: p.timestamp }),
      'activation:taken',
    ),
  );

  eventBus.on('activation:client-updated', (p) =>
    safe(
      () =>
        activatorNs
          .to(rooms.activator(p.activatorId))
          .emit('activation:client-updated', { activationId: p.activationId, timestamp: p.timestamp }),
      'activation:client-updated',
    ),
  );

  eventBus.on('activation:frozen', (p) =>
    safe(() => adminNs.to(rooms.ADMIN_BELL).emit('activation:frozen', p), 'activation:frozen'),
  );

  eventBus.on('activation:resolved', (p) =>
    safe(
      () =>
        activatorNs
          .to(rooms.activator(p.activatorId))
          .emit('activation:resolved', { activationId: p.activationId, outcome: p.outcome, timestamp: p.timestamp }),
      'activation:resolved',
    ),
  );

  eventBus.on('activation:status-changed', (p) =>
    safe(
      () => clientNs.to(rooms.activation(p.activationId)).emit('activation:status-changed', p),
      'activation:status-changed',
    ),
  );

  eventBus.on('order-request:created', (p) =>
    safe(() => adminNs.to(rooms.ADMIN_BELL).emit('order-request:created', p), 'order-request:created'),
  );

  eventBus.on('order-request:status-changed', (p) =>
    safe(() => {
      adminNs.to(rooms.ADMIN_BELL).emit('order-request:status-changed', p);
      distributorNs.to(rooms.distributor(p.distributorId)).emit('order-request:status-changed', p);
    }, 'order-request:status-changed'),
  );

  eventBus.on('revocation-request:created', (p) =>
    safe(
      () => adminNs.to(rooms.ADMIN_BELL).emit('revocation-request:created', p),
      'revocation-request:created',
    ),
  );

  eventBus.on('revocation-request:status-changed', (p) =>
    safe(() => {
      adminNs.to(rooms.ADMIN_BELL).emit('revocation-request:status-changed', p);
      // The distributor's own room never receives key material: by the time this fires the
      // card may be back at AT_DISTRIBUTOR and re-sellable (Set 7 §2.2/§7.3). Nothing on the
      // client reads cardKey — the listener only invalidates — so this is a pure removal.
      const { cardKey: _cardKey, ...forDistributor } = p;
      distributorNs
        .to(rooms.distributor(p.distributorId))
        .emit('revocation-request:status-changed', forDistributor);
    }, 'revocation-request:status-changed'),
  );

  logger.info('Realtime gateway initialized');
};
