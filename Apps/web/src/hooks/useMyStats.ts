import { useQuery } from "@tanstack/react-query";
import * as activatorService from "@/services/activator.service";
import { qk } from "@/lib/query-keys";

export function useMyStats() {
  return useQuery({
    queryKey: qk.activators.myStats(),
    queryFn: ({ signal }) => activatorService.getMyStats(signal),
  });
}
