import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { FreezeRequestCommand } from "@my-app/contract";
import * as activationsService from "@/services/activations.service";
import { useTranslation } from "@/hooks/useTranslation";

export function useFreezeActivation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, command }: { id: string; command: FreezeRequestCommand }) =>
      activationsService.freeze(id, command),
    onSuccess: () => {
      toast.success(t("activator.requests.card.adminToast"));
      queryClient.invalidateQueries({ queryKey: ["activations", "active"] });
      queryClient.invalidateQueries({ queryKey: ["activator", "my-stats"] });
      queryClient.invalidateQueries({ queryKey: ["activations", "my-history"] });
      queryClient.invalidateQueries({ queryKey: ["activations", "recent"] });
    },
  });
}
