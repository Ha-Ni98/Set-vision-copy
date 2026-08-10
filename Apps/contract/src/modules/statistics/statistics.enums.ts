export enum RevenueGranularity {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export enum RevenueDimension {
  PLAN = 'plan',
  WILAYA = 'wilaya',
  DISTRIBUTOR = 'distributor',
}

export enum RevenueSort {
  CASH_IN = 'cashIn',
  CASH_OUT = 'cashOut',
  NET = 'net',
}

// Sentinel key for breakdown rows whose dimension value is null — an activation on a card with no
// distributor, or an order lot with no plan. Such rows still carry money, so they get a bucket
// rather than being dropped: rows + others must always equal the summary total. The frontend
// renders admin.revenue.breakdown.unattributed for this key (no server-side copy).
export const REVENUE_UNATTRIBUTED_KEY = '__unattributed__';
