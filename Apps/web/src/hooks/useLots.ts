import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { GetLotsQuery, GetAvailableLotsQuery } from "@my-app/contract";
import * as lotsService from "@/services/lots.service";
import { qk } from "@/lib/query-keys";

export function useLots(query: GetLotsQuery) {
  return useQuery({
    queryKey: qk.lots.list(query),
    queryFn: ({ signal }) => lotsService.getAll(query, signal),
  });
}

export function useAvailableLotsForOrder(query: GetAvailableLotsQuery) {
  return useQuery({
    queryKey: qk.lots.availableForOrder(query),
    queryFn: ({ signal }) => lotsService.getAvailableForOrder(query, signal),
  });
}

// Creating/deleting a lot moves cards IN_LOT/back, so both domains invalidate (plan.md §3.2).
function invalidateLotsAndCards(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: qk.lots.all() });
  queryClient.invalidateQueries({ queryKey: qk.cards.all() });
}

export function useCreateLot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: lotsService.create,
    onSuccess: () => invalidateLotsAndCards(queryClient),
  });
}

export function useDeleteLot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: lotsService.remove,
    onSuccess: () => invalidateLotsAndCards(queryClient),
  });
}
