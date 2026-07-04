import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { GetSetsQuery, TransitionSetCommand } from "@my-app/contract";
import * as setsService from "@/services/sets.service";
import { qk } from "@/lib/query-keys";

export function useSets(query: GetSetsQuery) {
  return useQuery({
    queryKey: qk.sets.list(query),
    queryFn: ({ signal }) => setsService.getAll(query, signal),
  });
}

// A set's lifecycle creates/re-states its cards, so mutations invalidate both domains
// (plan.md §3.2).
function invalidateSetsAndCards(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: qk.sets.all() });
  queryClient.invalidateQueries({ queryKey: qk.cards.all() });
}

export function useCreateSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setsService.create,
    onSuccess: () => invalidateSetsAndCards(queryClient),
  });
}

export function useTransitionSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, command }: { id: string; command: TransitionSetCommand }) =>
      setsService.transition(id, command),
    onSuccess: () => invalidateSetsAndCards(queryClient),
  });
}

export function useDeleteSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setsService.remove,
    onSuccess: () => invalidateSetsAndCards(queryClient),
  });
}
