import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as activationsService from "@/services/activations.service";
import { useTranslation } from "@/hooks/useTranslation";

export function useTakeActivation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: activationsService.take,
    onSuccess: () => {
      toast.success(t("activator.requests.takenToast"));
      queryClient.invalidateQueries({ queryKey: ["activations", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["activations", "active"] });
      queryClient.invalidateQueries({ queryKey: ["activator", "my-stats"] });
    },
  });
}
