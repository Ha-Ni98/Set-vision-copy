import { describe, it, expect } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentMapper } from '@modules/payment/payment.mapper';
import { PaymentResponseSchema } from '@my-app/contract';

const PAYMENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ACTIVATOR_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ADMIN_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ADMIN_USER_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const basePayment = {
  id: PAYMENT_ID,
  adminId: ADMIN_ID,
  activatorId: ACTIVATOR_ID,
  totalAmount: new Decimal('150.50'),
  previousCredits: new Decimal('500.00'),
  paymentDate: new Date('2024-03-10T09:00:00.000Z'),
  isDeleted: false,
  deletedDate: null,
};

const baseAdmin = {
  id: ADMIN_ID,
  userId: ADMIN_USER_ID,
  fullName: 'Alice Admin',
  phone: '+213555111111',
  isEnabled: true,
};

describe('PaymentMapper.toDTO', () => {
  it('parses PaymentResponseSchema without throwing', () => {
    const dto = PaymentMapper.toDTO(basePayment as never, baseAdmin);
    expect(() => PaymentResponseSchema.parse(dto)).not.toThrow();
  });

  it('maps totalAmount to amount with 2dp precision', () => {
    const dto = PaymentMapper.toDTO(
      { ...basePayment, totalAmount: new Decimal('99.999') } as never,
      baseAdmin,
    );
    expect(dto.amount).toBe(100);
  });

  it('maps previousCredits to 2dp number', () => {
    const dto = PaymentMapper.toDTO(
      { ...basePayment, previousCredits: new Decimal('123.456') } as never,
      baseAdmin,
    );
    expect(dto.previousCredits).toBe(123.46);
  });

  it('resolves recordedByName from admin.fullName', () => {
    const dto = PaymentMapper.toDTO(basePayment as never, { ...baseAdmin, fullName: 'Bob Recorder' });
    expect(dto.recordedByName).toBe('Bob Recorder');
  });

  it('serializes paymentDate to ISO string', () => {
    const dto = PaymentMapper.toDTO(basePayment as never, baseAdmin);
    expect(dto.paymentDate).toBe('2024-03-10T09:00:00.000Z');
  });

  it('passes isDeleted=false through', () => {
    const dto = PaymentMapper.toDTO({ ...basePayment, isDeleted: false } as never, baseAdmin);
    expect(dto.isDeleted).toBe(false);
  });

  it('passes isDeleted=true through', () => {
    const dto = PaymentMapper.toDTO({ ...basePayment, isDeleted: true } as never, baseAdmin);
    expect(dto.isDeleted).toBe(true);
  });

  it('does not expose adminId or deletedDate', () => {
    const dto = PaymentMapper.toDTO(basePayment as never, baseAdmin) as Record<string, unknown>;
    expect(dto['adminId']).toBeUndefined();
    expect(dto['deletedDate']).toBeUndefined();
  });
});
