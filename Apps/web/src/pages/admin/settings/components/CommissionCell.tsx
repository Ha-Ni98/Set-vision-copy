import { useState } from "react";
import { Check, X, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDZD } from "@/lib/utils";

interface Props {
  commission: number | null;
  /** Called on save — RHF + Zod (commission-cell.schema.ts) + useUpdateCommission wire this
   * in Sprint 5. Editing/revert-on-error is real local UI state, built now. */
  onSubmit: () => void;
  isSaving?: boolean;
  /** True right after a save attempt failed — the cell flags red until re-edited (plan §D4 Tab 2). */
  hasError?: boolean;
}

// Inline click-to-edit cell — "editing" is genuine local UI behavior (not data wiring), same
// class as the wilaya→commune dependency precedent from Part 1/2.
export function CommissionCell({ commission, onSubmit, isSaving, hasError }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
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
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min={0}
        step={0.01}
        defaultValue={commission ?? 0}
        className="h-8 w-24"
        autoFocus
      />
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        disabled={isSaving}
        aria-label={t("common.actions.save")}
        onClick={() => {
          onSubmit();
          setIsEditing(false);
        }}
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        aria-label={t("common.actions.cancel")}
        onClick={() => setIsEditing(false)}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
