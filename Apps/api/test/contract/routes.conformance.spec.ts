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
