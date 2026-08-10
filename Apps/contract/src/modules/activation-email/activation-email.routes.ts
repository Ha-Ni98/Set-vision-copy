// Two read routes rather than one with a flag: the audiences, the guards, the shapes and the
// pagination all differ, and a single route serving both would have to leak the settings
// columns to activators (Set 10 plan §5.1).
export const ACTIVATION_EMAIL_ROUTES = {
  BASE: '/activation-emails',
  GET_ALL: '/', // settings list — ADMIN, paginated
  GET_POOL: '/pool', // picker      — ADMIN + ACTIVATOR, unpaginated, plan-scoped
  CREATE: '/',
  DELETE: '/:id',
} as const;
