import { useState } from "react";
import { Plus } from "lucide-react";
import { OrderRequestStat } from "@my-app/contract";
import { PageHeader } from "@/components/shared/PageHeader";
import { SimplePagination } from "@/components/shared/SimplePagination";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import {
  useMyCardOrderRequests,
  useCreateCardOrderRequest,
  useCancelCardOrderRequest,
} from "@/hooks/useCardOrderRequests";
import { MyOrderRequestsTable } from "./components/MyOrderRequestsTable";
import { SubmitOrderRequestModal } from "./components/SubmitOrderRequestModal";

const LIMIT = 10;
const ALL = "__all__";

export default function RequestsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [state, setState] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);

  const plansQuery = useSubscriptionPlans({ active: true });
  const requestsQuery = useMyCardOrderRequests({
    page,
    limit: LIMIT,
    state: (state as OrderRequestStat) || undefined,
  });
  const createRequest = useCreateCardOrderRequest();
  const cancelRequest = useCancelCardOrderRequest();

  const hasFilters = state.length > 0;
  const clearFilters = () => {
    setState("");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={t("distributor.orderRequests.title")} />
        <Button onClick={() => setSubmitOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("distributor.orderRequests.submit.title")}
        </Button>
      </div>

      <Select
        value={state || ALL}
        onValueChange={(v) => {
          setState(v === ALL ? "" : v);
          setPage(1);
        }}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder={t("distributor.orderRequests.filters.statePlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>
            {t("distributor.orderRequests.filters.statePlaceholder")}
          </SelectItem>
          {Object.values(OrderRequestStat).map((s) => (
            <SelectItem key={s} value={s}>
              {t(`enums.orderRequestStat.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <MyOrderRequestsTable
        data={requestsQuery.data?.items}
        isLoading={requestsQuery.isLoading}
        isError={requestsQuery.isError}
        onRetry={requestsQuery.refetch}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
        onCancel={(request) => cancelRequest.mutate(request.id)}
        isMutating={cancelRequest.isPending}
      />

      {requestsQuery.data && (
        <SimplePagination
          page={page}
          totalPages={requestsQuery.data.meta.totalPages}
          onPageChange={setPage}
        />
      )}

      <SubmitOrderRequestModal
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        onSubmit={(command) =>
          createRequest.mutate(command, { onSuccess: () => setSubmitOpen(false) })
        }
        isPending={createRequest.isPending}
        plans={plansQuery.data}
        plansLoading={plansQuery.isLoading}
      />
    </div>
  );
}
