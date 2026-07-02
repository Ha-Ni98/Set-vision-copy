import { useQuery } from "@tanstack/react-query";
import * as activationsService from "@/services/activations.service";

export function useRecentActivations() {
  return useQuery({
    queryKey: ["activations", "recent"],
    queryFn: activationsService.getRecent,
  });
}
