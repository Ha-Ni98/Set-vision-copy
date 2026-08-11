import { useState } from "react";
import { OrderRequestStat, type CardOrderRequestDTO } from "@my-app/contract";
import { PageHeader } from "@/components/shared/PageHeader";
import { SimplePagination } from "@/components/shared/SimplePagination";
import { useTranslation } from "@/hooks/useTranslation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import {
  useCardOrderRequests,
  useApproveCardOrderRequest,
  useRejectCardOrderRequest,
  useUnlinkCardOrderRequest,
} from "@/hooks/useCardOrderRequests";
import { OrderRequestsFilters } from "./components/OrderRequestsFilters";
import { OrderRequestsTable } from "./components/OrderRequestsTable";
import { ReviewOrderRequestModal } from "./components/ReviewOrderRequestModal";

const LIMIT = 10;

function toIsoDate(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

export default function OrderRequestsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [subscriptionPlanId, setSubscriptionPlanId] = useState("");
  const [state, setState] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reviewRequest, setReviewRequest] = useState<CardOrderRequestDTO | null>(null);
  const [reviewMode, setReviewMode] = useState<"approve" | "reject" | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  const plansQuery = useSubscriptionPlans({ active: true });
  const requestsQuery = useCardOrderRequests({
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
    subscriptionPlanId: subscriptionPlanId || undefined,
    state: (state as OrderRequestStat) || undefined,
    dateFrom: toIsoDate(dateFrom),
    dateTo: toIsoDate(dateTo),
  });

  const approveRequest = useApproveCardOrderRequest();
  const rejectRequest = useRejectCardOrderRequest();
  const unlinkRequest = useUnlinkCardOrderRequest();

  const hasFilters =
    search.length > 0 ||
    subscriptionPlanId.length > 0 ||
    state.length > 0 ||
    dateFrom.length > 0 ||
    dateTo.length > 0;
  const clearFilters = () => {
    setSearch("");
    setSubscriptionPlanId("");
    setState("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const isReviewPending = approveRequest.isPending || rejectRequest.isPending;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.shell.nav.orderRequests")} />

      <OrderRequestsFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        subscriptionPlanId={subscriptionPlanId}
        onSubscriptionPlanChange={(id) => {
          setSubscriptionPlanId(id);
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
        plans={plansQuery.data}
        plansLoading={plansQuery.isLoading}
        plansError={plansQuery.isError}
      />

      <OrderRequestsTable
        data={requestsQuery.data?.items}
        isLoading={requestsQuery.isLoading}
        isError={requestsQuery.isError}
        onRetry={requestsQuery.refetch}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
        onApprove={(request) => {
          setReviewRequest(request);
          setReviewMode("approve");
        }}
        onReject={(request) => {
          setReviewRequest(request);
          setReviewMode("reject");
        }}
        onUnlink={(request) => unlinkRequest.mutate(request.id)}
      />

      {requestsQuery.data && (
        <SimplePagination
          page={page}
          totalPages={requestsQuery.data.meta.totalPages}
          onPageChange={setPage}
        />
      )}

      <ReviewOrderRequestModal
        mode={reviewRequest ? reviewMode : null}
        onOpenChange={(open) => {
          if (!open) {
            setReviewRequest(null);
            setReviewMode(null);
          }
        }}
        isPending={isReviewPending}
        onSubmit={(command) => {
          if (!reviewRequest) return;
          const mutation = reviewMode === "approve" ? approveRequest : rejectRequest;
          mutation.mutate(
            { id: reviewRequest.id, command },
            {
              onSuccess: () => {
                setReviewRequest(null);
                setReviewMode(null);
              },
            },
          );
        }}
      />
    </div>
  );
}
