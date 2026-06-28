export const ACTIVATOR_ROUTES = {
  BASE: '/activators',
  GET_ALL: '/',
  CREATE: '/',
  GET_BY_ID: '/:id',
  UPDATE: '/:id',
  TOGGLE: '/:id/toggle',
  RESET_PASSWORD: '/:id/reset-password',
  DELETE: '/:id',
  PERFORMANCE: '/:id/performance',
  MY_STATS: '/me/stats',
} as const;
