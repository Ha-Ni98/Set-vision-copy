import { useQuery } from "@tanstack/react-query";
import * as keysService from "@/services/keys.service";
import { qk } from "@/lib/query-keys";

// No current UI consumer (the MVP never had a status-refresh feature) — built because
// it's explicitly named in the Sub-01 hook list and KEY_ROUTES.STATUS exists in the
// contract; ready for a future page to enable it while a submission is pending.
export function useActivationStatus(activationId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: qk.keys.status(activationId ?? ""),
    queryFn: () => keysService.getActivationStatus(activationId!),
    enabled: enabled && !!activationId,
  });
}
