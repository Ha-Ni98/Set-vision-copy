import {
  ACTIVATOR_ROUTES,
  type ApiResponse,
  type ActivatorDTO,
  type ActivatorDetailDTO,
  type ActivatorWithCredentialsDTO,
  type ActivatorGeneratedPasswordDTO,
  type ActivatorPerformanceDTO,
  type ActivatorDashboardDTO,
  type PaginatedActivators,
  type GetActivatorsQuery,
  type CreateActivatorCommand,
  type UpdateActivatorCommand,
  type ActivatorPerformanceQuery,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath, withParams } from "@/lib/api-path";

export async function getMyStats(signal?: AbortSignal): Promise<ActivatorDashboardDTO> {
  const res = await api.get<ApiResponse<ActivatorDashboardDTO>>(
    apiPath(ACTIVATOR_ROUTES.BASE, ACTIVATOR_ROUTES.MY_STATS),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getAll(
  query: GetActivatorsQuery,
  signal?: AbortSignal,
): Promise<PaginatedActivators> {
  const res = await api.get<ApiResponse<PaginatedActivators>>(
    apiPath(ACTIVATOR_ROUTES.BASE, ACTIVATOR_ROUTES.GET_ALL),
    {
      params: query,
      signal,
    },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function create(
  command: CreateActivatorCommand,
): Promise<ActivatorWithCredentialsDTO> {
  const res = await api.post<ApiResponse<ActivatorWithCredentialsDTO>>(
    apiPath(ACTIVATOR_ROUTES.BASE, ACTIVATOR_ROUTES.CREATE),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getById(id: string, signal?: AbortSignal): Promise<ActivatorDetailDTO> {
  const res = await api.get<ApiResponse<ActivatorDetailDTO>>(
    withParams(apiPath(ACTIVATOR_ROUTES.BASE, ACTIVATOR_ROUTES.GET_BY_ID), { id }),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function update(id: string, command: UpdateActivatorCommand): Promise<ActivatorDTO> {
  const res = await api.patch<ApiResponse<ActivatorDTO>>(
    withParams(apiPath(ACTIVATOR_ROUTES.BASE, ACTIVATOR_ROUTES.UPDATE), { id }),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function toggle(id: string): Promise<ActivatorDTO> {
  const res = await api.post<ApiResponse<ActivatorDTO>>(
    withParams(apiPath(ACTIVATOR_ROUTES.BASE, ACTIVATOR_ROUTES.TOGGLE), { id }),
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function resetPassword(id: string): Promise<ActivatorGeneratedPasswordDTO> {
  const res = await api.post<ApiResponse<ActivatorGeneratedPasswordDTO>>(
    withParams(apiPath(ACTIVATOR_ROUTES.BASE, ACTIVATOR_ROUTES.RESET_PASSWORD), { id }),
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function remove(id: string): Promise<void> {
  await api.delete(withParams(apiPath(ACTIVATOR_ROUTES.BASE, ACTIVATOR_ROUTES.DELETE), { id }));
}

export async function getPerformance(
  id: string,
  query: ActivatorPerformanceQuery,
  signal?: AbortSignal,
): Promise<ActivatorPerformanceDTO> {
  const res = await api.get<ApiResponse<ActivatorPerformanceDTO>>(
    withParams(apiPath(ACTIVATOR_ROUTES.BASE, ACTIVATOR_ROUTES.PERFORMANCE), { id }),
    { params: query, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}
