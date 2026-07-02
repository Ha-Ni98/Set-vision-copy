import { useSyncExternalStore } from "react";
import { getRealtimeStatus, onRealtimeStatusChange, type RealtimeStatus } from "@/lib/realtime";

// No current UI consumer — exists so a later stage can hang a "reconnecting…" toast off
// this without ever importing src/lib/realtime.ts directly (plan.md §5.1).
export function useRealtimeStatus(): RealtimeStatus {
  return useSyncExternalStore(onRealtimeStatusChange, getRealtimeStatus);
}
