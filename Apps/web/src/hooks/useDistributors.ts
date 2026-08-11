import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  GetDistributorsQuery,
  UpdateDistributorCommand,
  CreateDistributorAccountCommand,
} from "@my-app/contract";
import * as distributorsService from "@/services/distributors.service";
import { qk } from "@/lib/query-keys";

// Grouped per domain (plan.md D6) — no admin UI exists yet to consume these. No toasts (D7).

export function useDistributors(query: GetDistributorsQuery) {
  return useQuery({
    queryKey: qk.distributors.list(query),
    queryFn: ({ signal }) => distributorsService.getAll(query, signal),
  });
}

export function useCreateDistributor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: distributorsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.distributors.all() });
    },
  });
}

export function useDistributor(id: string) {
  return useQuery({
    queryKey: qk.distributors.detail(id),
    queryFn: ({ signal }) => distributorsService.getById(id, signal),
    enabled: !!id,
  });
}

export function useUpdateDistributor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, command }: { id: string; command: UpdateDistributorCommand }) =>
      distributorsService.update(id, command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.distributors.all() });
    },
  });
}

export function useToggleDistributor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: distributorsService.toggle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.distributors.all() });
    },
  });
}

export function useDeleteDistributor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: distributorsService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.distributors.all() });
    },
  });
}

export function useCreateDistributorAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, command }: { id: string; command: CreateDistributorAccountCommand }) =>
      distributorsService.createAccount(id, command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.distributors.all() });
    },
  });
}

export function useUnlinkDistributorAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: distributorsService.unlinkAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.distributors.all() });
    },
  });
}
