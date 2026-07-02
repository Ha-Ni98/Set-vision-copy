import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
import type { ActivatorDetailDTO } from "@my-app/contract";
import { ProfileCard } from "./components/ProfileCard";
import { StatsRevenueGrid } from "./components/StatsRevenueGrid";
import { PerformanceChart } from "./components/PerformanceChart";
import { PaymentsHistoryTable } from "./components/PaymentsHistoryTable";
import { EditActivatorModal } from "./components/EditActivatorModal";
import { RecordPaymentModal } from "./components/RecordPaymentModal";
import { GeneratedPasswordPanel } from "./components/GeneratedPasswordPanel";

// Placeholder shape only, for this sprint's static "what does success look like" render —
// Sprint 5 replaces this with useActivator(id)'s real data.
const PLACEHOLDER_ACTIVATOR: ActivatorDetailDTO = {
  id: "placeholder",
  userId: "placeholder",
  fullName: "Sample Activator",
  username: "sample_activator",
  phone: "0555123456",
  isEnabled: true,
  totalEarning: 45000,
  credits: 12000,
  nbOfActivation: 128,
  nbOfSuccessfulActivation: 120,
  avgActivationTimeSeconds: 240,
  lastLoginAt: null,
  createdAt: new Date().toISOString(),
  totalPaid: 33000,
  creditsOwed: 12000,
  successRate: 0.9375,
};

// Static composition — no data hooks yet (wired in Sprint 5, plan.md §D3). Three
// independently-gated regions per the plan: profile+stats share one loading/error/not-found
// state (same useActivator(id) query), chart and payments each have their own. This demo
// exercises profile+stats=success, chart=empty, payments=error in one static render.
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
  const [editOpen, setEditOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const profileStatsState = "success" as "success" | "loading" | "error" | "notFound";

  if (profileStatsState === "notFound") {
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.activators.detail.profile.title")} />

      {profileStatsState === "loading" && <ProfileStatsSkeleton />}

      {profileStatsState === "error" && (
        <NotFoundState
          title={t("admin.dashboard.sectionError")}
          body={t("admin.dashboard.sectionErrorBody")}
          action={<Button onClick={() => {}}>{t("common.actions.tryAgain")}</Button>}
        />
      )}

      {profileStatsState === "success" && (
        <>
          <ProfileCard
            activator={PLACEHOLDER_ACTIVATOR}
            onEdit={() => setEditOpen(true)}
            onToggle={() => setToggleConfirmOpen(true)}
            onResetPassword={() => setResetConfirmOpen(true)}
          />
          <StatsRevenueGrid activator={PLACEHOLDER_ACTIVATOR} />
        </>
      )}

      {generatedPassword && <GeneratedPasswordPanel password={generatedPassword} />}

      <section className="flex flex-col gap-3">
        <PerformanceChart isLoading={false} isError={false} data={[]} onRetry={() => {}} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t("admin.activators.detail.payments.title")}
        </h2>
        <PaymentsHistoryTable isLoading={false} isError onRetry={() => {}} onDelete={() => {}} />
      </section>

      <Button asChild variant="outline" className="self-start">
        <Link to="/admin/activations">
          {t("admin.activators.detail.viewAllActivations")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>

      <EditActivatorModal
        open={editOpen}
        onOpenChange={setEditOpen}
        activator={PLACEHOLDER_ACTIVATOR}
        onSubmit={() => setEditOpen(false)}
      />
      <RecordPaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        onSubmit={() => setPaymentOpen(false)}
      />

      <AlertDialog open={toggleConfirmOpen} onOpenChange={setToggleConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.activators.toggleConfirm.disableTitle")}</AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => setToggleConfirmOpen(false)}>
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
                setGeneratedPassword("Temp1234!");
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
