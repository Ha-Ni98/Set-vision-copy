import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as activationsService from "@/services/activations.service";
import { qk } from "@/lib/query-keys";

// New hook, no UI consumer yet — no toast (D7: inventing translation copy is UI thinking,
// out of scope here). Mirrors useReleaseActivation's invalidation set (plan.md §3.2), but
// uses the already-normalized qk.activators.myStats() key since this hook carries no
// legacy singular-key baggage to preserve.
export function useCancelActivation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activationsService.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.activations.active() });
      queryClient.invalidateQueries({ queryKey: qk.activations.myHistoryAll() });
      queryClient.invalidateQueries({ queryKey: qk.activations.recent() });
      queryClient.invalidateQueries({ queryKey: qk.activators.myStats() });
    },
  });
}
