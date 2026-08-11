// Set 11 (D9) — the revenue dashboard's raw SQL. This is the first raw SQL in the codebase; it
// exists because none of Prisma's query builders can express DATE_TRUNC bucketing,
// generate_series zero-fill, grouping by a relation's column, or the plan pro-rata allocation
// (see Docs/Stage-04-fix/plan/set-11-plan.md §3.1).
//
// Every variable part is a bound parameter (Prisma.sql tagged template). $queryRawUnsafe is never
// used. The `dimension` and `granularity` enums select which of a small, fixed set of
// pre-written fragments/functions run — no user-supplied string is ever spliced into SQL text.
//
// All "id" columns in this schema are Prisma `String @id @default(uuid())`, i.e. plain Postgres
// `text` — NOT the native `uuid` type. Every filter/join here compares as text accordingly.
import { Prisma, OrderStat as PrismaOrderStat, ActivationStat as PrismaActivationStat } from '@prisma/client';
import { RevenueDimension, RevenueGranularity, RevenueSort, REVENUE_UNATTRIBUTED_KEY } from '@my-app/contract';
import { REPORTING_TZ } from './statistics.time';

export type RevenueFilters = {
  subscriptionPlanId: string | null;
  wilayaId: string | null;
};

export type RevenueSummaryRawRow = {
  cash_in: Prisma.Decimal;
  cash_out: Prisma.Decimal;
  net: Prisma.Decimal;
  activation_cost: Prisma.Decimal;
  activation_price: Prisma.Decimal;
  delivered_orders: number;
  completed_activations: number;
};

export type RevenueSeriesRawRow = {
  bucket_start: Date;
  cash_in: Prisma.Decimal;
  cash_out: Prisma.Decimal;
  net: Prisma.Decimal;
};

export type RevenueBreakdownRawRow = {
  row_type: 'row' | 'others' | 'totals';
  key: string | null;
  label: string | null;
  cash_in: Prisma.Decimal;
  cash_out: Prisma.Decimal;
  net: Prisma.Decimal;
};

const UNIT_BY_GRANULARITY: Record<RevenueGranularity, string> = {
  [RevenueGranularity.DAY]: 'day',
  [RevenueGranularity.WEEK]: 'week',
  [RevenueGranularity.MONTH]: 'month',
};

const STEP_BY_GRANULARITY: Record<RevenueGranularity, string> = {
  [RevenueGranularity.DAY]: '1 day',
  [RevenueGranularity.WEEK]: '1 week',
  [RevenueGranularity.MONTH]: '1 month',
};

const SORT_EXPR: Record<RevenueSort, Prisma.Sql> = {
  [RevenueSort.CASH_IN]: Prisma.sql`cash_in`,
  [RevenueSort.CASH_OUT]: Prisma.sql`cash_out`,
  [RevenueSort.NET]: Prisma.sql`net`,
};

// Cash in, allocated across a plan pro-rata by Lot.nbOfCards (set-11-plan.md §2.2). Used for
// EVERY cash-in read, not only plan-scoped ones — SUM(amount) over every lot of every order is
// exactly SUM(orderPrice), so this degenerates correctly when no plan is involved. The plan
// filter is applied downstream (never inside this CTE) because the allocation's denominator
// needs every lot of an order, not just the ones matching a filter.
function cashInAllocFragment(from: Date, to: Date, wilayaId: string | null): Prisma.Sql {
  return Prisma.sql`
    cash_in_alloc AS (
      SELECT
        o.id AS order_id,
        o."completedAt" AS at,
        d.id AS distributor_id,
        d."wilayaId" AS wilaya_id,
        l."subscriptionPlanId" AS plan_id,
        CASE
          WHEN SUM(GREATEST(COALESCE(l."nbOfCards", 0), 0)) OVER (PARTITION BY o.id) > 0
            THEN o."orderPrice" * GREATEST(COALESCE(l."nbOfCards", 0), 0)::numeric
                 / SUM(GREATEST(COALESCE(l."nbOfCards", 0), 0)) OVER (PARTITION BY o.id)
          ELSE o."orderPrice" / COUNT(*) OVER (PARTITION BY o.id)
        END AS amount
      FROM "Order" o
      JOIN "Distributor" d ON d.id = o."distributorId"
      LEFT JOIN "OrderLot" ol ON ol."orderId" = o.id
      LEFT JOIN "Lot" l ON l.id = ol."lotId"
      WHERE o."orderStat" = ${PrismaOrderStat.DELIVERED}::"OrderStat"
        AND o."completedAt" IS NOT NULL
        AND o."completedAt" BETWEEN ${from}::timestamptz AND ${to}::timestamptz
        AND (${wilayaId}::text IS NULL OR d."wilayaId" = ${wilayaId}::text)
    )
  `;
}

