import {
  KeyVerificationResponseSchema,
  ClientActivationStatusResponseSchema,
  ClientActivationStatus,
  AccountInformation,
  type KeyVerificationDTO,
  type ClientActivationStatusDTO,
} from "@my-app/contract";

// Minimal shape — every optional absent, matching a freshly-invalid/unknown key.
export const mockKeyInvalid: KeyVerificationDTO = KeyVerificationResponseSchema.parse({
  status: ClientActivationStatus.INVALID,
});

export const mockKeyReady: KeyVerificationDTO = KeyVerificationResponseSchema.parse({
  status: ClientActivationStatus.READY,
  subscriptionLabel: "Snapchat+ — 1 Month",
  planKey: "SNAPCHAT_PLUS_ONE_MONTH",
});

export const mockKeyNeedsCorrection: KeyVerificationDTO = KeyVerificationResponseSchema.parse({
  status: ClientActivationStatus.NEEDS_CORRECTION,
  activationId: "9c1e0000-0000-4000-8000-000000000001",
  clientFullName: "Amine Client",
  clientPhone: "0555000000",
  submittedFields: [{ field: AccountInformation.USERNAME, value: "amine123" }],
  flaggedFields: [{ field: AccountInformation.USERNAME, label: "Username" }],
});

export const mockKeyNeedsOtp: KeyVerificationDTO = KeyVerificationResponseSchema.parse({
  status: ClientActivationStatus.NEEDS_OTP,
  activationId: "9c1e0000-0000-4000-8000-000000000002",
  requestedFields: [{ field: AccountInformation.OTP, label: "One-Time Code" }],
  accountUsername: "amine123",
});

// Same field-enum-keyed shape AccountForm.tsx's findByField looks up against.
const SUBMITTED_FIELDS = [
  { field: AccountInformation.USERNAME, value: "amine123" },
  { field: AccountInformation.EMAIL, value: "amine@example.com" },
  { field: AccountInformation.PASSWORD, value: "realpass1" },
];

export const mockKeySubmitted: KeyVerificationDTO = KeyVerificationResponseSchema.parse({
  status: ClientActivationStatus.SUBMITTED,
  activationId: "9c1e0000-0000-4000-8000-000000000004",
  clientFullName: "Amine Client",
  clientPhone: "0555000000",
  submittedFields: SUBMITTED_FIELDS,
});

export const mockKeyProcessing: KeyVerificationDTO = KeyVerificationResponseSchema.parse({
  status: ClientActivationStatus.PROCESSING,
  activationId: "9c1e0000-0000-4000-8000-000000000005",
  clientFullName: "Amine Client",
  clientPhone: "0555000000",
  submittedFields: SUBMITTED_FIELDS,
});

export const mockKeyUnderReview: KeyVerificationDTO = KeyVerificationResponseSchema.parse({
  status: ClientActivationStatus.UNDER_REVIEW,
  activationId: "9c1e0000-0000-4000-8000-000000000006",
});

export const mockKeyActivated: KeyVerificationDTO = KeyVerificationResponseSchema.parse({
  status: ClientActivationStatus.ACTIVATED,
  accountUsername: "amine123",
});

export const mockKeyFailed: KeyVerificationDTO = KeyVerificationResponseSchema.parse({
  status: ClientActivationStatus.FAILED,
});

export const mockClientActivationStatus: ClientActivationStatusDTO =
  ClientActivationStatusResponseSchema.parse({
    activationId: "9c1e0000-0000-4000-8000-000000000003",
    status: ClientActivationStatus.PROCESSING,
  });
