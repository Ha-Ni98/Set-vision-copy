import { useQuery } from "@tanstack/react-query";
import * as distributorsService from "@/services/distributors.service";
import { qk } from "@/lib/query-keys";

export function useDistributorDashboard() {
  return useQuery({
    queryKey: qk.distributors.myDashboard(),
    queryFn: ({ signal }) => distributorsService.getMyDashboard(signal),
  });
}
