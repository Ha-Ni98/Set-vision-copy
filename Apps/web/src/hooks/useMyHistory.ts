import { useQuery } from "@tanstack/react-query";
import type { GetActivatorHistoryQuery } from "@my-app/contract";
import * as activationsService from "@/services/activations.service";

export function useMyHistory(query: GetActivatorHistoryQuery) {
  return useQuery({
    queryKey: ["activations", "my-history", query],
    queryFn: () => activationsService.getMyHistory(query),
  });
}
