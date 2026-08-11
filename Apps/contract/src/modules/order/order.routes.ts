export const ORDER_ROUTES = {
  BASE: '/orders',
  GET_ALL: '/',
  GET_MINE: '/mine',
  GET_MINE_BY_ID: '/mine/:id',
  GET_BY_ID: '/:id',
  CREATE: '/',
  TRANSITION: '/:id/transition',
  DELETE: '/:id',
} as const;
