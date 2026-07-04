import { useQuery } from "@tanstack/react-query";
import * as geographyService from "@/services/geography.service";
import { qk } from "@/lib/query-keys";

// Static reference data — never goes stale within a session (plan.md §2.9).
export function useWilayas() {
  return useQuery({
    queryKey: qk.geography.wilayas(),
    queryFn: ({ signal }) => geographyService.getWilayas(signal),
    staleTime: Infinity,
  });
}

export function useCommunes(wilayaId: string | undefined) {
  return useQuery({
    queryKey: qk.geography.communes(wilayaId ?? ""),
    queryFn: ({ signal }) => geographyService.getCommunes(wilayaId!, signal),
    enabled: !!wilayaId,
    staleTime: Infinity,
  });
}
