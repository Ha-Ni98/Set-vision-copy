import {
  OrderResponseSchema,
  OrderDetailResponseSchema,
  PaginatedOrdersSchema,
  OrderStat,
  DeliveryType,
  LotStat,
  type OrderDTO,
  type OrderDetailDTO,
  type PaginatedOrders,
} from "@my-app/contract";

export const mockOrderPendingDelivery: OrderDTO = OrderResponseSchema.parse({
  id: "91000000-0000-4000-8000-000000000001",
  orderNumber: "ORD-2026-001",
  distributorId: "f3000000-0000-4000-8000-000000000001",
  distributorName: "Store Alger Centre",
  receivedName: "Karim Ferhat",
  receivedPhone: "0555444555",
  wilayaId: "f1000000-0000-4000-8000-000000000001",
  wilayaName: "Alger",
  communeId: "f2000000-0000-4000-8000-000000000001",
  communeName: "Sidi M'Hamed",
  deliveryCompanyId: "f4000000-0000-4000-8000-000000000001",
  deliveryCompanyName: "Yalidine",
  deliveryType: DeliveryType.HOME,
  lotNumbers: ["LOT-2026-001"],
  cardsCount: 50,
  orderPrice: 15000,
  deliverPrice: 500,
  cardsDeliveredCount: 0,
  orderStat: OrderStat.PENDING_DELIVERY,
  createdAt: "2026-06-10T09:00:00.000Z",
  completedAt: null,
});

// completedAt is null until the order reaches a terminal state (plan.md §4.1).
export const mockOrderDelivered: OrderDTO = OrderResponseSchema.parse({
  ...mockOrderPendingDelivery,
  id: "91000000-0000-4000-8000-000000000002",
  orderNumber: "ORD-2026-002",
  cardsDeliveredCount: 50,
  orderStat: OrderStat.DELIVERED,
  completedAt: "2026-06-12T09:00:00.000Z",
});

export const mockOrderDetail: OrderDetailDTO = OrderDetailResponseSchema.parse({
  ...mockOrderPendingDelivery,
  lots: [
    {
      lotId: "72000000-0000-4000-8000-000000000001",
      lotNumber: "LOT-2026-001",
      subscriptionLabel: "Snapchat+ — 1 Month",
      cardsCount: 50,
      lotStat: LotStat.DELIVERED,
    },
  ],
});

export const mockPaginatedOrders: PaginatedOrders = PaginatedOrdersSchema.parse({
  items: [mockOrderPendingDelivery, mockOrderDelivered],
  meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
});
