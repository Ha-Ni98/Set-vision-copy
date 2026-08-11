import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GetNotificationsQuery } from "@my-app/contract";
import * as notificationsService from "@/services/notifications.service";
import { qk } from "@/lib/query-keys";

export function useNotifications(query: GetNotificationsQuery) {
  return useQuery({
    queryKey: qk.notifications.list(query),
    queryFn: ({ signal }) => notificationsService.getAll(query, signal),
  });
}

export function useResendNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsService.resend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.notifications.all() });
    },
  });
}
