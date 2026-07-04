import { AccountForm } from "./AccountForm";
import { OtpStep } from "./OtpStep";
import { createAccountFormSchema } from "./account-form.schema";

// The genericity principle (client-portal spec): Step 2's account form and Step 3's
// additional-info input are per-subscription-plan, keyed by the verify response's `planKey`
// — not hard-coded into the page. Snapchat+ is the only plan today; a future plan gets its
// own registry entry here (its own form + field schema + additional-info component), with
// no page-level or schema change elsewhere.
interface PlanFormEntry {
  FormComponent: typeof AccountForm;
  fieldSchema: typeof createAccountFormSchema;
  AdditionalInfoComponent: typeof OtpStep;
}

const SNAPCHAT_ENTRY: PlanFormEntry = {
  FormComponent: AccountForm,
  fieldSchema: createAccountFormSchema,
  AdditionalInfoComponent: OtpStep,
};

const DEFAULT_ENTRY = SNAPCHAT_ENTRY;

// `planKey` isn't used to branch yet (there's nothing to branch to) — it's the lookup key a
// future plan's entry would be keyed by, kept in the signature now so call sites don't need
// to change when a second plan is added.
export function getPlanForm(_planKey: string | undefined): PlanFormEntry {
  return DEFAULT_ENTRY;
}
