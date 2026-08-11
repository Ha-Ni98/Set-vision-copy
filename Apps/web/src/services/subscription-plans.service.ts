import {
  SUBSCRIPTION_PLAN_ROUTES,
  type ApiResponse,
  type SubscriptionPlanDTO,
  type CommissionDurationDTO,
  type CommissionMatrixDTO,
  type CommissionCellDTO,
  type SubscriptionPlanCostDTO,
  type GetSubscriptionPlansQuery,
  type CreateSubscriptionPlanCommand,
  type UpdateCommissionCommand,
  type UpdateSubscriptionPlanCostCommand,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath, withParams } from "@/lib/api-path";

export async function getAll(
  query: GetSubscriptionPlansQuery,
  signal?: AbortSignal,
): Promise<SubscriptionPlanDTO[]> {
  const res = await api.get<ApiResponse<SubscriptionPlanDTO[]>>(
    apiPath(SUBSCRIPTION_PLAN_ROUTES.BASE, SUBSCRIPTION_PLAN_ROUTES.GET_ALL),
    { params: query, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function create(command: CreateSubscriptionPlanCommand): Promise<SubscriptionPlanDTO> {
  const res = await api.post<ApiResponse<SubscriptionPlanDTO>>(
    apiPath(SUBSCRIPTION_PLAN_ROUTES.BASE, SUBSCRIPTION_PLAN_ROUTES.CREATE),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function toggle(id: string): Promise<SubscriptionPlanDTO> {
  const res = await api.post<ApiResponse<SubscriptionPlanDTO>>(
    withParams(apiPath(SUBSCRIPTION_PLAN_ROUTES.BASE, SUBSCRIPTION_PLAN_ROUTES.TOGGLE), { id }),
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getCommissionDurations(
  signal?: AbortSignal,
): Promise<CommissionDurationDTO[]> {
  const res = await api.get<ApiResponse<CommissionDurationDTO[]>>(
    apiPath(SUBSCRIPTION_PLAN_ROUTES.BASE, SUBSCRIPTION_PLAN_ROUTES.GET_COMMISSION_DURATIONS),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getCommissions(signal?: AbortSignal): Promise<CommissionMatrixDTO> {
  const res = await api.get<ApiResponse<CommissionMatrixDTO>>(
    apiPath(SUBSCRIPTION_PLAN_ROUTES.BASE, SUBSCRIPTION_PLAN_ROUTES.GET_COMMISSIONS),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function updateCommission(
  command: UpdateCommissionCommand,
): Promise<CommissionCellDTO> {
  const res = await api.patch<ApiResponse<CommissionCellDTO>>(
    apiPath(SUBSCRIPTION_PLAN_ROUTES.BASE, SUBSCRIPTION_PLAN_ROUTES.UPDATE_COMMISSION),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getCosts(signal?: AbortSignal): Promise<SubscriptionPlanCostDTO[]> {
  const res = await api.get<ApiResponse<SubscriptionPlanCostDTO[]>>(
    apiPath(SUBSCRIPTION_PLAN_ROUTES.BASE, SUBSCRIPTION_PLAN_ROUTES.GET_COSTS),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function updateCost(
  command: UpdateSubscriptionPlanCostCommand,
): Promise<SubscriptionPlanCostDTO> {
  const res = await api.patch<ApiResponse<SubscriptionPlanCostDTO>>(
    apiPath(SUBSCRIPTION_PLAN_ROUTES.BASE, SUBSCRIPTION_PLAN_ROUTES.UPDATE_COST),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}
