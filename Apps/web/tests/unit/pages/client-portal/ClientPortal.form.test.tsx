import "../../../fixtures/wrappers/mockTranslation";
import "./support/mockHooks";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AccountInformation,
  ClientActivationStatus,
  KeyVerificationResponseSchema,
  type KeyVerificationDTO,
} from "@my-app/contract";
import * as useVerifyKeyHook from "@/hooks/useVerifyKey";
import * as useActivationStatusHook from "@/hooks/useActivationStatus";
import * as useSubmitActivationHook from "@/hooks/useSubmitActivation";
import * as useUpdateActivationHook from "@/hooks/useUpdateActivation";
import * as useSubmitAdditionalInfoHook from "@/hooks/useSubmitAdditionalInfo";
import { renderLandingPage } from "./support/renderLandingPage";
import { mutationMock, statusQueryMock } from "./support/testHelpers";
import {
  mockKeyReady,
  mockKeySubmitted,
  mockKeyProcessing,
} from "../../../fixtures/data/keys.mock";

const KEY_PLACEHOLDER = "public.landing.verify.placeholder";
const SUBMIT_BUTTON = "public.landing.verify.submit";
// LandingPage's KEY_FORMAT_PATTERN is a flat 12-char [A-Z0-9] string (no hyphens) — this must
// match that shape or Step 1's client-side validation rejects it before verify() ever mutates.
const VALID_KEY = "ABCD1234EFGH";

const mockKeyNeedsCorrection: KeyVerificationDTO = KeyVerificationResponseSchema.parse({
  status: ClientActivationStatus.NEEDS_CORRECTION,
  activationId: "9c1e0000-0000-4000-8000-00000000000a",
  clientFullName: "Jane Doe",
  clientPhone: "0555999888",
  submittedFields: [
    { field: AccountInformation.USERNAME, value: "wrongname" },
    { field: AccountInformation.EMAIL, value: "jane@example.com" },
    { field: AccountInformation.PASSWORD, value: "realpass1" },
  ],
  flaggedFields: [{ field: AccountInformation.USERNAME, label: "Snapchat Username" }],
});

let verifyMutate: ReturnType<typeof vi.fn>;
let submitMutate: ReturnType<typeof vi.fn>;
let updateMutate: ReturnType<typeof vi.fn>;

function verifyResolvesWith(data: KeyVerificationDTO) {
  verifyMutate.mockImplementation(
    (_vars: unknown, opts?: { onSuccess?: (d: KeyVerificationDTO) => void }) =>
      opts?.onSuccess?.(data),
  );
}

async function seedView(user: ReturnType<typeof userEvent.setup>, dto: KeyVerificationDTO) {
  verifyResolvesWith(dto);
  const { container } = renderLandingPage();
  await user.type(screen.getByPlaceholderText(KEY_PLACEHOLDER), VALID_KEY);
  await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));
  expect(await screen.findByLabelText("public.landing.form.fullName")).toBeInTheDocument();
  return container;
}

beforeEach(() => {
  vi.clearAllMocks();
  const verify = mutationMock();
  verifyMutate = verify.mutate;
  vi.mocked(useVerifyKeyHook.useVerifyKey).mockReturnValue(verify as never);
  vi.mocked(useActivationStatusHook.useActivationStatus).mockReturnValue(
    statusQueryMock() as never,
  );

  const submit = mutationMock();
  submitMutate = submit.mutate;
  vi.mocked(useSubmitActivationHook.useSubmitActivation).mockReturnValue(submit as never);

  const update = mutationMock();
  updateMutate = update.mutate;
  vi.mocked(useUpdateActivationHook.useUpdateActivation).mockReturnValue(update as never);

  vi.mocked(useSubmitAdditionalInfoHook.useSubmitAdditionalInfo).mockReturnValue(
    mutationMock() as never,
  );
});

