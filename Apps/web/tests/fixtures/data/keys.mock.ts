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
  submittedFields: [{ fieldLabel: "Username", value: "amine123" }],
  flaggedFields: [{ field: AccountInformation.USERNAME, label: "Username" }],
});

export const mockKeyNeedsOtp: KeyVerificationDTO = KeyVerificationResponseSchema.parse({
  status: ClientActivationStatus.NEEDS_OTP,
  activationId: "9c1e0000-0000-4000-8000-000000000002",
  requestedFields: [{ field: AccountInformation.OTP, label: "One-Time Code" }],
  accountUsername: "amine123",
});

export const mockClientActivationStatus: ClientActivationStatusDTO =
  ClientActivationStatusResponseSchema.parse({
    activationId: "9c1e0000-0000-4000-8000-000000000003",
    status: ClientActivationStatus.PROCESSING,
  });
