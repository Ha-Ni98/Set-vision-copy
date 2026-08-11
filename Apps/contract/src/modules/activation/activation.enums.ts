export enum ActivationStat {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  WRONG_INFORMATION = 'WRONG_INFORMATION',
  ADDITIONAL_INFORMATION = 'ADDITIONAL_INFORMATION',
  FREEZE = 'FREEZE',
  ACTIVATED = 'ACTIVATED',
  ACTIVATED_BY_ADMIN = 'ACTIVATED_BY_ADMIN',
  CANCELLED_BY_ACTIVATOR = 'CANCELLED_BY_ACTIVATOR',
  REMOVED_FROM_ACTIVATOR = 'REMOVED_FROM_ACTIVATOR',
  CANCELLED_BY_ADMIN = 'CANCELLED_BY_ADMIN',
}

export enum AccountInformation {
  USERNAME = 'USERNAME',
  EMAIL = 'EMAIL',
  PHONE_NUMBER = 'PHONE_NUMBER',
  OTP = 'OTP',
  BIRTHDAY = 'BIRTHDAY',
  PASSWORD = 'PASSWORD',
}

// Which client-facing flow produced an activation:client-updated event. The two flows are
// otherwise indistinguishable — both end at PROCESSING — and Set 6's notification templates
// need to tell them apart (correction vs. an OTP answer). The realtime gateway ignores this
// field; it exists for the notification subscriber only.
export enum ClientUpdateKind {
  CORRECTION = 'CORRECTION',
  ADDITIONAL = 'ADDITIONAL',
}

// Contract-owned — not in Prisma. The public portal sees this; raw ActivationStat never crosses to the client.
export enum ClientActivationStatus {
  INVALID = 'INVALID',
  READY = 'READY',
  SUBMITTED = 'SUBMITTED',
  PROCESSING = 'PROCESSING',
  NEEDS_CORRECTION = 'NEEDS_CORRECTION',
  NEEDS_OTP = 'NEEDS_OTP',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACTIVATED = 'ACTIVATED',
  FAILED = 'FAILED',
}
