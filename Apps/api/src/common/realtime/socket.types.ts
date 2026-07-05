import type {
  JWTPayload,
  PendingActivationDTO,
  ClientActivationStatus,
} from '@my-app/contract';

export interface ServerToClientEvents {
  'activation:created': (p: PendingActivationDTO) => void;
  'activation:taken': (p: { activationId: string; timestamp: string }) => void;
  'activation:client-updated': (p: { activationId: string; timestamp: string }) => void;
  'activation:frozen': (p: { activationId: string; timestamp: string }) => void;
  'activation:resolved': (p: { activationId: string; outcome: string; timestamp: string }) => void;
  'activation:status-changed': (p: {
    activationId: string;
    status: ClientActivationStatus;
    timestamp: string;
  }) => void;
}

export interface ClientToServerEvents {
  subscribe: (activationId: string) => void;
  unsubscribe: (activationId: string) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  user?: JWTPayload;
}
