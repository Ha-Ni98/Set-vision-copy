import { useQuery } from "@tanstack/react-query";
import * as activationsService from "@/services/activations.service";
import { qk } from "@/lib/query-keys";

// Global Recent has no per-viewer filter, so a stale tab is the one place in this portal
// where a plain on-focus refetch (rather than relying solely on socket invalidation) earns
// its keep — activator-portal plan.md D3 ("live via socket + on-focus").
export function useRecentActivations() {
  return useQuery({
    queryKey: qk.activations.recent(),
    queryFn: ({ signal }) => activationsService.getRecent(signal),
    refetchOnWindowFocus: true,
  });
}
