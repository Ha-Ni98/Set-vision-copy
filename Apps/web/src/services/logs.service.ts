import {
  LOG_ROUTES,
  type ApiResponse,
  type PaginatedLogs,
  type GetLogsQuery,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath } from "@/lib/api-path";

export async function getAll(query: GetLogsQuery, signal?: AbortSignal): Promise<PaginatedLogs> {
  const res = await api.get<ApiResponse<PaginatedLogs>>(
    apiPath(LOG_ROUTES.BASE, LOG_ROUTES.GET_ALL),
    {
      params: query,
      signal,
    },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}
