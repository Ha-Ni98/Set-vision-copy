import {
  ORDER_ROUTES,
  type ApiResponse,
  type OrderDTO,
  type OrderDetailDTO,
  type PaginatedOrders,
  type GetOrdersQuery,
  type GetMyOrdersQuery,
  type CreateOrderCommand,
  type TransitionOrderCommand,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath, withParams } from "@/lib/api-path";

export async function getAll(
  query: GetOrdersQuery,
  signal?: AbortSignal,
): Promise<PaginatedOrders> {
  const res = await api.get<ApiResponse<PaginatedOrders>>(
    apiPath(ORDER_ROUTES.BASE, ORDER_ROUTES.GET_ALL),
    {
      params: query,
      signal,
    },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getById(id: string, signal?: AbortSignal): Promise<OrderDetailDTO> {
  const res = await api.get<ApiResponse<OrderDetailDTO>>(
    withParams(apiPath(ORDER_ROUTES.BASE, ORDER_ROUTES.GET_BY_ID), { id }),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function create(command: CreateOrderCommand): Promise<OrderDTO> {
  const res = await api.post<ApiResponse<OrderDTO>>(
    apiPath(ORDER_ROUTES.BASE, ORDER_ROUTES.CREATE),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

// TransitionOrderCommand.to is constrained to IN_DELIVERY | DELIVERED | RETURNED by the
// contract; deliveredCount is optional.
export async function transition(id: string, command: TransitionOrderCommand): Promise<OrderDTO> {
  const res = await api.post<ApiResponse<OrderDTO>>(
    withParams(apiPath(ORDER_ROUTES.BASE, ORDER_ROUTES.TRANSITION), { id }),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function remove(id: string): Promise<void> {
  await api.delete(withParams(apiPath(ORDER_ROUTES.BASE, ORDER_ROUTES.DELETE), { id }));
}

// ─── Distributor-facing ───────────────────────────────────────────────────────

export async function getMine(
  query: GetMyOrdersQuery,
  signal?: AbortSignal,
): Promise<PaginatedOrders> {
  const res = await api.get<ApiResponse<PaginatedOrders>>(
    apiPath(ORDER_ROUTES.BASE, ORDER_ROUTES.GET_MINE),
    { params: query, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getMineById(id: string, signal?: AbortSignal): Promise<OrderDetailDTO> {
  const res = await api.get<ApiResponse<OrderDetailDTO>>(
    withParams(apiPath(ORDER_ROUTES.BASE, ORDER_ROUTES.GET_MINE_BY_ID), { id }),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}
