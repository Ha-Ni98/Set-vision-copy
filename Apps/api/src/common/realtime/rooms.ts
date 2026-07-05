export const NS = {
  CLIENT: '/client',
  ACTIVATORS: '/activators',
  ADMIN: '/admin',
} as const;

export const rooms = {
  activation: (activationId: string) => `activation:${activationId}`,
  activator: (activatorId: string) => `activator:${activatorId}`,
  ADMIN_BELL: 'admin',
} as const;
