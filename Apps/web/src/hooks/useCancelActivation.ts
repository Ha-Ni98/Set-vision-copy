import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as activationsService from "@/services/activations.service";
import { useTranslation } from "@/hooks/useTranslation";
import { qk } from "@/lib/query-keys";

// Now consumed by ActiveRequestCard's Cancel action (activator-portal plan.md §D4) — the
// toast this hook lacked while unconsumed is the same copy useReleaseActivation used
// ("Request cancelled."), reused as-is since it already fits real Cancel semantics.
export function useCancelActivation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: activationsService.cancel,
    onSuccess: () => {
      toast.success(t("activator.requests.card.cancelToast"));
      queryClient.invalidateQueries({ queryKey: qk.activations.active() });
      queryClient.invalidateQueries({ queryKey: qk.activations.myHistoryAll() });
      queryClient.invalidateQueries({ queryKey: qk.activations.recent() });
      queryClient.invalidateQueries({ queryKey: qk.activators.myStats() });
    },
  });
}
