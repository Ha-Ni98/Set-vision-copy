import { describe, it, expect } from 'vitest';
import request from 'supertest';
import {
  AUTH_ROUTES,
  ADMIN_ROUTES,
  ACTIVATOR_ROUTES,
  ACTIVATION_ROUTES,
  KEY_ROUTES,
  CARD_ROUTES,
  LOT_ROUTES,
  SET_ROUTES,
  ORDER_ROUTES,
  PAYMENT_ROUTES,
  LOG_ROUTES,
  GEOGRAPHY_ROUTES,
  DELIVERY_COMPANY_ROUTES,
  DISTRIBUTOR_ROUTES,
  SUBSCRIPTION_PLAN_ROUTES,
  STATISTICS_ROUTES,
  AuthTokensResponseSchema,
  SessionUserResponseSchema,
  AdminResponseSchema,
  AdminWithCredentialsResponseSchema,
  ActivatorDetailResponseSchema,
  ActivatorDashboardResponseSchema,
  SetResponseSchema,
  LotResponseSchema,
  OrderDetailResponseSchema,
  CardDetailResponseSchema,
  KeyVerificationResponseSchema,
  ActiveRequestResponseSchema,
  ActivationDetailResponseSchema,
  ActivationStat,
  ClientActivationStatus,
  AccountInformation,
  UserRole,
} from '@my-app/contract';
import { app } from '../../src/app';

const ALL_ROUTES = [
  ['AUTH_ROUTES', AUTH_ROUTES],
  ['ADMIN_ROUTES', ADMIN_ROUTES],
  ['ACTIVATOR_ROUTES', ACTIVATOR_ROUTES],
  ['ACTIVATION_ROUTES', ACTIVATION_ROUTES],
  ['KEY_ROUTES', KEY_ROUTES],
  ['CARD_ROUTES', CARD_ROUTES],
  ['LOT_ROUTES', LOT_ROUTES],
  ['SET_ROUTES', SET_ROUTES],
  ['ORDER_ROUTES', ORDER_ROUTES],
  ['PAYMENT_ROUTES', PAYMENT_ROUTES],
  ['LOG_ROUTES', LOG_ROUTES],
  ['GEOGRAPHY_ROUTES', GEOGRAPHY_ROUTES],
  ['DELIVERY_COMPANY_ROUTES', DELIVERY_COMPANY_ROUTES],
  ['DISTRIBUTOR_ROUTES', DISTRIBUTOR_ROUTES],
  ['SUBSCRIPTION_PLAN_ROUTES', SUBSCRIPTION_PLAN_ROUTES],
  ['STATISTICS_ROUTES', STATISTICS_ROUTES],
] as const;

describe('Contract route constants', () => {
  it.each(ALL_ROUTES)('%s is an object with a defined BASE', (name, routes) => {
    expect(typeof routes).toBe('object');
    expect((routes as { BASE: string }).BASE).toBeDefined();
  });
});

const API = `/api/v1${AUTH_ROUTES.BASE}`;

describe('AUTH_ROUTES — registration', () => {
  it('POST /auth/login is registered (not 404)', async () => {
    // Empty body → validateRequest returns 400 before any DB access
    const res = await request(app).post(`${API}${AUTH_ROUTES.LOGIN}`).send({});
    expect(res.status).not.toBe(404);
  });

  it('POST /auth/refresh is registered (not 404)', async () => {
    const res = await request(app).post(`${API}${AUTH_ROUTES.REFRESH}`).send({});
    expect(res.status).not.toBe(404);
  });

  it('POST /auth/logout is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(`${API}${AUTH_ROUTES.LOGOUT}`).send({});
    expect(res.status).toBe(401);
  });

  it('GET /auth/me is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(`${API}${AUTH_ROUTES.ME}`);
    expect(res.status).toBe(401);
  });
});

const ADMIN_API = `/api/v1${ADMIN_ROUTES.BASE}`;

