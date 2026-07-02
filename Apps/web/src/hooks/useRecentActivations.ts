import { useQuery } from "@tanstack/react-query";
import * as activationsService from "@/services/activations.service";
import { qk } from "@/lib/query-keys";

export function useRecentActivations() {
  return useQuery({
    queryKey: qk.activations.recent(),
    queryFn: ({ signal }) => activationsService.getRecent(signal),
  });
}
