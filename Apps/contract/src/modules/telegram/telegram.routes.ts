export const TELEGRAM_ROUTES = {
  BASE: '/telegram',
  WEBHOOK: '/webhook', // unauthenticated, secret-header-guarded — declared before /link/:role/:profileId
  LINK_STATUS: '/link/:role/:profileId',
  GENERATE_TOKEN: '/link/:role/:profileId',
  UNLINK: '/link/:role/:profileId',
} as const;