describe('ADMIN_ROUTES — registration', () => {
  it('GET /admins is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(ADMIN_API);
    expect(res.status).toBe(401);
  });

  it('POST /admins is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(ADMIN_API).send({});
    expect(res.status).toBe(401);
  });

  it('GET /admins/:id is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(`${ADMIN_API}/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`);
    expect(res.status).toBe(401);
  });

  it('PATCH /admins/:id is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).patch(`${ADMIN_API}/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`).send({});
    expect(res.status).toBe(401);
  });

  it('POST /admins/:id/toggle is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(`${ADMIN_API}/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/toggle`);
    expect(res.status).toBe(401);
  });

  it('POST /admins/:id/reset-password is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(`${ADMIN_API}/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/reset-password`);
    expect(res.status).toBe(401);
  });

  it('DELETE /admins/:id is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).delete(`${ADMIN_API}/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`);
    expect(res.status).toBe(401);
  });
});

describe('ADMIN response schemas', () => {
  const sampleAdmin = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    userId: 'b1ffcd00-0d1c-4f19-bc7e-7cc0ce491b22',
    fullName: 'Alice Admin',
    username: 'alice',
    phone: '0612345678',
    isEnabled: true,
    lastLoginAt: null,
    createdAt: '2025-01-10T08:30:00.000Z',
  };

  it('AdminResponseSchema accepts a valid shape', () => {
    expect(() => AdminResponseSchema.parse(sampleAdmin)).not.toThrow();
  });

  it('AdminWithCredentialsResponseSchema accepts a valid shape', () => {
    expect(() =>
      AdminWithCredentialsResponseSchema.parse({ admin: sampleAdmin, generatedPassword: 'Temp#Pass99' }),
    ).not.toThrow();
  });
});

const ACT_API = `/api/v1${ACTIVATOR_ROUTES.BASE}`;
const SAMPLE_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('ACTIVATOR_ROUTES — registration', () => {
  it('GET /activators/me/stats is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(`${ACT_API}${ACTIVATOR_ROUTES.MY_STATS}`);
    expect(res.status).toBe(401);
  });

  it('GET /activators is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(ACT_API);
    expect(res.status).toBe(401);
  });

  it('POST /activators is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(ACT_API).send({});
    expect(res.status).toBe(401);
  });

  it('GET /activators/:id is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(`${ACT_API}/${SAMPLE_UUID}`);
    expect(res.status).toBe(401);
  });

  it('PATCH /activators/:id is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).patch(`${ACT_API}/${SAMPLE_UUID}`).send({});
    expect(res.status).toBe(401);
  });

  it('POST /activators/:id/toggle is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(`${ACT_API}/${SAMPLE_UUID}/toggle`);
    expect(res.status).toBe(401);
  });

  it('POST /activators/:id/reset-password is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(`${ACT_API}/${SAMPLE_UUID}/reset-password`);
    expect(res.status).toBe(401);
  });

  it('DELETE /activators/:id is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).delete(`${ACT_API}/${SAMPLE_UUID}`);
    expect(res.status).toBe(401);
  });

  it('GET /activators/:id/performance is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(`${ACT_API}/${SAMPLE_UUID}/performance`);
    expect(res.status).toBe(401);
  });
});

