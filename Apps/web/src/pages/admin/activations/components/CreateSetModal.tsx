import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { CARD_KEY_PATTERN, MAX_KEYS_PER_SET, type CreateSetCommand } from "@my-app/contract";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionPlans";
import { generateCardKey } from "@/lib/card-key";
import { createSetSchema } from "./create-set.schema";

const DEFAULT_COUNT = 100;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (command: CreateSetCommand) => void;
  isPending?: boolean;
  /** The create mutation's error — a 409 carries `error.details.takenKeys` to highlight. */
  createError?: unknown;
}

// A create conflict (409) returns the already-existing keys in error.details so the modal can
// highlight exactly which rows to fix (Stage-04-fix).
function extractTakenKeys(error: unknown): string[] {
  if (axios.isAxiosError(error)) {
    const details = (error.response?.data as { error?: { details?: { takenKeys?: unknown } } })
      ?.error?.details;
    if (details && Array.isArray(details.takenKeys)) {
      return details.takenKeys.filter((k): k is string => typeof k === "string");
    }
  }
  return [];
}

// Self-contained (calls its own useSubscriptionPlans) — the page passes no data props, only
// the submit handler and the create error. Keys are generated client-side (crypto), shown in
// an editable list, and re-validated server-side on submit.
export function CreateSetModal({ open, onOpenChange, onSubmit, isPending, createError }: Props) {
  const { t } = useTranslation();
  const plansQuery = useSubscriptionPlans({ active: true });

  const [planId, setPlanId] = useState("");
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [keys, setKeys] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPlanId("");
      setCount(DEFAULT_COUNT);
      setKeys([]);
      setFormError(null);
    }
  }, [open]);

  const takenKeys = useMemo(() => new Set(extractTakenKeys(createError)), [createError]);

  // Indices that duplicate an earlier key in the list — flagged live so the admin can fix
  // them before submitting (the schema would reject the whole set otherwise).
  const duplicateIndices = useMemo(() => {
    const seen = new Map<string, number>();
    const dupes = new Set<number>();
    keys.forEach((k, i) => {
      const prev = seen.get(k);
      if (prev !== undefined) {
        dupes.add(i);
        dupes.add(prev);
      } else {
        seen.set(k, i);
      }
    });
    return dupes;
  }, [keys]);

  const generate = () => {
    const n = Math.min(Math.max(1, Math.floor(count) || 0), MAX_KEYS_PER_SET);
    setKeys(Array.from({ length: n }, generateCardKey));
    setFormError(null);
  };

  const setKeyAt = (i: number, value: string) =>
    setKeys((prev) => prev.map((k, idx) => (idx === i ? value.toUpperCase() : k)));
  const regenerateAt = (i: number) => setKeyAt(i, generateCardKey());
  const removeAt = (i: number) => setKeys((prev) => prev.filter((_, idx) => idx !== i));
  const addKey = () => setKeys((prev) => [...prev, generateCardKey()]);

  const submit = () => {
    const parsed = createSetSchema(t).safeParse({ subscriptionPlanId: planId, keys });
    if (!parsed.success) {
      // Surface the first top-level issue (plan required / no keys / cap / duplicates);
      // per-row format errors already render inline below.
      setFormError(parsed.error.issues[0]?.message ?? null);
      return;
    }
    setFormError(null);
    onSubmit(parsed.data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("admin.setsLots.sets.create.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label>{t("admin.setsLots.sets.create.plan")}</Label>
            <Select
              value={planId}
              onValueChange={setPlanId}
              disabled={plansQuery.isLoading || plansQuery.isError}
            >
              <SelectTrigger>
                {plansQuery.isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <SelectValue placeholder={t("admin.setsLots.sets.create.planPlaceholder")} />
                )}
              </SelectTrigger>
              <SelectContent>
                {(plansQuery.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-set-count">{t("admin.setsLots.sets.create.numberOfKeys")}</Label>
            <div className="flex gap-2">
              <Input
                id="create-set-count"
                type="number"
                min={1}
                max={MAX_KEYS_PER_SET}
                step={1}
                value={count}
                onChange={(e) => setCount(e.target.valueAsNumber || 0)}
                className="w-32"
              />
              <Button type="button" variant="outline" onClick={generate}>
                {t("admin.setsLots.sets.create.generate")}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("admin.setsLots.sets.create.keysTitle", { count: keys.length })}</Label>
              {keys.length > 0 && (
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={addKey}>
                    <Plus className="me-1 h-3.5 w-3.5" /> {t("admin.setsLots.sets.create.addKey")}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={generate}>
                    <RefreshCw className="me-1 h-3.5 w-3.5" />{" "}
                    {t("admin.setsLots.sets.create.regenerateAll")}
                  </Button>
                </div>
              )}
            </div>

            {keys.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                {t("admin.setsLots.sets.create.keysEmpty")}
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {t("admin.setsLots.sets.create.keysHint")}
                </p>
                <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
                  {keys.map((k, i) => {
                    const taken = takenKeys.has(k);
                    const dup = duplicateIndices.has(i);
                    const badFormat = !CARD_KEY_PATTERN.test(k);
                    const invalid = taken || dup || badFormat;
                    const message = badFormat
                      ? t("admin.setsLots.sets.create.invalidKey")
                      : dup
                        ? t("admin.setsLots.sets.create.duplicateKey")
                        : taken
                          ? t("admin.setsLots.sets.create.takenKey")
                          : null;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Input
                            value={k}
                            onChange={(e) => setKeyAt(i, e.target.value)}
                            className={cn("font-mono text-sm", invalid && "border-destructive")}
                            aria-invalid={invalid}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => regenerateAt(i)}
                            aria-label={t("admin.setsLots.sets.create.regenerateOne")}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive"
                            onClick={() => removeAt(i)}
                            aria-label={t("admin.setsLots.sets.create.removeKey")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {message && <p className="ps-1 text-xs text-destructive">{message}</p>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.actions.cancel")}
          </Button>
          <Button type="button" onClick={submit} disabled={isPending}>
            {t("common.actions.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
