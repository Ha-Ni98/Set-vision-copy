import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { useActivation } from "@/components/providers/ActivationProvider";
import { unsubscribeActivation } from "@/lib/realtime";

// Spec: "Always visible at the bottom of the main section" (Sprint 3 made LandingPage mount
// it unconditionally, matching that literal wording). Clicking tears down the socket room for
// whatever activation is currently tracked (client-portal plan.md §D5 — "always" unsubscribe
// before reset, not just when one happens to be pending) before resetting the flow to Step 1.
export function CheckAnotherKeyButton() {
  const { t } = useTranslation();
  const { activation, reset } = useActivation();
  const handleClick = () => {
    if (activation?.activationId) unsubscribeActivation(activation.activationId);
    reset();
  };
  return (
    <Button variant="outline" onClick={handleClick}>
      <RotateCcw className="me-2 h-4 w-4" /> {t("public.landing.verify.checkAnother")}
    </Button>
  );
}
