import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ActivationStat } from "@my-app/contract";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { PageHeader } from "@/components/shared/PageHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { useActivationDetail, useSetActivationPrice } from "@/hooks/useAdminActivations";
import { ClientBlock } from "./components/ClientBlock";
import { DistributorBlock } from "./components/DistributorBlock";
import { ActivatorBlock } from "./components/ActivatorBlock";
import { SubmittedInformationList } from "./components/SubmittedInformationList";
import { ActivationTimeline } from "./components/ActivationTimeline";
import { CardHistoryTimeline } from "./components/CardHistoryTimeline";
import { FinancialBlock } from "./components/FinancialBlock";
import { SetActivatorPriceModal } from "./components/SetActivatorPriceModal";

const COMPLETED_STATES = new Set<ActivationStat>([
  ActivationStat.ACTIVATED,
  ActivationStat.ACTIVATED_BY_ADMIN,
]);

// One useActivationDetail(id) query drives the whole page — loading/error is one region,
// not per-block (plan §D2).
export default function ActivationDetailPage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const [priceModalOpen, setPriceModalOpen] = useState(false);

  const detailQuery = useActivationDetail(id);
  const setActivationPrice = useSetActivationPrice();

  if (detailQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("admin.activationDetail.title")} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("admin.activationDetail.title")} />
        <NotFoundState
          title={t("admin.activationDetail.notFound.title")}
          body=""
          action={
            <Button asChild variant="outline">
              <Link to="/admin/activations">{t("admin.activationDetail.notFound.backLink")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const detail = detailQuery.data;
  // No top-level `state` on ActivationDetailDTO — the last timeline entry's stat is the
  // current status, same as the list's gating (§E-2 note: derive, don't fabricate a field).
  const currentState = detail.timeline.at(-1)?.stat;
  // Any completed activation can be (re-)priced, not just an unpriced one (Stage-04-fix #1) —
  // the backend's setPrice already adjusts the activator's earning/credits by the delta.
  const canSetPrice = !!currentState && COMPLETED_STATES.has(currentState);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.activationDetail.title")} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ClientBlock client={detail.client} />
        <DistributorBlock distributor={detail.distributor} />
        <ActivatorBlock activator={detail.activator} />
        <FinancialBlock
          financial={detail.financial}
          canSetPrice={canSetPrice}
          onRequestSetPrice={() => setPriceModalOpen(true)}
        />
      </div>

      <SubmittedInformationList fields={detail.submittedInformation} />
      <ActivationTimeline entries={detail.timeline} />
      <CardHistoryTimeline entries={detail.cardHistory} />

      <SetActivatorPriceModal
        open={priceModalOpen}
        onOpenChange={setPriceModalOpen}
        isPending={setActivationPrice.isPending}
        currentAmount={detail.financial.activationPrice}
        onSubmit={(values) =>
          setActivationPrice.mutate(
            { id, command: { amount: values.amount } },
            { onSuccess: () => setPriceModalOpen(false) },
          )
        }
      />
    </div>
  );
}
