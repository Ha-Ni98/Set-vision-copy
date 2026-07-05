import {
  DistributorResponseSchema,
  DistributorDetailResponseSchema,
  PaginatedDistributorsSchema,
  type DistributorDTO,
  type DistributorDetailDTO,
  type PaginatedDistributors,
} from "@my-app/contract";

export const mockDistributor: DistributorDTO = DistributorResponseSchema.parse({
  id: "f3000000-0000-4000-8000-000000000001",
  fullName: "Karim Ferhat",
  storeName: "Store Alger Centre",
  phone: "0555444555",
  wilayaId: "f1000000-0000-4000-8000-000000000001",
  wilayaName: "Alger",
  communeId: "f2000000-0000-4000-8000-000000000001",
  communeName: "Sidi M'Hamed",
  isEnabled: true,
  nbOfActiveCards: 45,
  nbOfActivation: 120,
  deliveredOrdersCount: 8,
  createdAt: "2026-02-01T09:00:00.000Z",
});

export const mockDistributorDetail: DistributorDetailDTO = DistributorDetailResponseSchema.parse({
  ...mockDistributor,
  soldKeys: 200,
  ordersCount: 10,
});

export const mockPaginatedDistributors: PaginatedDistributors = PaginatedDistributorsSchema.parse({
  items: [mockDistributor],
  meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
});
