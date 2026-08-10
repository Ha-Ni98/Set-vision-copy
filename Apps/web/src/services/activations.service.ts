import {
  ACTIVATION_ROUTES,
  type ApiResponse,
  type ActiveRequestDTO,
  type PendingActivationDTO,
  type PaginatedActivatorHistory,
  type RecentActivationDTO,
  type GetActivatorHistoryQuery,
  type FlagWrongInfoCommand,
  type RequestAdditionalInfoCommand,
  type FreezeRequestCommand,
  type PaginatedActivations,
  type ActivationDetailDTO,
  type AdminActivationDTO,
  type SetActivatorPriceCommand,
  type GetActivationsQuery,
  type ActivateActivationCommand,
  type PaginatedDistributorActivations,
  type DistributorActivationDetailDTO,
  type GetDistributorActivationsQuery,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath, withParams } from "@/lib/api-path";

// ─── Activator-facing ────────────────────────────────────────────────────────

export async function getPending(signal?: AbortSignal): Promise<PendingActivationDTO[]> {
  const res = await api.get<ApiResponse<PendingActivationDTO[]>>(
    apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.GET_PENDING),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getActive(signal?: AbortSignal): Promise<ActiveRequestDTO[]> {
  const res = await api.get<ApiResponse<ActiveRequestDTO[]>>(
    apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.GET_ACTIVE),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function take(id: string): Promise<ActiveRequestDTO> {
  const res = await api.post<ApiResponse<ActiveRequestDTO>>(
    withParams(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.TAKE), { id }),
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function flagWrongInfo(
  id: string,
  command: FlagWrongInfoCommand,
): Promise<ActiveRequestDTO> {
  const res = await api.post<ApiResponse<ActiveRequestDTO>>(
    withParams(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.FLAG_WRONG), { id }),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function requestAdditionalInfo(
  id: string,
  command: RequestAdditionalInfoCommand,
): Promise<ActiveRequestDTO> {
  const res = await api.post<ApiResponse<ActiveRequestDTO>>(
    withParams(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.REQUEST_ADDITIONAL), { id }),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

// Stage-04-fix #2: now takes a required ActivateActivationCommand ({ activationEmail }),
// stored on the activation and surfaced later in the recent-activation tables.
export async function activate(
  id: string,
  command: ActivateActivationCommand,
): Promise<ActiveRequestDTO> {
  const res = await api.post<ApiResponse<ActiveRequestDTO>>(
    withParams(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.ACTIVATE), { id }),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function cancel(id: string): Promise<void> {
  await api.post(withParams(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.CANCEL), { id }));
}

export async function release(id: string): Promise<void> {
  await api.post(withParams(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.RELEASE), { id }));
}

export async function freeze(id: string, command: FreezeRequestCommand): Promise<ActiveRequestDTO> {
  const res = await api.post<ApiResponse<ActiveRequestDTO>>(
    withParams(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.FREEZE), { id }),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getMyHistory(
  query: GetActivatorHistoryQuery,
  signal?: AbortSignal,
): Promise<PaginatedActivatorHistory> {
  const res = await api.get<ApiResponse<PaginatedActivatorHistory>>(
    apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.GET_MY_HISTORY),
    { params: query, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getRecent(signal?: AbortSignal): Promise<RecentActivationDTO[]> {
  const res = await api.get<ApiResponse<RecentActivationDTO[]>>(
    apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.GET_RECENT),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

// ─── Admin-facing ────────────────────────────────────────────────────────────

export async function getAll(
  query: GetActivationsQuery,
  signal?: AbortSignal,
): Promise<PaginatedActivations> {
  const res = await api.get<ApiResponse<PaginatedActivations>>(
    apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.GET_ALL),
    { params: query, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getById(id: string, signal?: AbortSignal): Promise<ActivationDetailDTO> {
  const res = await api.get<ApiResponse<ActivationDetailDTO>>(
    withParams(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.GET_BY_ID), { id }),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

// Stage-04-fix #2: now takes a required ActivateActivationCommand ({ activationEmail }).
export async function activateByAdmin(
  id: string,
  command: ActivateActivationCommand,
): Promise<AdminActivationDTO> {
  const res = await api.post<ApiResponse<AdminActivationDTO>>(
    withParams(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.ACTIVATE_BY_ADMIN), { id }),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function cancelByAdmin(id: string): Promise<AdminActivationDTO> {
  const res = await api.post<ApiResponse<AdminActivationDTO>>(
    withParams(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.CANCEL_BY_ADMIN), { id }),
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function setPrice(
  id: string,
  command: SetActivatorPriceCommand,
): Promise<AdminActivationDTO> {
  const res = await api.post<ApiResponse<AdminActivationDTO>>(
    withParams(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.SET_PRICE), { id }),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

// ─── Distributor-facing ───────────────────────────────────────────────────────

export async function getOnMyCards(
  query: GetDistributorActivationsQuery,
  signal?: AbortSignal,
): Promise<PaginatedDistributorActivations> {
  const res = await api.get<ApiResponse<PaginatedDistributorActivations>>(
    apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.GET_ON_MY_CARDS),
    { params: query, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getOnMyCardsById(
  id: string,
  signal?: AbortSignal,
): Promise<DistributorActivationDetailDTO> {
  const res = await api.get<ApiResponse<DistributorActivationDetailDTO>>(
    withParams(apiPath(ACTIVATION_ROUTES.BASE, ACTIVATION_ROUTES.GET_ON_MY_CARDS_BY_ID), { id }),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}
