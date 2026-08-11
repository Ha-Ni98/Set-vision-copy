import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ActivationStat } from "@my-app/contract";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useActivationDetail,
  useSetActivationPrice,
  useSetActivationCost,
} from "@/hooks/useAdminActivations";
import { ClientBlock } from "./components/ClientBlock";
import { DistributorBlock } from "./components/DistributorBlock";
import { ActivatorBlock } from "./components/ActivatorBlock";
import { CardChainBlock } from "./components/CardChainBlock";
import { TimingBlock } from "./components/TimingBlock";
import { SubmittedInformationList } from "./components/SubmittedInformationList";
import { ActivationTimeline } from "./components/ActivationTimeline";
import { CardHistoryTimeline } from "./components/CardHistoryTimeline";
import { FinancialBlock } from "./components/FinancialBlock";
import { SetActivatorPriceModal } from "./components/SetActivatorPriceModal";
import { SetActivationCostModal } from "./components/SetActivationCostModal";

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
  const [costModalOpen, setCostModalOpen] = useState(false);

  const detailQuery = useActivationDetail(id);
  const setActivationPrice = useSetActivationPrice();
  const setActivationCost = useSetActivationCost();

  if (detailQuery.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("admin.activationDetail.title")} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
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
  // Any completed activation can be (re-)priced, not just an unpriced one (Stage-04-fix #1) —
  // the backend's setPrice already adjusts the activator's earning/credits by the delta.
  const canSetPrice = COMPLETED_STATES.has(detail.state);
  // Set 9 (D10): same completed-only gate, enforced server-side by setCost too.
  const canSetCost = COMPLETED_STATES.has(detail.state);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <PageHeader title={t("admin.activationDetail.title")} />
        <StatusBadge status={detail.state} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ClientBlock client={detail.client} />
        <DistributorBlock distributor={detail.distributor} />
        <ActivatorBlock activator={detail.activator} />
        <CardChainBlock card={detail.card} />
        <TimingBlock timing={detail.timing} activationEmail={detail.activationEmail} />
        <FinancialBlock
          financial={detail.financial}
          canSetPrice={canSetPrice}
          onRequestSetPrice={() => setPriceModalOpen(true)}
          canSetCost={canSetCost}
          onRequestSetCost={() => setCostModalOpen(true)}
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

      <SetActivationCostModal
        open={costModalOpen}
        onOpenChange={setCostModalOpen}
        isPending={setActivationCost.isPending}
        currentAmount={detail.financial.activationCost}
        onSubmit={(values) =>
          setActivationCost.mutate(
            { id, command: { amount: values.amount } },
            { onSuccess: () => setCostModalOpen(false) },
          )
        }
      />
    </div>
  );
}
