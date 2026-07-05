import { useState } from "react";
import { Link, useParams } from "react-router-dom";
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
import {
  useDistributor,
  useUpdateDistributor,
  useToggleDistributor,
} from "@/hooks/useDistributors";
import { useOrders } from "@/hooks/useOrders";
import { useCards } from "@/hooks/useCards";
import { useWilayas, useCommunes } from "@/hooks/useGeography";
import { DistributorProfileCard } from "./components/DistributorProfileCard";
import { DistributorStatsGrid } from "./components/DistributorStatsGrid";
import { OrdersHistoryCompact } from "./components/OrdersHistoryCompact";
import { CardsHistoryCompact } from "./components/CardsHistoryCompact";

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
  const { id = "" } = useParams<{ id: string }>();
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [editWilayaId, setEditWilayaId] = useState("");

  const distributorQuery = useDistributor(id);
  const ordersQuery = useOrders({ distributorId: id, limit: 5 });
  const cardsQuery = useCards({ distributorId: id, limit: 5 });
  const wilayasQuery = useWilayas();
  const communesQuery = useCommunes(editWilayaId);
  const updateDistributor = useUpdateDistributor();
  const toggleDistributor = useToggleDistributor();

  if (!distributorQuery.isLoading && distributorQuery.isError) {
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

  const distributor = distributorQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.distributors.detail.profile.title")} />

      {distributorQuery.isLoading && <ProfileStatsSkeleton />}

      {!distributorQuery.isLoading && distributor && (
        <>
          <DistributorProfileCard
            distributor={distributor}
            onToggle={() => setToggleConfirmOpen(true)}
            onSave={(values) => updateDistributor.mutate({ id, command: values })}
            isPending={updateDistributor.isPending}
            wilayas={wilayasQuery.data}
            wilayasLoading={wilayasQuery.isLoading}
            wilayasError={wilayasQuery.isError}
            communes={communesQuery.data}
            communesLoading={communesQuery.isLoading}
            communesError={communesQuery.isError}
            editWilayaId={editWilayaId}
            onEditWilayaChange={setEditWilayaId}
          />
          <DistributorStatsGrid distributor={distributor} />
        </>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {t("admin.distributors.detail.orders.title")}
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link to={`/admin/distributors/orders?distributor=${id}`}>
              {t("admin.distributors.detail.orders.viewAll")}
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <OrdersHistoryCompact
          data={ordersQuery.data?.items}
          isLoading={ordersQuery.isLoading}
          isError={ordersQuery.isError}
          onRetry={ordersQuery.refetch}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {t("admin.distributors.detail.cards.title")}
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link to={`/admin/activations/cards?distributor=${id}`}>
              {t("admin.distributors.detail.cards.viewAll")}
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <CardsHistoryCompact
          data={cardsQuery.data?.items}
          isLoading={cardsQuery.isLoading}
          isError={cardsQuery.isError}
          onRetry={cardsQuery.refetch}
        />
      </section>

      <AlertDialog open={toggleConfirmOpen} onOpenChange={setToggleConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                distributor?.isEnabled
                  ? "admin.distributors.toggleConfirm.disableTitle"
                  : "admin.distributors.toggleConfirm.enableTitle",
              )}
            </AlertDialogTitle>
            <AlertDialogDescription />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                toggleDistributor.mutate(id);
                setToggleConfirmOpen(false);
              }}
            >
              {t("common.actions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
