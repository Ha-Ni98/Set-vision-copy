import { describe, it, expect } from "vitest";
import { DeliveryType, OrderStat } from "@my-app/contract";
import { server } from "../../fixtures/msw/server";
import { orderErrorHandlers } from "../../fixtures/msw/orders.handlers";
import {
  mockPaginatedOrders,
  mockOrderDetail,
  mockOrderPendingDelivery,
} from "../../fixtures/data/orders.mock";
import * as ordersService from "@/services/orders.service";

describe("orders.service", () => {
  it("getAll returns the unwrapped paginated result", async () => {
    const result = await ordersService.getAll({});
    expect(result).toEqual(mockPaginatedOrders);
  });

  it("getAll throws on 500", async () => {
    server.use(orderErrorHandlers.getAllServerError());
    await expect(ordersService.getAll({})).rejects.toMatchObject({ response: { status: 500 } });
  });

  it("getById returns the unwrapped detail DTO (with its embedded lots array)", async () => {
    const result = await ordersService.getById("id");
    expect(result).toEqual(mockOrderDetail);
  });

  it("create returns the unwrapped DTO (201)", async () => {
    const result = await ordersService.create({
      distributorId: "id",
      lotIds: ["id"],
      receivedName: "Karim Ferhat",
      receivedPhone: "0555444555",
      wilayaId: "id",
      communeId: "id",
      deliveryCompanyId: "id",
      deliveryType: DeliveryType.HOME,
      orderPrice: 15000,
      deliverPrice: 500,
    });
    expect(result).toEqual(mockOrderPendingDelivery);
  });

  it("create throws on a 400 validation error", async () => {
    server.use(orderErrorHandlers.createValidationError());
    await expect(
      ordersService.create({
        distributorId: "id",
        lotIds: ["id"],
        receivedName: "Karim Ferhat",
        receivedPhone: "0555444555",
        wilayaId: "id",
        communeId: "id",
        deliveryCompanyId: "id",
        deliveryType: DeliveryType.HOME,
        orderPrice: 15000,
        deliverPrice: 500,
      }),
    ).rejects.toMatchObject({ response: { status: 400 } });
  });

  it("transition sends the command without deliveredCount (it's optional) and returns the unwrapped DTO", async () => {
    const result = await ordersService.transition("id", { to: OrderStat.IN_DELIVERY });
    expect(result).toEqual(mockOrderPendingDelivery);
  });

  it("transition sends the command with deliveredCount and returns the unwrapped DTO", async () => {
    const result = await ordersService.transition("id", {
      to: OrderStat.DELIVERED,
      deliveredCount: 50,
    });
    expect(result).toEqual(mockOrderPendingDelivery);
  });

  it("remove resolves void on 204", async () => {
    await expect(ordersService.remove("id")).resolves.toBeUndefined();
  });
});
