import {
  CARD_ROUTES,
  type ApiResponse,
  type CardDTO,
  type CardDetailDTO,
  type AvailableCardDTO,
  type PaginatedCards,
  type GetCardsQuery,
  type GetAvailableCardsQuery,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath, withParams } from "@/lib/api-path";

export async function getAll(query: GetCardsQuery, signal?: AbortSignal): Promise<PaginatedCards> {
  const res = await api.get<ApiResponse<PaginatedCards>>(
    apiPath(CARD_ROUTES.BASE, CARD_ROUTES.GET_ALL),
    {
      params: query,
      signal,
    },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getAvailableForLot(
  query: GetAvailableCardsQuery,
  signal?: AbortSignal,
): Promise<AvailableCardDTO[]> {
  const res = await api.get<ApiResponse<AvailableCardDTO[]>>(
    apiPath(CARD_ROUTES.BASE, CARD_ROUTES.GET_AVAILABLE_FOR_LOT),
    { params: query, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getById(id: string, signal?: AbortSignal): Promise<CardDetailDTO> {
  const res = await api.get<ApiResponse<CardDetailDTO>>(
    withParams(apiPath(CARD_ROUTES.BASE, CARD_ROUTES.GET_BY_ID), { id }),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function remove(id: string): Promise<void> {
  await api.delete(withParams(apiPath(CARD_ROUTES.BASE, CARD_ROUTES.DELETE), { id }));
}

export async function disable(id: string): Promise<CardDTO> {
  const res = await api.post<ApiResponse<CardDTO>>(
    withParams(apiPath(CARD_ROUTES.BASE, CARD_ROUTES.DISABLE), { id }),
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function enable(id: string): Promise<CardDTO> {
  const res = await api.post<ApiResponse<CardDTO>>(
    withParams(apiPath(CARD_ROUTES.BASE, CARD_ROUTES.ENABLE), { id }),
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function revoke(id: string): Promise<CardDTO> {
  const res = await api.post<ApiResponse<CardDTO>>(
    withParams(apiPath(CARD_ROUTES.BASE, CARD_ROUTES.REVOKE), { id }),
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}
