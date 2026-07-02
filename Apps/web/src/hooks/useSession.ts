import { useQuery } from "@tanstack/react-query";
import * as authService from "@/services/auth.service";
import { qk } from "@/lib/query-keys";

export function useSession() {
  return useQuery({
    queryKey: qk.auth.me(),
    queryFn: authService.me,
    staleTime: Infinity,
    retry: false,
  });
}
