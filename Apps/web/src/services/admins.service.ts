import {
  ADMIN_ROUTES,
  type ApiResponse,
  type AdminDTO,
  type AdminWithCredentialsDTO,
  type AdminGeneratedPasswordDTO,
  type PaginatedAdmins,
  type GetAdminsQuery,
  type CreateAdminCommand,
  type UpdateAdminCommand,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath, withParams } from "@/lib/api-path";

export async function getAll(
  query: GetAdminsQuery,
  signal?: AbortSignal,
): Promise<PaginatedAdmins> {
  const res = await api.get<ApiResponse<PaginatedAdmins>>(
    apiPath(ADMIN_ROUTES.BASE, ADMIN_ROUTES.GET_ALL),
    {
      params: query,
      signal,
    },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function create(command: CreateAdminCommand): Promise<AdminWithCredentialsDTO> {
  const res = await api.post<ApiResponse<AdminWithCredentialsDTO>>(
    apiPath(ADMIN_ROUTES.BASE, ADMIN_ROUTES.CREATE),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getById(id: string, signal?: AbortSignal): Promise<AdminDTO> {
  const res = await api.get<ApiResponse<AdminDTO>>(
    withParams(apiPath(ADMIN_ROUTES.BASE, ADMIN_ROUTES.GET_BY_ID), { id }),
    {
      signal,
    },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function update(id: string, command: UpdateAdminCommand): Promise<AdminDTO> {
  const res = await api.patch<ApiResponse<AdminDTO>>(
    withParams(apiPath(ADMIN_ROUTES.BASE, ADMIN_ROUTES.UPDATE), { id }),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function toggle(id: string): Promise<AdminDTO> {
  const res = await api.post<ApiResponse<AdminDTO>>(
    withParams(apiPath(ADMIN_ROUTES.BASE, ADMIN_ROUTES.TOGGLE), { id }),
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function resetPassword(id: string): Promise<AdminGeneratedPasswordDTO> {
  const res = await api.post<ApiResponse<AdminGeneratedPasswordDTO>>(
    withParams(apiPath(ADMIN_ROUTES.BASE, ADMIN_ROUTES.RESET_PASSWORD), { id }),
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function remove(id: string): Promise<void> {
  await api.delete(withParams(apiPath(ADMIN_ROUTES.BASE, ADMIN_ROUTES.DELETE), { id }));
}
