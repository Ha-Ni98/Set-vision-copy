import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { BooleanQuerySchema } from '../common/types';
import { LoginSchema } from '../modules/auth/auth.command';
import { CreateLotSchema } from '../modules/lot/lot.command';
import { GetPaymentsQuerySchema } from '../modules/payment/payment.query';
import { GetSubscriptionPlansQuerySchema } from '../modules/subscription-plan/subscription-plan.query';
import { GetDeliveryCompaniesQuerySchema } from '../modules/delivery-company/delivery-company.query';
import { AdminResponseSchema } from '../modules/admin/admin.dtos';
import { TransitionSetSchema } from '../modules/set/set.command';
import { SetStat } from '../modules/set/set.enums';
import { PendingActivationResponseSchema } from '../modules/activation/activation.dtos';

// ── BooleanQuerySchema ─────────────────────────────────────────────────────
describe('BooleanQuerySchema', () => {
  it('parses "false" as false (the z.coerce.boolean bug)', () => {
    assert.equal(BooleanQuerySchema.parse('false'), false);
  });

  it('parses "true" as true', () => {
    assert.equal(BooleanQuerySchema.parse('true'), true);
  });

  it('passes through an actual boolean', () => {
    assert.equal(BooleanQuerySchema.parse(true), true);
    assert.equal(BooleanQuerySchema.parse(false), false);
  });

  it('rejects an unrecognised string', () => {
    assert.throws(() => BooleanQuerySchema.parse('yes'));
  });
});

// ── Boolean query params in real query schemas ─────────────────────────────
describe('includeDeleted / active query params', () => {
  it('GetPaymentsQuerySchema: "false" → includeDeleted: false', () => {
    const q = GetPaymentsQuerySchema.parse({ includeDeleted: 'false' });
    assert.equal(q.includeDeleted, false);
  });

  it('GetPaymentsQuerySchema: "true" → includeDeleted: true', () => {
    const q = GetPaymentsQuerySchema.parse({ includeDeleted: 'true' });
    assert.equal(q.includeDeleted, true);
  });

  it('GetSubscriptionPlansQuerySchema: "false" → active: false', () => {
    const q = GetSubscriptionPlansQuerySchema.parse({ active: 'false' });
    assert.equal(q.active, false);
  });

  it('GetDeliveryCompaniesQuerySchema: "false" → active: false', () => {
    const q = GetDeliveryCompaniesQuerySchema.parse({ active: 'false' });
    assert.equal(q.active, false);
  });
});

// ── Auth ───────────────────────────────────────────────────────────────────
describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    const cmd = LoginSchema.parse({ username: 'admin', password: 'secret' });
    assert.equal(cmd.username, 'admin');
  });

  it('rejects missing password', () => {
    assert.throws(() => LoginSchema.parse({ username: 'admin' }));
  });
});

// ── nonempty arrays ────────────────────────────────────────────────────────
// UUIDs below are valid v4 (version digit = 4, variant bits = a/8)
const UUID1 = '123e4567-e89b-42d3-a456-426614174000';
const UUID2 = '123e4567-e89b-42d3-a456-426614174001';

describe('CreateLotSchema.cardIds nonempty', () => {
  it('accepts a non-empty array', () => {
    const cmd = CreateLotSchema.parse({
      subscriptionPlanId: UUID1,
      cardIds: [UUID2],
    });
    assert.equal(cmd.cardIds.length, 1);
  });

  it('rejects an empty array', () => {
    assert.throws(() =>
      CreateLotSchema.parse({
        subscriptionPlanId: UUID1,
        cardIds: [],
      }),
    );
  });
});

// ── Enum narrowing ─────────────────────────────────────────────────────────
describe('TransitionSetSchema', () => {
  it('accepts PENDING_PRINTING', () => {
    const cmd = TransitionSetSchema.parse({ to: SetStat.PENDING_PRINTING });
    assert.equal(cmd.to, 'PENDING_PRINTING');
  });

  it('rejects NOT_PRINTED (initial state — not a valid transition target)', () => {
    assert.throws(() => TransitionSetSchema.parse({ to: SetStat.NOT_PRINTED }));
  });
});

// ── DTO shape validation ───────────────────────────────────────────────────
describe('AdminResponseSchema', () => {
  it('parses a valid admin payload', () => {
    const dto = AdminResponseSchema.parse({
      id: UUID1,
      userId: UUID2,
      fullName: 'Alice Admin',
      username: 'alice',
      phone: '+213555000001',
      isEnabled: true,
      lastLoginAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    assert.equal(dto.fullName, 'Alice Admin');
    assert.equal(dto.lastLoginAt, null);
  });

  it('rejects a payload with a bad uuid', () => {
    assert.throws(() =>
      AdminResponseSchema.parse({
        id: 'not-a-uuid',
        userId: UUID2,
        fullName: 'Alice',
        username: 'alice',
        phone: '+213555000001',
        isEnabled: true,
        lastLoginAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    );
  });
});

describe('PendingActivationResponseSchema', () => {
  it('parses a valid pending activation', () => {
    const dto = PendingActivationResponseSchema.parse({
      id: UUID1,
      subscriptionLabel: 'Snapchat+ 1 Month',
      keyMasked: 'XXXX1234',
      requestedAt: '2026-06-28T10:00:00.000Z',
    });
    assert.equal(dto.subscriptionLabel, 'Snapchat+ 1 Month');
  });
});
