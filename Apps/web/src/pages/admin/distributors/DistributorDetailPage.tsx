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
import type { DistributorDetailDTO } from "@my-app/contract";
import { DistributorProfileCard } from "./components/DistributorProfileCard";
import { DistributorStatsGrid } from "./components/DistributorStatsGrid";
import { OrdersHistoryCompact } from "./components/OrdersHistoryCompact";
import { CardsHistoryCompact } from "./components/CardsHistoryCompact";

// Placeholder shape only, for this sprint's static "what does success look like" render —
// Sprint 4 replaces this with useDistributor(id)'s real data.
const PLACEHOLDER_DISTRIBUTOR: DistributorDetailDTO = {
  id: "placeholder",
  fullName: "Sample Distributor",
  storeName: "Sample Store",
  phone: "0555987654",
  wilayaId: "placeholder-wilaya",
  wilayaName: "Alger",
  communeId: "placeholder-commune",
  communeName: "Bab Ezzouar",
  isEnabled: true,
  nbOfActiveCards: 42,
  nbOfActivation: 310,
  deliveredOrdersCount: 12,
  createdAt: new Date().toISOString(),
  soldKeys: 268,
  ordersCount: 14,
};

// Static composition — no data hooks yet (wired in Sprint 4, plan.md §D5). Profile+stats
// share one loading/error/not-found gate (same useDistributor(id) query); orders and cards
// each have their own. This demo exercises profile+stats=success, orders=empty, cards=error.
function ProfileStatsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-3 h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function DistributorDetailPage() {
  const { t } = useTranslation();
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [editWilayaId, setEditWilayaId] = useState(PLACEHOLDER_DISTRIBUTOR.wilayaId);

  const profileStatsState = "success" as "success" | "loading" | "error" | "notFound";

  if (profileStatsState === "notFound") {
    return (
      <NotFoundState
        title={t("admin.distributors.detail.notFound.title")}
        body=""
        action={
          <Button asChild variant="outline">
            <Link to="/admin/distributors">
              <ArrowLeft className="mr-2 h-4 w-4" />{" "}
              {t("admin.distributors.detail.notFound.backLink")}
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.distributors.detail.profile.title")} />

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
          <DistributorProfileCard
            distributor={PLACEHOLDER_DISTRIBUTOR}
            onToggle={() => setToggleConfirmOpen(true)}
            onSave={() => {}}
            wilayasLoading={false}
            wilayasError={false}
            communesLoading={false}
            communesError={false}
            editWilayaId={editWilayaId}
            onEditWilayaChange={setEditWilayaId}
          />
          <DistributorStatsGrid distributor={PLACEHOLDER_DISTRIBUTOR} />
        </>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {t("admin.distributors.detail.orders.title")}
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link to={`/admin/distributors/orders?distributor=${PLACEHOLDER_DISTRIBUTOR.id}`}>
              {t("admin.distributors.detail.orders.viewAll")}
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <OrdersHistoryCompact data={[]} isLoading={false} isError={false} onRetry={() => {}} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {t("admin.distributors.detail.cards.title")}
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link to={`/admin/activations/cards?distributor=${PLACEHOLDER_DISTRIBUTOR.id}`}>
              {t("admin.distributors.detail.cards.viewAll")}
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <CardsHistoryCompact isLoading={false} isError onRetry={() => {}} />
      </section>

      <AlertDialog open={toggleConfirmOpen} onOpenChange={setToggleConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.distributors.toggleConfirm.disableTitle")}
            </AlertDialogTitle>
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
    </div>
  );
}
