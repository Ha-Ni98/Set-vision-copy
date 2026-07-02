import {
  PAYMENT_ROUTES,
  type ApiResponse,
  type PaymentDTO,
  type PaginatedPayments,
  type GetPaymentsQuery,
  type RecordPaymentCommand,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath, withParams } from "@/lib/api-path";

export async function getAll(
  query: GetPaymentsQuery,
  signal?: AbortSignal,
): Promise<PaginatedPayments> {
  const res = await api.get<ApiResponse<PaginatedPayments>>(
    apiPath(PAYMENT_ROUTES.BASE, PAYMENT_ROUTES.GET_ALL),
    {
      params: query,
      signal,
    },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function record(command: RecordPaymentCommand): Promise<PaymentDTO> {
  const res = await api.post<ApiResponse<PaymentDTO>>(
    apiPath(PAYMENT_ROUTES.BASE, PAYMENT_ROUTES.CREATE),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function remove(id: string): Promise<void> {
  await api.delete(withParams(apiPath(PAYMENT_ROUTES.BASE, PAYMENT_ROUTES.DELETE), { id }));
}
