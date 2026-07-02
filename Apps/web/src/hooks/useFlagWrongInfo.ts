import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { FlagWrongInfoCommand } from "@my-app/contract";
import * as activationsService from "@/services/activations.service";
import { useTranslation } from "@/hooks/useTranslation";

export function useFlagWrongInfo() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, command }: { id: string; command: FlagWrongInfoCommand }) =>
      activationsService.flagWrongInfo(id, command),
    onSuccess: () => {
      toast.success(t("activator.requests.card.wrongInfoToast"));
      queryClient.invalidateQueries({ queryKey: ["activations", "active"] });
    },
  });
}
