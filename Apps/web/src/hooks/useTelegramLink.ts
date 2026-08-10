import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserRole } from "@my-app/contract";
import * as telegramLinkService from "@/services/telegram-link.service";
import { qk } from "@/lib/query-keys";

export function useTelegramLink(role: UserRole, profileId: string) {
  return useQuery({
    queryKey: qk.telegramLink.detail(role, profileId),
    queryFn: ({ signal }) => telegramLinkService.getLinkStatus(role, profileId, signal),
    enabled: !!profileId,
  });
}

export function useGenerateTelegramToken(role: UserRole, profileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => telegramLinkService.generateToken(role, profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.telegramLink.detail(role, profileId) });
    },
  });
}

export function useUnlinkTelegram(role: UserRole, profileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => telegramLinkService.unlink(role, profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.telegramLink.detail(role, profileId) });
    },
  });
}
