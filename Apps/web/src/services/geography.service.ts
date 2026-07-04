import {
  GEOGRAPHY_ROUTES,
  type ApiResponse,
  type WilayaDTO,
  type CommuneDTO,
} from "@my-app/contract";
import { api } from "@/lib/axios";
import { apiPath, withParams } from "@/lib/api-path";

export async function getWilayas(signal?: AbortSignal): Promise<WilayaDTO[]> {
  const res = await api.get<ApiResponse<WilayaDTO[]>>(
    apiPath(GEOGRAPHY_ROUTES.BASE, GEOGRAPHY_ROUTES.GET_WILAYAS),
    {
      signal,
    },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}

export async function getCommunes(wilayaId: string, signal?: AbortSignal): Promise<CommuneDTO[]> {
  const res = await api.get<ApiResponse<CommuneDTO[]>>(
    withParams(apiPath(GEOGRAPHY_ROUTES.BASE, GEOGRAPHY_ROUTES.GET_COMMUNES), { wilayaId }),
    { signal },
  );
  if (!res.data.success) throw new Error(res.data.error.message); // defensive
  return res.data.data;
}
