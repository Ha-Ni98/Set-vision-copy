import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GetCardsQuery } from "@my-app/contract";
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
export function useAvailableCardsForLot(subscriptionPlanId: string | undefined) {
  return useQuery({
    queryKey: qk.cards.availableForLot({ subscriptionPlanId: subscriptionPlanId ?? "" }),
    queryFn: ({ signal }) =>
      cardsService.getAvailableForLot({ subscriptionPlanId: subscriptionPlanId! }, signal),
    enabled: !!subscriptionPlanId,
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
