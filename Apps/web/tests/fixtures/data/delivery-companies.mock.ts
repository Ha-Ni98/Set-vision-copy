import { DeliveryCompanyResponseSchema, type DeliveryCompanyDTO } from "@my-app/contract";

export const mockDeliveryCompanyActive: DeliveryCompanyDTO = DeliveryCompanyResponseSchema.parse({
  id: "f4000000-0000-4000-8000-000000000001",
  name: "Yalidine",
  registeredName: "Yalidine Express SARL",
  isActive: true,
});

export const mockDeliveryCompanyInactive: DeliveryCompanyDTO = DeliveryCompanyResponseSchema.parse({
  id: "f4000000-0000-4000-8000-000000000002",
  name: "ZR Express",
  registeredName: "ZR Express SARL",
  isActive: false,
});

export const mockDeliveryCompanies: DeliveryCompanyDTO[] = [
  mockDeliveryCompanyActive,
  mockDeliveryCompanyInactive,
];
