// Declared literally, not imported from modules/order (R13 — a cross-module Zod import is
// a runtime circular-dependency risk that tsc cannot see; madge --circular is the guard).
export enum OrderRequestStat {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  PENDING_DELIVERY = 'PENDING_DELIVERY',
  IN_DELIVERY = 'IN_DELIVERY',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
}
