import type {
  PaymentDTO,
  PaginatedPayments,
  GetPaymentsQuery,
  RecordPaymentCommand,
} from '@my-app/contract';

export interface IPaymentService {
  getAll(query: GetPaymentsQuery): Promise<PaginatedPayments>;
  create(cmd: RecordPaymentCommand, actorUserId: string): Promise<PaymentDTO>;
  delete(id: string, actorUserId: string): Promise<void>;
}
