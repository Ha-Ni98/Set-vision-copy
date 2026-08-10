export const CARD_ROUTES = {
  BASE: '/cards',
  GET_ALL: '/',
  GET_AVAILABLE_FOR_LOT: '/available-for-lot',
  GET_MINE: '/mine',
  GET_MINE_BY_ID: '/mine/:id',
  GET_BY_ID: '/:id',
  DELETE: '/:id',
  DISABLE: '/:id/disable',
  ENABLE: '/:id/enable',
  REVOKE: '/:id/revoke',
} as const;
