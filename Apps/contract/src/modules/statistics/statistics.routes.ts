export const STATISTICS_ROUTES = {
  BASE: '/statistics',
  DASHBOARD: '/dashboard',
  ACTIVATORS_SUMMARY: '/activators',
  DISTRIBUTORS_SUMMARY: '/distributors',
  INVENTORY_SUMMARY: '/inventory',
  ORDERS_SUMMARY: '/orders',
  ACTIVATIONS_SUMMARY: '/activations',
  OVERVIEW: '/overview',
  WILAYA_HEATMAP: '/wilaya-heatmap',
  // Statics must be registered before the param route below.
  REVENUE_SUMMARY: '/revenue/summary',
  REVENUE_SERIES: '/revenue/series',
  REVENUE_BREAKDOWN: '/revenue/breakdown',
  WILAYA_DRILLDOWN: '/wilaya/:wilayaId',
} as const;
