import { useQuery } from "@tanstack/react-query";
import * as activationsService from "@/services/activations.service";

export function useActiveRequests() {
  return useQuery({
    queryKey: ["activations", "active"],
    queryFn: activationsService.getActive,
  });
}
