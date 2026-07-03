import { useState } from "react";
import type {
  DistributorDTO,
  SubscriptionPlanDTO,
  LotDTO,
  WilayaDTO,
  CommuneDTO,
  DeliveryCompanyDTO,
  DeliveryType,
} from "@my-app/contract";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { StepSelectDistributor } from "./StepSelectDistributor";
import { StepSelectLots } from "./StepSelectLots";
import { StepReceiverInfo } from "./StepReceiverInfo";
import { StepDeliveryConfig } from "./StepDeliveryConfig";
import { StepConfirmSummary } from "./StepConfirmSummary";

const STEP_KEYS = [
  "admin.orders.create.steps.selectDistributor",
  "admin.orders.create.steps.selectLots",
  "admin.orders.create.steps.receiverInfo",
  "admin.orders.create.steps.deliveryConfig",
  "admin.orders.create.steps.confirmSummary",
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called on Confirm — RHF (create-order.schema.ts) + per-step `trigger()` gating +
   * useCreateOrder wire this in Sprint 3. Advancing steps here is unconditional. */
  onSubmit: () => void;
  isPending?: boolean;

  distributorSearch: string;
  onDistributorSearchChange: (value: string) => void;
  distributors?: DistributorDTO[];
  distributorsLoading: boolean;
  distributorsError: boolean;
  onRetryDistributors: () => void;
  distributorId: string;
  onDistributorChange: (id: string) => void;

  plans?: SubscriptionPlanDTO[];
  plansLoading: boolean;
  plansError: boolean;
  subscriptionPlanId: string;
  onPlanChange: (id: string) => void;
  lots?: LotDTO[];
  lotsLoading: boolean;
  lotsError: boolean;
  onRetryLots: () => void;
  lotIds: string[];
  onToggleLot: (id: string) => void;

  wilayaId: string;
  onWilayaChange: (id: string) => void;
  wilayas?: WilayaDTO[];
  wilayasLoading: boolean;
  wilayasError: boolean;
  communes?: CommuneDTO[];
  communesLoading: boolean;
  communesError: boolean;

  deliveryCompanies?: DeliveryCompanyDTO[];
  deliveryCompaniesLoading: boolean;
  deliveryCompaniesError: boolean;

  summaryDistributorName?: string;
  summaryCardsTotal: number;
  summaryDeliveryType?: DeliveryType;
}

// Stepper host — static shell only (plan.md's Sprint 2 vs. Sprint 3 split). Step-index
// navigation is real, local UI state; `form.trigger([...stepFields])` gating, RHF, and the
// final `useCreateOrder.mutate(command)` call are Sprint 3 concerns.
export function CreateOrderModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  distributorSearch,
  onDistributorSearchChange,
  distributors,
  distributorsLoading,
  distributorsError,
  onRetryDistributors,
  distributorId,
  onDistributorChange,
  plans,
  plansLoading,
  plansError,
  subscriptionPlanId,
  onPlanChange,
  lots,
  lotsLoading,
  lotsError,
  onRetryLots,
  lotIds,
  onToggleLot,
  wilayaId,
  onWilayaChange,
  wilayas,
  wilayasLoading,
  wilayasError,
  communes,
  communesLoading,
  communesError,
  deliveryCompanies,
  deliveryCompaniesLoading,
  deliveryCompaniesError,
  summaryDistributorName,
  summaryCardsTotal,
  summaryDeliveryType,
}: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const isFirst = step === 0;
  const isLast = step === STEP_KEYS.length - 1;

  const handleOpenChange = (next: boolean) => {
    if (!next) setStep(0);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t("admin.orders.create.title")} — {t(STEP_KEYS[step])}
          </DialogTitle>
        </DialogHeader>

        {step === 0 && (
          <StepSelectDistributor
            search={distributorSearch}
            onSearchChange={onDistributorSearchChange}
            distributors={distributors}
            isLoading={distributorsLoading}
            isError={distributorsError}
            onRetry={onRetryDistributors}
            selectedDistributorId={distributorId}
            onSelectDistributor={onDistributorChange}
          />
        )}
        {step === 1 && (
          <StepSelectLots
            plans={plans}
            plansLoading={plansLoading}
            plansError={plansError}
            subscriptionPlanId={subscriptionPlanId}
            onPlanChange={onPlanChange}
            lots={lots}
            lotsLoading={lotsLoading}
            lotsError={lotsError}
            onRetry={onRetryLots}
            selectedLotIds={lotIds}
            onToggleLot={onToggleLot}
          />
        )}
        {step === 2 && (
          <StepReceiverInfo
            wilayaId={wilayaId}
            onWilayaChange={onWilayaChange}
            wilayas={wilayas}
            wilayasLoading={wilayasLoading}
            wilayasError={wilayasError}
            communes={communes}
            communesLoading={communesLoading}
            communesError={communesError}
          />
        )}
        {step === 3 && (
          <StepDeliveryConfig
            deliveryCompanies={deliveryCompanies}
            deliveryCompaniesLoading={deliveryCompaniesLoading}
            deliveryCompaniesError={deliveryCompaniesError}
          />
        )}
        {step === 4 && (
          <StepConfirmSummary
            distributorName={summaryDistributorName}
            lotsCount={lotIds.length}
            cardsTotal={summaryCardsTotal}
            deliveryType={summaryDeliveryType}
          />
        )}

        <DialogFooter className="justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={isFirst}
          >
            {t("common.actions.back")}
          </Button>
          {isLast ? (
            <Button onClick={onSubmit} disabled={isPending}>
              {t("common.actions.confirm")}
            </Button>
          ) : (
            <Button type="button" onClick={() => setStep((s) => s + 1)}>
              {t("common.actions.next")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
