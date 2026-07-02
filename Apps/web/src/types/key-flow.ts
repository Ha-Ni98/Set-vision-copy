import type { KeyVerificationDTO } from "@my-app/contract";

// KeyVerificationDTO plus the raw key string — the client already knows it (they typed
// it), so it isn't part of the DTO, but the UI needs it for display and to build
// SubmitActivationCommand. Frontend-only view model, never itself sent to the backend.
export interface KeyLookupResult extends KeyVerificationDTO {
  key: string;
}

export type KeyFlowView =
  | { name: "IDLE" }
  | { name: "FORM"; key: KeyLookupResult }
  | { name: "OTP"; key: KeyLookupResult }
  | { name: "COMPLETED"; key: KeyLookupResult }
  | { name: "MESSAGE"; tone: "success" | "error"; titleKey: string; bodyKey: string };
