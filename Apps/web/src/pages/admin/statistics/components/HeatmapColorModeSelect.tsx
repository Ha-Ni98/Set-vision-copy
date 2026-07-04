import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import type { HeatmapColorMode } from "./heatmap-color-scale";

const COLOR_MODES: HeatmapColorMode[] = ["distributors", "activations", "cancellations", "avgTime"];

interface Props {
  value: HeatmapColorMode;
  onChange: (mode: HeatmapColorMode) => void;
}

export function HeatmapColorModeSelect({ value, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <Select value={value} onValueChange={(v) => onChange(v as HeatmapColorMode)}>
      <SelectTrigger className="w-44" aria-label={t("admin.statistics.colorMode.label")}>
        <SelectValue placeholder={t("admin.statistics.colorMode.label")} />
      </SelectTrigger>
      <SelectContent>
        {COLOR_MODES.map((mode) => (
          <SelectItem key={mode} value={mode}>
            {t(`admin.statistics.colorMode.${mode}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
