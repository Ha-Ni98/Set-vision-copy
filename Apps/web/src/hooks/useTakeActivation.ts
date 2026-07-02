import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as activationsService from "@/services/activations.service";
import { useTranslation } from "@/hooks/useTranslation";
import { qk } from "@/lib/query-keys";

export function useTakeActivation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: activationsService.take,
    onSuccess: () => {
      toast.success(t("activator.requests.takenToast"));
      queryClient.invalidateQueries({ queryKey: qk.activations.pending() });
      queryClient.invalidateQueries({ queryKey: qk.activations.active() });
      queryClient.invalidateQueries({ queryKey: qk.activators.myStats() });
    },
  });
}
