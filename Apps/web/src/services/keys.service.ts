import {
  KEY_ROUTES,
  type ApiResponse,
  type VerifyKeyCommand,
  type KeyVerificationDTO,
  type SubmitActivationCommand,
  type UpdateActivationCommand,
  type SubmitAdditionalInfoCommand,
  type ClientActivationStatusDTO,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath, withParams } from "@/lib/api-path";

export async function verifyKey(command: VerifyKeyCommand): Promise<KeyVerificationDTO> {
  const res = await api.post<ApiResponse<KeyVerificationDTO>>(
    apiPath(KEY_ROUTES.BASE, KEY_ROUTES.VERIFY),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function submitActivation(
  command: SubmitActivationCommand,
): Promise<ClientActivationStatusDTO> {
  const res = await api.post<ApiResponse<ClientActivationStatusDTO>>(
    apiPath(KEY_ROUTES.BASE, KEY_ROUTES.SUBMIT),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

// The API registers this as POST, not PATCH (verified against Apps/api's key.routes.ts) —
// the Sub-01 stub's TODO comment named the wrong verb.
export async function updateActivation(
  activationId: string,
  command: UpdateActivationCommand,
): Promise<ClientActivationStatusDTO> {
  const res = await api.post<ApiResponse<ClientActivationStatusDTO>>(
    withParams(apiPath(KEY_ROUTES.BASE, KEY_ROUTES.UPDATE), { activationId }),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function submitAdditionalInfo(
  activationId: string,
  command: SubmitAdditionalInfoCommand,
): Promise<ClientActivationStatusDTO> {
  const res = await api.post<ApiResponse<ClientActivationStatusDTO>>(
    withParams(apiPath(KEY_ROUTES.BASE, KEY_ROUTES.ADDITIONAL), { activationId }),
    command,
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getActivationStatus(
  activationId: string,
): Promise<ClientActivationStatusDTO> {
  const res = await api.get<ApiResponse<ClientActivationStatusDTO>>(
    withParams(apiPath(KEY_ROUTES.BASE, KEY_ROUTES.STATUS), { activationId }),
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}
