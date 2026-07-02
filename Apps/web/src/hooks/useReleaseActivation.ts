import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as activationsService from "@/services/activations.service";
import { useTranslation } from "@/hooks/useTranslation";

export function useReleaseActivation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: activationsService.release,
    onSuccess: () => {
      toast.info(t("activator.requests.card.cancelToast"));
      queryClient.invalidateQueries({ queryKey: ["activations", "active"] });
      queryClient.invalidateQueries({ queryKey: ["activator", "my-stats"] });
      queryClient.invalidateQueries({ queryKey: ["activations", "my-history"] });
      queryClient.invalidateQueries({ queryKey: ["activations", "recent"] });
    },
  });
}
