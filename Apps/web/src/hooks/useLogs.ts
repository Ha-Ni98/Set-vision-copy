import { useQuery } from "@tanstack/react-query";
import type { GetLogsQuery } from "@my-app/contract";
import * as logsService from "@/services/logs.service";
import { qk } from "@/lib/query-keys";

// Logs are an append-only audit trail — no domain's mutations invalidate this key (plan.md
// §3.2), and no toasts (D7) since there's no admin UI consumer yet.
export function useLogs(query: GetLogsQuery) {
  return useQuery({
    queryKey: qk.logs.list(query),
    queryFn: ({ signal }) => logsService.getAll(query, signal),
  });
}
