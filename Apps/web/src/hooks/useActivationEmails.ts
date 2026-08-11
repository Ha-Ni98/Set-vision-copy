import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GetActivationEmailsQuery, CreateActivationEmailCommand } from "@my-app/contract";
import * as activationEmailsService from "@/services/activation-emails.service";
import { qk } from "@/lib/query-keys";

export function useActivationEmails(query: GetActivationEmailsQuery) {
  return useQuery({
    queryKey: qk.activationEmails.list(query),
    queryFn: ({ signal }) => activationEmailsService.getAll(query, signal),
  });
}

// staleTime: 0 — reopening the picker after a completion must reflect the new ordering
// (Set 10 plan §7.1, manual test 3), not a cached pre-completion snapshot.
export function useActivationEmailPool(subscriptionPlanId: string) {
  return useQuery({
    queryKey: qk.activationEmails.pool(subscriptionPlanId),
    queryFn: ({ signal }) => activationEmailsService.getPool(subscriptionPlanId, signal),
    enabled: !!subscriptionPlanId,
    staleTime: 0,
  });
}

export function useAddActivationEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: CreateActivationEmailCommand) => activationEmailsService.create(command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.activationEmails.all() });
    },
  });
}

export function useDeleteActivationEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activationEmailsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.activationEmails.all() });
    },
  });
}
