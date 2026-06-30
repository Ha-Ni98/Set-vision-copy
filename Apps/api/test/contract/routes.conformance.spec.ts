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
