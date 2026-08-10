import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type {
  GetCardOrderRequestsQuery,
  GetMyCardOrderRequestsQuery,
  CreateCardOrderRequestCommand,
  ReviewCardOrderRequestCommand,
} from "@my-app/contract";
import * as cardOrderRequestsService from "@/services/card-order-requests.service";
import { qk } from "@/lib/query-keys";

export function useCardOrderRequests(query: GetCardOrderRequestsQuery) {
  return useQuery({
    queryKey: qk.cardOrderRequests.list(query),
    queryFn: ({ signal }) => cardOrderRequestsService.getAll(query, signal),
  });
}

export function useMyCardOrderRequests(query: GetMyCardOrderRequestsQuery) {
  return useQuery({
    queryKey: qk.cardOrderRequests.mine(query),
    queryFn: ({ signal }) => cardOrderRequestsService.getMine(query, signal),
  });
}

export function useLinkableOrderRequests() {
  return useQuery({
    queryKey: qk.cardOrderRequests.linkable(),
    queryFn: ({ signal }) => cardOrderRequestsService.getLinkable(signal),
  });
}

export function useCardOrderRequest(id: string) {
  return useQuery({
    queryKey: qk.cardOrderRequests.detail(id),
    queryFn: ({ signal }) => cardOrderRequestsService.getById(id, signal),
    enabled: !!id,
  });
}

// Both admin and distributor views, plus the linkable selector, must all refresh on any
// change — a new submission, a decision, a cancel, or an unlink all move this set.
function invalidateCardOrderRequests(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: qk.cardOrderRequests.all() });
}

export function useCreateCardOrderRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cardOrderRequestsService.create,
    onSuccess: () => invalidateCardOrderRequests(queryClient),
  });
}

export function useApproveCardOrderRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, command }: { id: string; command: ReviewCardOrderRequestCommand }) =>
      cardOrderRequestsService.approve(id, command),
    onSuccess: () => invalidateCardOrderRequests(queryClient),
  });
}

export function useRejectCardOrderRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, command }: { id: string; command: ReviewCardOrderRequestCommand }) =>
      cardOrderRequestsService.reject(id, command),
    onSuccess: () => invalidateCardOrderRequests(queryClient),
  });
}

export function useCancelCardOrderRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cardOrderRequestsService.cancel,
    onSuccess: () => invalidateCardOrderRequests(queryClient),
  });
}

// Unlinking also frees the order back up in the add-order selector and detail views.
function invalidateUnlink(queryClient: QueryClient): void {
  invalidateCardOrderRequests(queryClient);
  queryClient.invalidateQueries({ queryKey: qk.orders.all() });
}

export function useUnlinkCardOrderRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cardOrderRequestsService.unlink,
    onSuccess: () => invalidateUnlink(queryClient),
  });
}
