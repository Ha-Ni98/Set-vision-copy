import "../../../fixtures/wrappers/mockTranslation";
import "./support/mockHooks";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientActivationStatus, type KeyVerificationDTO } from "@my-app/contract";
import * as useVerifyKeyHook from "@/hooks/useVerifyKey";
import * as useActivationStatusHook from "@/hooks/useActivationStatus";
import * as useSubmitActivationHook from "@/hooks/useSubmitActivation";
import * as useUpdateActivationHook from "@/hooks/useUpdateActivation";
import * as useSubmitAdditionalInfoHook from "@/hooks/useSubmitAdditionalInfo";
import * as realtimeLib from "@/lib/realtime";
import { renderLandingPage, rerenderLandingPage } from "./support/renderLandingPage";
import { mutationMock, statusQueryMock } from "./support/testHelpers";
import {
  mockKeyNeedsOtp,
  mockKeyUnderReview,
  mockKeySubmitted,
  mockKeyNeedsCorrection,
} from "../../../fixtures/data/keys.mock";

const KEY_PLACEHOLDER = "public.landing.verify.placeholder";
const SUBMIT_BUTTON = "public.landing.verify.submit";
// LandingPage's KEY_FORMAT_PATTERN is a flat 12-char [A-Z0-9] string (no hyphens) — this must
// match that shape or Step 1's client-side validation rejects it before verify() ever mutates.
const VALID_KEY = "ABCD1234EFGH";

let verifyMutate: ReturnType<typeof vi.fn>;

function verifyResolvesWith(data: KeyVerificationDTO) {
  verifyMutate.mockImplementation(
    (_vars: unknown, opts?: { onSuccess?: (d: KeyVerificationDTO) => void }) =>
      opts?.onSuccess?.(data),
  );
}

async function seedView(user: ReturnType<typeof userEvent.setup>, dto: KeyVerificationDTO) {
  verifyResolvesWith(dto);
  const result = renderLandingPage();
  await user.type(screen.getByPlaceholderText(KEY_PLACEHOLDER), VALID_KEY);
  await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));
  return result;
}

beforeEach(() => {
  vi.clearAllMocks();
  const verify = mutationMock();
  verifyMutate = verify.mutate;
  vi.mocked(useVerifyKeyHook.useVerifyKey).mockReturnValue(verify as never);
  vi.mocked(useActivationStatusHook.useActivationStatus).mockReturnValue(
    statusQueryMock() as never,
  );
  vi.mocked(useSubmitActivationHook.useSubmitActivation).mockReturnValue(mutationMock() as never);
  vi.mocked(useUpdateActivationHook.useUpdateActivation).mockReturnValue(mutationMock() as never);
  vi.mocked(useSubmitAdditionalInfoHook.useSubmitAdditionalInfo).mockReturnValue(
    mutationMock() as never,
  );
});

describe("LandingPage — realtime re-sync", () => {
  it("a status change delivered via useActivationStatus re-verifies and re-dispatches the view (no click involved)", async () => {
    const user = userEvent.setup();
    const { rerender } = await seedView(user, mockKeyNeedsOtp);
    expect(await screen.findByText("public.landing.otp.title")).toBeInTheDocument();

    // Simulates what a real socket invalidation (or the window-focus/polling refetch,
    // wired inside useActivationStatus itself — see tests/integration/hooks/keys.test.tsx
    // for that layer) delivers: a fresh ClientActivationStatusDTO for the same activation.
    // Stage-04-fix #4B: this now triggers a full re-verify (not just folding in the new
    // status), so the mocked verify must resolve with the post-transition DTO on this next
    // call — refreshing flaggedFields/submittedFields is the whole point of the fix.
    verifyMutate.mockImplementationOnce(
      (_vars: unknown, opts?: { onSuccess?: (d: KeyVerificationDTO) => void }) =>
        opts?.onSuccess?.(mockKeyUnderReview),
    );
    vi.mocked(useActivationStatusHook.useActivationStatus).mockReturnValue(
      statusQueryMock({
        activationId: mockKeyNeedsOtp.activationId!,
        status: ClientActivationStatus.UNDER_REVIEW,
      }) as never,
    );
    rerenderLandingPage(rerender);

    expect(await screen.findByText("public.landing.review.title")).toBeInTheDocument();
    expect(screen.queryByText("public.landing.otp.title")).not.toBeInTheDocument();
  });

  // Stage-04-fix #4B: before this fix, a live SUBMITTED → NEEDS_CORRECTION push updated the
  // status but the form's `editing` state (set once at mount) never re-initialized, so fields
  // stayed disabled and unflagged until the client manually refreshed and re-checked the key.
  it("a live SUBMITTED → NEEDS_CORRECTION push makes fields editable and flags the reported one, without a manual refresh", async () => {
    const user = userEvent.setup();
    const { rerender } = await seedView(user, mockKeySubmitted);
    expect(screen.getByLabelText("public.landing.form.fullName")).toBeDisabled();

    verifyMutate.mockImplementationOnce(
      (_vars: unknown, opts?: { onSuccess?: (d: KeyVerificationDTO) => void }) =>
        opts?.onSuccess?.(mockKeyNeedsCorrection),
    );
    vi.mocked(useActivationStatusHook.useActivationStatus).mockReturnValue(
      statusQueryMock({
        activationId: mockKeySubmitted.activationId!,
        status: ClientActivationStatus.NEEDS_CORRECTION,
      }) as never,
    );
    rerenderLandingPage(rerender);

    expect(await screen.findByText("public.landing.form.correctionBanner")).toBeInTheDocument();
    expect(screen.getByLabelText("public.landing.form.fullName")).toBeEnabled();
    expect(screen.getByLabelText("public.landing.form.username")).toBeEnabled();
    expect(screen.getByText("public.landing.form.flagged")).toBeInTheDocument();
  });

  it('"Check Another Key" unsubscribes the current activation before resetting to Step 1', async () => {
    const user = userEvent.setup();
    await seedView(user, mockKeyNeedsOtp);
    expect(await screen.findByText("public.landing.otp.title")).toBeInTheDocument();

    await user.click(screen.getByText("public.landing.verify.checkAnother"));

    expect(realtimeLib.unsubscribeActivation).toHaveBeenCalledWith(mockKeyNeedsOtp.activationId);
    expect(screen.getByPlaceholderText(KEY_PLACEHOLDER)).toHaveValue("");
    expect(screen.queryByText("public.landing.otp.title")).not.toBeInTheDocument();
  });

  it('"Check Another Key" is a safe no-op for unsubscribe when nothing was ever verified', async () => {
    const user = userEvent.setup();
    renderLandingPage();

    await user.click(screen.getByText("public.landing.verify.checkAnother"));

    expect(realtimeLib.unsubscribeActivation).not.toHaveBeenCalled();
  });

  it("the stats section always renders without an error block (§E-1: no public stats endpoint)", () => {
    renderLandingPage();

    expect(screen.getByText("public.landing.stats.title")).toBeInTheDocument();
    expect(screen.queryByText("common.errors.crashTitle")).not.toBeInTheDocument();
  });
});
