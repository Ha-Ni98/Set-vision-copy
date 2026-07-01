import { z } from 'zod';
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

export const initRealtimeGateway = (io: AppIOServer): void => {
  const clientNs = io.of(NS.CLIENT);
  const activatorNs = io.of(NS.ACTIVATORS);
  const adminNs = io.of(NS.ADMIN);

  activatorNs.on('connection', (socket) => {
    const userId = socket.data.user?.id;
    if (userId) void socket.join(rooms.activator(userId));
  });

  adminNs.on('connection', (socket) => {
    void socket.join(rooms.ADMIN_BELL);
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

  logger.info('Realtime gateway initialized');
};
