import { Link } from "react-router-dom";
import { CardStat } from "@my-app/contract";
import { Store, Package, Zap, CheckCircle2, AlertTriangle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatCardSkeleton } from "@/components/shared/StatCardSkeleton";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { EmptyState } from "@/components/shared/EmptyState";
import { CardsByStatusGrid } from "./components/CardsByStatusGrid";
import { useTranslation } from "@/hooks/useTranslation";
import { useDistributorDashboard } from "@/hooks/useDistributorDashboard";
import { countOf } from "@/lib/utils";

export default function PortalPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useDistributorDashboard();
  const isEmpty = data && data.totalCards === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("distributor.dashboard.title")}
        subtitle={t("distributor.dashboard.subtitle")}
      />

      {isError ? (
        <NotFoundState
          icon={<AlertTriangle className="h-8 w-8" />}
          title={t("common.errors.crashTitle")}
          body={t("common.errors.crashBody")}
          action={<Button onClick={() => refetch()}>{t("common.actions.tryAgain")}</Button>}
        />
      ) : isLoading || !data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 7 }, (_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<CreditCard className="h-5 w-5" />}
              label={t("distributor.dashboard.totalCards")}
              value={data.totalCards.toString()}
            />
            <StatCard
              icon={<Store className="h-5 w-5" />}
              label={t("distributor.dashboard.atDistributor")}
              value={countOf(data.cardsByStat, CardStat.AT_DISTRIBUTOR).toString()}
            />
            <StatCard
              icon={<Zap className="h-5 w-5" />}
              label={t("distributor.dashboard.inActivation")}
              value={countOf(data.cardsByStat, CardStat.ACTIVATION_PROGRESS).toString()}
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label={t("distributor.dashboard.activated")}
              value={countOf(data.cardsByStat, CardStat.ACTIVATED).toString()}
            />
          </div>

          {isEmpty ? (
            <EmptyState
              icon={<Package className="h-6 w-6" />}
              title={t("distributor.dashboard.emptyTitle")}
              body={t("distributor.dashboard.emptyBody")}
              decoration={
                <Button asChild variant="outline" className="mt-2">
                  <Link to="/portal/requests">{t("distributor.dashboard.goToRequests")}</Link>
                </Button>
              }
            />
          ) : (
            <CardsByStatusGrid data={data} />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              icon={<Store className="h-5 w-5" />}
              label={t("distributor.dashboard.disabled")}
              value={data.disabledCards.toString()}
            />
            <StatCard
              icon={<Store className="h-5 w-5" />}
              label={t("distributor.dashboard.revoked")}
              value={data.revokedCards.toString()}
            />
          </div>
        </>
      )}
    </div>
  );
}
