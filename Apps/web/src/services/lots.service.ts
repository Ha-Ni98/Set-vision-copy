import {
  LOT_ROUTES,
  type ApiResponse,
  type LotDTO,
  type PaginatedLots,
  type GetLotsQuery,
  type GetAvailableLotsQuery,
  type CreateLotCommand,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath, withParams } from "@/lib/api-path";

export async function getAll(query: GetLotsQuery, signal?: AbortSignal): Promise<PaginatedLots> {
  const res = await api.get<ApiResponse<PaginatedLots>>(
    apiPath(LOT_ROUTES.BASE, LOT_ROUTES.GET_ALL),
    {
      params: query,
      signal,
    },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getAvailableForOrder(
  query: GetAvailableLotsQuery,
  signal?: AbortSignal,
): Promise<LotDTO[]> {
  const res = await api.get<ApiResponse<LotDTO[]>>(
    apiPath(LOT_ROUTES.BASE, LOT_ROUTES.GET_AVAILABLE_FOR_ORDER),
    { params: query, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function create(command: CreateLotCommand): Promise<LotDTO> {
  const res = await api.post<ApiResponse<LotDTO>>(
    apiPath(LOT_ROUTES.BASE, LOT_ROUTES.CREATE),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function remove(id: string): Promise<void> {
  await api.delete(withParams(apiPath(LOT_ROUTES.BASE, LOT_ROUTES.DELETE), { id }));
}
