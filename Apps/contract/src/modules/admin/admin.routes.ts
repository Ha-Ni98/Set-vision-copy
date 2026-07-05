export const ADMIN_ROUTES = {
  BASE: '/admins',
  GET_ALL: '/',
  CREATE: '/',
  GET_BY_ID: '/:id',
  UPDATE: '/:id',
  TOGGLE: '/:id/toggle',
  RESET_PASSWORD: '/:id/reset-password',
  DELETE: '/:id',
} as const;
