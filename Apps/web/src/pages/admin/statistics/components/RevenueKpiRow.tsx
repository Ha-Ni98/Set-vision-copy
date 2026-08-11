import { TrendingUp, TrendingDown, Minus, Wallet, ArrowDownCircle, Scale } from "lucide-react";
import type { RevenueSummaryDTO } from "@my-app/contract";
import { StatCard } from "@/components/shared/StatCard";
import { StatCardSkeleton } from "@/components/shared/StatCardSkeleton";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDZD } from "@/lib/utils";

interface Props {
  data?: RevenueSummaryDTO;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

// `polarity` decides whether an increase is colored as good news: more cash in / net is good,
// but more cash out isn't inherently bad (could just mean more activity) — so cash out's trend
// only shows direction, never a green/red judgement.
function Trend({
  current,
  previous,
  polarity,
}: {
  current: number;
  previous: number;
  polarity: "good" | "neutral";
}) {
  const { t } = useTranslation();
  if (previous === 0) return null;
  const deltaPct = Math.round(((current - previous) / Math.abs(previous)) * 100);
  if (deltaPct === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        {t("admin.revenue.kpi.vsPrevious")}
      </span>
    );
  }
  const positive = deltaPct > 0;
  const colorClass =
    polarity === "neutral"
      ? "text-muted-foreground"
      : positive
        ? "text-success"
        : "text-destructive";
  return (
    <span className={`flex items-center gap-1 text-xs ${colorClass}`}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}
      {deltaPct}% {t("admin.revenue.kpi.vsPrevious")}
    </span>
  );
}

export function RevenueKpiRow({ data, isLoading, isError, onRetry }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <NotFoundState
        title={t("admin.dashboard.sectionError")}
        body={t("admin.dashboard.sectionErrorBody")}
        action={<Button onClick={onRetry}>{t("common.actions.tryAgain")}</Button>}
      />
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        icon={<Wallet className="h-5 w-5" />}
        label={t("admin.revenue.kpi.cashIn")}
        value={formatDZD(data.current.cashIn, language)}
        trend={
          <Trend current={data.current.cashIn} previous={data.previous.cashIn} polarity="good" />
        }
      />
      <StatCard
        icon={<ArrowDownCircle className="h-5 w-5" />}
        label={t("admin.revenue.kpi.cashOut")}
        value={formatDZD(data.current.cashOut, language)}
        trend={
          <Trend
            current={data.current.cashOut}
            previous={data.previous.cashOut}
            polarity="neutral"
          />
        }
      />
      <StatCard
        icon={<Scale className="h-5 w-5" />}
        label={t("admin.revenue.kpi.net")}
        value={formatDZD(data.current.net, language)}
        trend={<Trend current={data.current.net} previous={data.previous.net} polarity="good" />}
      />
    </div>
  );
}