describe('ACTIVATOR response schemas', () => {
  const sampleActivator = {
    id: SAMPLE_UUID,
    userId: 'b1ffcd00-0d1c-4f19-bc7e-7cc0ce491b22',
    fullName: 'Alice Activator',
    username: 'alice_act',
    phone: '0612345678',
    isEnabled: true,
    totalEarning: 0,
    credits: 0,
    nbOfActivation: 0,
    nbOfSuccessfulActivation: 0,
    avgActivationTimeSeconds: null,
    lastLoginAt: null,
    createdAt: '2025-01-10T08:30:00.000Z',
  };

  it('ActivatorDetailResponseSchema accepts a valid shape', () => {
    expect(() =>
      ActivatorDetailResponseSchema.parse({
        ...sampleActivator,
        totalPaid: 0,
        creditsOwed: 0,
        successRate: 0,
      }),
    ).not.toThrow();
  });

  it('ActivatorDashboardResponseSchema accepts a valid shape', () => {
    expect(() =>
      ActivatorDashboardResponseSchema.parse({
        totalEarnings: 0,
        earningsTrendPercent: 0,
        creditsBalance: 0,
        totalActivations: 0,
        activationsToday: 0,
        avgActivationTimeSeconds: null,
        activeSlotsUsed: 0,
        weekly: [],
      }),
    ).not.toThrow();
  });
});

const SET_API = `/api/v1${SET_ROUTES.BASE}`;

describe('SET_ROUTES — registration', () => {
  it('GET /sets is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(SET_API);
    expect(res.status).toBe(401);
  });

  it('POST /sets is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(SET_API).send({});
    expect(res.status).toBe(401);
  });

  it('POST /sets/:id/transition is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app)
      .post(`${SET_API}/${SAMPLE_UUID}/transition`)
      .send({});
    expect(res.status).toBe(401);
  });

  it('DELETE /sets/:id is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).delete(`${SET_API}/${SAMPLE_UUID}`);
    expect(res.status).toBe(401);
  });
});

const LOT_API = `/api/v1${LOT_ROUTES.BASE}`;

describe('LOT_ROUTES — registration', () => {
  it('GET /lots is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(LOT_API);
    expect(res.status).toBe(401);
  });

  it('GET /lots/available-for-order is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(`${LOT_API}${LOT_ROUTES.GET_AVAILABLE_FOR_ORDER}`);
    expect(res.status).toBe(401);
  });

  it('POST /lots is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(LOT_API).send({});
    expect(res.status).toBe(401);
  });

  it('DELETE /lots/:id is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).delete(`${LOT_API}/${SAMPLE_UUID}`);
    expect(res.status).toBe(401);
  });
});

describe('LOT response schemas', () => {
  it('LotResponseSchema accepts a valid shape', () => {
    const sample = {
      id: SAMPLE_UUID,
      lotNumber: 'LOT-20240630-AABBCC',
      subscriptionPlanId: 'b1ffcd00-0d1c-4f19-bc7e-7cc0ce491b22',
      subscriptionLabel: 'Snapchat Plus — 01 Month',
      lotStat: 'PENDING',
      nbOfCards: 5,
      deliveredCardsCount: 0,
      isReturned: false,
      createdAt: '2025-01-10T08:30:00.000Z',
      deliveryDate: null,
    };
    expect(() => LotResponseSchema.parse(sample)).not.toThrow();
  });
});

const ORDER_API = `/api/v1${ORDER_ROUTES.BASE}`;

describe('ORDER_ROUTES — registration', () => {
  it('GET /orders is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(ORDER_API);
    expect(res.status).toBe(401);
  });

  it('GET /orders/:id is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(`${ORDER_API}/${SAMPLE_UUID}`);
    expect(res.status).toBe(401);
  });

  it('POST /orders is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(ORDER_API).send({});
    expect(res.status).toBe(401);
  });

  it('POST /orders/:id/transition is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(`${ORDER_API}/${SAMPLE_UUID}/transition`).send({});
    expect(res.status).toBe(401);
  });

  it('DELETE /orders/:id is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).delete(`${ORDER_API}/${SAMPLE_UUID}`);
    expect(res.status).toBe(401);
  });
});

