import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UpdateActivationCommand } from "@my-app/contract";
import * as keysService from "@/services/keys.service";
import { useTranslation } from "@/hooks/useTranslation";
import { qk } from "@/lib/query-keys";

export function useUpdateActivation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({
      activationId,
      command,
    }: {
      activationId: string;
      command: UpdateActivationCommand;
    }) => keysService.updateActivation(activationId, command),
    onSuccess: (_data, { activationId }) => {
      toast.success(t("public.landing.form.updatedToast"));
      queryClient.invalidateQueries({ queryKey: qk.keys.status(activationId) });
    },
  });
}
