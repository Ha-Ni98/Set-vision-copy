import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";

// Shown over AccountForm's fieldsets while the activation is SUBMITTED or PROCESSING
// (pending-step2-ux-plan §2). No real elapsed time or percentage is claimed — the spinning
// ring and the looping bar are deliberately indeterminate ("work is happening"), not a fake
// countdown. Every animation is behind `motion-safe:` so a reduced-motion user gets a static
// ring and a static bar segment instead of a spinning/looping one.
export function PendingOverlay({ onReveal }: { onReveal: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-y-auto rounded-lg bg-card/85 p-6 text-center backdrop-blur-sm">
      <div className="relative flex h-16 w-16 items-center justify-center" aria-hidden="true">
        <span className="motion-safe:animate-spin absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary" />
        <Clock className="h-7 w-7 text-primary" />
      </div>

      <div role="status" aria-live="polite" className="space-y-1.5">
        <p dir="rtl" lang="ar" className="text-base font-semibold text-foreground">
          {t("public.landing.pending.titleDarija")}
        </p>
        <p dir="ltr" lang="fr" className="text-sm text-foreground">
          {t("public.landing.pending.titleFrench")}
        </p>
      </div>

      <div
        className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted"
        aria-hidden="true"
      >
        <div className="motion-safe:animate-indeterminate-bar h-full w-1/4 rounded-full bg-primary" />
      </div>

      <div role="status" aria-live="polite" className="space-y-1 text-xs text-muted-foreground">
        <p dir="rtl" lang="ar">
          {t("public.landing.pending.holdDarija")}
        </p>
        <p dir="ltr" lang="fr">
          {t("public.landing.pending.holdFrench")}
        </p>
        <div className="mx-auto my-2 h-px w-16 bg-border" />
        <p dir="rtl" lang="ar">
          {t("public.landing.pending.contactDarija")}
        </p>
        <p dir="ltr" lang="fr">
          {t("public.landing.pending.contactFrench")}
        </p>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={onReveal}>
        {t("public.landing.pending.showInfo")}
      </Button>
    </div>
  );
}

// The revealed-state companion — a compact status strip shown ABOVE the (still disabled)
// fields once the client has tapped "Show my information", so the pending signal never fully
// disappears (pending-step2-ux-plan §2.4).
export function PendingRevealedStrip({ onHide }: { onHide: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
      <Clock
        className="motion-safe:animate-pulse h-4 w-4 shrink-0 text-primary"
        aria-hidden="true"
      />
      <div role="status" aria-live="polite" className="flex-1 text-xs text-muted-foreground">
        <span dir="rtl" lang="ar">
          {t("public.landing.pending.titleDarija")}
        </span>
        {" · "}
        <span dir="ltr" lang="fr">
          {t("public.landing.pending.titleFrench")}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-auto p-1 text-xs"
        onClick={onHide}
      >
        {t("public.landing.pending.hideInfo")}
      </Button>
    </div>
  );
}