describe('ORDER response schemas', () => {
  it('OrderDetailResponseSchema accepts a valid shape', () => {
    const sample = {
      id: SAMPLE_UUID,
      orderNumber: 'ORD-20240630-AABBCC',
      distributorId: 'b1ffcd00-0d1c-4f19-bc7e-7cc0ce491b22',
      distributorName: 'Best Store',
      receivedName: 'John Doe',
      receivedPhone: '0612345678',
      wilayaId: 'b1ffcd00-0d1c-4f19-bc7e-7cc0ce491b23',
      wilayaName: 'Alger',
      communeId: 'b1ffcd00-0d1c-4f19-bc7e-7cc0ce491b24',
      communeName: 'Bab El Oued',
      deliveryCompanyId: 'b1ffcd00-0d1c-4f19-bc7e-7cc0ce491b25',
      deliveryCompanyName: 'FastDel',
      deliveryType: 'HOME',
      lotNumbers: ['LOT-001'],
      cardsCount: 10,
      orderPrice: 500.0,
      deliverPrice: 50.0,
      cardsDeliveredCount: 0,
      orderStat: 'PENDING_DELIVERY',
      createdAt: '2025-01-10T08:30:00.000Z',
      completedAt: null,
      lots: [
        {
          lotId: 'b1ffcd00-0d1c-4f19-bc7e-7cc0ce491b26',
          lotNumber: 'LOT-001',
          subscriptionLabel: 'Snapchat Plus — 01 Month',
          cardsCount: 10,
          lotStat: 'PENDING',
        },
      ],
    };
    expect(() => OrderDetailResponseSchema.parse(sample)).not.toThrow();
  });
});

describe('SET response schemas', () => {
  it('SetResponseSchema accepts a valid shape', () => {
    const sample = {
      id: SAMPLE_UUID,
      setNumber: 'SET-20240630-AABBCC',
      subscriptionPlanId: 'b1ffcd00-0d1c-4f19-bc7e-7cc0ce491b22',
      subscriptionLabel: 'Snapchat Plus — 01 Month',
      numberOfKeys: 10,
      setStat: 'NOT_PRINTED',
      createdAt: '2025-01-10T08:30:00.000Z',
      printedAt: null,
    };
    expect(() => SetResponseSchema.parse(sample)).not.toThrow();
  });
});

const CARD_API = `/api/v1${CARD_ROUTES.BASE}`;

describe('CARD_ROUTES — registration', () => {
  it('GET /cards is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(CARD_API);
    expect(res.status).toBe(401);
  });

  it('GET /cards/available-for-lot is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(`${CARD_API}${CARD_ROUTES.GET_AVAILABLE_FOR_LOT}`);
    expect(res.status).toBe(401);
  });

  it('GET /cards/:id is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(`${CARD_API}/${SAMPLE_UUID}`);
    expect(res.status).toBe(401);
  });

  it('DELETE /cards/:id is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).delete(`${CARD_API}/${SAMPLE_UUID}`);
    expect(res.status).toBe(401);
  });

  it('POST /cards/:id/disable is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(`${CARD_API}/${SAMPLE_UUID}/disable`);
    expect(res.status).toBe(401);
  });

  it('POST /cards/:id/enable is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(`${CARD_API}/${SAMPLE_UUID}/enable`);
    expect(res.status).toBe(401);
  });

  it('POST /cards/:id/revoke is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(`${CARD_API}/${SAMPLE_UUID}/revoke`);
    expect(res.status).toBe(401);
  });
});

describe('CARD response schemas', () => {
  it('CardDetailResponseSchema accepts a valid shape', () => {
    const sample = {
      id: SAMPLE_UUID,
      key: 'ABCD-1234-EFGH-5678',
      subscriptionPlanId: 'b1ffcd00-0d1c-4f19-bc7e-7cc0ce491b22',
      subscriptionLabel: 'Snapchat Plus — 01 Month',
      setNumber: 'SET-20240101-AABBCC',
      lotNumber: null,
      distributorName: null,
      cardStat: 'IN_SET',
      isActive: false,
      isDisabled: false,
      isRevoked: false,
      createdAt: '2025-01-10T08:30:00.000Z',
      distributionTimeline: [{ stat: 'IN_SET', at: '2025-01-10T08:30:00.000Z' }],
    };
    expect(() => CardDetailResponseSchema.parse(sample)).not.toThrow();
  });
});

