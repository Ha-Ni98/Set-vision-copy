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

// GetCardsQuery caps `limit` at 100 (contract), so a set with more cards than that needs
// multiple requests — loops until every page is collected instead of returning a partial list.
export async function getAllKeysForSet(setNumber: string, signal?: AbortSignal): Promise<string[]> {
  const limit = 100;
  const first = await getAll({ setNumber, page: 1, limit }, signal);
  const keys = first.items.map((c) => c.key);
  for (let page = 2; page <= first.meta.totalPages; page++) {
    const next = await getAll({ setNumber, page, limit }, signal);
    keys.push(...next.items.map((c) => c.key));
  }
  return keys;
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
