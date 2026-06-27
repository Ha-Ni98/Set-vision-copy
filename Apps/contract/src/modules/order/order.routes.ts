export const ORDER_ROUTES = {
  BASE: '/orders',
  GET_ALL: '/',
  GET_BY_ID: '/:id',
  CREATE: '/',
  TRANSITION: '/:id/transition',
  DELETE: '/:id',
} as const;
