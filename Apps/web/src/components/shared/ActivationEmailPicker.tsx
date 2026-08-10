import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import { useActivationEmailPool } from "@/hooks/useActivationEmails";

interface Props {
  subscriptionPlanId: string;
  value: string;
  onChange: (email: string) => void;
  error?: string | undefined;
  id?: string;
}

// Set 10 (D13) — ONE component, used by both the activator's own Activate flow
// (ActiveRequestCard) and the admin's resolve-freeze flow (ResolveFreezeDialog, itself shared
// by two callers). Owns its own query (Component → Hook → Service, same self-contained
// arrangement every settings tab uses) — no useEffect fetching.
export function ActivationEmailPicker({ subscriptionPlanId, value, onChange, error, id }: Props) {
  const { t } = useTranslation();
  const poolQuery = useActivationEmailPool(subscriptionPlanId);
  const pool = poolQuery.data ?? [];
  const hasPool = pool.length > 0;

  // `null` = no manual toggle yet, so the mode tracks the query: "pool" once a non-empty pool
  // has loaded, "free" while loading, errored, or genuinely empty — the field must always be
  // usable, never blocked on the pool query. Once the user toggles, their choice wins for the
  // lifetime of this picker instance.
  const [manualMode, setManualMode] = useState<"pool" | "free" | null>(null);

  if (poolQuery.isLoading) {
    return <Skeleton className="h-9 w-full" />;
  }

  const effectiveMode = manualMode ?? (hasPool ? "pool" : "free");

  return (
    <div className="flex flex-col gap-1">
      {effectiveMode === "pool" ? (
        <>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger id={id} aria-invalid={!!error}>
              <SelectValue placeholder={t("common.activationEmailPicker.label")} />
            </SelectTrigger>
            <SelectContent>
              {pool.map((option) => (
                <SelectItem key={option.id} value={option.email}>
                  {option.email}{" "}
                  <span className="text-muted-foreground">
                    (
                    {option.nbOfActivation > 0
                      ? t("common.activationEmailPicker.usedCount", {
                          count: option.nbOfActivation,
                        })
                      : t("common.activationEmailPicker.neverUsed")}
                    )
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit"
            onClick={() => setManualMode("free")}
          >
            {t("common.activationEmailPicker.typeAnother")}
          </Button>
        </>
      ) : (
        <>
          <Input
            id={id}
            type="email"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t("activator.requests.card.activationEmailPlaceholder")}
            aria-invalid={!!error}
          />
          {poolQuery.isError ? (
            <p className="text-xs text-muted-foreground">
              {t("common.activationEmailPicker.loadError")}
            </p>
          ) : !hasPool ? (
            <p className="text-xs text-muted-foreground">
              {t("common.activationEmailPicker.empty")}
            </p>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => setManualMode("pool")}
            >
              {t("common.activationEmailPicker.fromPool")}
            </Button>
          )}
        </>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
