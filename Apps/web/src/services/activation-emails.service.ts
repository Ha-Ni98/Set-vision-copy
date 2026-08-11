import {
  ACTIVATION_EMAIL_ROUTES,
  type ApiResponse,
  type ActivationEmailDTO,
  type PaginatedActivationEmails,
  type ActivationEmailOptionDTO,
  type GetActivationEmailsQuery,
  type CreateActivationEmailCommand,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath, withParams } from "@/lib/api-path";

export async function getAll(
  query: GetActivationEmailsQuery,
  signal?: AbortSignal,
): Promise<PaginatedActivationEmails> {
  const res = await api.get<ApiResponse<PaginatedActivationEmails>>(
    apiPath(ACTIVATION_EMAIL_ROUTES.BASE, ACTIVATION_EMAIL_ROUTES.GET_ALL),
    { params: query, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getPool(
  subscriptionPlanId: string,
  signal?: AbortSignal,
): Promise<ActivationEmailOptionDTO[]> {
  const res = await api.get<ApiResponse<ActivationEmailOptionDTO[]>>(
    apiPath(ACTIVATION_EMAIL_ROUTES.BASE, ACTIVATION_EMAIL_ROUTES.GET_POOL),
    { params: { subscriptionPlanId }, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function create(command: CreateActivationEmailCommand): Promise<ActivationEmailDTO> {
  const res = await api.post<ApiResponse<ActivationEmailDTO>>(
    apiPath(ACTIVATION_EMAIL_ROUTES.BASE, ACTIVATION_EMAIL_ROUTES.CREATE),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function remove(id: string): Promise<void> {
  await api.delete(
    withParams(apiPath(ACTIVATION_EMAIL_ROUTES.BASE, ACTIVATION_EMAIL_ROUTES.DELETE), { id }),
  );
}