const KEY_API = `/api/v1${KEY_ROUTES.BASE}`;
const ACT_ID = 'a0eebc99-9c0b-4ef8-8a6d-6bb9bd380a11'; // RFC-4122 variant

describe('KEY_ROUTES — registration', () => {
  it('POST /keys/verify is registered (validates body → 400, not 404)', async () => {
    const res = await request(app).post(`${KEY_API}${KEY_ROUTES.VERIFY}`).send({});
    expect(res.status).not.toBe(404);
  });

  it('POST /keys/submit is registered (validates body → 400, not 404)', async () => {
    const res = await request(app).post(`${KEY_API}${KEY_ROUTES.SUBMIT}`).send({});
    expect(res.status).not.toBe(404);
  });

  it('POST /keys/:activationId/update is registered (validates body → 400, not 404)', async () => {
    const res = await request(app)
      .post(`${KEY_API}/${ACT_ID}/update`)
      .send({});
    expect(res.status).not.toBe(404);
  });

  it('POST /keys/:activationId/additional is registered (validates body → 400, not 404)', async () => {
    const res = await request(app)
      .post(`${KEY_API}/${ACT_ID}/additional`)
      .send({});
    expect(res.status).not.toBe(404);
  });

  it('GET /keys/:activationId/status is registered (invalid UUID → 400 from validation, not 404 from router)', async () => {
    const res = await request(app).get(`${KEY_API}/not-a-uuid/status`);
    expect(res.status).toBe(400);
  });
});

const ACTIVATION_API = `/api/v1${ACTIVATION_ROUTES.BASE}`;

describe('ACTIVATION_ROUTES — registration', () => {
  it('GET /activations/pending is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(`${ACTIVATION_API}${ACTIVATION_ROUTES.GET_PENDING}`);
    expect(res.status).toBe(401);
  });

  it('GET /activations/active is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(`${ACTIVATION_API}${ACTIVATION_ROUTES.GET_ACTIVE}`);
    expect(res.status).toBe(401);
  });

  it('GET /activations/my-history is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(`${ACTIVATION_API}${ACTIVATION_ROUTES.GET_MY_HISTORY}`);
    expect(res.status).toBe(401);
  });

  it('GET /activations/recent is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(`${ACTIVATION_API}${ACTIVATION_ROUTES.GET_RECENT}`);
    expect(res.status).toBe(401);
  });

  it('GET /activations/ is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(`${ACTIVATION_API}${ACTIVATION_ROUTES.GET_ALL}`);
    expect(res.status).toBe(401);
  });

  it('GET /activations/:id is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).get(`${ACTIVATION_API}/${SAMPLE_UUID}`);
    expect(res.status).toBe(401);
  });

  it('POST /activations/:id/take is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(`${ACTIVATION_API}/${SAMPLE_UUID}/take`);
    expect(res.status).toBe(401);
  });

  it('POST /activations/:id/flag-wrong-info is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(`${ACTIVATION_API}/${SAMPLE_UUID}/flag-wrong-info`).send({});
    expect(res.status).toBe(401);
  });

  it('POST /activations/:id/request-additional is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app)
      .post(`${ACTIVATION_API}/${SAMPLE_UUID}/request-additional`)
      .send({});
    expect(res.status).toBe(401);
  });

  it('POST /activations/:id/activate is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(`${ACTIVATION_API}/${SAMPLE_UUID}/activate`);
    expect(res.status).toBe(401);
  });

  it('POST /activations/:id/cancel is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(`${ACTIVATION_API}/${SAMPLE_UUID}/cancel`);
    expect(res.status).toBe(401);
  });

  it('POST /activations/:id/release is registered (requireAuth → 401, not 404) [RELEASE contract addition]', async () => {
    const res = await request(app).post(`${ACTIVATION_API}/${SAMPLE_UUID}/release`);
    expect(res.status).toBe(401);
  });

  it('POST /activations/:id/freeze is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(`${ACTIVATION_API}/${SAMPLE_UUID}/freeze`).send({});
    expect(res.status).toBe(401);
  });

  it('POST /activations/:id/activate-by-admin is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(`${ACTIVATION_API}/${SAMPLE_UUID}/activate-by-admin`);
    expect(res.status).toBe(401);
  });

  it('POST /activations/:id/cancel-by-admin is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(`${ACTIVATION_API}/${SAMPLE_UUID}/cancel-by-admin`);
    expect(res.status).toBe(401);
  });

  it('POST /activations/:id/set-price is registered (requireAuth → 401, not 404)', async () => {
    const res = await request(app).post(`${ACTIVATION_API}/${SAMPLE_UUID}/set-price`).send({});
    expect(res.status).toBe(401);
  });
});

