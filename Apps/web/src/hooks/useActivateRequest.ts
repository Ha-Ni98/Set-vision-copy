import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as activationsService from "@/services/activations.service";
import { useTranslation } from "@/hooks/useTranslation";
import { qk } from "@/lib/query-keys";

export function useActivateRequest() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: activationsService.activate,
    onSuccess: () => {
      toast.success(t("activator.requests.card.doneToast"));
      queryClient.invalidateQueries({ queryKey: qk.activations.active() });
      // Deliberately still the raw ["activator","my-stats"] literal — see useTakeActivation.
      queryClient.invalidateQueries({ queryKey: ["activator", "my-stats"] });
      queryClient.invalidateQueries({ queryKey: qk.activations.myHistoryAll() });
      queryClient.invalidateQueries({ queryKey: qk.activations.recent() });
    },
  });
}
