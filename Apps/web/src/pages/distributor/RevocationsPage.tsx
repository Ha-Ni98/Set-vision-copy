import { useState } from "react";
import { Plus } from "lucide-react";
import { RevocationRequestStat } from "@my-app/contract";
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
import {
  useMyCardRevocationRequests,
  useEligibleCards,
  useCreateCardRevocationRequest,
  useCancelCardRevocationRequest,
} from "@/hooks/useCardRevocationRequests";
import { MyRevocationRequestsTable } from "./components/MyRevocationRequestsTable";
import { SubmitRevocationRequestModal } from "./components/SubmitRevocationRequestModal";

const LIMIT = 10;
const ALL = "__all__";

export default function RevocationsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [state, setState] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);

  const eligibleQuery = useEligibleCards();
  const requestsQuery = useMyCardRevocationRequests({
    page,
    limit: LIMIT,
    state: (state as RevocationRequestStat) || undefined,
  });
  const createRequest = useCreateCardRevocationRequest();
  const cancelRequest = useCancelCardRevocationRequest();

  const hasFilters = state.length > 0;
  const clearFilters = () => {
    setState("");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={t("distributor.revocations.title")} />
        <Button onClick={() => setSubmitOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("distributor.revocations.submit.title")}
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
          <SelectValue placeholder={t("distributor.revocations.filters.statePlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>
            {t("distributor.revocations.filters.statePlaceholder")}
          </SelectItem>
          {Object.values(RevocationRequestStat).map((s) => (
            <SelectItem key={s} value={s}>
              {t(`enums.revocationRequestStat.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <MyRevocationRequestsTable
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

      <SubmitRevocationRequestModal
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        onSubmit={(command) =>
          createRequest.mutate(command, { onSuccess: () => setSubmitOpen(false) })
        }
        isPending={createRequest.isPending}
        eligibleCards={eligibleQuery.data}
        eligibleLoading={eligibleQuery.isLoading}
      />
    </div>
  );
}
