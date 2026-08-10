import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, X, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDZD } from "@/lib/utils";
import {
  planCostCellSchema,
  type PlanCostCellFormValues,
  type PlanCostCellFormInput,
} from "./plan-cost-cell.schema";

interface Props {
  cost: number | null;
  onSubmit: (values: PlanCostCellFormValues) => void;
  isSaving?: boolean;
  /** True right after a save attempt failed — the cell flags red until re-edited. */
  hasError?: boolean;
}

// Inline click-to-edit cell — copy-adapted from CommissionCell.tsx (Set 9 plan §5.2): same
// exit-on-submit behavior, same collapsed-view error styling instead of a visual revert.
export function PlanCostCell({ cost, onSubmit, isSaving, hasError }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PlanCostCellFormInput, unknown, PlanCostCellFormValues>({
    resolver: zodResolver(planCostCellSchema(t)),
    defaultValues: { cost: cost ?? 0 },
  });

  const submit = handleSubmit((values) => {
    onSubmit(values);
    setIsEditing(false);
  });

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => {
          reset({ cost: cost ?? 0 });
          setIsEditing(true);
        }}
        title={hasError ? t("admin.settings.planCosts.saveError") : undefined}
        className={cn(
          "group flex items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-accent",
          hasError && "text-destructive",
        )}
      >
        {cost != null ? formatDZD(cost, language) : "—"}
        <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60" />
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-1">
      <Input
        type="number"
        min={0}
        step={0.01}
        className="h-8 w-24"
        autoFocus
        {...register("cost")}
      />
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        disabled={isSaving}
        aria-label={t("common.actions.save")}
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        aria-label={t("common.actions.cancel")}
        onClick={() => setIsEditing(false)}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      {errors.cost && <p className="text-xs text-destructive">{errors.cost.message}</p>}
    </form>
  );
}