describe('ACTIVATION response schemas', () => {
  it('KeyVerificationResponseSchema accepts READY shape', () => {
    expect(() =>
      KeyVerificationResponseSchema.parse({
        status: ClientActivationStatus.READY,
        subscriptionLabel: 'Snapchat Plus — 01 Month',
      }),
    ).not.toThrow();
  });

  it('KeyVerificationResponseSchema accepts NEEDS_CORRECTION shape with flaggedFields', () => {
    expect(() =>
      KeyVerificationResponseSchema.parse({
        status: ClientActivationStatus.NEEDS_CORRECTION,
        activationId: SAMPLE_UUID,
        flaggedFields: [{ field: AccountInformation.USERNAME, label: 'Username' }],
      }),
    ).not.toThrow();
  });

  it('ActiveRequestResponseSchema accepts a valid shape', () => {
    expect(() =>
      ActiveRequestResponseSchema.parse({
        id: SAMPLE_UUID,
        subscriptionLabel: 'Snapchat Plus — 01 Month',
        key: 'A1B2C3D4E5F6',
        takenAt: '2025-01-10T08:30:00.000Z',
        state: ActivationStat.PROCESSING,
        distributor: { storeName: 'Tech Store', wilayaName: 'Alger', communeName: 'Bab El Oued' },
        client: { fullName: 'Jane Doe', phone: '+213555000001' },
        accountFields: [{ fieldLabel: 'Username', value: 'jane_doe' }],
        otpValue: null,
        freezeReason: null,
      }),
    ).not.toThrow();
  });

  it('ActivationDetailResponseSchema accepts a valid shape', () => {
    expect(() =>
      ActivationDetailResponseSchema.parse({
        id: SAMPLE_UUID,
        client: { fullName: 'Jane Doe', phone: '+213555000001' },
        distributor: { storeName: 'Tech Store', wilayaName: 'Alger', communeName: 'Bab El Oued' },
        activator: null,
        submittedInformation: [{ fieldLabel: 'Username', value: 'jane_doe' }],
        timeline: [],
        cardHistory: [{ stat: 'IN_SET', at: '2025-01-01T00:00:00.000Z' }],
        financial: { activationPrice: null, commissionTierLabel: null },
      }),
    ).not.toThrow();
  });
});

describe('AUTH response schemas', () => {
  it('AuthTokensResponseSchema accepts a valid shape', () => {
    const data = { accessToken: 'eyJ.tok.en', refreshToken: 'raw-opaque-token', role: UserRole.ADMIN };
    expect(() => AuthTokensResponseSchema.parse(data)).not.toThrow();
  });

  it('SessionUserResponseSchema accepts a valid shape', () => {
    const data = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      username: 'alice',
      role: UserRole.ADMIN,
      fullName: 'Alice Admin',
    };
    expect(() => SessionUserResponseSchema.parse(data)).not.toThrow();
  });
});
