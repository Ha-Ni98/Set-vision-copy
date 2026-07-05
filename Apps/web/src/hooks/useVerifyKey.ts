import { useMutation } from "@tanstack/react-query";
import * as keysService from "@/services/keys.service";
import { subscribeActivation } from "@/lib/realtime";

export function useVerifyKey() {
  return useMutation({
    mutationFn: keysService.verifyKey,
    onSuccess: (data) => {
      // Not every status carries an activationId (e.g. INVALID never does) — subscribe
      // only when the portal actually has one to track (plan.md §5.1).
      if (data.activationId) subscribeActivation(data.activationId);
    },
  });
}
