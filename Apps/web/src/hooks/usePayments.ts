import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { GetPaymentsQuery } from "@my-app/contract";
import * as paymentsService from "@/services/payments.service";
import { qk } from "@/lib/query-keys";

// Grouped per domain (plan.md D6) — no admin UI exists yet to consume these. No toasts (D7).

export function usePayments(query: GetPaymentsQuery) {
  return useQuery({
    queryKey: qk.payments.list(query),
    queryFn: ({ signal }) => paymentsService.getAll(query, signal),
  });
}

// A payment changes an activator's credits balance, so both domains invalidate together
// (plan.md §3.2).
function invalidatePaymentsAndActivators(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: qk.payments.all() });
  queryClient.invalidateQueries({ queryKey: qk.activators.all() });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: paymentsService.record,
    onSuccess: () => invalidatePaymentsAndActivators(queryClient),
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: paymentsService.remove,
    onSuccess: () => invalidatePaymentsAndActivators(queryClient),
  });
}
