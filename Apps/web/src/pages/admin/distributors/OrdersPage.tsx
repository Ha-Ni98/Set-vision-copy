import { useState } from "react";
import { Package, Clock, Truck, Wallet, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { StatsRow, type DashboardStatCardData } from "../components/StatsRow";
import { OrdersFilters } from "./components/OrdersFilters";
import { OrdersTable } from "./components/OrdersTable";
import { OrderDetailDrawer } from "./components/OrderDetailDrawer";
import { CreateOrderModal } from "./components/CreateOrderModal";

// Static composition — no data hooks yet (wired in Sprint 3, plan.md §D1).
const STATIC_CARDS: DashboardStatCardData[] = [
  {
    key: "total",
    icon: <Package className="h-5 w-5" />,
    labelKey: "admin.orders.stats.total.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
  {
    key: "pendingDelivery",
    icon: <Clock className="h-5 w-5" />,
    labelKey: "admin.orders.stats.pendingDelivery.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
  {
    key: "inDelivery",
    icon: <Truck className="h-5 w-5" />,
    labelKey: "admin.orders.stats.inDelivery.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
  {
    key: "totalRevenue",
    icon: <Wallet className="h-5 w-5" />,
    labelKey: "admin.orders.stats.totalRevenue.title",
    value: null,
    isLoading: true,
    isError: false,
    onRetry: () => {},
  },
];

export default function OrdersPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [wilayaId, setWilayaId] = useState("");
  const [deliveryCompanyId, setDeliveryCompanyId] = useState("");
  const [state, setState] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createDistributorSearch, setCreateDistributorSearch] = useState("");
  const [createDistributorId, setCreateDistributorId] = useState("");
  const [createPlanId, setCreatePlanId] = useState("");
  const [createLotIds, setCreateLotIds] = useState<string[]>([]);
  const [createWilayaId, setCreateWilayaId] = useState("");

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
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={t("admin.shell.nav.orders")} />
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("admin.orders.create.title")}
        </Button>
      </div>

      <StatsRow cards={STATIC_CARDS} />

      <OrdersFilters
        search={search}
        onSearchChange={setSearch}
        wilayaId={wilayaId}
        onWilayaChange={setWilayaId}
        deliveryCompanyId={deliveryCompanyId}
        onDeliveryCompanyChange={setDeliveryCompanyId}
        state={state}
        onStateChange={setState}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        wilayasLoading
        wilayasError={false}
        deliveryCompaniesLoading
        deliveryCompaniesError={false}
      />

      <OrdersTable
        isLoading
        isError={false}
        onRetry={() => {}}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
        onCreateFirst={() => setCreateOpen(true)}
        onView={() => {}}
        onMarkInDelivery={() => {}}
        onMarkDelivered={() => {}}
        onMarkReturned={() => {}}
        onDelete={() => {}}
      />

      <OrderDetailDrawer
        open={false}
        onOpenChange={() => {}}
        isLoading={false}
        isError={false}
        onRetry={() => {}}
      />

      <CreateOrderModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={() => setCreateOpen(false)}
        distributorSearch={createDistributorSearch}
        onDistributorSearchChange={setCreateDistributorSearch}
        distributorsLoading
        distributorsError={false}
        onRetryDistributors={() => {}}
        distributorId={createDistributorId}
        onDistributorChange={setCreateDistributorId}
        plansLoading
        plansError={false}
        subscriptionPlanId={createPlanId}
        onPlanChange={setCreatePlanId}
        lotsLoading
        lotsError={false}
        onRetryLots={() => {}}
        lotIds={createLotIds}
        onToggleLot={(id) =>
          setCreateLotIds((prev) =>
            prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id],
          )
        }
        wilayaId={createWilayaId}
        onWilayaChange={setCreateWilayaId}
        wilayasLoading
        wilayasError={false}
        communesLoading={false}
        communesError={false}
        deliveryCompaniesLoading
        deliveryCompaniesError={false}
        summaryCardsTotal={0}
      />
    </div>
  );
}
