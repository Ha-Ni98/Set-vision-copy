export const SUBSCRIPTION_PLAN_ROUTES = {
  BASE: '/subscription-plans',
  GET_ALL: '/',
  CREATE: '/',
  TOGGLE: '/:id/toggle',
  GET_COMMISSION_DURATIONS: '/commission-durations',
  GET_COMMISSIONS: '/commissions',
  UPDATE_COMMISSION: '/commissions',
} as const;
