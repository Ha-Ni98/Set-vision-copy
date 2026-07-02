import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UpdateActivationCommand } from "@my-app/contract";
import * as keysService from "@/services/keys.service";
import { useTranslation } from "@/hooks/useTranslation";

export function useUpdateActivation() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ activationId, command }: { activationId: string; command: UpdateActivationCommand }) =>
      keysService.updateActivation(activationId, command),
    onSuccess: () => toast.success(t("public.landing.form.updatedToast")),
  });
}
