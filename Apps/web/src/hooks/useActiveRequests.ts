import { useQuery } from "@tanstack/react-query";
import * as activationsService from "@/services/activations.service";
import { qk } from "@/lib/query-keys";

export function useActiveRequests() {
  return useQuery({
    queryKey: qk.activations.active(),
    queryFn: ({ signal }) => activationsService.getActive(signal),
  });
}
