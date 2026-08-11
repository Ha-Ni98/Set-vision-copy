import {
  TELEGRAM_ROUTES,
  type ApiResponse,
  type TelegramLinkStatusDTO,
  type UserRole,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath, withParams } from "@/lib/api-path";

function linkPath(role: UserRole, profileId: string): string {
  return withParams(apiPath(TELEGRAM_ROUTES.BASE, TELEGRAM_ROUTES.LINK_STATUS), {
    role,
    profileId,
  });
}

export async function getLinkStatus(
  role: UserRole,
  profileId: string,
  signal?: AbortSignal,
): Promise<TelegramLinkStatusDTO> {
  const res = await api.get<ApiResponse<TelegramLinkStatusDTO>>(linkPath(role, profileId), {
    signal,
  });
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function generateToken(
  role: UserRole,
  profileId: string,
): Promise<TelegramLinkStatusDTO> {
  const res = await api.post<ApiResponse<TelegramLinkStatusDTO>>(linkPath(role, profileId));
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function unlink(role: UserRole, profileId: string): Promise<TelegramLinkStatusDTO> {
  const res = await api.delete<ApiResponse<TelegramLinkStatusDTO>>(linkPath(role, profileId));
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}