// Cash out, one row per completed activation. Both filters are safe to apply directly here
// (unlike the plan filter on cash-in, nothing downstream needs the unfiltered set).
function cashOutFragment(
  from: Date,
  to: Date,
  wilayaId: string | null,
  subscriptionPlanId: string | null,
): Prisma.Sql {
  return Prisma.sql`
    cash_out AS (
      SELECT
        a.id AS activation_id,
        a."completedAt" AS at,
        c."distributorId" AS distributor_id,
        d."wilayaId" AS wilaya_id,
        c."subscriptionPlanId" AS plan_id,
        COALESCE(a."activationCost", 0) AS cost,
        COALESCE(a."activationPrice", 0) AS price,
        COALESCE(a."activationCost", 0) + COALESCE(a."activationPrice", 0) AS amount
      FROM "Activation" a
      JOIN "Card" c ON c.id = a."cardId"
      LEFT JOIN "Distributor" d ON d.id = c."distributorId"
      WHERE (
          a."activationStat" = ${PrismaActivationStat.ACTIVATED}::"ActivationStat"
          OR a."activationStat" = ${PrismaActivationStat.ACTIVATED_BY_ADMIN}::"ActivationStat"
        )
        AND a."completedAt" IS NOT NULL
        AND a."completedAt" BETWEEN ${from}::timestamptz AND ${to}::timestamptz
        AND (${wilayaId}::text IS NULL OR d."wilayaId" = ${wilayaId}::text)
        AND (
          ${subscriptionPlanId}::text IS NULL
          OR c."subscriptionPlanId" = ${subscriptionPlanId}::text
        )
    )
  `;
}

export function buildRevenueTotalsSql(from: Date, to: Date, filters: RevenueFilters): Prisma.Sql {
  const { subscriptionPlanId, wilayaId } = filters;
  return Prisma.sql`
    WITH
    ${cashInAllocFragment(from, to, wilayaId)},
    ${cashOutFragment(from, to, wilayaId, subscriptionPlanId)},
    cash_in_sum AS (
      SELECT COALESCE(SUM(amount), 0) AS cash_in, COUNT(DISTINCT order_id) AS delivered_orders
      FROM cash_in_alloc
      WHERE (${subscriptionPlanId}::text IS NULL OR plan_id = ${subscriptionPlanId}::text)
    ),
    cash_out_sum AS (
      SELECT
        COALESCE(SUM(amount), 0) AS cash_out,
        COALESCE(SUM(cost), 0) AS activation_cost,
        COALESCE(SUM(price), 0) AS activation_price,
        COUNT(*) AS completed_activations
      FROM cash_out
    )
    SELECT
      ci.cash_in AS cash_in,
      co.cash_out AS cash_out,
      (ci.cash_in - co.cash_out) AS net,
      co.activation_cost AS activation_cost,
      co.activation_price AS activation_price,
      ci.delivered_orders::int AS delivered_orders,
      co.completed_activations::int AS completed_activations
    FROM cash_in_sum ci, cash_out_sum co
  `;
}

export function buildRevenueSeriesSql(
  from: Date,
  to: Date,
  granularity: RevenueGranularity,
  filters: RevenueFilters,
): Prisma.Sql {
  const { subscriptionPlanId, wilayaId } = filters;
  const unit = UNIT_BY_GRANULARITY[granularity];
  const step = STEP_BY_GRANULARITY[granularity];
  return Prisma.sql`
    WITH
    ${cashInAllocFragment(from, to, wilayaId)},
    cash_in_filtered AS (
      SELECT order_id, at, amount FROM cash_in_alloc
      WHERE (${subscriptionPlanId}::text IS NULL OR plan_id = ${subscriptionPlanId}::text)
    ),
    ${cashOutFragment(from, to, wilayaId, subscriptionPlanId)},
    buckets AS (
      SELECT gs AS bucket_start
      FROM generate_series(
        date_trunc(${unit}, ${from}::timestamptz AT TIME ZONE ${REPORTING_TZ}),
        date_trunc(${unit}, ${to}::timestamptz AT TIME ZONE ${REPORTING_TZ}),
        ${step}::interval
      ) gs
    ),
    in_by_bucket AS (
      SELECT date_trunc(${unit}, at AT TIME ZONE ${REPORTING_TZ}) AS bucket_key, SUM(amount) AS amount
      FROM cash_in_filtered
      GROUP BY 1
    ),
    out_by_bucket AS (
      SELECT date_trunc(${unit}, at AT TIME ZONE ${REPORTING_TZ}) AS bucket_key, SUM(amount) AS amount
      FROM cash_out
      GROUP BY 1
    )
    SELECT
      (b.bucket_start AT TIME ZONE ${REPORTING_TZ}) AS bucket_start,
      COALESCE(i.amount, 0) AS cash_in,
      COALESCE(o.amount, 0) AS cash_out,
      COALESCE(i.amount, 0) - COALESCE(o.amount, 0) AS net
    FROM buckets b
    LEFT JOIN in_by_bucket i ON i.bucket_key = b.bucket_start
    LEFT JOIN out_by_bucket o ON o.bucket_key = b.bucket_start
    ORDER BY b.bucket_start
  `;
}

