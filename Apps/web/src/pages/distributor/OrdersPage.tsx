import { useMemo, useState } from "react";
import { OrderStat } from "@my-app/contract";
import type { GetMyOrdersQuery, OrderDTO } from "@my-app/contract";
import { PageHeader } from "@/components/shared/PageHeader";
import { SimplePagination } from "@/components/shared/SimplePagination";
import { useTranslation } from "@/hooks/useTranslation";
import { useMyOrders, useMyOrder } from "@/hooks/useMyOrders";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { MyOrdersFilters } from "./components/MyOrdersFilters";
import { MyOrdersTable } from "./components/MyOrdersTable";
import { MyOrderDetailDrawer } from "./components/MyOrderDetailDrawer";

const LIMIT = 10;

function toIsoDate(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [state, setState] = useState<OrderStat | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const query: GetMyOrdersQuery = useMemo(
    () => ({
      page,
      limit: LIMIT,
      search: debouncedSearch.trim() || undefined,
      state: state || undefined,
      dateFrom: toIsoDate(dateFrom),
      dateTo: toIsoDate(dateTo),
    }),
    [page, debouncedSearch, state, dateFrom, dateTo],
  );

  const ordersQuery = useMyOrders(query);
  const detailQuery = useMyOrder(selectedId ?? "");

  const hasFilters =
    search.trim().length > 0 || state !== "" || dateFrom.length > 0 || dateTo.length > 0;
  const clearFilters = () => {
    setSearch("");
    setState("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const openDetail = (order: OrderDTO) => setSelectedId(order.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("distributor.orders.title")} />

      <MyOrdersFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        state={state}
        onStateChange={(v) => {
          setState(v);
          setPage(1);
        }}
        dateFrom={dateFrom}
        onDateFromChange={(v) => {
          setDateFrom(v);
          setPage(1);
        }}
        dateTo={dateTo}
        onDateToChange={(v) => {
          setDateTo(v);
          setPage(1);
        }}
      />

      <MyOrdersTable
        data={ordersQuery.data?.items}
        isLoading={ordersQuery.isLoading}
        isError={ordersQuery.isError}
        onRetry={ordersQuery.refetch}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
        onRowClick={openDetail}
      />

      {ordersQuery.data && (
        <SimplePagination
          page={page}
          totalPages={ordersQuery.data.meta.totalPages}
          onPageChange={setPage}
        />
      )}

      <MyOrderDetailDrawer
        open={selectedId !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
        order={detailQuery.data}
        isLoading={detailQuery.isLoading}
        isError={detailQuery.isError}
        onRetry={detailQuery.refetch}
      />
    </div>
  );
}
