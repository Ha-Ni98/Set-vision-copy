import {
  CARD_ORDER_REQUEST_ROUTES,
  type ApiResponse,
  type CardOrderRequestDTO,
  type LinkableCardOrderRequestDTO,
  type PaginatedCardOrderRequests,
  type GetCardOrderRequestsQuery,
  type GetMyCardOrderRequestsQuery,
  type CreateCardOrderRequestCommand,
  type ReviewCardOrderRequestCommand,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath, withParams } from "@/lib/api-path";

export async function getAll(
  query: GetCardOrderRequestsQuery,
  signal?: AbortSignal,
): Promise<PaginatedCardOrderRequests> {
  const res = await api.get<ApiResponse<PaginatedCardOrderRequests>>(
    apiPath(CARD_ORDER_REQUEST_ROUTES.BASE, CARD_ORDER_REQUEST_ROUTES.GET_ALL),
    { params: query, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getMine(
  query: GetMyCardOrderRequestsQuery,
  signal?: AbortSignal,
): Promise<PaginatedCardOrderRequests> {
  const res = await api.get<ApiResponse<PaginatedCardOrderRequests>>(
    apiPath(CARD_ORDER_REQUEST_ROUTES.BASE, CARD_ORDER_REQUEST_ROUTES.GET_MINE),
    { params: query, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getLinkable(signal?: AbortSignal): Promise<LinkableCardOrderRequestDTO[]> {
  const res = await api.get<ApiResponse<LinkableCardOrderRequestDTO[]>>(
    apiPath(CARD_ORDER_REQUEST_ROUTES.BASE, CARD_ORDER_REQUEST_ROUTES.GET_LINKABLE),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getById(id: string, signal?: AbortSignal): Promise<CardOrderRequestDTO> {
  const res = await api.get<ApiResponse<CardOrderRequestDTO>>(
    withParams(apiPath(CARD_ORDER_REQUEST_ROUTES.BASE, CARD_ORDER_REQUEST_ROUTES.GET_BY_ID), {
      id,
    }),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function create(command: CreateCardOrderRequestCommand): Promise<CardOrderRequestDTO> {
  const res = await api.post<ApiResponse<CardOrderRequestDTO>>(
    apiPath(CARD_ORDER_REQUEST_ROUTES.BASE, CARD_ORDER_REQUEST_ROUTES.CREATE),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function approve(
  id: string,
  command: ReviewCardOrderRequestCommand,
): Promise<CardOrderRequestDTO> {
  const res = await api.post<ApiResponse<CardOrderRequestDTO>>(
    withParams(apiPath(CARD_ORDER_REQUEST_ROUTES.BASE, CARD_ORDER_REQUEST_ROUTES.APPROVE), { id }),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function reject(
  id: string,
  command: ReviewCardOrderRequestCommand,
): Promise<CardOrderRequestDTO> {
  const res = await api.post<ApiResponse<CardOrderRequestDTO>>(
    withParams(apiPath(CARD_ORDER_REQUEST_ROUTES.BASE, CARD_ORDER_REQUEST_ROUTES.REJECT), { id }),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function cancel(id: string): Promise<CardOrderRequestDTO> {
  const res = await api.post<ApiResponse<CardOrderRequestDTO>>(
    withParams(apiPath(CARD_ORDER_REQUEST_ROUTES.BASE, CARD_ORDER_REQUEST_ROUTES.CANCEL), { id }),
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function unlink(id: string): Promise<CardOrderRequestDTO> {
  const res = await api.post<ApiResponse<CardOrderRequestDTO>>(
    withParams(apiPath(CARD_ORDER_REQUEST_ROUTES.BASE, CARD_ORDER_REQUEST_ROUTES.UNLINK), { id }),
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}