function breakdownByWilayaSql(
  from: Date,
  to: Date,
  sort: RevenueSort,
  limit: number,
  filters: RevenueFilters,
): Prisma.Sql {
  const { subscriptionPlanId, wilayaId } = filters;
  return Prisma.sql`
    WITH
    ${cashInAllocFragment(from, to, wilayaId)},
    cash_in_filtered AS (
      SELECT wilaya_id, amount FROM cash_in_alloc
      WHERE (${subscriptionPlanId}::text IS NULL OR plan_id = ${subscriptionPlanId}::text)
    ),
    ${cashOutFragment(from, to, wilayaId, subscriptionPlanId)},
    in_by_key AS (
      SELECT COALESCE(wilaya_id::text, ${REVENUE_UNATTRIBUTED_KEY}) AS bkey, SUM(amount) AS cash_in
      FROM cash_in_filtered
      GROUP BY 1
    ),
    out_by_key AS (
      SELECT COALESCE(wilaya_id::text, ${REVENUE_UNATTRIBUTED_KEY}) AS bkey, SUM(amount) AS cash_out
      FROM cash_out
      GROUP BY 1
    ),
    keyed AS (
      SELECT
        COALESCE(i.bkey, o.bkey) AS bkey,
        COALESCE(i.cash_in, 0) AS cash_in,
        COALESCE(o.cash_out, 0) AS cash_out,
        COALESCE(i.cash_in, 0) - COALESCE(o.cash_out, 0) AS net
      FROM in_by_key i
      FULL OUTER JOIN out_by_key o ON o.bkey = i.bkey
    ),
    labeled AS (
      SELECT
        k.bkey,
        CASE WHEN k.bkey = ${REVENUE_UNATTRIBUTED_KEY} THEN '' ELSE COALESCE(w."frName", '') END AS label,
        k.cash_in, k.cash_out, k.net
      FROM keyed k
      LEFT JOIN "Wilaya" w ON w.id::text = k.bkey
    ),
    ranked AS (
      SELECT bkey, label, cash_in, cash_out, net,
        ROW_NUMBER() OVER (ORDER BY ${SORT_EXPR[sort]} DESC) AS rn
      FROM labeled
    )
    SELECT 'row' AS row_type, bkey AS key, label, cash_in, cash_out, net FROM ranked WHERE rn <= ${limit}
    UNION ALL
    SELECT 'others', NULL::text, NULL::text,
      COALESCE(SUM(cash_in), 0), COALESCE(SUM(cash_out), 0), COALESCE(SUM(cash_in), 0) - COALESCE(SUM(cash_out), 0)
    FROM ranked WHERE rn > ${limit}
    UNION ALL
    SELECT 'totals', NULL::text, NULL::text,
      COALESCE(SUM(cash_in), 0), COALESCE(SUM(cash_out), 0), COALESCE(SUM(cash_in), 0) - COALESCE(SUM(cash_out), 0)
    FROM ranked
  `;
}

function breakdownByDistributorSql(
  from: Date,
  to: Date,
  sort: RevenueSort,
  limit: number,
  filters: RevenueFilters,
): Prisma.Sql {
  const { subscriptionPlanId, wilayaId } = filters;
  return Prisma.sql`
    WITH
    ${cashInAllocFragment(from, to, wilayaId)},
    cash_in_filtered AS (
      SELECT distributor_id, amount FROM cash_in_alloc
      WHERE (${subscriptionPlanId}::text IS NULL OR plan_id = ${subscriptionPlanId}::text)
    ),
    ${cashOutFragment(from, to, wilayaId, subscriptionPlanId)},
    in_by_key AS (
      SELECT COALESCE(distributor_id::text, ${REVENUE_UNATTRIBUTED_KEY}) AS bkey, SUM(amount) AS cash_in
      FROM cash_in_filtered
      GROUP BY 1
    ),
    out_by_key AS (
      SELECT COALESCE(distributor_id::text, ${REVENUE_UNATTRIBUTED_KEY}) AS bkey, SUM(amount) AS cash_out
      FROM cash_out
      GROUP BY 1
    ),
    keyed AS (
      SELECT
        COALESCE(i.bkey, o.bkey) AS bkey,
        COALESCE(i.cash_in, 0) AS cash_in,
        COALESCE(o.cash_out, 0) AS cash_out,
        COALESCE(i.cash_in, 0) - COALESCE(o.cash_out, 0) AS net
      FROM in_by_key i
      FULL OUTER JOIN out_by_key o ON o.bkey = i.bkey
    ),
    labeled AS (
      SELECT
        k.bkey,
        CASE WHEN k.bkey = ${REVENUE_UNATTRIBUTED_KEY} THEN '' ELSE COALESCE(d2."storeName", '') END AS label,
        k.cash_in, k.cash_out, k.net
      FROM keyed k
      LEFT JOIN "Distributor" d2 ON d2.id::text = k.bkey
    ),
    ranked AS (
      SELECT bkey, label, cash_in, cash_out, net,
        ROW_NUMBER() OVER (ORDER BY ${SORT_EXPR[sort]} DESC) AS rn
      FROM labeled
    )
    SELECT 'row' AS row_type, bkey AS key, label, cash_in, cash_out, net FROM ranked WHERE rn <= ${limit}
    UNION ALL
    SELECT 'others', NULL::text, NULL::text,
      COALESCE(SUM(cash_in), 0), COALESCE(SUM(cash_out), 0), COALESCE(SUM(cash_in), 0) - COALESCE(SUM(cash_out), 0)
    FROM ranked WHERE rn > ${limit}
    UNION ALL
    SELECT 'totals', NULL::text, NULL::text,
      COALESCE(SUM(cash_in), 0), COALESCE(SUM(cash_out), 0), COALESCE(SUM(cash_in), 0) - COALESCE(SUM(cash_out), 0)
    FROM ranked
  `;
}

