import { useQuery } from "@tanstack/react-query";
import type { GetActivatorHistoryQuery } from "@my-app/contract";
import * as activationsService from "@/services/activations.service";
import { qk } from "@/lib/query-keys";

export function useMyHistory(query: GetActivatorHistoryQuery) {
  return useQuery({
    queryKey: qk.activations.myHistory(query),
    queryFn: ({ signal }) => activationsService.getMyHistory(query, signal),
  });
}
