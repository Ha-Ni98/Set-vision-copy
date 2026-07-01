import type { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import type { IPaymentService } from './payment.interface';
import { PaymentMapper } from './payment.mapper';
import { NotFoundError, ConflictError, BadRequestError } from '@common/errors';
import { LogActionType } from '@my-app/contract';
import { buildPaginationMeta, toSkipTake } from '@common/http/pagination';
import type {
  PaymentDTO,
  PaginatedPayments,
  GetPaymentsQuery,
  RecordPaymentCommand,
} from '@my-app/contract';

export class PaymentService implements IPaymentService {
  constructor(private prisma: PrismaClient) {}

  async getAll(query: GetPaymentsQuery): Promise<PaginatedPayments> {
    const conditions: Prisma.PaymentWhereInput[] = [];
    if (query.activatorId) conditions.push({ activatorId: query.activatorId });
    if (!query.includeDeleted) conditions.push({ isDeleted: false });

    const where: Prisma.PaymentWhereInput = conditions.length > 0 ? { AND: conditions } : {};

    const [rows, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: { admin: true },
        orderBy: { paymentDate: 'desc' },
        ...toSkipTake(query),
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      items: rows.map((p) => PaymentMapper.toDTO(p, p.admin)),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async create(cmd: RecordPaymentCommand, actorUserId: string): Promise<PaymentDTO> {
    const admin = await this.prisma.admin.findFirst({ where: { userId: actorUserId } });
    if (!admin) throw new NotFoundError('Admin not found for the current user');

    const activator = await this.prisma.activator.findUnique({ where: { id: cmd.activatorId } });
    if (!activator) throw new NotFoundError('Activator not found');

    if (cmd.amount <= 0) throw new BadRequestError('Amount must be positive');

    const currentCredits = Number(activator.credits.toFixed(2));
    if (cmd.amount > currentCredits) throw new ConflictError('Amount exceeds activator credits');

    const previousCredits = activator.credits;
    const amountDecimal = new Decimal(cmd.amount);

    const payment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          adminId: admin.id,
          activatorId: cmd.activatorId,
          totalAmount: amountDecimal,
          previousCredits,
          ...(cmd.date !== undefined && { paymentDate: new Date(cmd.date) }),
        },
        include: { admin: true },
      });

      await tx.activator.update({
        where: { id: cmd.activatorId },
        data: { credits: { decrement: amountDecimal } },
      });

      await tx.log.create({
        data: {
          actionType: LogActionType.SET_PAYMENT,
          actionDescription: `Recorded payment of ${cmd.amount} for activator ${cmd.activatorId}`,
          userId: actorUserId,
        },
      });

      return p;
    });

    return PaymentMapper.toDTO(payment, payment.admin);
  }

  async delete(id: string, actorUserId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundError('Payment not found');
    if (payment.isDeleted) throw new ConflictError('Payment already deleted');

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id },
        data: { isDeleted: true, deletedDate: new Date() },
      });

      await tx.activator.update({
        where: { id: payment.activatorId },
        data: { credits: { increment: payment.totalAmount } },
      });

      await tx.log.create({
        data: {
          actionType: LogActionType.DELETE_PAYMENT,
          actionDescription: `Reversed payment ${id} for activator ${payment.activatorId}`,
          userId: actorUserId,
        },
      });
    });
  }
}
