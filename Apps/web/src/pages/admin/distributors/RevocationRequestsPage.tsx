import { useState } from "react";
import { RevocationRequestStat, type CardRevocationRequestDTO } from "@my-app/contract";
import { PageHeader } from "@/components/shared/PageHeader";
import { SimplePagination } from "@/components/shared/SimplePagination";
import { useTranslation } from "@/hooks/useTranslation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  useCardRevocationRequests,
  useApproveCardRevocationRequest,
  useRejectCardRevocationRequest,
} from "@/hooks/useCardRevocationRequests";
import { RevocationRequestsFilters } from "./components/RevocationRequestsFilters";
import { RevocationRequestsTable } from "./components/RevocationRequestsTable";
import { ReviewRevocationRequestModal } from "./components/ReviewRevocationRequestModal";

const LIMIT = 10;

function toIsoDate(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

export default function RevocationRequestsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reviewRequest, setReviewRequest] = useState<CardRevocationRequestDTO | null>(null);
  const [reviewMode, setReviewMode] = useState<"approve" | "reject" | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  const requestsQuery = useCardRevocationRequests({
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
    state: (state as RevocationRequestStat) || undefined,
    dateFrom: toIsoDate(dateFrom),
    dateTo: toIsoDate(dateTo),
  });

  const approveRequest = useApproveCardRevocationRequest();
  const rejectRequest = useRejectCardRevocationRequest();

  const hasFilters =
    search.length > 0 || state.length > 0 || dateFrom.length > 0 || dateTo.length > 0;
  const clearFilters = () => {
    setSearch("");
    setState("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const isReviewPending = approveRequest.isPending || rejectRequest.isPending;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.shell.nav.revocationRequests")} />

      <RevocationRequestsFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
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
      />

      <RevocationRequestsTable
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
      />

      {requestsQuery.data && (
        <SimplePagination
          page={page}
          totalPages={requestsQuery.data.meta.totalPages}
          onPageChange={setPage}
        />
      )}

      <ReviewRevocationRequestModal
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
