import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

// Presentational only — debouncing the value before it becomes a query param is Sprint 5's
// wiring concern (plan.md §B8), not this primitive's.
export function ActivatorSearch({ value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <div className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("admin.activators.search.placeholder")}
        className="pl-9"
      />
    </div>
  );
}
