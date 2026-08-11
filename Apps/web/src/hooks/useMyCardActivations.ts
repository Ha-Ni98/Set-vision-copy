import { useQuery } from "@tanstack/react-query";
import type { GetDistributorActivationsQuery } from "@my-app/contract";
import * as activationsService from "@/services/activations.service";
import { qk } from "@/lib/query-keys";

export function useMyCardActivations(query: GetDistributorActivationsQuery) {
  return useQuery({
    queryKey: qk.activations.onMyCards(query),
    queryFn: ({ signal }) => activationsService.getOnMyCards(query, signal),
  });
}

export function useMyCardActivation(id: string) {
  return useQuery({
    queryKey: qk.activations.onMyCardsDetail(id),
    queryFn: ({ signal }) => activationsService.getOnMyCardsById(id, signal),
    enabled: !!id,
  });
}
