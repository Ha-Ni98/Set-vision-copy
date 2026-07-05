import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { GetSubscriptionPlansQuery, UpdateCommissionCommand } from "@my-app/contract";
import * as subscriptionPlansService from "@/services/subscription-plans.service";
import { qk } from "@/lib/query-keys";

// Grouped per domain (plan.md D6) — no admin UI exists yet to consume these. No toasts (D7).

export function useSubscriptionPlans(query: GetSubscriptionPlansQuery) {
  return useQuery({
    queryKey: qk.subscriptionPlans.list(query),
    queryFn: ({ signal }) => subscriptionPlansService.getAll(query, signal),
  });
}

export function useCreateSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscriptionPlansService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.subscriptionPlans.all() });
    },
  });
}

export function useToggleSubscriptionPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscriptionPlansService.toggle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.subscriptionPlans.all() });
    },
  });
}

export function useCommissionDurations() {
  return useQuery({
    queryKey: qk.subscriptionPlans.commissionDurations(),
    queryFn: ({ signal }) => subscriptionPlansService.getCommissionDurations(signal),
  });
}

export function useCommissions() {
  return useQuery({
    queryKey: qk.subscriptionPlans.commissions(),
    queryFn: ({ signal }) => subscriptionPlansService.getCommissions(signal),
  });
}

// Both commission-related keys invalidate — matrix and duration tiers — but not the plans
// list itself, which a single cell edit never touches (plan.md §3.2).
function invalidateCommissions(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: qk.subscriptionPlans.commissions() });
  queryClient.invalidateQueries({ queryKey: qk.subscriptionPlans.commissionDurations() });
}

export function useUpdateCommission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: UpdateCommissionCommand) =>
      subscriptionPlansService.updateCommission(command),
    onSuccess: () => invalidateCommissions(queryClient),
  });
}
