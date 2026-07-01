import type { Payment, Admin } from '@prisma/client';
import { PaymentResponseSchema, type PaymentDTO } from '@my-app/contract';

export class PaymentMapper {
  static toDTO(payment: Payment, admin: Admin): PaymentDTO {
    const dto = {
      id: payment.id,
      activatorId: payment.activatorId,
      amount: Number(payment.totalAmount.toFixed(2)),
      previousCredits: Number(payment.previousCredits.toFixed(2)),
      paymentDate: payment.paymentDate.toISOString(),
      recordedByName: admin.fullName,
      isDeleted: payment.isDeleted,
    };
    return PaymentResponseSchema.parse(dto);
  }
}
