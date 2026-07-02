import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as authService from "@/services/auth.service";

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authService.logout,
    // "Settled", not "success": the service clears local tokens in its own `finally` even
    // when the API call throws, so the cache should reflect the logged-out state either way.
    onSettled: () => {
      queryClient.clear();
    },
  });
}
