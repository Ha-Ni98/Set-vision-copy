import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import * as keysService from "@/services/keys.service";
import { useTranslation } from "@/hooks/useTranslation";

export function useSubmitActivation() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: keysService.submitActivation,
    onSuccess: () => toast.success(t("public.landing.form.submittedToast")),
  });
}
