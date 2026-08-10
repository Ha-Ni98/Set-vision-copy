import {
  CARD_REVOCATION_REQUEST_ROUTES,
  type ApiResponse,
  type CardRevocationRequestDTO,
  type RevocableCardDTO,
  type PaginatedCardRevocationRequests,
  type GetCardRevocationRequestsQuery,
  type GetMyCardRevocationRequestsQuery,
  type CreateCardRevocationRequestCommand,
  type ReviewCardRevocationRequestCommand,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath, withParams } from "@/lib/api-path";

export async function getAll(
  query: GetCardRevocationRequestsQuery,
  signal?: AbortSignal,
): Promise<PaginatedCardRevocationRequests> {
  const res = await api.get<ApiResponse<PaginatedCardRevocationRequests>>(
    apiPath(CARD_REVOCATION_REQUEST_ROUTES.BASE, CARD_REVOCATION_REQUEST_ROUTES.GET_ALL),
    { params: query, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getMine(
  query: GetMyCardRevocationRequestsQuery,
  signal?: AbortSignal,
): Promise<PaginatedCardRevocationRequests> {
  const res = await api.get<ApiResponse<PaginatedCardRevocationRequests>>(
    apiPath(CARD_REVOCATION_REQUEST_ROUTES.BASE, CARD_REVOCATION_REQUEST_ROUTES.GET_MINE),
    { params: query, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getEligible(signal?: AbortSignal): Promise<RevocableCardDTO[]> {
  const res = await api.get<ApiResponse<RevocableCardDTO[]>>(
    apiPath(CARD_REVOCATION_REQUEST_ROUTES.BASE, CARD_REVOCATION_REQUEST_ROUTES.GET_ELIGIBLE),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getById(id: string, signal?: AbortSignal): Promise<CardRevocationRequestDTO> {
  const res = await api.get<ApiResponse<CardRevocationRequestDTO>>(
    withParams(
      apiPath(CARD_REVOCATION_REQUEST_ROUTES.BASE, CARD_REVOCATION_REQUEST_ROUTES.GET_BY_ID),
      {
        id,
      },
    ),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function create(
  command: CreateCardRevocationRequestCommand,
): Promise<CardRevocationRequestDTO> {
  const res = await api.post<ApiResponse<CardRevocationRequestDTO>>(
    apiPath(CARD_REVOCATION_REQUEST_ROUTES.BASE, CARD_REVOCATION_REQUEST_ROUTES.CREATE),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function approve(
  id: string,
  command: ReviewCardRevocationRequestCommand,
): Promise<CardRevocationRequestDTO> {
  const res = await api.post<ApiResponse<CardRevocationRequestDTO>>(
    withParams(
      apiPath(CARD_REVOCATION_REQUEST_ROUTES.BASE, CARD_REVOCATION_REQUEST_ROUTES.APPROVE),
      {
        id,
      },
    ),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function reject(
  id: string,
  command: ReviewCardRevocationRequestCommand,
): Promise<CardRevocationRequestDTO> {
  const res = await api.post<ApiResponse<CardRevocationRequestDTO>>(
    withParams(
      apiPath(CARD_REVOCATION_REQUEST_ROUTES.BASE, CARD_REVOCATION_REQUEST_ROUTES.REJECT),
      {
        id,
      },
    ),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function cancel(id: string): Promise<CardRevocationRequestDTO> {
  const res = await api.post<ApiResponse<CardRevocationRequestDTO>>(
    withParams(
      apiPath(CARD_REVOCATION_REQUEST_ROUTES.BASE, CARD_REVOCATION_REQUEST_ROUTES.CANCEL),
      {
        id,
      },
    ),
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}
