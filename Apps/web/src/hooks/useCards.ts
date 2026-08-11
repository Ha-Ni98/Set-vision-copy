import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import type { GetCardsQuery, GetAvailableCardsQuery } from "@my-app/contract";
import * as cardsService from "@/services/cards.service";
import { qk } from "@/lib/query-keys";

export function useCards(query: GetCardsQuery) {
  return useQuery({
    queryKey: qk.cards.list(query),
    queryFn: ({ signal }) => cardsService.getAll(query, signal),
  });
}

// GetAvailableCardsQuery.subscriptionPlanId is required by the contract, so the enabled
// gate takes the id directly (mirrors useCommunes, Sprint 6) rather than a partial query.
// keepPreviousData: paging/searching the picker must not flash the group area back to
// skeletons between requests (set-8-plan §6.2 item 5).
export function useAvailableCardsForLot(
  subscriptionPlanId: string | undefined,
  rest: Omit<GetAvailableCardsQuery, "subscriptionPlanId"> = {},
) {
  const query: GetAvailableCardsQuery = { subscriptionPlanId: subscriptionPlanId ?? "", ...rest };
  return useQuery({
    queryKey: qk.cards.availableForLot(query),
    queryFn: ({ signal }) => cardsService.getAvailableForLot({ ...query }, signal),
    enabled: !!subscriptionPlanId,
    placeholderData: keepPreviousData,
  });
}

export function useCard(id: string) {
  return useQuery({
    queryKey: qk.cards.detail(id),
    queryFn: ({ signal }) => cardsService.getById(id, signal),
    enabled: !!id,
  });
}

export function useDeleteCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cardsService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.cards.all() });
    },
  });
}

export function useDisableCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cardsService.disable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.cards.all() });
    },
  });
}

export function useEnableCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cardsService.enable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.cards.all() });
    },
  });
}

export function useRevokeCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cardsService.revoke,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.cards.all() });
    },
  });
}
