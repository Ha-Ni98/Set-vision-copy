import { Zap, Clock, Wallet, HandCoins, Coins, Percent } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { formatDZD } from "@/lib/utils";
import { formatDuration } from "@/lib/duration";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { ActivatorDetailDTO } from "@my-app/contract";

interface Props {
  activator: ActivatorDetailDTO;
}

// Assumes valid data — see ProfileCard's note on the shared profile+stats loading gate.
export function StatsRevenueGrid({ activator }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard
        icon={<Zap className="h-5 w-5" />}
        label={t("admin.activators.detail.stats.totalActivations")}
        value={String(activator.nbOfActivation)}
      />
      <StatCard
        icon={<Clock className="h-5 w-5" />}
        label={t("admin.activators.detail.stats.avgTime")}
        value={formatDuration(activator.avgActivationTimeSeconds)}
      />
      <StatCard
        icon={<Wallet className="h-5 w-5" />}
        label={t("admin.activators.detail.stats.earned")}
        value={formatDZD(activator.totalEarning, language)}
      />
      <StatCard
        icon={<HandCoins className="h-5 w-5" />}
        label={t("admin.activators.detail.stats.paid")}
        value={formatDZD(activator.totalPaid, language)}
      />
      <StatCard
        icon={<Coins className="h-5 w-5" />}
        label={t("admin.activators.detail.stats.creditsOwed")}
        value={formatDZD(activator.creditsOwed, language)}
      />
      <StatCard
        icon={<Percent className="h-5 w-5" />}
        label={t("admin.activators.detail.stats.successRate")}
        value={`${Math.round(activator.successRate * 100)}%`}
      />
    </div>
  );
}
