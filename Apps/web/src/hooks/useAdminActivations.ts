import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  GetActivationsQuery,
  SetActivatorPriceCommand,
  ActivateActivationCommand,
} from "@my-app/contract";
import * as activationsService from "@/services/activations.service";
import { qk } from "@/lib/query-keys";

// Grouped per domain (plan.md D6) — no admin UI exists yet to consume these; they exist
// for full contract coverage ahead of the admin sub-stage plugging into a finished
// pipeline. No toasts (D7).

export function useAdminActivations(query: GetActivationsQuery) {
  return useQuery({
    queryKey: qk.activations.list(query),
    queryFn: ({ signal }) => activationsService.getAll(query, signal),
  });
}

export function useActivationDetail(id: string) {
  return useQuery({
    queryKey: qk.activations.detail(id),
    queryFn: ({ signal }) => activationsService.getById(id, signal),
    enabled: !!id,
  });
}

// Stage-04-fix #2: activateByAdmin now takes a required ActivateActivationCommand.
export function useActivateByAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, command }: { id: string; command: ActivateActivationCommand }) =>
      activationsService.activateByAdmin(id, command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.activations.all() });
      queryClient.invalidateQueries({ queryKey: qk.activators.all() });
    },
  });
}

export function useCancelByAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activationsService.cancelByAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.activations.all() });
      queryClient.invalidateQueries({ queryKey: qk.activators.all() });
    },
  });
}

export function useSetActivationPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, command }: { id: string; command: SetActivatorPriceCommand }) =>
      activationsService.setPrice(id, command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.activations.all() });
      queryClient.invalidateQueries({ queryKey: qk.activators.all() });
    },
  });
}
