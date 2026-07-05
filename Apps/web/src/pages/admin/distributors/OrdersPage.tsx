import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Package, Clock, Truck, Wallet, Plus } from "lucide-react";
import { OrderStat } from "@my-app/contract";
import { PageHeader } from "@/components/shared/PageHeader";
import { SimplePagination } from "@/components/shared/SimplePagination";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useOrdersSummary } from "@/hooks/useStatistics";
import {
  useOrders,
  useOrder,
  useCreateOrder,
  useTransitionOrder,
  useDeleteOrder,
} from "@/hooks/useOrders";
import { useWilayas } from "@/hooks/useGeography";
import { useDeliveryCompanies } from "@/hooks/useDeliveryCompanies";
import { formatDZD } from "@/lib/utils";
import { StatsRow, type DashboardStatCardData } from "../components/StatsRow";
import { OrdersFilters } from "./components/OrdersFilters";
import { OrdersTable } from "./components/OrdersTable";
import { OrderDetailDrawer } from "./components/OrderDetailDrawer";
import { CreateOrderModal } from "./components/CreateOrderModal";

const LIMIT = 10;

function toIsoDate(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [wilayaId, setWilayaId] = useState("");
  const [deliveryCompanyId, setDeliveryCompanyId] = useState("");
  const [state, setState] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [distributorId] = useState(() => searchParams.get("distributor") ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOrderId, setViewOrderId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search);

  const summary = useOrdersSummary();
  const ordersQuery = useOrders({
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
    distributorId: distributorId || undefined,
    wilayaId: wilayaId || undefined,
    deliveryCompanyId: deliveryCompanyId || undefined,
    state: (state as OrderStat) || undefined,
    dateFrom: toIsoDate(dateFrom),
    dateTo: toIsoDate(dateTo),
  });
  const wilayasQuery = useWilayas();
  const deliveryCompaniesQuery = useDeliveryCompanies({ active: true });
  const orderDetailQuery = useOrder(viewOrderId);

  const createOrder = useCreateOrder();
  const transitionOrder = useTransitionOrder();
  const deleteOrder = useDeleteOrder();
  const isMutating = transitionOrder.isPending || deleteOrder.isPending;

  const hasFilters =
    search.length > 0 ||
    wilayaId.length > 0 ||
    deliveryCompanyId.length > 0 ||
    state.length > 0 ||
    dateFrom.length > 0 ||
    dateTo.length > 0;
  const clearFilters = () => {
    setSearch("");
    setWilayaId("");
    setDeliveryCompanyId("");
    setState("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const cards: DashboardStatCardData[] = [
    {
      key: "total",
      icon: <Package className="h-5 w-5" />,
      labelKey: "admin.orders.stats.total.title",
      value: summary.data ? String(summary.data.totalOrders.all) : null,
      subLabelKey: "admin.orders.stats.total.subLabel",
      subLabelVars: summary.data
        ? { month: summary.data.totalOrders.month, week: summary.data.totalOrders.week }
        : undefined,
      isLoading: summary.isLoading,
      isError: summary.isError,
      onRetry: summary.refetch,
    },
    {
      key: "pendingDelivery",
      icon: <Clock className="h-5 w-5" />,
      labelKey: "admin.orders.stats.pendingDelivery.title",
      value: summary.data ? String(summary.data.pendingDelivery) : null,
      isLoading: summary.isLoading,
      isError: summary.isError,
      onRetry: summary.refetch,
    },
    {
      key: "inDelivery",
      icon: <Truck className="h-5 w-5" />,
      labelKey: "admin.orders.stats.inDelivery.title",
      value: summary.data ? String(summary.data.inDelivery) : null,
      isLoading: summary.isLoading,
      isError: summary.isError,
      onRetry: summary.refetch,
    },
    {
      key: "totalRevenue",
      icon: <Wallet className="h-5 w-5" />,
      labelKey: "admin.orders.stats.totalRevenue.title",
      value: summary.data ? formatDZD(summary.data.totalRevenue, language) : null,
      isLoading: summary.isLoading,
      isError: summary.isError,
      onRetry: summary.refetch,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={t("admin.shell.nav.orders")} />
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.orders.create.title")}
        </Button>
      </div>

      <StatsRow cards={cards} />

      <OrdersFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        wilayaId={wilayaId}
        onWilayaChange={(id) => {
          setWilayaId(id);
          setPage(1);
        }}
        deliveryCompanyId={deliveryCompanyId}
        onDeliveryCompanyChange={(id) => {
          setDeliveryCompanyId(id);
          setPage(1);
        }}
        state={state}
        onStateChange={(s) => {
          setState(s);
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
        wilayas={wilayasQuery.data}
        wilayasLoading={wilayasQuery.isLoading}
        wilayasError={wilayasQuery.isError}
        deliveryCompanies={deliveryCompaniesQuery.data}
        deliveryCompaniesLoading={deliveryCompaniesQuery.isLoading}
        deliveryCompaniesError={deliveryCompaniesQuery.isError}
      />

      <OrdersTable
        data={ordersQuery.data?.items}
        isLoading={ordersQuery.isLoading}
        isError={ordersQuery.isError}
        onRetry={ordersQuery.refetch}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
        onCreateFirst={() => setCreateOpen(true)}
        onView={(order) => {
          setViewOrderId(order.id);
          setDrawerOpen(true);
        }}
        onMarkInDelivery={(order) =>
          transitionOrder.mutate({ id: order.id, command: { to: OrderStat.IN_DELIVERY } })
        }
        onMarkDelivered={(order, values) =>
          transitionOrder.mutate({
            id: order.id,
            command: { to: OrderStat.DELIVERED, deliveredCount: values.deliveredCount },
          })
        }
        onMarkReturned={(order) =>
          transitionOrder.mutate({ id: order.id, command: { to: OrderStat.RETURNED } })
        }
        onDelete={(order) => deleteOrder.mutate(order.id)}
        isMutating={isMutating}
      />

      {ordersQuery.data && (
        <SimplePagination
          page={page}
          totalPages={ordersQuery.data.meta.totalPages}
          onPageChange={setPage}
        />
      )}

      <OrderDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        order={orderDetailQuery.data}
        isLoading={orderDetailQuery.isLoading}
        isError={orderDetailQuery.isError}
        onRetry={orderDetailQuery.refetch}
      />

      <CreateOrderModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(command) =>
          createOrder.mutate(command, { onSuccess: () => setCreateOpen(false) })
        }
        isPending={createOrder.isPending}
      />
    </div>
  );
}
