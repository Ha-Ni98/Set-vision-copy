import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GetAdminsQuery, UpdateAdminCommand } from "@my-app/contract";
import * as adminsService from "@/services/admins.service";
import { qk } from "@/lib/query-keys";

// Grouped per domain (plan.md D6) — no admin UI exists yet to consume these; full contract
// coverage ahead of the admin sub-stage. No toasts (D7).

export function useAdmins(query: GetAdminsQuery) {
  return useQuery({
    queryKey: qk.admins.list(query),
    queryFn: ({ signal }) => adminsService.getAll(query, signal),
  });
}

export function useCreateAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.admins.all() });
    },
  });
}

export function useAdmin(id: string) {
  return useQuery({
    queryKey: qk.admins.detail(id),
    queryFn: ({ signal }) => adminsService.getById(id, signal),
    enabled: !!id,
  });
}

export function useUpdateAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, command }: { id: string; command: UpdateAdminCommand }) =>
      adminsService.update(id, command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.admins.all() });
    },
  });
}

export function useToggleAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminsService.toggle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.admins.all() });
    },
  });
}

export function useResetAdminPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminsService.resetPassword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.admins.all() });
    },
  });
}

export function useDeleteAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminsService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.admins.all() });
    },
  });
}
