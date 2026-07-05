import {
  DELIVERY_COMPANY_ROUTES,
  type ApiResponse,
  type DeliveryCompanyDTO,
  type GetDeliveryCompaniesQuery,
  type CreateDeliveryCompanyCommand,
  type UpdateDeliveryCompanyCommand,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath, withParams } from "@/lib/api-path";

export async function getAll(
  query: GetDeliveryCompaniesQuery,
  signal?: AbortSignal,
): Promise<DeliveryCompanyDTO[]> {
  const res = await api.get<ApiResponse<DeliveryCompanyDTO[]>>(
    apiPath(DELIVERY_COMPANY_ROUTES.BASE, DELIVERY_COMPANY_ROUTES.GET_ALL),
    { params: query, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function create(command: CreateDeliveryCompanyCommand): Promise<DeliveryCompanyDTO> {
  const res = await api.post<ApiResponse<DeliveryCompanyDTO>>(
    apiPath(DELIVERY_COMPANY_ROUTES.BASE, DELIVERY_COMPANY_ROUTES.CREATE),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function update(
  id: string,
  command: UpdateDeliveryCompanyCommand,
): Promise<DeliveryCompanyDTO> {
  const res = await api.patch<ApiResponse<DeliveryCompanyDTO>>(
    withParams(apiPath(DELIVERY_COMPANY_ROUTES.BASE, DELIVERY_COMPANY_ROUTES.UPDATE), { id }),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function toggle(id: string): Promise<DeliveryCompanyDTO> {
  const res = await api.post<ApiResponse<DeliveryCompanyDTO>>(
    withParams(apiPath(DELIVERY_COMPANY_ROUTES.BASE, DELIVERY_COMPANY_ROUTES.TOGGLE), { id }),
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}
