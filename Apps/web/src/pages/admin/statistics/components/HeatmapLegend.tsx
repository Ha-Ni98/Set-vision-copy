import { useTranslation } from "@/hooks/useTranslation";
import { purpleShade } from "./heatmap-color-scale";

const STEPS = 6;

export function HeatmapLegend() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{t("admin.statistics.heatmap.legend.min")}</span>
      <div className="flex overflow-hidden rounded-full">
        {Array.from({ length: STEPS }, (_, i) => (
          <div
            key={i}
            className="h-3 w-5"
            style={{ backgroundColor: purpleShade(i / (STEPS - 1)) }}
          />
        ))}
      </div>
      <span>{t("admin.statistics.heatmap.legend.max")}</span>
    </div>
  );
}
