import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  GetActivatorsQuery,
  UpdateActivatorCommand,
  ActivatorPerformanceQuery,
} from "@my-app/contract";
import * as activatorService from "@/services/activator.service";
import { qk } from "@/lib/query-keys";

// Grouped per domain (plan.md D6) — no admin UI exists yet to consume these; full contract
// coverage ahead of the admin sub-stage. useMyStats keeps its own Sub-01 file. No toasts (D7).

export function useActivators(query: GetActivatorsQuery) {
  return useQuery({
    queryKey: qk.activators.list(query),
    queryFn: ({ signal }) => activatorService.getAll(query, signal),
  });
}

export function useCreateActivator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activatorService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.activators.all() });
    },
  });
}

export function useActivator(id: string) {
  return useQuery({
    queryKey: qk.activators.detail(id),
    queryFn: ({ signal }) => activatorService.getById(id, signal),
    enabled: !!id,
  });
}

export function useUpdateActivator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, command }: { id: string; command: UpdateActivatorCommand }) =>
      activatorService.update(id, command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.activators.all() });
    },
  });
}

export function useToggleActivator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activatorService.toggle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.activators.all() });
    },
  });
}

export function useResetActivatorPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activatorService.resetPassword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.activators.all() });
    },
  });
}

export function useDeleteActivator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activatorService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.activators.all() });
    },
  });
}

export function useActivatorPerformance(id: string, query: ActivatorPerformanceQuery) {
  return useQuery({
    queryKey: qk.activators.performance(id, query),
    queryFn: ({ signal }) => activatorService.getPerformance(id, query, signal),
    enabled: !!id,
  });
}
