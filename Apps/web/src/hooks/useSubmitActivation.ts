import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import * as keysService from "@/services/keys.service";
import { useTranslation } from "@/hooks/useTranslation";
import { subscribeActivation } from "@/lib/realtime";

export function useSubmitActivation() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: keysService.submitActivation,
    onSuccess: (data) => {
      toast.success(t("public.landing.form.submittedToast"));
      subscribeActivation(data.activationId);
    },
  });
}
