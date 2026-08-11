import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type {
  GetCardRevocationRequestsQuery,
  GetMyCardRevocationRequestsQuery,
  CreateCardRevocationRequestCommand,
  ReviewCardRevocationRequestCommand,
} from "@my-app/contract";
import * as cardRevocationRequestsService from "@/services/card-revocation-requests.service";
import { qk } from "@/lib/query-keys";

export function useCardRevocationRequests(query: GetCardRevocationRequestsQuery) {
  return useQuery({
    queryKey: qk.cardRevocationRequests.list(query),
    queryFn: ({ signal }) => cardRevocationRequestsService.getAll(query, signal),
  });
}

export function useMyCardRevocationRequests(query: GetMyCardRevocationRequestsQuery) {
  return useQuery({
    queryKey: qk.cardRevocationRequests.mine(query),
    queryFn: ({ signal }) => cardRevocationRequestsService.getMine(query, signal),
  });
}

export function useEligibleCards() {
  return useQuery({
    queryKey: qk.cardRevocationRequests.eligible(),
    queryFn: ({ signal }) => cardRevocationRequestsService.getEligible(signal),
  });
}

export function useCardRevocationRequest(id: string) {
  return useQuery({
    queryKey: qk.cardRevocationRequests.detail(id),
    queryFn: ({ signal }) => cardRevocationRequestsService.getById(id, signal),
    enabled: !!id,
  });
}

function invalidateCardRevocationRequests(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: qk.cardRevocationRequests.all() });
}

export function useCreateCardRevocationRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cardRevocationRequestsService.create,
    onSuccess: () => invalidateCardRevocationRequests(queryClient),
  });
}

// An approval revokes the card and moves the distributor's active-card count, so both
// domains invalidate alongside the request lists themselves.
function invalidateApprove(queryClient: QueryClient): void {
  invalidateCardRevocationRequests(queryClient);
  queryClient.invalidateQueries({ queryKey: qk.cards.all() });
  queryClient.invalidateQueries({ queryKey: qk.distributors.all() });
}

export function useApproveCardRevocationRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, command }: { id: string; command: ReviewCardRevocationRequestCommand }) =>
      cardRevocationRequestsService.approve(id, command),
    onSuccess: () => invalidateApprove(queryClient),
  });
}

export function useRejectCardRevocationRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, command }: { id: string; command: ReviewCardRevocationRequestCommand }) =>
      cardRevocationRequestsService.reject(id, command),
    onSuccess: () => invalidateCardRevocationRequests(queryClient),
  });
}

export function useCancelCardRevocationRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cardRevocationRequestsService.cancel,
    onSuccess: () => invalidateCardRevocationRequests(queryClient),
  });
}
