import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as authService from "@/services/auth.service";
import { qk } from "@/lib/query-keys";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authService.login,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.auth.me() });
    },
  });
}
