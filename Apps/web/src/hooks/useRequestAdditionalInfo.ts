import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RequestAdditionalInfoCommand } from "@my-app/contract";
import * as activationsService from "@/services/activations.service";
import { useTranslation } from "@/hooks/useTranslation";

export function useRequestAdditionalInfo() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, command }: { id: string; command: RequestAdditionalInfoCommand }) =>
      activationsService.requestAdditionalInfo(id, command),
    onSuccess: () => {
      toast.success(t("activator.requests.card.otpToast"));
      queryClient.invalidateQueries({ queryKey: ["activations", "active"] });
    },
  });
}
