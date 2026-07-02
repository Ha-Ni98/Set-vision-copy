import { useQuery } from "@tanstack/react-query";
import * as activationsService from "@/services/activations.service";

export function usePendingActivations() {
  return useQuery({
    queryKey: ["activations", "pending"],
    queryFn: activationsService.getPending,
  });
}
