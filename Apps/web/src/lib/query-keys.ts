import type {
  GetActivatorHistoryQuery,
  GetActivationsQuery,
  GetActivatorsQuery,
  ActivatorPerformanceQuery,
  GetAdminsQuery,
  GetPaymentsQuery,
  GetLogsQuery,
  GetSubscriptionPlansQuery,
  GetDeliveryCompaniesQuery,
  GetDistributorsQuery,
  GetSetsQuery,
  GetLotsQuery,
  GetAvailableLotsQuery,
  GetOrdersQuery,
  GetCardOrderRequestsQuery,
  GetMyCardOrderRequestsQuery,
  GetCardRevocationRequestsQuery,
  GetMyCardRevocationRequestsQuery,
  GetCardsQuery,
  GetAvailableCardsQuery,
  StatisticsOverviewQuery,
  WilayaHeatmapQuery,
  WilayaDrilldownQuery,
} from "@my-app/contract";

// Central query-key registry (plan.md §3.1). Hooks read keys from here — never inline
// arrays — so a mutation's invalidation list and a query's own key can't silently drift.
// Every domain exposes `all()`, the bare `[domain]` prefix: TanStack Query matches keys by
// prefix, so `invalidateQueries({ queryKey: qk.activations.all() })` sweeps every
// `['activations', ...]` entry — that's how the plan.md §3.2 invalidation matrix's
// domain-wide rows (`['activations']`, `['activators']`, ...) are expressed here.
export const qk = {
  auth: {
    all: () => ["auth"] as const,
    me: () => ["auth", "me"] as const,
  },
  keys: {
    all: () => ["keys"] as const,
    status: (activationId: string) => ["keys", "status", activationId] as const,
  },
  activations: {
    all: () => ["activations"] as const,
    pending: () => ["activations", "pending"] as const,
    active: () => ["activations", "active"] as const,
    recent: () => ["activations", "recent"] as const,
    // `xxxAll()` is the family root — no query param, so invalidating it (TanStack matches
    // by key *prefix*) sweeps every cached page/filter combination at once. `xxx(query)` is
    // for the specific useQuery call. Mutations invalidate the root; hooks read the
    // specific one. Same split applies to any future parameterized list key.
    myHistoryAll: () => ["activations", "my-history"] as const,
    myHistory: (query: GetActivatorHistoryQuery) => ["activations", "my-history", query] as const,
    listAll: () => ["activations", "list"] as const,
    list: (query: GetActivationsQuery) => ["activations", "list", query] as const,
    detail: (id: string) => ["activations", "detail", id] as const,
  },
  activators: {
    all: () => ["activators"] as const,
    myStats: () => ["activators", "my-stats"] as const,
    list: (query: GetActivatorsQuery) => ["activators", "list", query] as const,
    detail: (id: string) => ["activators", "detail", id] as const,
    performance: (id: string, query: ActivatorPerformanceQuery) =>
      ["activators", "performance", id, query] as const,
  },
  admins: {
    all: () => ["admins"] as const,
    list: (query: GetAdminsQuery) => ["admins", "list", query] as const,
    detail: (id: string) => ["admins", "detail", id] as const,
  },
  payments: {
    all: () => ["payments"] as const,
    list: (query: GetPaymentsQuery) => ["payments", "list", query] as const,
  },
  logs: {
    all: () => ["logs"] as const,
    list: (query: GetLogsQuery) => ["logs", "list", query] as const,
  },
  subscriptionPlans: {
    all: () => ["subscription-plans"] as const,
    list: (query: GetSubscriptionPlansQuery) => ["subscription-plans", "list", query] as const,
    commissionDurations: () => ["subscription-plans", "commission-durations"] as const,
    commissions: () => ["subscription-plans", "commissions"] as const,
  },
  geography: {
    all: () => ["geography"] as const,
    wilayas: () => ["geography", "wilayas"] as const,
    communes: (wilayaId: string) => ["geography", "communes", wilayaId] as const,
  },
  deliveryCompanies: {
    all: () => ["delivery-companies"] as const,
    list: (query: GetDeliveryCompaniesQuery) => ["delivery-companies", "list", query] as const,
  },
  distributors: {
    all: () => ["distributors"] as const,
    list: (query: GetDistributorsQuery) => ["distributors", "list", query] as const,
    detail: (id: string) => ["distributors", "detail", id] as const,
  },
  sets: {
    all: () => ["sets"] as const,
    list: (query: GetSetsQuery) => ["sets", "list", query] as const,
  },
  lots: {
    all: () => ["lots"] as const,
    list: (query: GetLotsQuery) => ["lots", "list", query] as const,
    availableForOrder: (query: GetAvailableLotsQuery) =>
      ["lots", "available-for-order", query] as const,
  },
  orders: {
    all: () => ["orders"] as const,
    list: (query: GetOrdersQuery) => ["orders", "list", query] as const,
    detail: (id: string) => ["orders", "detail", id] as const,
  },
  cardOrderRequests: {
    all: () => ["card-order-requests"] as const,
    list: (query: GetCardOrderRequestsQuery) => ["card-order-requests", "list", query] as const,
    mineAll: () => ["card-order-requests", "mine"] as const,
    mine: (query: GetMyCardOrderRequestsQuery) => ["card-order-requests", "mine", query] as const,
    linkable: () => ["card-order-requests", "linkable"] as const,
    detail: (id: string) => ["card-order-requests", "detail", id] as const,
  },
  cardRevocationRequests: {
    all: () => ["card-revocation-requests"] as const,
    list: (query: GetCardRevocationRequestsQuery) =>
      ["card-revocation-requests", "list", query] as const,
    mineAll: () => ["card-revocation-requests", "mine"] as const,
    mine: (query: GetMyCardRevocationRequestsQuery) =>
      ["card-revocation-requests", "mine", query] as const,
    eligible: () => ["card-revocation-requests", "eligible"] as const,
    detail: (id: string) => ["card-revocation-requests", "detail", id] as const,
  },
  cards: {
    all: () => ["cards"] as const,
    list: (query: GetCardsQuery) => ["cards", "list", query] as const,
    availableForLot: (query: GetAvailableCardsQuery) =>
      ["cards", "available-for-lot", query] as const,
    detail: (id: string) => ["cards", "detail", id] as const,
  },
  statistics: {
    all: () => ["statistics"] as const,
    dashboard: () => ["statistics", "dashboard"] as const,
    activatorsSummary: () => ["statistics", "activators"] as const,
    distributorsSummary: () => ["statistics", "distributors"] as const,
    inventorySummary: () => ["statistics", "inventory"] as const,
    ordersSummary: () => ["statistics", "orders"] as const,
    activationsSummary: () => ["statistics", "activations"] as const,
    overview: (query: StatisticsOverviewQuery) => ["statistics", "overview", query] as const,
    wilayaHeatmap: (query: WilayaHeatmapQuery) => ["statistics", "wilaya-heatmap", query] as const,
    wilayaDrilldown: (wilayaId: string, query: WilayaDrilldownQuery) =>
      ["statistics", "wilaya-drilldown", wilayaId, query] as const,
  },
} as const;