describe("LandingPage — Step 2 account form", () => {
  it("Ready: shows per-field Zod errors on an empty submit and never calls the mutation", async () => {
    const user = userEvent.setup();
    const container = await seedView(user, mockKeyReady);

    await user.click(screen.getByText("public.landing.form.saveSubmit"));

    await waitFor(() => expect(container.querySelector("#fullName-error")).not.toBeNull());
    expect(container.querySelector("#fullName-error")?.textContent).toContain(
      "common.validation.minLength",
    );
    expect(container.querySelector("#phone-error")?.textContent).toContain(
      "common.validation.invalidPhone",
    );
    expect(container.querySelector("#username-error")?.textContent).toContain(
      "common.validation.required",
    );
    expect(submitMutate).not.toHaveBeenCalled();
  });

  it("Ready: a valid submit calls useSubmitActivation.mutate with accountFields and no confirmPassword", async () => {
    const user = userEvent.setup();
    await seedView(user, mockKeyReady);

    await user.type(screen.getByLabelText("public.landing.form.fullName"), "Jane Doe");
    await user.type(screen.getByLabelText("public.landing.form.phone"), "0555123456");
    await user.type(screen.getByLabelText("public.landing.form.username"), "jane.snap");
    await user.type(screen.getByLabelText("public.landing.form.email"), "jane@example.com");
    await user.type(screen.getByLabelText("public.landing.form.password"), "secret123");
    await user.type(screen.getByLabelText("public.landing.form.confirmPassword"), "secret123");
    await user.click(screen.getByText("public.landing.form.saveSubmit"));

    expect(submitMutate).toHaveBeenCalledTimes(1);
    const [command] = submitMutate.mock.calls[0] as [Record<string, unknown>];
    expect(command).toEqual({
      key: VALID_KEY,
      fullName: "Jane Doe",
      phone: "0555123456",
      accountFields: [
        { field: AccountInformation.USERNAME, value: "jane.snap" },
        { field: AccountInformation.EMAIL, value: "jane@example.com" },
        { field: AccountInformation.PHONE_NUMBER, value: "" },
        { field: AccountInformation.PASSWORD, value: "secret123" },
      ],
    });
    expect(command).not.toHaveProperty("confirmPassword");
  });

  // Stage-04-fix #3.2: an unset Snapchat phone must stay blank, not silently reuse the
  // personal `phone` — the activator's card can't otherwise tell "no Snap phone" apart from
  // "Snap phone happens to equal the personal number".
  it("Ready: a distinct Snapchat phone is sent as-is, not the personal phone", async () => {
    const user = userEvent.setup();
    await seedView(user, mockKeyReady);

    await user.type(screen.getByLabelText("public.landing.form.fullName"), "Jane Doe");
    await user.type(screen.getByLabelText("public.landing.form.phone"), "0555123456");
    await user.type(screen.getByLabelText("public.landing.form.username"), "jane.snap");
    await user.type(screen.getByLabelText("public.landing.form.email"), "jane@example.com");
    await user.type(screen.getByLabelText("public.landing.form.snapPhone"), "0666111222");
    await user.type(screen.getByLabelText("public.landing.form.password"), "secret123");
    await user.type(screen.getByLabelText("public.landing.form.confirmPassword"), "secret123");
    await user.click(screen.getByText("public.landing.form.saveSubmit"));

    const [command] = submitMutate.mock.calls[0] as [{ accountFields: unknown[] }];
    expect(command.accountFields).toContainEqual({
      field: AccountInformation.PHONE_NUMBER,
      value: "0666111222",
    });
  });

  // Stage-04-fix (follow-up): submit's own mutation response is only {activationId, status}
  // (same contract gap useActivationStatus has) — a bare status swap left the form's very
  // next render (which remounts on status change, #4B) computing defaultValues from stale/
  // unset submittedFields, showing blank fields right after the client's own successful save.
  it("Ready: a successful submit re-verifies (not just swaps status), so the next render isn't blank", async () => {
    const user = userEvent.setup();
    await seedView(user, mockKeyReady);

    await user.type(screen.getByLabelText("public.landing.form.fullName"), "Jane Doe");
    await user.type(screen.getByLabelText("public.landing.form.phone"), "0555123456");
    await user.type(screen.getByLabelText("public.landing.form.username"), "jane.snap");
    await user.type(screen.getByLabelText("public.landing.form.email"), "jane@example.com");
    await user.type(screen.getByLabelText("public.landing.form.password"), "secret123");
    await user.type(screen.getByLabelText("public.landing.form.confirmPassword"), "secret123");

    submitMutate.mockImplementationOnce(
      (_vars: unknown, opts?: { onSuccess?: (d: unknown) => void }) =>
        opts?.onSuccess?.({
          activationId: mockKeySubmitted.activationId,
          status: ClientActivationStatus.SUBMITTED,
        }),
    );
    // The mutation's own response carries no field values — the second verify() call (the
    // re-verify this fix adds) is what must supply them.
    verifyMutate.mockImplementationOnce(
      (_vars: unknown, opts?: { onSuccess?: (d: KeyVerificationDTO) => void }) =>
        opts?.onSuccess?.(mockKeySubmitted),
    );

    await user.click(screen.getByText("public.landing.form.saveSubmit"));

    expect(await screen.findByText("public.landing.form.pendingBanner")).toBeInTheDocument();
    expect(verifyMutate).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("public.landing.form.fullName")).toHaveValue("Amine Client");
    expect(screen.getByLabelText("public.landing.form.username")).toHaveValue("amine123");
  });

  it("Ready: a password/confirm-password mismatch blocks submit with an inline error", async () => {
    const user = userEvent.setup();
    await seedView(user, mockKeyReady);

    await user.type(screen.getByLabelText("public.landing.form.fullName"), "Jane Doe");
    await user.type(screen.getByLabelText("public.landing.form.phone"), "0555123456");
    await user.type(screen.getByLabelText("public.landing.form.username"), "jane.snap");
    await user.type(screen.getByLabelText("public.landing.form.email"), "jane@example.com");
    await user.type(screen.getByLabelText("public.landing.form.password"), "secret123");
    await user.type(screen.getByLabelText("public.landing.form.confirmPassword"), "different1");
    await user.click(screen.getByText("public.landing.form.saveSubmit"));

    expect(await screen.findByText("public.landing.form.passwordMismatch")).toBeInTheDocument();
    expect(submitMutate).not.toHaveBeenCalled();
  });

  it("Ready: Clear Fields requires confirmation before actually clearing", async () => {
    const user = userEvent.setup();
    await seedView(user, mockKeyReady);

    await user.type(screen.getByLabelText("public.landing.form.fullName"), "Jane Doe");
    await user.click(screen.getByText("common.actions.clearFields"));
    const dialog = await screen.findByRole("alertdialog");
    expect(screen.getByLabelText("public.landing.form.fullName")).toHaveValue("Jane Doe");

    await user.click(within(dialog).getByText("common.actions.cancel"));
    expect(screen.getByLabelText("public.landing.form.fullName")).toHaveValue("Jane Doe");

    await user.click(screen.getByText("common.actions.clearFields"));
    const dialog2 = await screen.findByRole("alertdialog");
    await user.click(within(dialog2).getByText("common.actions.clearFields"));
    expect(screen.getByLabelText("public.landing.form.fullName")).toHaveValue("");
  });

  it("Submitted: read-only with the real prefilled password, and Update Information re-opens it blank", async () => {
    const user = userEvent.setup();
    await seedView(user, mockKeySubmitted);

    expect(screen.getByLabelText("public.landing.form.fullName")).toBeDisabled();
    // Stage-04-fix #4A: no more forced masking placeholder — the real saved password prefills.
    expect(screen.getByLabelText("public.landing.form.password")).toHaveValue("realpass1");
    expect(screen.getByText("public.landing.form.pendingBanner")).toBeInTheDocument();
    expect(screen.getByText("common.actions.contactWhatsapp").closest("a")).toHaveAttribute(
      "target",
      "_blank",
    );

    await user.click(screen.getByText("public.landing.form.updateInfo"));

    expect(screen.getByLabelText("public.landing.form.fullName")).toBeEnabled();
    // Update Information still forces a deliberate re-entry (unchanged, intentional UX).
    expect(screen.getByLabelText("public.landing.form.password")).toHaveValue("");
  });

  it("Processing: read-only with no edit action at all (no Update Information button)", async () => {
    const user = userEvent.setup();
    await seedView(user, mockKeyProcessing);

    expect(screen.getByLabelText("public.landing.form.fullName")).toBeDisabled();
    expect(screen.getByText("public.landing.form.processingNotice")).toBeInTheDocument();
    expect(screen.queryByText("public.landing.form.updateInfo")).not.toBeInTheDocument();
    expect(screen.queryByText("common.actions.contactWhatsapp")).not.toBeInTheDocument();
  });

  it("Needs-correction: prefills submitted values, flags the reported field, and Update & Re-submit calls useUpdateActivation", async () => {
    const user = userEvent.setup();
    await seedView(user, mockKeyNeedsCorrection);

    expect(screen.getByText("public.landing.form.correctionBanner")).toBeInTheDocument();
    expect(screen.getByLabelText("public.landing.form.fullName")).toHaveValue("Jane Doe");
    expect(screen.getByLabelText("public.landing.form.username")).toHaveValue("wrongname");
    // Stage-04-fix #4A: the real password is now returned and prefilled (no more forced-blank
    // masking), so a correction round doesn't require blindly re-entering an untouched field.
    expect(screen.getByLabelText("public.landing.form.password")).toHaveValue("realpass1");
    expect(screen.getByText("public.landing.form.flagged")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("public.landing.form.username"));
    await user.type(screen.getByLabelText("public.landing.form.username"), "corrected.name");
    await user.type(screen.getByLabelText("public.landing.form.password"), "newpass1");
    await user.type(screen.getByLabelText("public.landing.form.confirmPassword"), "newpass1");
    await user.click(screen.getByText("public.landing.form.updateResubmit"));

    expect(updateMutate).toHaveBeenCalledTimes(1);
    const [{ activationId, command }] = updateMutate.mock.calls[0] as [
      { activationId: string; command: { accountFields: unknown[] } },
    ];
    expect(activationId).toBe(mockKeyNeedsCorrection.activationId);
    expect(command.accountFields).toContainEqual({
      field: AccountInformation.USERNAME,
      value: "corrected.name",
    });
  });
});
