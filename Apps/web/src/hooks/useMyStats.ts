import { useQuery } from "@tanstack/react-query";
import * as activatorService from "@/services/activator.service";

export function useMyStats() {
  return useQuery({
    queryKey: ["activator", "my-stats"],
    queryFn: activatorService.getMyStats,
  });
}
