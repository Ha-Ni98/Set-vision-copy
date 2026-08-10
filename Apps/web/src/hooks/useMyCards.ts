import { useQuery } from "@tanstack/react-query";
import type { GetDistributorCardsQuery } from "@my-app/contract";
import * as cardsService from "@/services/cards.service";
import { qk } from "@/lib/query-keys";

export function useMyCards(query: GetDistributorCardsQuery) {
  return useQuery({
    queryKey: qk.cards.mine(query),
    queryFn: ({ signal }) => cardsService.getMine(query, signal),
  });
}

export function useMyCard(id: string) {
  return useQuery({
    queryKey: qk.cards.mineDetail(id),
    queryFn: ({ signal }) => cardsService.getMineById(id, signal),
    enabled: !!id,
  });
}
