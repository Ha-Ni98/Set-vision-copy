import { useQuery } from "@tanstack/react-query";
import * as keysService from "@/services/keys.service";
import { qk } from "@/lib/query-keys";
import { getRealtimeStatus } from "@/lib/realtime";

// Spec §Step 1/D5: "polling fallback 5–10s" while the socket is down.
const POLL_INTERVAL_MS = 8_000;

// Backs the client portal's realtime re-sync (client-portal plan.md §D5): the `/client`
// socket only invalidates this query on `activation:status-changed` (sockets are a
// freshness signal, never a data source — rules §2) — this is the one place the fresh
// status is actually fetched. `refetchOnWindowFocus` re-syncs a backgrounded tab (the
// socket may have missed events while hidden); `refetchInterval` is the polling fallback,
// active only while the socket isn't connected.
export function useActivationStatus(activationId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: qk.keys.status(activationId ?? ""),
    queryFn: () => keysService.getActivationStatus(activationId!),
    enabled: enabled && !!activationId,
    refetchOnWindowFocus: true,
    refetchInterval: () => (getRealtimeStatus() === "connected" ? false : POLL_INTERVAL_MS),
  });
}
