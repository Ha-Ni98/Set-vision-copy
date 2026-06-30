import { describe, it, expect } from 'vitest';
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
} from '@my-app/contract';

// TODO (Sub-02): add route-vs-app coverage assertion once module routers are mounted.
// Each Sub-02 sprint should append the routes it registers to an `app._router` check here.

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
