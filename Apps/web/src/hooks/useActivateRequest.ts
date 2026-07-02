import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as activationsService from "@/services/activations.service";
import { useTranslation } from "@/hooks/useTranslation";

export function useActivateRequest() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: activationsService.activate,
    onSuccess: () => {
      toast.success(t("activator.requests.card.doneToast"));
      queryClient.invalidateQueries({ queryKey: ["activations", "active"] });
      queryClient.invalidateQueries({ queryKey: ["activator", "my-stats"] });
      queryClient.invalidateQueries({ queryKey: ["activations", "my-history"] });
      queryClient.invalidateQueries({ queryKey: ["activations", "recent"] });
    },
  });
}
