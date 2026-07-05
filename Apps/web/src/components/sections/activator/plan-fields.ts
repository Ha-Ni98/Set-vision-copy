import { AccountInformation } from "@my-app/contract";

// The Active card's copyable field list, the Wrong-Info checkbox set, and the
// Request-additional-info picker are all driven by the SAME per-plan field registry
// (plan.md §B4 genericity principle) — keyed by subscription label rather than a plan id,
// since that's the only plan identifier ActiveRequestDTO/PendingActivationDTO actually
// carry. Snapchat+ is the only plan today; add future labels here as new plans launch.
interface PlanFields {
  /** Collected up front by the client's activation form — the Wrong-Info checkbox set. */
  collected: AccountInformation[];
  /** Not collected up front but requestable later via "Request additional info". */
  requestable: AccountInformation[];
}

const SNAPCHAT_FIELDS: PlanFields = {
  collected: [
    AccountInformation.USERNAME,
    AccountInformation.EMAIL,
    AccountInformation.PHONE_NUMBER,
    AccountInformation.PASSWORD,
  ],
  requestable: [AccountInformation.OTP],
};

const DEFAULT_FIELDS: PlanFields = SNAPCHAT_FIELDS;

function fieldsForPlan(subscriptionLabel: string): PlanFields {
  return subscriptionLabel.toLowerCase().includes("snap") ? SNAPCHAT_FIELDS : DEFAULT_FIELDS;
}

// Fields correctable via the Wrong-Info modal.
export function correctableFields(subscriptionLabel: string): AccountInformation[] {
  return fieldsForPlan(subscriptionLabel).collected;
}

// Fields requestable via "Request additional info" beyond what's already collected — today
// that's always just OTP (Snapchat+'s only additional-info field).
export function requestableFields(subscriptionLabel: string): AccountInformation[] {
  return fieldsForPlan(subscriptionLabel).requestable;
}
