import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import type { WilayaDTO, CommuneDTO } from "@my-app/contract";

// Radix Select reserves "" for "no selection" internally, so "all wilayas/communes" is
// represented by this sentinel and translated back to "" for the caller.
const ALL = "__all__";

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  wilayaId: string;
  onWilayaChange: (id: string) => void;
  communeId: string;
  onCommuneChange: (id: string) => void;
  wilayas?: WilayaDTO[];
  wilayasLoading: boolean;
  wilayasError: boolean;
  communes?: CommuneDTO[];
  communesLoading: boolean;
  communesError: boolean;
}

export function DistributorsFilters({
  search,
  onSearchChange,
  wilayaId,
  onWilayaChange,
  communeId,
  onCommuneChange,
  wilayas,
  wilayasLoading,
  wilayasError,
  communes,
  communesLoading,
  communesError,
}: Props) {
  const { t } = useTranslation();
  const communeDisabled = !wilayaId || communesLoading || communesError;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("admin.distributors.search.placeholder")}
          className="pl-9"
        />
      </div>

      <Select
        value={wilayaId || ALL}
        onValueChange={(v) => {
          onWilayaChange(v === ALL ? "" : v);
          onCommuneChange(""); // wilaya changed — commune selection no longer valid
        }}
        disabled={wilayasLoading || wilayasError}
      >
        <SelectTrigger className="w-48">
          {wilayasLoading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </span>
          ) : (
            <SelectValue placeholder={t("admin.distributors.filters.wilayaPlaceholder")} />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.distributors.filters.wilayaPlaceholder")}</SelectItem>
          {(wilayas ?? []).map((w) => (
            <SelectItem key={w.id} value={w.id}>
              {w.frName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={communeId || ALL}
        onValueChange={(v) => onCommuneChange(v === ALL ? "" : v)}
        disabled={communeDisabled}
      >
        <SelectTrigger className="w-48">
          {communesLoading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </span>
          ) : (
            <SelectValue
              placeholder={
                !wilayaId
                  ? t("admin.distributors.communeNeedsWilaya")
                  : communesError
                    ? t("admin.distributors.selectLoadError")
                    : t("admin.distributors.filters.communePlaceholder")
              }
            />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("admin.distributors.filters.communePlaceholder")}</SelectItem>
          {(communes ?? []).map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.frName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
