import {
  NOTIFICATION_ROUTES,
  type ApiResponse,
  type NotificationDTO,
  type PaginatedNotifications,
  type GetNotificationsQuery,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath, withParams } from "@/lib/api-path";

export async function getAll(
  query: GetNotificationsQuery,
  signal?: AbortSignal,
): Promise<PaginatedNotifications> {
  const res = await api.get<ApiResponse<PaginatedNotifications>>(
    apiPath(NOTIFICATION_ROUTES.BASE, NOTIFICATION_ROUTES.GET_ALL),
    { params: query, signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function resend(id: string): Promise<NotificationDTO> {
  const res = await api.post<ApiResponse<NotificationDTO>>(
    withParams(apiPath(NOTIFICATION_ROUTES.BASE, NOTIFICATION_ROUTES.RESEND), { id }),
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}
