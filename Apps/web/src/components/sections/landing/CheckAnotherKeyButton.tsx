import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { useActivation } from "@/components/providers/ActivationProvider";

// Spec: "Always visible at the bottom of the main section." This component itself has no
// visibility logic — Sprint 3 decides when LandingPage mounts it (today's LandingPage hides
// its old equivalent at Step 1; whether to literally always-mount per the spec's wording is
// a call for that sprint, once the real dispatch replaces the old view model). Clicking
// resets the flow to Step 1; the socket teardown (`unsubscribeActivation`) is layered on by
// Sprint 4's realtime wiring, not this component's own concern.
export function CheckAnotherKeyButton() {
  const { t } = useTranslation();
  const { reset } = useActivation();
  return (
    <Button variant="outline" onClick={reset}>
      <RotateCcw className="me-2 h-4 w-4" /> {t("public.landing.verify.checkAnother")}
    </Button>
  );
}
