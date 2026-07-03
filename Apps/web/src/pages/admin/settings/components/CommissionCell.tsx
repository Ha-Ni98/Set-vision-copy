import { useEffect, useRef, useState } from "react";
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
  commissionCellSchema,
  type CommissionCellFormValues,
  type CommissionCellFormInput,
} from "./commission-cell.schema";

interface Props {
  commission: number | null;
  onSubmit: (values: CommissionCellFormValues) => void;
  isSaving?: boolean;
  /** True right after a save attempt failed — the cell flags red until re-edited (plan §D4 Tab 2). */
  hasError?: boolean;
}

// Inline click-to-edit cell — "editing" is genuine local UI behavior (not data wiring), same
// class as the wilaya→commune dependency precedent from Part 1/2. Exits edit mode as soon as
// the save settles either way (isSaving true→false); on failure the collapsed view reverts to
// the last known-good `commission` value and flags red (plan §D4 Tab 2's revert-on-error).
export function CommissionCell({ commission, onSubmit, isSaving, hasError }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const wasSaving = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommissionCellFormInput, unknown, CommissionCellFormValues>({
    resolver: zodResolver(commissionCellSchema(t)),
    defaultValues: { commission: commission ?? 0 },
  });

  useEffect(() => {
    if (wasSaving.current && !isSaving) {
      setIsEditing(false);
    }
    wasSaving.current = isSaving ?? false;
  }, [isSaving]);

  const submit = handleSubmit((values) => onSubmit(values));

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => {
          reset({ commission: commission ?? 0 });
          setIsEditing(true);
        }}
        title={hasError ? t("admin.settings.commission.saveError") : undefined}
        className={cn(
          "group flex items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-accent",
          hasError && "text-destructive",
        )}
      >
        {commission != null ? formatDZD(commission, language) : "—"}
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
        {...register("commission")}
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
      {errors.commission && <p className="text-xs text-destructive">{errors.commission.message}</p>}
    </form>
  );
}
