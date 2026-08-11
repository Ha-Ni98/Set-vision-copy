export const CARD_REVOCATION_REQUEST_ROUTES = {
  BASE: '/card-revocation-requests',
  GET_ALL: '/',
  GET_MINE: '/mine',
  GET_ELIGIBLE: '/eligible',
  CREATE: '/',
  GET_BY_ID: '/:id',
  APPROVE: '/:id/approve',
  REJECT: '/:id/reject',
  CANCEL: '/:id/cancel',
} as const;
