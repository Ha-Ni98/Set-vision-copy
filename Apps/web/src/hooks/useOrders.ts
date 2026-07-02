import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { GetOrdersQuery, TransitionOrderCommand } from "@my-app/contract";
import * as ordersService from "@/services/orders.service";
import { qk } from "@/lib/query-keys";

export function useOrders(query: GetOrdersQuery) {
  return useQuery({
    queryKey: qk.orders.list(query),
    queryFn: ({ signal }) => ordersService.getAll(query, signal),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: qk.orders.detail(id),
    queryFn: ({ signal }) => ordersService.getById(id, signal),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ordersService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.orders.all() });
    },
  });
}

// An order's transition moves its lots'/cards' delivery state and touches the owning
// distributor's standing, so all four families invalidate (plan.md §3.2).
function invalidateTransitionFanOut(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: qk.orders.all() });
  queryClient.invalidateQueries({ queryKey: qk.lots.all() });
  queryClient.invalidateQueries({ queryKey: qk.cards.all() });
  queryClient.invalidateQueries({ queryKey: qk.distributors.all() });
}

export function useTransitionOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, command }: { id: string; command: TransitionOrderCommand }) =>
      ordersService.transition(id, command),
    onSuccess: () => invalidateTransitionFanOut(queryClient),
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ordersService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.orders.all() });
    },
  });
}
