import {
  PaymentResponseSchema,
  PaginatedPaymentsSchema,
  type PaymentDTO,
  type PaginatedPayments,
} from "@my-app/contract";

export const mockPayment: PaymentDTO = PaymentResponseSchema.parse({
  id: "e1000000-0000-4000-8000-000000000001",
  activatorId: "c1000000-0000-4000-8000-000000000001",
  amount: 5000,
  previousCredits: 300,
  paymentDate: "2026-07-01T10:00:00.000Z",
  recordedByName: "Sara Haddad",
  isDeleted: false,
});

export const mockPaymentDeleted: PaymentDTO = PaymentResponseSchema.parse({
  ...mockPayment,
  id: "e1000000-0000-4000-8000-000000000002",
  isDeleted: true,
});

export const mockPaginatedPayments: PaginatedPayments = PaginatedPaymentsSchema.parse({
  items: [mockPayment],
  meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
});
