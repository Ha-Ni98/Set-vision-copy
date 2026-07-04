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
import { renderLandingPage } from "./support/renderLandingPage";
import { mutationMock, statusQueryMock } from "./support/testHelpers";
import {
  mockKeyInvalid,
  mockKeyReady,
  mockKeySubmitted,
  mockKeyProcessing,
  mockKeyNeedsCorrection,
  mockKeyNeedsOtp,
  mockKeyUnderReview,
  mockKeyActivated,
  mockKeyFailed,
} from "../../../fixtures/data/keys.mock";

const KEY_PLACEHOLDER = "public.landing.verify.placeholder";
const SUBMIT_BUTTON = "public.landing.verify.submit";
const VALID_KEY = "ABCD-1234-EFGH-5678";

let verifyMutate: ReturnType<typeof vi.fn>;

function verifyResolvesWith(data: KeyVerificationDTO) {
  verifyMutate.mockImplementation(
    (_vars: unknown, opts?: { onSuccess?: (d: KeyVerificationDTO) => void }) =>
      opts?.onSuccess?.(data),
  );
}

function verifyRejectsWith(err: unknown) {
  verifyMutate.mockImplementation((_vars: unknown, opts?: { onError?: (e: unknown) => void }) =>
    opts?.onError?.(err),
  );
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

describe("LandingPage — Step 1 verify", () => {
  it("shows an inline empty-key error and never calls verifyKey.mutate", async () => {
    const user = userEvent.setup();
    renderLandingPage();

    await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

    expect(screen.getByText("public.landing.verify.emptyKey")).toBeInTheDocument();
    expect(verifyMutate).not.toHaveBeenCalled();
  });

  it("shows an inline bad-format error and never calls verifyKey.mutate", async () => {
    const user = userEvent.setup();
    renderLandingPage();

    await user.type(screen.getByPlaceholderText(KEY_PLACEHOLDER), "nope");
    await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

    expect(screen.getByText("public.landing.verify.badFormat")).toBeInTheDocument();
    expect(verifyMutate).not.toHaveBeenCalled();
  });

  it("disables the field and shows a spinner while the mutation is pending", () => {
    vi.mocked(useVerifyKeyHook.useVerifyKey).mockReturnValue(
      mutationMock({ isPending: true }) as never,
    );
    renderLandingPage();

    expect(screen.getByPlaceholderText(KEY_PLACEHOLDER)).toBeDisabled();
    expect(screen.getByText("public.landing.verify.verifying")).toBeInTheDocument();
  });

  it("shows the networkError message (no WhatsApp) on a connection failure", async () => {
    const user = userEvent.setup();
    verifyRejectsWith(Object.assign(new Error("network down"), { isAxiosError: true }));
    renderLandingPage();

    await user.type(screen.getByPlaceholderText(KEY_PLACEHOLDER), VALID_KEY);
    await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

    expect(await screen.findByText("public.landing.verify.networkError")).toBeInTheDocument();
    expect(screen.queryByText("common.actions.contactWhatsapp")).not.toBeInTheDocument();
  });

  it("shows the shared serverError message + a WhatsApp link on a 5xx", async () => {
    const user = userEvent.setup();
    verifyRejectsWith(
      Object.assign(new Error("boom"), { isAxiosError: true, response: { status: 500 } }),
    );
    renderLandingPage();

    await user.type(screen.getByPlaceholderText(KEY_PLACEHOLDER), VALID_KEY);
    await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

    expect(await screen.findByText("public.landing.serverError")).toBeInTheDocument();
    expect(screen.getByText("common.actions.contactWhatsapp")).toBeInTheDocument();
  });

  it("calls verifyKey.mutate with the typed key on a well-formed submit", async () => {
    const user = userEvent.setup();
    verifyResolvesWith(mockKeyReady);
    renderLandingPage();

    await user.type(screen.getByPlaceholderText(KEY_PLACEHOLDER), VALID_KEY);
    await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

    expect(verifyMutate).toHaveBeenCalledWith({ key: VALID_KEY }, expect.anything());
  });

  it.each([
    ["INVALID", mockKeyInvalid, "public.landing.message.invalidBody"],
    ["READY", mockKeyReady, "public.landing.form.saveSubmit"],
    ["SUBMITTED", mockKeySubmitted, "public.landing.form.pendingBanner"],
    ["PROCESSING", mockKeyProcessing, "public.landing.form.processingNotice"],
    ["NEEDS_CORRECTION", mockKeyNeedsCorrection, "public.landing.form.correctionBanner"],
    ["NEEDS_OTP", mockKeyNeedsOtp, "public.landing.otp.title"],
    ["UNDER_REVIEW", mockKeyUnderReview, "public.landing.review.title"],
    ["ACTIVATED", mockKeyActivated, "public.landing.completed.title"],
    ["FAILED", mockKeyFailed, "public.landing.failed.title"],
  ] satisfies [string, KeyVerificationDTO, string][])(
    "status %s routes to its own view (marker: %s)",
    async (_label, dto, marker) => {
      const user = userEvent.setup();
      verifyResolvesWith(dto);
      renderLandingPage();

      await user.type(screen.getByPlaceholderText(KEY_PLACEHOLDER), VALID_KEY);
      await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

      expect(await screen.findByText(marker)).toBeInTheDocument();
    },
  );

  it("INVALID shows a WhatsApp link and keeps the input editable (stays on Step 1)", async () => {
    const user = userEvent.setup();
    verifyResolvesWith(mockKeyInvalid);
    renderLandingPage();

    await user.type(screen.getByPlaceholderText(KEY_PLACEHOLDER), VALID_KEY);
    await user.click(screen.getByRole("button", { name: SUBMIT_BUTTON }));

    expect(await screen.findByText("common.actions.contactWhatsapp")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(KEY_PLACEHOLDER)).toBeEnabled();
  });

  it("the switch covers every ClientActivationStatus member (exhaustiveness canary)", () => {
    expect(Object.values(ClientActivationStatus)).toHaveLength(9);
  });
});
