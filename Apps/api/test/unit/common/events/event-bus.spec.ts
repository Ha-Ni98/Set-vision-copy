import { describe, it, expect, vi } from 'vitest';
import { eventBus } from '@common/events/event-bus';
import { ClientActivationStatus } from '@my-app/contract';

describe('eventBus', () => {
  it('delivers activation:status-changed to subscribed handlers', () => {
    const handler = vi.fn();
    const payload = {
      activationId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      status: ClientActivationStatus.PROCESSING,
      timestamp: new Date().toISOString(),
    };

    eventBus.on('activation:status-changed', handler);
    eventBus.emit('activation:status-changed', payload);
    eventBus.off('activation:status-changed', handler);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it('does not deliver to a handler that was removed', () => {
    const handler = vi.fn();
    eventBus.on('activation:status-changed', handler);
    eventBus.off('activation:status-changed', handler);

    eventBus.emit('activation:status-changed', {
      activationId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      status: ClientActivationStatus.READY,
      timestamp: new Date().toISOString(),
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
