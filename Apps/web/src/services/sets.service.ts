import {
  SET_ROUTES,
  type ApiResponse,
  type SetDTO,
  type PaginatedSets,
  type GetSetsQuery,
  type CreateSetCommand,
  type TransitionSetCommand,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath, withParams } from "@/lib/api-path";

export async function getAll(query: GetSetsQuery, signal?: AbortSignal): Promise<PaginatedSets> {
  const res = await api.get<ApiResponse<PaginatedSets>>(
    apiPath(SET_ROUTES.BASE, SET_ROUTES.GET_ALL),
    {
      params: query,
      signal,
    },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function create(command: CreateSetCommand): Promise<SetDTO> {
  const res = await api.post<ApiResponse<SetDTO>>(
    apiPath(SET_ROUTES.BASE, SET_ROUTES.CREATE),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

// TransitionSetCommand.to is constrained to PENDING_PRINTING | PRINTED by the contract.
export async function transition(id: string, command: TransitionSetCommand): Promise<SetDTO> {
  const res = await api.post<ApiResponse<SetDTO>>(
    withParams(apiPath(SET_ROUTES.BASE, SET_ROUTES.TRANSITION), { id }),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function remove(id: string): Promise<void> {
  await api.delete(withParams(apiPath(SET_ROUTES.BASE, SET_ROUTES.DELETE), { id }));
}
