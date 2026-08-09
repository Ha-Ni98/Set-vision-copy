export const DISTRIBUTOR_ROUTES = {
  BASE: '/distributors',
  GET_ALL: '/',
  CREATE: '/',
  GET_BY_ID: '/:id',
  UPDATE: '/:id',
  TOGGLE: '/:id/toggle',
  DELETE: '/:id',
  CREATE_ACCOUNT: '/:id/account',
  UNLINK_ACCOUNT: '/:id/account',
} as const;
