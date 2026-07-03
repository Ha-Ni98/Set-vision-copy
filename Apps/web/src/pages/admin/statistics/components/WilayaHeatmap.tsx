import { useMemo, useState } from "react";
import type { WilayaHeatmapDTO } from "@my-app/contract";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { WILAYA_GEOMETRY, HEATMAP_VIEWBOX } from "./wilaya-geometry";
import { resolveLibWilayaName } from "./wilaya-name-map";
import { purpleShade, type HeatmapColorMode } from "./heatmap-color-scale";

// WilayaHeatmapDTO is itself the array type (contract's response schema is a bare
// z.array(...)) — this is the shape of one entry.
export type WilayaHeatmapEntry = WilayaHeatmapDTO[number];

type MetricKey =
  "distributorsCount" | "activationsCount" | "cancellationsCount" | "avgActivationTimeSeconds";

const METRIC_KEY: Record<HeatmapColorMode, MetricKey> = {
  distributors: "distributorsCount",
  activations: "activationsCount",
  cancellations: "cancellationsCount",
  avgTime: "avgActivationTimeSeconds",
};

interface Props {
  data?: WilayaHeatmapDTO;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  colorMode: HeatmapColorMode;
  onWilayaSelect: (wilaya: WilayaHeatmapEntry) => void;
  selectedWilayaId?: string;
}

export function WilayaHeatmap({
  data,
  isLoading,
  isError,
  onRetry,
  colorMode,
  onWilayaSelect,
  selectedWilayaId,
}: Props) {
  const { t } = useTranslation();
  const [hoveredLibName, setHoveredLibName] = useState<string | null>(null);

  const byLibName = useMemo(() => {
    const map = new Map<string, WilayaHeatmapEntry>();
    (data ?? []).forEach((entry) => {
      const libName = resolveLibWilayaName(entry.wilayaName);
      if (libName) map.set(libName, entry);
    });
    return map;
  }, [data]);

  const { min, max } = useMemo(() => {
    const key = METRIC_KEY[colorMode];
    const values = (data ?? [])
      .map((d) => d[key])
      .filter((v): v is number => typeof v === "number");
    if (values.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [data, colorMode]);

  const fillFor = (libName: string): string => {
    if (isLoading) return "oklch(var(--muted))";
    const entry = byLibName.get(libName);
    const value = entry?.[METRIC_KEY[colorMode]];
    if (value == null || max === min) return purpleShade(0);
    return purpleShade((value - min) / (max - min));
  };

  if (isError) {
    return (
      <NotFoundState
        title={t("admin.statistics.heatmap.loadError")}
        body=""
        action={<Button onClick={onRetry}>{t("common.actions.tryAgain")}</Button>}
      />
    );
  }

  const hovered = hoveredLibName ? byLibName.get(hoveredLibName) : undefined;

  return (
    <div className="relative">
      <svg
        viewBox={HEATMAP_VIEWBOX}
        role="img"
        aria-label={t("admin.statistics.heatmap.title")}
        className="h-auto w-full"
      >
        {WILAYA_GEOMETRY.map((w) => {
          const entry = byLibName.get(w.name);
          const isSelected = !!entry && entry.wilayaId === selectedWilayaId;
          const Shape = w.tag;
          return (
            <g
              key={w.name}
              onMouseEnter={() => setHoveredLibName(w.name)}
              onMouseLeave={() => setHoveredLibName((h) => (h === w.name ? null : h))}
              onClick={() => entry && onWilayaSelect(entry)}
              className={entry ? "cursor-pointer" : "cursor-default"}
            >
              <Shape
                {...(w.tag === "polygon" ? { points: w.coords } : { d: w.coords })}
                fill={isError ? "transparent" : fillFor(w.name)}
                stroke={isSelected ? "oklch(var(--primary))" : "oklch(var(--border))"}
                strokeWidth={isSelected ? 1.5 : 0.75}
                strokeLinecap="round"
                className="transition-colors duration-300"
              />
            </g>
          );
        })}
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute left-2 top-2 min-w-48 rounded-lg border border-border bg-popover p-3 text-xs text-popover-foreground shadow-lg">
          <p className="mb-1 font-semibold">{hovered.wilayaName}</p>
          {hovered.distributorsCount === 0 &&
          hovered.activationsCount === 0 &&
          hovered.cancellationsCount === 0 ? (
            <p className="text-muted-foreground">{t("admin.statistics.heatmap.noData")}</p>
          ) : (
            <dl className="space-y-0.5">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  {t("admin.statistics.colorMode.distributors")}
                </dt>
                <dd>{hovered.distributorsCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  {t("admin.statistics.colorMode.activations")}
                </dt>
                <dd>{hovered.activationsCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  {t("admin.statistics.colorMode.cancellations")}
                </dt>
                <dd>{hovered.cancellationsCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("admin.statistics.colorMode.avgTime")}</dt>
                <dd>{hovered.avgActivationTimeSeconds ?? "—"}</dd>
              </div>
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
