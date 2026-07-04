import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DeliveryType, type CreateOrderCommand } from "@my-app/contract";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useDistributors } from "@/hooks/useDistributors";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { useAvailableLotsForOrder } from "@/hooks/useLots";
import { useWilayas, useCommunes } from "@/hooks/useGeography";
import { useDeliveryCompanies } from "@/hooks/useDeliveryCompanies";
import {
  createOrderSchema,
  type CreateOrderFormValues,
  type CreateOrderFormInput,
} from "./create-order.schema";
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

const STEP_FIELDS: (keyof CreateOrderFormValues)[][] = [
  ["distributorId"],
  ["lotIds"],
  ["receivedName", "receivedPhone", "wilayaId", "communeId"],
  ["deliveryCompanyId", "deliveryType", "orderPrice", "deliverPrice"],
  [],
];

const DEFAULT_VALUES: CreateOrderFormInput = {
  distributorId: "",
  lotIds: [],
  receivedName: "",
  receivedPhone: "",
  wilayaId: "",
  communeId: "",
  deliveryCompanyId: "",
  deliveryType: DeliveryType.HOME,
  orderPrice: 0,
  deliverPrice: 0,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (command: CreateOrderCommand) => void;
  isPending?: boolean;
}

// Stepper host — owns the wizard's single RHF form + local `step` state (plan.md decision
// #5) and every read this wizard needs (each step's data hook is called here, not threaded
// down as a dozen props). Advancing a step only calls `trigger()` on that step's fields.
export function CreateOrderModal({ open, onOpenChange, onSubmit, isPending }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [distributorSearch, setDistributorSearch] = useState("");
  const [lotsPlanId, setLotsPlanId] = useState("");
  const debouncedDistributorSearch = useDebouncedValue(distributorSearch);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    reset,
    formState: { errors },
  } = useForm<CreateOrderFormInput, unknown, CreateOrderFormValues>({
    resolver: zodResolver(createOrderSchema(t)),
    defaultValues: DEFAULT_VALUES,
  });

  const distributorId = watch("distributorId");
  const lotIds = watch("lotIds");
  const wilayaId = watch("wilayaId");
  const communeId = watch("communeId");
  const deliveryCompanyId = watch("deliveryCompanyId");
  const deliveryType = watch("deliveryType");
  const orderPrice = watch("orderPrice");
  const deliverPrice = watch("deliverPrice");

  // Distributors are fetched by search only (no server `enabled` filter, F-5) — enabled
  // distributors are client-filtered from the fetched page.
  const distributorsQuery = useDistributors({
    search: debouncedDistributorSearch || undefined,
    limit: 100,
  });
  const enabledDistributors = useMemo(
    () => (distributorsQuery.data?.items ?? []).filter((d) => d.isEnabled),
    [distributorsQuery.data],
  );
  const plansQuery = useSubscriptionPlans({ active: true });
  const lotsQuery = useAvailableLotsForOrder({ subscriptionPlanId: lotsPlanId || undefined });
  const wilayasQuery = useWilayas();
  const communesQuery = useCommunes(wilayaId || undefined);
  const deliveryCompaniesQuery = useDeliveryCompanies({ active: true });

  const isFirst = step === 0;
  const isLast = step === STEP_KEYS.length - 1;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setStep(0);
      setDistributorSearch("");
      setLotsPlanId("");
      reset(DEFAULT_VALUES);
    }
    onOpenChange(next);
  };

  // Prefills the receiver step from the chosen distributor — a plain state derivation on
  // user action, not a fetch, so it's fine outside a data hook (rules §2).
  const handleSelectDistributor = (id: string) => {
    setValue("distributorId", id, { shouldValidate: true });
    const distributor = enabledDistributors.find((d) => d.id === id);
    if (distributor) {
      setValue("receivedName", distributor.fullName);
      setValue("receivedPhone", distributor.phone);
      setValue("wilayaId", distributor.wilayaId);
      setValue("communeId", distributor.communeId);
    }
  };

  const handleToggleLot = (id: string) => {
    const next = lotIds.includes(id) ? lotIds.filter((l) => l !== id) : [...lotIds, id];
    setValue("lotIds", next, { shouldValidate: true });
  };

  const handleNext = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => s + 1);
  };

  const confirm = handleSubmit((values) => onSubmit(values));

  const cardsTotal = useMemo(
    () =>
      (lotsQuery.data ?? [])
        .filter((l) => lotIds.includes(l.id))
        .reduce((sum, l) => sum + l.nbOfCards, 0),
    [lotsQuery.data, lotIds],
  );
  const selectedDistributor = enabledDistributors.find((d) => d.id === distributorId);
  const selectedWilaya = wilayasQuery.data?.find((w) => w.id === wilayaId);
  const selectedCommune = communesQuery.data?.find((c) => c.id === communeId);
  const selectedDeliveryCompany = deliveryCompaniesQuery.data?.find(
    (c) => c.id === deliveryCompanyId,
  );

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
            onSearchChange={setDistributorSearch}
            distributors={enabledDistributors}
            isLoading={distributorsQuery.isLoading}
            isError={distributorsQuery.isError}
            onRetry={distributorsQuery.refetch}
            selectedDistributorId={distributorId}
            onSelectDistributor={handleSelectDistributor}
            error={errors.distributorId?.message}
          />
        )}
        {step === 1 && (
          <StepSelectLots
            plans={plansQuery.data}
            plansLoading={plansQuery.isLoading}
            plansError={plansQuery.isError}
            subscriptionPlanId={lotsPlanId}
            onPlanChange={setLotsPlanId}
            lots={lotsQuery.data}
            lotsLoading={lotsQuery.isLoading}
            lotsError={lotsQuery.isError}
            onRetry={lotsQuery.refetch}
            selectedLotIds={lotIds}
            onToggleLot={handleToggleLot}
            error={errors.lotIds?.message}
          />
        )}
        {step === 2 && (
          <StepReceiverInfo
            register={register}
            errors={errors}
            wilayaId={wilayaId}
            onWilayaChange={(id) => {
              setValue("wilayaId", id, { shouldValidate: true });
              setValue("communeId", "");
            }}
            communeId={communeId}
            onCommuneChange={(id) => setValue("communeId", id, { shouldValidate: true })}
            wilayas={wilayasQuery.data}
            wilayasLoading={wilayasQuery.isLoading}
            wilayasError={wilayasQuery.isError}
            communes={communesQuery.data}
            communesLoading={communesQuery.isLoading}
            communesError={communesQuery.isError}
          />
        )}
        {step === 3 && (
          <StepDeliveryConfig
            register={register}
            errors={errors}
            deliveryCompanyId={deliveryCompanyId}
            onDeliveryCompanyChange={(id) =>
              setValue("deliveryCompanyId", id, { shouldValidate: true })
            }
            deliveryType={deliveryType}
            onDeliveryTypeChange={(v) =>
              setValue("deliveryType", v as DeliveryType, { shouldValidate: true })
            }
            deliveryCompanies={deliveryCompaniesQuery.data}
            deliveryCompaniesLoading={deliveryCompaniesQuery.isLoading}
            deliveryCompaniesError={deliveryCompaniesQuery.isError}
          />
        )}
        {step === 4 && (
          <StepConfirmSummary
            distributorName={selectedDistributor?.fullName}
            lotsCount={lotIds.length}
            cardsTotal={cardsTotal}
            receivedName={watch("receivedName")}
            receivedPhone={watch("receivedPhone")}
            wilayaName={selectedWilaya?.frName}
            communeName={selectedCommune?.frName}
            deliveryCompanyName={selectedDeliveryCompany?.name}
            deliveryType={deliveryType}
            orderPrice={Number(orderPrice)}
            deliverPrice={Number(deliverPrice)}
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
            <Button onClick={confirm} disabled={isPending}>
              {t("common.actions.confirm")}
            </Button>
          ) : (
            <Button type="button" onClick={handleNext}>
              {t("common.actions.next")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
