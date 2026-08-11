import { useQuery } from "@tanstack/react-query";
import type { GetMyOrdersQuery } from "@my-app/contract";
import * as ordersService from "@/services/orders.service";
import { qk } from "@/lib/query-keys";

export function useMyOrders(query: GetMyOrdersQuery) {
  return useQuery({
    queryKey: qk.orders.mine(query),
    queryFn: ({ signal }) => ordersService.getMine(query, signal),
  });
}

export function useMyOrder(id: string) {
  return useQuery({
    queryKey: qk.orders.mineDetail(id),
    queryFn: ({ signal }) => ordersService.getMineById(id, signal),
    enabled: !!id,
  });
}
