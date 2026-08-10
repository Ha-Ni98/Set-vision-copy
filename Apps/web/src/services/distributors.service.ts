import {
  DISTRIBUTOR_ROUTES,
  type ApiResponse,
  type DistributorDTO,
  type DistributorDetailDTO,
  type DistributorWithCredentialsDTO,
  type DistributorDashboardDTO,
  type PaginatedDistributors,
  type GetDistributorsQuery,
  type CreateDistributorCommand,
  type UpdateDistributorCommand,
  type CreateDistributorAccountCommand,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath, withParams } from "@/lib/api-path";

export async function getMyDashboard(signal?: AbortSignal): Promise<DistributorDashboardDTO> {
  const res = await api.get<ApiResponse<DistributorDashboardDTO>>(
    apiPath(DISTRIBUTOR_ROUTES.BASE, DISTRIBUTOR_ROUTES.MY_DASHBOARD),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getAll(
  query: GetDistributorsQuery,
  signal?: AbortSignal,
): Promise<PaginatedDistributors> {
  const res = await api.get<ApiResponse<PaginatedDistributors>>(
    apiPath(DISTRIBUTOR_ROUTES.BASE, DISTRIBUTOR_ROUTES.GET_ALL),
    { params: query, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function create(command: CreateDistributorCommand): Promise<DistributorDTO> {
  const res = await api.post<ApiResponse<DistributorDTO>>(
    apiPath(DISTRIBUTOR_ROUTES.BASE, DISTRIBUTOR_ROUTES.CREATE),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getById(id: string, signal?: AbortSignal): Promise<DistributorDetailDTO> {
  const res = await api.get<ApiResponse<DistributorDetailDTO>>(
    withParams(apiPath(DISTRIBUTOR_ROUTES.BASE, DISTRIBUTOR_ROUTES.GET_BY_ID), { id }),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function update(
  id: string,
  command: UpdateDistributorCommand,
): Promise<DistributorDTO> {
  const res = await api.patch<ApiResponse<DistributorDTO>>(
    withParams(apiPath(DISTRIBUTOR_ROUTES.BASE, DISTRIBUTOR_ROUTES.UPDATE), { id }),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function toggle(id: string): Promise<DistributorDTO> {
  const res = await api.post<ApiResponse<DistributorDTO>>(
    withParams(apiPath(DISTRIBUTOR_ROUTES.BASE, DISTRIBUTOR_ROUTES.TOGGLE), { id }),
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function remove(id: string): Promise<void> {
  await api.delete(withParams(apiPath(DISTRIBUTOR_ROUTES.BASE, DISTRIBUTOR_ROUTES.DELETE), { id }));
}

export async function createAccount(
  id: string,
  command: CreateDistributorAccountCommand,
): Promise<DistributorWithCredentialsDTO> {
  const res = await api.post<ApiResponse<DistributorWithCredentialsDTO>>(
    withParams(apiPath(DISTRIBUTOR_ROUTES.BASE, DISTRIBUTOR_ROUTES.CREATE_ACCOUNT), { id }),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function unlinkAccount(id: string): Promise<DistributorDTO> {
  const res = await api.delete<ApiResponse<DistributorDTO>>(
    withParams(apiPath(DISTRIBUTOR_ROUTES.BASE, DISTRIBUTOR_ROUTES.UNLINK_ACCOUNT), { id }),
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}
