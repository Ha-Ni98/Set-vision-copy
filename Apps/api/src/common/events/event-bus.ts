import { EventEmitter } from 'node:events';
import type { ActivationEvents } from '@my-app/contract';

// UserEvents is not yet exported by the contract; widen to UserEvents & ActivationEvents when it is.
type AppEvents = ActivationEvents;

class TypedBus {
  private emitter = new EventEmitter();

  emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): void {
    this.emitter.emit(event as string, payload);
  }

  on<K extends keyof AppEvents>(event: K, handler: (payload: AppEvents[K]) => void): void {
    this.emitter.on(event as string, handler);
  }

  off<K extends keyof AppEvents>(event: K, handler: (payload: AppEvents[K]) => void): void {
    this.emitter.off(event as string, handler);
  }
}

export const eventBus = new TypedBus();
