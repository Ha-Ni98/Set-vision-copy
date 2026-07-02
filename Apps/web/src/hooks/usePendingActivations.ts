import { useQuery } from "@tanstack/react-query";
import * as activationsService from "@/services/activations.service";
import { qk } from "@/lib/query-keys";

export function usePendingActivations() {
  return useQuery({
    queryKey: qk.activations.pending(),
    queryFn: ({ signal }) => activationsService.getPending(signal),
  });
}
