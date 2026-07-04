import { KeyRound, CreditCard, Package, Zap } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { useTranslation } from "@/hooks/useTranslation";
import type { DistributorDetailDTO } from "@my-app/contract";

interface Props {
  distributor: DistributorDetailDTO;
}

// Assumes valid data — see DistributorProfileCard's note on the shared profile+stats
// loading gate.
export function DistributorStatsGrid({ distributor }: Props) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard
        icon={<KeyRound className="h-5 w-5" />}
        label={t("admin.distributors.detail.stats.soldKeys")}
        value={String(distributor.soldKeys)}
      />
      <StatCard
        icon={<CreditCard className="h-5 w-5" />}
        label={t("admin.distributors.detail.stats.remainingCards")}
        value={String(distributor.nbOfActiveCards)}
      />
      <StatCard
        icon={<Package className="h-5 w-5" />}
        label={t("admin.distributors.detail.stats.orders")}
        value={String(distributor.ordersCount)}
      />
      <StatCard
        icon={<Zap className="h-5 w-5" />}
        label={t("admin.distributors.detail.stats.activationsOriginated")}
        value={String(distributor.nbOfActivation)}
      />
    </div>
  );
}
