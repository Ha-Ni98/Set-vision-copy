export const KEY_ROUTES = {
  BASE: '/keys',
  VERIFY: '/verify',
  SUBMIT: '/submit',
  UPDATE: '/:activationId/update',
  ADDITIONAL: '/:activationId/additional',
  STATUS: '/:activationId/status',
} as const;

export const ACTIVATION_ROUTES = {
  BASE: '/activations',
  GET_PENDING: '/pending',
  GET_ACTIVE: '/active',
  TAKE: '/:id/take',
  FLAG_WRONG: '/:id/flag-wrong-info',
  REQUEST_ADDITIONAL: '/:id/request-additional',
  ACTIVATE: '/:id/activate',
  CANCEL: '/:id/cancel',
  FREEZE: '/:id/freeze',
  GET_MY_HISTORY: '/my-history',
  GET_RECENT: '/recent',
  GET_ALL: '/',
  GET_BY_ID: '/:id',
  ACTIVATE_BY_ADMIN: '/:id/activate-by-admin',
  CANCEL_BY_ADMIN: '/:id/cancel-by-admin',
  SET_PRICE: '/:id/set-price',
} as const;
