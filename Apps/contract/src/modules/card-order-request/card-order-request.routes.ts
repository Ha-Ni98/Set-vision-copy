export const CARD_ORDER_REQUEST_ROUTES = {
  BASE: '/card-order-requests',
  GET_ALL: '/',
  GET_MINE: '/mine',
  GET_LINKABLE: '/linkable',
  CREATE: '/',
  GET_BY_ID: '/:id',
  APPROVE: '/:id/approve',
  REJECT: '/:id/reject',
  CANCEL: '/:id/cancel',
  UNLINK: '/:id/unlink',
} as const;