// Plan dimension deliberately carries no label from SQL — composeSubscriptionLabel() is a TS
// function (set/set.mapper.ts), so the service resolves labels via a small supplementary
// SubscriptionPlan lookup after this query returns, exactly like toWilayaDrilldownDTO does today.
function breakdownByPlanSql(
  from: Date,
  to: Date,
  sort: RevenueSort,
  limit: number,
  filters: RevenueFilters,
): Prisma.Sql {
  const { subscriptionPlanId, wilayaId } = filters;
  return Prisma.sql`
    WITH
    ${cashInAllocFragment(from, to, wilayaId)},
    cash_in_filtered AS (
      SELECT plan_id, amount FROM cash_in_alloc
      WHERE (${subscriptionPlanId}::text IS NULL OR plan_id = ${subscriptionPlanId}::text)
    ),
    ${cashOutFragment(from, to, wilayaId, subscriptionPlanId)},
    in_by_key AS (
      SELECT COALESCE(plan_id::text, ${REVENUE_UNATTRIBUTED_KEY}) AS bkey, SUM(amount) AS cash_in
      FROM cash_in_filtered
      GROUP BY 1
    ),
    out_by_key AS (
      SELECT COALESCE(plan_id::text, ${REVENUE_UNATTRIBUTED_KEY}) AS bkey, SUM(amount) AS cash_out
      FROM cash_out
      GROUP BY 1
    ),
    keyed AS (
      SELECT
        COALESCE(i.bkey, o.bkey) AS bkey,
        COALESCE(i.cash_in, 0) AS cash_in,
        COALESCE(o.cash_out, 0) AS cash_out,
        COALESCE(i.cash_in, 0) - COALESCE(o.cash_out, 0) AS net
      FROM in_by_key i
      FULL OUTER JOIN out_by_key o ON o.bkey = i.bkey
    ),
    ranked AS (
      SELECT bkey, cash_in, cash_out, net,
        ROW_NUMBER() OVER (ORDER BY ${SORT_EXPR[sort]} DESC) AS rn
      FROM keyed
    )
    SELECT 'row' AS row_type, bkey AS key, NULL::text AS label, cash_in, cash_out, net
    FROM ranked WHERE rn <= ${limit}
    UNION ALL
    SELECT 'others', NULL::text, NULL::text,
      COALESCE(SUM(cash_in), 0), COALESCE(SUM(cash_out), 0), COALESCE(SUM(cash_in), 0) - COALESCE(SUM(cash_out), 0)
    FROM ranked WHERE rn > ${limit}
    UNION ALL
    SELECT 'totals', NULL::text, NULL::text,
      COALESCE(SUM(cash_in), 0), COALESCE(SUM(cash_out), 0), COALESCE(SUM(cash_in), 0) - COALESCE(SUM(cash_out), 0)
    FROM ranked
  `;
}

export function buildRevenueBreakdownSql(
  from: Date,
  to: Date,
  dimension: RevenueDimension,
  sort: RevenueSort,
  limit: number,
  filters: RevenueFilters,
): Prisma.Sql {
  switch (dimension) {
    case RevenueDimension.WILAYA:
      return breakdownByWilayaSql(from, to, sort, limit, filters);
    case RevenueDimension.DISTRIBUTOR:
      return breakdownByDistributorSql(from, to, sort, limit, filters);
    case RevenueDimension.PLAN:
      return breakdownByPlanSql(from, to, sort, limit, filters);
  }
}
