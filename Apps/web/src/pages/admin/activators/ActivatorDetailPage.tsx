import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { UserRole } from "@my-app/contract";
import { PageHeader } from "@/components/shared/PageHeader";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { StatCardSkeleton } from "@/components/shared/StatCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useActivator,
  useActivatorPerformance,
  useUpdateActivator,
  useToggleActivator,
  useResetActivatorPassword,
} from "@/hooks/useActivators";
import { usePayments, useRecordPayment, useDeletePayment } from "@/hooks/usePayments";
import { ProfileCard } from "./components/ProfileCard";
import { StatsRevenueGrid } from "./components/StatsRevenueGrid";
import { PerformanceChart } from "./components/PerformanceChart";
import { PaymentsHistoryTable } from "./components/PaymentsHistoryTable";
import { EditActivatorModal } from "./components/EditActivatorModal";
import { RecordPaymentModal } from "./components/RecordPaymentModal";
import { GeneratedPasswordPanel } from "./components/GeneratedPasswordPanel";
import { TelegramLinkPanel } from "@/components/sections/admin/TelegramLinkPanel";

function ProfileStatsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-3 h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function ActivatorDetailPage() {
  const { t } = useTranslation();
  const { id = "" } = useParams<{ id: string }>();
  const [editOpen, setEditOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const activatorQuery = useActivator(id);
  const performanceQuery = useActivatorPerformance(id, { days: 30 });
  const paymentsQuery = usePayments({ activatorId: id, page: 1, limit: 10 });
  const updateActivator = useUpdateActivator();
  const toggleActivator = useToggleActivator();
  const resetPassword = useResetActivatorPassword();
  const recordPayment = useRecordPayment();
  const deletePayment = useDeletePayment();

  if (!activatorQuery.isLoading && activatorQuery.isError) {
    return (
      <NotFoundState
        title={t("admin.activators.detail.notFound.title")}
        body=""
        action={
          <Button asChild variant="outline">
            <Link to="/admin/activators">
              <ArrowLeft className="mr-2 h-4 w-4" />{" "}
              {t("admin.activators.detail.notFound.backLink")}
            </Link>
          </Button>
        }
      />
    );
  }

  const activator = activatorQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.activators.detail.profile.title")} />

      {activatorQuery.isLoading && <ProfileStatsSkeleton />}

      {!activatorQuery.isLoading && activator && (
        <>
          <ProfileCard
            activator={activator}
            onEdit={() => setEditOpen(true)}
            onToggle={() => setToggleConfirmOpen(true)}
            onResetPassword={() => setResetConfirmOpen(true)}
          />
          <StatsRevenueGrid activator={activator} />
          <TelegramLinkPanel role={UserRole.ACTIVATOR} profileId={activator.id} />
        </>
      )}

      {generatedPassword && <GeneratedPasswordPanel password={generatedPassword} />}

      <section className="flex flex-col gap-3">
        <PerformanceChart
          data={performanceQuery.data?.series}
          isLoading={performanceQuery.isLoading}
          isError={performanceQuery.isError}
          onRetry={performanceQuery.refetch}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {t("admin.activators.detail.payments.title")}
          </h2>
          <Button variant="outline" size="sm" onClick={() => setPaymentOpen(true)}>
            {t("common.actions.recordPayment")}
          </Button>
        </div>
        <PaymentsHistoryTable
          data={paymentsQuery.data?.items}
          isLoading={paymentsQuery.isLoading}
          isError={paymentsQuery.isError}
          onRetry={paymentsQuery.refetch}
          onDelete={(paymentId) => deletePayment.mutate(paymentId)}
          onAddFirst={() => setPaymentOpen(true)}
        />
      </section>

      <Button asChild variant="outline" className="self-start">
        <Link to={`/admin/activations?activator=${id}`}>
          {t("admin.activators.detail.viewAllActivations")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>

      <EditActivatorModal
        open={editOpen}
        onOpenChange={setEditOpen}
        activator={activator}
        onSubmit={(values) =>
          updateActivator.mutate({ id, command: values }, { onSuccess: () => setEditOpen(false) })
        }
        isPending={updateActivator.isPending}
      />
      <RecordPaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        onSubmit={(values) =>
          recordPayment.mutate(
            {
              activatorId: id,
              amount: values.amount,
              date: values.date ? new Date(values.date).toISOString() : undefined,
            },
            { onSuccess: () => setPaymentOpen(false) },
          )
        }
        isPending={recordPayment.isPending}
      />

      <AlertDialog open={toggleConfirmOpen} onOpenChange={setToggleConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                activator?.isEnabled
                  ? "admin.activators.toggleConfirm.disableTitle"
                  : "admin.activators.toggleConfirm.enableTitle",
              )}
            </AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                toggleActivator.mutate(id);
                setToggleConfirmOpen(false);
              }}
            >
              {t("common.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.activators.detail.resetPasswordConfirm.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.activators.detail.resetPasswordConfirm.body")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetPassword.mutate(id, {
                  onSuccess: (data) => setGeneratedPassword(data.generatedPassword),
                });
                setResetConfirmOpen(false);
              }}
            >
              {t("common.actions.resetPassword")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
