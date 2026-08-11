export const NS = {
  CLIENT: '/client',
  ACTIVATORS: '/activators',
  ADMIN: '/admin',
  DISTRIBUTORS: '/distributors',
} as const;

export const rooms = {
  activation: (activationId: string) => `activation:${activationId}`,
  activator: (activatorId: string) => `activator:${activatorId}`,
  // Distributor.id, NOT User.id — same rule as rooms.activator (Stage-04-fix #3.4:
  // joining by userId put every activator in a room nothing ever emits to).
  distributor: (distributorId: string) => `distributor:${distributorId}`,
  ADMIN_BELL: 'admin',
} as const;
