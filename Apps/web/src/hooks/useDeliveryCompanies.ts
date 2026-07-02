import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GetDeliveryCompaniesQuery, UpdateDeliveryCompanyCommand } from "@my-app/contract";
import * as deliveryCompaniesService from "@/services/delivery-companies.service";
import { qk } from "@/lib/query-keys";

// Grouped per domain (plan.md D6) — no admin UI exists yet to consume these. No toasts (D7).

export function useDeliveryCompanies(query: GetDeliveryCompaniesQuery) {
  return useQuery({
    queryKey: qk.deliveryCompanies.list(query),
    queryFn: ({ signal }) => deliveryCompaniesService.getAll(query, signal),
  });
}

export function useCreateDeliveryCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deliveryCompaniesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.deliveryCompanies.all() });
    },
  });
}

export function useUpdateDeliveryCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, command }: { id: string; command: UpdateDeliveryCompanyCommand }) =>
      deliveryCompaniesService.update(id, command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.deliveryCompanies.all() });
    },
  });
}

export function useToggleDeliveryCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deliveryCompaniesService.toggle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.deliveryCompanies.all() });
    },
  });
}
